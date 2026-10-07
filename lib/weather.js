// 기상청 초단기실황에서 현재 바람을 가져오는 파일
// 서버에서만 실행돼요. 키가 브라우저로 나가지 않아요.

const API_URL =
  "https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getUltraSrtNcst";

// 양주시청 부근 격자 좌표 (기상청 변환식으로 계산, 서울시청 60,127로 검증)
export const YANGJU_CITY_HALL_GRID = { nx: 61, ny: 131 };

// 16방위 이름 (0° = 북쪽, 시계 방향)
const DIRECTIONS = [
  "북", "북북동", "북동", "동북동", "동", "동남동", "남동", "남남동",
  "남", "남남서", "남서", "서남서", "서", "서북서", "북서", "북북서",
];

export function directionName(degree) {
  return DIRECTIONS[Math.round((((degree % 360) + 360) % 360) / 22.5) % 16];
}

// 보퍼트 풍력계급 0(고요): 풍속 0.3m/s 미만은 바람이 거의 없어 풍향의 의미가 약해요
const CALM_SPEED = 0.3;

// 한국 시간 기준으로 "조회할 관측 시각" 계산
// 초단기실황은 매시 정각 자료가 약 40분 뒤에 올라와서, 40분을 뺀 뒤 정각으로 맞춰요
function baseDateTime(hoursBack = 0) {
  const kst = new Date(Date.now() + 9 * 3600 * 1000 - 40 * 60 * 1000 - hoursBack * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    base_date: `${kst.getUTCFullYear()}${pad(kst.getUTCMonth() + 1)}${pad(kst.getUTCDate())}`,
    base_time: `${pad(kst.getUTCHours())}00`,
  };
}

// 기상청 API 한 번 부르기
async function fetchObservation(grid, hoursBack) {
  const key = (process.env.KMA_AUTH_KEY || "").trim();
  if (!key) {
    throw new Error(
      "서버에 KMA_AUTH_KEY가 없어요. (내 컴퓨터는 .env.local, Vercel은 환경변수를 확인하세요)"
    );
  }

  const { base_date, base_time } = baseDateTime(hoursBack);
  const params = new URLSearchParams({
    pageNo: "1",
    numOfRows: "10",
    dataType: "JSON",
    base_date,
    base_time,
    nx: String(grid.nx),
    ny: String(grid.ny),
    authKey: key,
  });

  const res = await fetch(`${API_URL}?${params}`, {
    next: { revalidate: 600 }, // 같은 관측 자료는 10분 동안 다시 쓰기
  });
  if (!res.ok) throw new Error(`기상청 API에 연결하지 못했어요 (HTTP ${res.status})`);

  const data = await res.json();
  const header = data?.response?.header;
  if (header?.resultCode === "03") return null; // 아직 자료가 안 올라옴(NO_DATA)
  if (header?.resultCode !== "00") {
    throw new Error(`기상청 API 오류: ${header?.resultMsg ?? "알 수 없음"}`);
  }

  const items = data.response.body.items.item;
  const value = (category) => items.find((i) => i.category === category)?.obsrValue;
  return { base_date, base_time, vec: value("VEC"), wsd: value("WSD") };
}

// 현재 바람 정보 가져오기 (자료가 아직 없으면 한 시간 전 자료로)
export async function getCurrentWind(grid = YANGJU_CITY_HALL_GRID) {
  const obs =
    (await fetchObservation(grid, 0)) ?? (await fetchObservation(grid, 1));
  if (!obs || obs.vec == null || obs.wsd == null) {
    throw new Error("기상청 관측 자료를 찾지 못했어요.");
  }

  const windFrom = Number(obs.vec); // 바람이 불어오는 방향
  const speed = Number(obs.wsd); // 풍속 (m/s)
  const smokeTo = (windFrom + 180) % 360; // 연기가 이동하는 방향

  return {
    observedAt: `${obs.base_time.slice(0, 2)}시`, // 관측 시각
    windFrom,
    windFromName: directionName(windFrom),
    smokeTo,
    smokeToName: directionName(smokeTo),
    speed,
    isCalm: speed < CALM_SPEED,
  };
}

// 위도·경도를 기상청 격자(nx, ny)로 바꾸는 함수 (기상청 공식 변환식)
// 지금은 양주시청 격자를 쓰지만, 4·5단계에서 내 위치나 화재 위치의 격자를 구할 때 써요.
export function latLonToGrid(lat, lon) {
  const RE = 6371.00877, GRID = 5.0, SLAT1 = 30.0, SLAT2 = 60.0;
  const OLON = 126.0, OLAT = 38.0, XO = 43, YO = 136;
  const D = Math.PI / 180;
  const re = RE / GRID;
  const s1 = SLAT1 * D, s2 = SLAT2 * D, olon = OLON * D, olat = OLAT * D;
  let sn = Math.tan(Math.PI / 4 + s2 / 2) / Math.tan(Math.PI / 4 + s1 / 2);
  sn = Math.log(Math.cos(s1) / Math.cos(s2)) / Math.log(sn);
  let sf = Math.tan(Math.PI / 4 + s1 / 2);
  sf = (Math.pow(sf, sn) * Math.cos(s1)) / sn;
  let ro = Math.tan(Math.PI / 4 + olat / 2);
  ro = (re * sf) / Math.pow(ro, sn);
  let ra = Math.tan(Math.PI / 4 + lat * D / 2);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lon * D - olon;
  if (theta > Math.PI) theta -= 2 * Math.PI;
  if (theta < -Math.PI) theta += 2 * Math.PI;
  theta *= sn;
  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}
