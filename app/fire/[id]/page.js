// 화재 페이지: /fire/화재번호?from=날짜 (지도 탭의 메인 화면)
// from: 그 화재의 첫 문자 날짜("20260806"). 이 날짜부터 3일 치만 불러와 화재를 찾아요.
// from이 없으면 최근 3일에서 찾아요 (진행 중 화재).

import { cache } from "react";
import { loadIncidents, findIncident } from "../../../lib/loadIncidents";
import { RECENT_DAYS } from "../../../lib/config";
import { isCurrent } from "../../../lib/incidents";
import { addDaysYmd, recentStart } from "../../../lib/dates";
import FireView from "../../FireView";
import { incidentTitle } from "../../ui";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const getData = cache(async (id, from) => {
  const valid = /^\d{8}$/.test(from ?? "");
  const start = valid ? from : recentStart(RECENT_DAYS);
  const end = valid ? addDaysYmd(from, 3) : null;
  const { incidents } = await loadIncidents(start, end);
  return { incident: findIncident(incidents, id) };
});

// 카카오톡 등으로 공유할 때 미리보기 제목과 설명
export async function generateMetadata({ params, searchParams }) {
  const { id } = await params;
  const { from } = await searchParams;
  try {
    const { incident } = await getData(id, from);
    if (incident) {
      return {
        title: `${incidentTitle(incident)} | 양주 재난나침반`,
        description: incident.latest.text.slice(0, 80),
      };
    }
  } catch {
    // 불러오지 못하면 기본 제목
  }
  return { title: "화재 정보 | 양주 재난나침반" };
}

export default async function FirePage({ params, searchParams }) {
  const { id } = await params;
  const { from } = await searchParams;
  let data = null;
  let error = null;
  try {
    data = await getData(id, from);
  } catch (e) {
    error = e.message;
  }

  if (error || !data?.incident) {
    return (
      <main className="records">
        <div className="empty-card">
          <strong>{error ? "정보를 불러오지 못했어요" : "이 화재를 찾지 못했어요"}</strong>
          {error ? error : "아래 재난 기록 탭에서 날짜로 찾아보세요."}
        </div>
      </main>
    );
  }

  return <FireView incident={data.incident} stale={!isCurrent(data.incident)} />;
}