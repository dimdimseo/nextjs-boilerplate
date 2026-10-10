// 재난문자 → AI 분석 → 화재별 묶기 (→ 좌표·바람)까지 한 번에 하는 파일
//   startDate: 이 날짜부터 ("20260806")
//   endDate:   이 날짜 전까지 (없으면 오늘까지)
//   withPlaces: 좌표와 화재 지점 바람까지 붙일지 (재난 기록 목록에는 필요 없어서 false)

import { cache } from "react";
import { getYangjuFires } from "./disasters";
import { getAnalysis } from "./analysis";
import { groupIntoIncidents } from "./incidents";
import { geocode } from "./geocode";
import { getCurrentWind, latLonToGrid } from "./weather";
import { sentYmd } from "./dates";

// cache: 한 번 접속하는 동안 같은 조건으로 여러 번 불러도 한 번만 계산
export const loadIncidents = cache(async (startDate, endDate = null, withPlaces = true) => {
  const all = await getYangjuFires(startDate);
  // 고른 기간의 문자만 남기고 AI 분석 (기간 밖 문자는 AI에 보내지 않음)
  const fires = endDate ? all.filter((f) => sentYmd(f.sentAt) < endDate) : all;
  const analyses = await Promise.all(
    fires.map((fire) => getAnalysis(fire.id, fire.text).catch(() => null))
  );
  const grouped = groupIntoIncidents(fires, analyses);
  if (!withPlaces) return { fires, incidents: grouped };

  // 화재마다 좌표와 화재 지점 부근 바람 붙이기
  const incidents = await Promise.all(
    grouped.map(async (incident) => {
      let location = null;
      let locationError = null;
      try {
        location = await geocode(incident.address, incident.facility);
      } catch (e) {
        locationError = e.message;
      }
      const wind = location
        ? await getCurrentWind(latLonToGrid(location.lat, location.lon)).catch((e) => ({
            error: e.message,
          }))
        : null;
      return { ...incident, location, locationError, wind };
    })
  );
  return { fires, incidents };
});

// 주소의 번호로 화재 찾기 (그 화재의 어떤 문자 번호로 들어와도 같은 화재)
export function findIncident(incidents, id) {
  const n = Number(id);
  return incidents.find(
    (inc) => inc.id === n || inc.latest.id === n || inc.earlier.some((m) => m.id === n)
  );
}