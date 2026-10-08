// 기본 주소(/)로 들어왔을 때
// - 현재 화재(마지막 안내 24시간 이내) 1건 → 그 화재 페이지로 바로 이동
// - 2건 이상 → 화재 제목 목록
// - 없음 → "진행 중인 화재 문자가 없어요"

import Link from "next/link";
import { redirect } from "next/navigation";
import { loadIncidents } from "../lib/loadIncidents";
import { RECENT_DAYS } from "../lib/config";
import { recentStart, ymdOf } from "../lib/dates";
import { isCurrent, formatKstTime } from "../lib/incidents";
import { incidentTitle } from "./ui";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function Home() {
  let current = [];
  let error = null;
  try {
    const { incidents } = await loadIncidents(recentStart(RECENT_DAYS), null, false);
    current = incidents.filter((inc) => isCurrent(inc));
  } catch (e) {
    error = e.message;
  }

  if (!error && current.length === 1) {
    redirect(`/fire/${current[0].id}?from=${ymdOf(current[0].occurredDate)}`); // 화재가 하나면 바로 그 화면으로
  }

  return (
    <main className="records">
      <div className="records-title">지금 양주시</div>
      <div className="records-sub">최근 24시간 안에 발송된 양주시 화재 재난문자를 확인해요.</div>

      {error && <div className="empty-card">정보를 불러오지 못했어요. ({error})</div>}

      {!error && current.length === 0 && (
        <div className="empty-card">
          <strong>진행 중인 화재 문자가 없어요</strong>
          화재 문자가 오면 이 화면에서 바로 그 화재의 지도와 안내로 이동해요. 지난 화재는 아래 재난 기록에서 볼 수
          있어요.
        </div>
      )}

      {!error &&
        current.length > 1 &&
        current.map((inc) => (
          <Link key={inc.id} href={`/fire/${inc.id}?from=${ymdOf(inc.occurredDate)}`} className="record-card">
            <div className="row">
              <strong>{incidentTitle(inc)}</strong>
              <span className="tiny-pill now">진행 중</span>
            </div>
            <div className="record-date">마지막 안내 {formatKstTime(inc.latest.sentDate)}</div>
          </Link>
        ))}

      <div className="caution">홈 화면에 추가해두면 화재 문자를 받았을 때 앱처럼 바로 열 수 있어요.</div>
    </main>
  );
}