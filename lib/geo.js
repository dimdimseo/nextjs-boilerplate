// 두 지점 사이의 거리와 방향을 계산하는 파일
// 브라우저(시민의 휴대폰)에서 실행돼요. 그래서 내 위치가 서버로 나가지 않아요.

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

// 두 지점 사이의 거리 (km) - 하버사인 공식
export function distanceKm(from, to) {
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// from에서 볼 때 to가 있는 방향 (0° = 북쪽, 시계 방향)
export function bearingDeg(from, to) {
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const Δλ = toRad(to.lon - from.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// 16방위 이름 (weather.js와 같은 규칙)
const DIRECTIONS = [
  "북", "북북동", "북동", "동북동", "동", "동남동", "남동", "남남동",
  "남", "남남서", "남서", "서남서", "서", "서북서", "북서", "북북서",
];
export function directionName(degree) {
  return DIRECTIONS[Math.round((((degree % 360) + 360) % 360) / 22.5) % 16];
}

// 한 지점에서 어떤 방향으로 몇 km 간 지점 (바람 화살표 끝점 계산용)
export function destination(from, bearing, km) {
  const δ = km / EARTH_RADIUS_KM;
  const θ = toRad(bearing);
  const φ1 = toRad(from.lat);
  const λ1 = toRad(from.lon);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 =
    λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: toDeg(φ2), lon: toDeg(λ2) };
}

// 연기 방향과 "화재 → 내 위치" 방향의 차이가 이 각도 안이면 "내 쪽으로 온다(추정)"
// 공식 기준이 아닌 설계값 (16방위 한 칸). 팀 결정에 따라 바꾸세요.
export const TOWARD_ME_DEG = 22.5;

export function angleDiff(a, b) {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

// 화재 지점의 연기가 내 쪽으로 향하는지 (바람이 없거나 정보가 없으면 false)
export function isSmokeTowardMe(fire, me, wind) {
  if (!fire || !me || !wind || wind.error || wind.isCalm) return false;
  return angleDiff(bearingDeg(fire, me), wind.smokeTo) <= TOWARD_ME_DEG;
}