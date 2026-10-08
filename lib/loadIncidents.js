// 재난문자 → AI 분석 → 화재별 묶기까지 한 번에 하는 파일
// 전체 목록 화면과 화재별 페이지가 같은 결과를 쓰도록 한곳에 모았어요.

import { cache } from "react";
import { getYangjuFires } from "./disasters";
import { getAnalysis } from "./analysis";
import { groupIntoIncidents } from "./incidents";
import { geocode } from "./geocode";
import { getCurrentWind, latLonToGrid } from "./weather";

// cache: 한 번 접속하는 동안 여러 번 불러도 재난문자 API는 한 번만 호출
export const loadIncidents = cache(async (startDate) => {
  const fires = await getYangjuFires(startDate);
  const analyses = await Promise.all(
    fires.map((fire) => getAnalysis(fire.id, fire.text).catch(() => null))
  );
  const grouped = groupIntoIncidents(fires, analyses);

  // 화재마다 좌표와 화재 지점 부근 바람 붙이기
  const incidents = await Promise.all(
    grouped.map(async (incident) => {
      let location = null;
      let locationError = null;
      try {
        location = await geocode(incident.address);
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

// 주소의 번호로 화재 찾기
// 첫 문자 번호뿐 아니라, 그 화재에 속한 어떤 문자 번호로 들어와도 같은 화재를 보여줘요.
export function findIncident(incidents, id) {
  const n = Number(id);
  return incidents.find(
    (inc) => inc.id === n || inc.latest.id === n || inc.earlier.some((m) => m.id === n)
  );
}