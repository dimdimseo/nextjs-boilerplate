// 화재 장소를 좌표로 바꾸는 파일 (카카오 로컬 API, 서버에서만 실행)
// 찾는 순서: ① 번지 정확히 일치 → ② 시설 이름(터널 등) → ③ 동·리 중심
// 기획안 원칙: 정확한 위치를 확인할 수 없으면 임의로 정하지 않고 확인 가능한 범위까지만.
// 카카오 이용 조건을 지키기 위해 좌표 결과는 저장하지 않고 매번 받아 써요.

import { cache } from "react";
import { parseAddress } from "./factories";

const ADDRESS_URL = "https://dapi.kakao.com/v2/local/search/address.json";
const KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";
const PREFIX = "경기도 양주시 ";

async function kakaoGet(url, params) {
  const key = (process.env.KAKAO_REST_KEY || "").trim();
  if (!key) {
    throw new Error("서버에 KAKAO_REST_KEY가 없어요. (내 컴퓨터는 .env.local, Vercel은 환경변수를 확인하세요)");
  }
  const res = await fetch(`${url}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `KakaoAK ${key}` },
    cache: "no-store", // 좌표를 저장하지 않음
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`카카오 검색 실패 (HTTP ${res.status}): ${detail.slice(0, 150)}`);
  }
  const data = await res.json();
  return data.documents ?? [];
}

const searchAddress = (query) => kakaoGet(ADDRESS_URL, { query, analyze_type: "exact", size: "10" });
const searchKeyword = (query) => kakaoGet(KEYWORD_URL, { query, size: "15" });

// 카카오 결과의 지번을 "309-1", "산59-14" 형식으로
function lotOf(addr) {
  if (!addr) return null;
  const sub = addr.sub_address_no && addr.sub_address_no !== "0" ? `-${addr.sub_address_no}` : "";
  return `${addr.mountain_yn === "Y" ? "산" : ""}${addr.main_address_no}${sub}`;
}

// 비교용: 띄어쓰기와 괄호 내용 없애기 ("노고산 1터널" → "노고산1터널", "사패산터널(의정부 방향)" → "사패산터널")
const squash = (s) => String(s ?? "").replace(/\(.*?\)/g, "").replace(/\s/g, "");

// 장소 → { lat, lon, precision: "lot"(번지) | "facility"(시설) | "area"(동·리 중심), label }
// cache: 한 번 접속하는 동안 같은 장소는 한 번만 물어봄 (접속이 끝나면 사라짐)
export const geocode = cache(async (address, facility = null) => {
  if (!address && !facility) return null;
  const parsed = address ? parseAddress(address) : null; // 예: { area: "율정동", lot: "309-1" }

  // ① 번지까지 정확히 일치하는 결과만 인정
  if (parsed) {
    const docs = await searchAddress(`${PREFIX}${parsed.area} ${parsed.lot}`);
    const areaLast = parsed.area.split(" ").pop(); // "은현면 하패리" → "하패리"
    const exact = docs.find(
      (d) => d.address?.address_name?.includes(areaLast) && lotOf(d.address) === parsed.lot
    );
    if (exact) {
      return { lat: Number(exact.y), lon: Number(exact.x), precision: "lot", label: `${parsed.area} ${parsed.lot}` };
    }
  }

  // ② 시설 이름으로 찾기 (이름과 지역이 모두 맞을 때만 인정)
  const name = squash(facility);
  if (name) {
    // 문자에 적힌 읍·면·동 (예: "장흥면 삼상리" → "장흥면")
    const town = (address ?? "").trim().split(/\s+/).find((t) => /[읍면동]$/.test(t));
    const docs = await searchKeyword(name);
    const hit = docs.find(
      (d) =>
        squash(d.place_name).includes(name) &&
        d.address_name?.includes("양주") &&
        (!town || d.address_name.includes(town))
    );
    if (hit) {
      return { lat: Number(hit.y), lon: Number(hit.x), precision: "facility", label: hit.place_name };
    }
  }

  // ③ 동·리 중심까지만
  if (address) {
    const area = parsed ? parsed.area : address.trim();
    const docs = await searchAddress(`${PREFIX}${area}`);
    const region = docs.find((d) => d.address_type === "REGION");
    if (region) {
      return { lat: Number(region.y), lon: Number(region.x), precision: "area", label: area };
    }
  }
  return null; // 확인할 수 없으면 거리를 계산하지 않음
});