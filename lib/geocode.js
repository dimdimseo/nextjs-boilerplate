// 화재 주소를 좌표로 바꾸는 파일 (카카오 로컬 API, 서버에서만 실행)
// 기획안 원칙: 정확한 주소를 못 찾으면 임의로 정하지 않고 동(리) 단위까지만.
// 카카오 이용 조건을 지키기 위해 좌표 결과는 저장하지 않고 매번 받아 써요.

import { cache } from "react";
import { parseAddress } from "./factories";

const SEARCH_URL = "https://dapi.kakao.com/v2/local/search/address.json";
const PREFIX = "경기도 양주시 ";

async function searchAddress(query) {
  const key = (process.env.KAKAO_REST_KEY || "").trim();
  if (!key) {
    throw new Error(
      "서버에 KAKAO_REST_KEY가 없어요. (내 컴퓨터는 .env.local, Vercel은 환경변수를 확인하세요)"
    );
  }
  const params = new URLSearchParams({ query, analyze_type: "exact", size: "10" });
  const res = await fetch(`${SEARCH_URL}?${params}`, {
    headers: { Authorization: `KakaoAK ${key}` },
    cache: "no-store", // 좌표를 저장하지 않음
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`카카오 주소 검색 실패 (HTTP ${res.status}): ${detail.slice(0, 150)}`);
  }
  const data = await res.json();
  return data.documents ?? [];
}

// 카카오 결과의 지번을 "309-1", "산59-14" 형식으로
function lotOf(addr) {
  if (!addr) return null;
  const sub = addr.sub_address_no && addr.sub_address_no !== "0" ? `-${addr.sub_address_no}` : "";
  return `${addr.mountain_yn === "Y" ? "산" : ""}${addr.main_address_no}${sub}`;
}

// 주소 → { lat, lon, precision: "lot"(번지) | "area"(동·리 중심), label }
// cache: 한 번 접속하는 동안 같은 주소는 한 번만 물어봄 (접속이 끝나면 사라짐)
export const geocode = cache(async (address) => {
  if (!address) return null;
  const parsed = parseAddress(address); // 예: { area: "율정동", lot: "309-1" }

  // 1) 번지까지 정확히 일치하는 결과만 인정
  if (parsed) {
    const docs = await searchAddress(`${PREFIX}${parsed.area} ${parsed.lot}`);
    const areaLast = parsed.area.split(" ").pop(); // "은현면 하패리" → "하패리"
    const exact = docs.find(
      (d) => d.address?.address_name?.includes(areaLast) && lotOf(d.address) === parsed.lot
    );
    if (exact) {
      return {
        lat: Number(exact.y),
        lon: Number(exact.x),
        precision: "lot",
        label: `${parsed.area} ${parsed.lot}`,
      };
    }
  }

  // 2) 번지를 못 찾거나 번지가 없으면 동(리) 중심까지만
  const area = parsed ? parsed.area : address.trim();
  const docs = await searchAddress(`${PREFIX}${area}`);
  const region = docs.find((d) => d.address_type === "REGION");
  if (region) {
    return { lat: Number(region.y), lon: Number(region.x), precision: "area", label: area };
  }
  return null; // 동 단위로도 못 찾으면 거리를 계산하지 않음
});
