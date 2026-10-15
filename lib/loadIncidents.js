// 재난문자 → AI 분석 → 화재별 묶기 (→ 좌표·바람)까지 한 번에 하는 파일
//   startDate: 이 날짜부터 ("20260806")
//   endDate:   이 날짜 전까지 (없으면 오늘까지)
//   withPlaces: 좌표와 화재 지점 바람까지 붙일지 (재난 기록 목록에는 필요 없어서 false)

import { cache } from "react";
import { getYangjuFires } from "./disasters";
import { getAnalysis } from "./analysis";
import { groupIntoIncidents } from "./incidents";
import { geocode } from "./geocode";
import { getFireWind } from "./weather";
import { sentYmd, ymdOf } from "./dates";

// cache: 한 번 접속하는 동안 같은 조건으로 여러 번 불러도 한 번만 계산
export const loadIncidents = cache(async (startDate, endDate = null, withPlaces = true) => {
  const t0 = Date.now();
  // 이미 지난 기간(어제까지)이면 결과가 바뀌지 않으니 하루 동안 저장, 아니면 1분
  const pastOnly = endDate && endDate <= ymdOf(new Date());
  const all = await getYangjuFires(startDate, pastOnly ? 86400 : 60);
  const t1 = Date.now();

  // 고른 기간의 문자만 남기고 AI 분석 (기간 밖 문자는 AI에 보내지 않음)
  const fires = endDate ? all.filter((f) => sentYmd(f.sentAt) < endDate) : all;
  const analyses = await Promise.all(
    fires.map((fire) => getAnalysis(fire.id, fire.text).catch(() => null))
  );
  const grouped = groupIntoIncidents(fires, analyses);
  const t2 = Date.now();

  const incidents = withPlaces ? await Promise.all(grouped.map(withPlace)) : grouped;
  const t3 = Date.now();

  // [속도 확인] 어느 단계가 느린지 Vercel 기록(Logs)에 남겨요
  console.log(
    `[속도] 재난문자 ${t1 - t0}ms, AI ${t2 - t1}ms${withPlaces ? `, 위치·바람 ${t3 - t2}ms` : ""} (문자 ${fires.length}건, 화재 ${grouped.length}건)`
  );
  return { fires, incidents, snapshot: all.snapshot ?? null };
});

// 화재 하나에 좌표와 화재 지점 바람 붙이기
export async function withPlace(incident) {
  const t0 = Date.now();
  let location = null;
  let locationError = null;
  try {
    location = await geocode(incident.address, incident.facility);
  } catch (e) {
    locationError = e.message;
  }
  const t1 = Date.now();
  const wind = location ? await getFireWind(location).catch((e) => ({ error: e.message })) : null;
  console.log(`[속도] 좌표 ${t1 - t0}ms, 바람(${wind?.source ?? "없음"}) ${Date.now() - t1}ms`);
  return { ...incident, location, locationError, wind };
}

// 주소의 번호로 화재 찾기 (그 화재의 어떤 문자 번호로 들어와도 같은 화재)
export function findIncident(incidents, id) {
  const n = Number(id);
  return incidents.find(
    (inc) => inc.id === n || inc.latest.id === n || inc.earlier.some((m) => m.id === n)
  );
}