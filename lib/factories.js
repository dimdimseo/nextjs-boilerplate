// 화재 주소와 양주시 공장등록현황을 대조하는 파일
// 기획안: "양주시 공장등록현황은 지역 공장정보를 보조적으로 확인하는 데 활용"
// 주소가 같다는 것만으로 그 공장에서 불이 났다고 단정할 수 없으니, 참고 정보로만 보여줘요.

import data from "../data/factories.json";

// "율정동 309-1", "은현면 하패리 682", "장흥면 울대리 산59-14" → 지역 + 번지로 나누기
const ADDRESS_PATTERN =
  /^(?:경기도\s*)?(?:양주시\s*)?((?:\S+[읍면]\s+\S+리)|(?:\S+동))\s*(산)?\s*(\d+)(?:-(\d+))?/;

export function parseAddress(address) {
  const m = String(address ?? "").trim().match(ADDRESS_PATTERN);
  if (!m) return null; // 번지가 없는 주소(예: "장흥면 삼상리")는 대조하지 않음
  const [, area, san, main, sub] = m;
  return { area, lot: `${san ? "산" : ""}${main}${sub ? `-${sub}` : ""}` };
}

// 같은 번지에 등록된 공장 찾기
export function findFactories(address) {
  const parsed = parseAddress(address);
  if (!parsed) return null;
  const products = data.factories
    .filter((f) => f.area === parsed.area && f.lot === parsed.lot)
    .map((f) => f.product);
  return {
    area: parsed.area,
    lot: parsed.lot,
    products, // 같은 번지 공장들의 생산품
    areaCount: data.areaCount[parsed.area] ?? 0, // 같은 동(리)의 등록 공장 수
    baseDate: data.baseDate,
  };
}
