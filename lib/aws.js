// 기상청 자동기상관측(AWS) 매분자료에서 화재와 가장 가까운 관측소의 바람을 가져오는 파일 (서버에서만)
// 초단기실황(1시간 단위 격자값)보다 최신이에요. 10분 평균 풍향·풍속을 써요.

import { distanceKm } from "./geo";
import { directionName } from "./weather";

// 양주시 AWS 관측소 7곳 + 동쪽 끝 대비 포천 선단동 (기상청 API허브 AWS 지점정보에서 확인)
export const AWS_STATIONS = [
  { stn: 351, name: "남면", lat: 37.8978, lon: 126.9768 },
  { stn: 352, name: "장흥면", lat: 37.71794, lon: 126.9412 },
  { stn: 353, name: "덕정동", lat: 37.8414, lon: 127.0683 },
  { stn: 372, name: "은현면", lat: 37.87496, lon: 127.02463 },
  { stn: 373, name: "남방", lat: 37.7706, lon: 127.0458 },
  { stn: 375, name: "백석읍", lat: 37.79461, lon: 126.9855 },
  { stn: 598, name: "양주(광적면)", lat: 37.83118, lon: 126.9905 },
  { stn: 359, name: "포천 선단동", lat: 37.85428, lon: 127.15919 },
];

const MAX_KM = 8; // 이보다 먼 관측소뿐이면 쓰지 않고 격자값으로
const API_URL = "https://apihub.kma.go.kr/api/typ01/cgi-bin/url/nph-aws2_min";

// 한국 시간 "202610151430" 형식
function kstStamp(date) {
  const k = new Date(date.getTime() + 9 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return `${k.getUTCFullYear()}${p(k.getUTCMonth() + 1)}${p(k.getUTCDate())}${p(k.getUTCHours())}${p(k.getUTCMinutes())}`;
}

export function nearestStation(location) {
  let best = null;
  for (const s of AWS_STATIONS) {
    const km = distanceKm(location, s);
    if (!best || km < best.km) best = { ...s, km };
  }
  return best;
}

// 응답 글자에서 해당 관측소의 가장 최근 10분 평균 풍향·풍속 찾기
export function parseAws(text, stn) {
  const lines = text.split(/\r?\n/);
  // 설명 줄(#)에서 칸 이름 찾기. 못 찾으면 기본 순서(시각, 지점, WD1, WS1, WDS, WSS, WD10, WS10…)
  let col = { time: 0, stn: 1, wd: 6, ws: 7 };
  const header = lines.find((l) => l.startsWith("#") && /\bSTN\b/.test(l) && /\bWS10\b/.test(l));
  if (header) {
    const names = header.replace(/^#\s*/, "").trim().split(/[\s,]+/);
    const at = (n) => names.indexOf(n);
    if (at("STN") >= 0 && at("WD10") >= 0 && at("WS10") >= 0) {
      col = { time: Math.max(at("YYMMDDHHMI"), 0), stn: at("STN"), wd: at("WD10"), ws: at("WS10") };
    }
  }

  let last = null;
  for (const line of lines) {
    if (!line.trim() || line.startsWith("#")) continue;
    const v = line.split(/[\s,]+/).filter(Boolean);
    if (Number(v[col.stn]) !== stn) continue;
    const wd = Number(v[col.wd]);
    const ws = Number(v[col.ws]);
    // -50 이하는 관측 없음(결측) → 건너뛰기
    if (!(wd >= 0 && wd <= 360) || !(ws >= 0) || ws > 60) continue;
    // 기상청 설명: 풍향 360은 "무풍" (0이 북쪽)
    last = { time: v[col.time], wd: wd === 360 ? null : wd, ws: wd === 360 ? 0 : ws };
  }
  return last;
}

export async function getAwsWind(location) {
  const station = nearestStation(location);
  if (!station || station.km > MAX_KM) return null;

  const key = (process.env.KMA_AUTH_KEY || "").trim();
  if (!key) return null;

  const now = new Date();
  const params = new URLSearchParams({
    tm1: kstStamp(new Date(now.getTime() - 20 * 60 * 1000)), // 최근 20분
    tm2: kstStamp(now),
    stn: String(station.stn),
    disp: "1",
    help: "1",
    authKey: key,
  });
  const res = await fetch(`${API_URL}?${params}`, {
    next: { revalidate: 60 }, // 1분 동안 다시 쓰기
    signal: AbortSignal.timeout(6000), // 6초 넘으면 포기하고 격자값으로
  });
  if (!res.ok) return null;
  const obs = parseAws(await res.text(), station.stn);
  if (!obs) return null;

  const t = String(obs.time);
  const hhmm = t.length >= 12 ? `${t.slice(8, 10)}:${t.slice(10, 12)}` : t;
  const calm = obs.wd === null || obs.ws < 0.3; // 무풍이거나 보퍼트 풍력계급 0(고요)
  const windFrom = obs.wd ?? 0;
  const smokeTo = (windFrom + 180) % 360;
  return {
    source: "aws",
    observedAt: hhmm,
    windFrom,
    windFromName: directionName(windFrom),
    smokeTo,
    smokeToName: directionName(smokeTo),
    speed: obs.ws,
    isCalm: calm,
    stationName: station.name,
    stationKm: Math.round(station.km * 10) / 10,
  };
}