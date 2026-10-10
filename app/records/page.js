// 재난 기록 탭: /records?y=2026&m=8&d=6
// 년·월(·일)을 고르면 그 기간의 양주시 화재를 보여줘요.
// 고른 기간의 문자만 AI로 분석하고, 지도·바람은 화재 페이지에서만 불러와요.

import Link from "next/link";
import { loadIncidents } from "../../lib/loadIncidents";
import { FIRST_RECORD_YEAR } from "../../lib/config";
import { isCurrent, formatKst } from "../../lib/incidents";
import { ymdOf, addDaysYmd, daysInMonth, pad } from "../../lib/dates";
import { incidentTitle } from "../ui";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function Records({ searchParams }) {
  const sp = await searchParams;
  const today = ymdOf(new Date());
  const thisY = Number(today.slice(0, 4));
  const thisM = Number(today.slice(4, 6));

  // 고른 날짜 (잘못된 값이면 이번 달로)
  let y = Number(sp.y) || thisY;
  let m = Number(sp.m) || thisM;
  y = Math.min(Math.max(y, FIRST_RECORD_YEAR), thisY);
  m = Math.min(Math.max(m, 1), 12);
  const maxDay = daysInMonth(y, m);
  let d = Number(sp.d) || 0;
  if (d < 0 || d > maxDay) d = 0;

  const monthStart = `${y}${pad(m)}01`;
  const start = d ? `${y}${pad(m)}${pad(d)}` : monthStart;
  const end = d ? addDaysYmd(start, 1) : addDaysYmd(monthStart, maxDay);
  const label = d ? `${y}년 ${m}월 ${d}일` : `${y}년 ${m}월`;

  // 이전 달 / 다음 달
  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  const hasPrev = prev.y >= FIRST_RECORD_YEAR;
  const hasNext = `${next.y}${pad(next.m)}01` <= today;

  let fires = [];
  let incidents = [];
  let error = null;
  if (start <= today) {
    try {
      ({ fires, incidents } = await loadIncidents(start, end, false));
    } catch (e) {
      error = e.message;
    }
  }

  const years = [];
  for (let yy = thisY; yy >= FIRST_RECORD_YEAR; yy--) years.push(yy);

  return (
    <main className="records">
      <div className="records-title">재난 기록</div>
      <div className="records-sub">공식 재난문자로 받은 재난이에요. 누르면 내 위치 기준 상세 안내를 지도에서 볼 수 있어요.</div>

      <form method="get" action="/records" className="records-filter">
        <label>
          년
          <select name="y" defaultValue={y}>
            {years.map((yy) => (
              <option key={yy} value={yy}>
                {yy}
              </option>
            ))}
          </select>
        </label>
        <label>
          월
          <select name="m" defaultValue={m}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => (
              <option key={mm} value={mm}>
                {mm}
              </option>
            ))}
          </select>
        </label>
        <label>
          일
          <select name="d" defaultValue={d}>
            <option value="0">전체</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((dd) => (
              <option key={dd} value={dd}>
                {dd}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">조회</button>
      </form>

      <div className="records-month">
        {hasPrev ? <Link href={`/records?y=${prev.y}&m=${prev.m}`}>‹ {prev.m}월</Link> : <span />}
        <strong>{label}</strong>
        {hasNext ? <Link href={`/records?y=${next.y}&m=${next.m}`}>{next.m}월 ›</Link> : <span />}
      </div>

      {error && <div className="empty-card">정보를 불러오지 못했어요. ({error})</div>}

      {!error && (
        <>
          <p className="records-count">
            화재 {incidents.length}건 · 재난문자 {fires.length}건
          </p>
          {incidents.length === 0 && (
            <div className="empty-card">
              <strong>이 기간에는 화재 문자가 없어요</strong>
              다른 달이나 날짜를 골라보세요.
            </div>
          )}
          {incidents.map((inc) => {
            const current = isCurrent(inc);
            const done = inc.status === "완진";
            const first = formatKst(inc.occurredDate); // "8월 6일 18:53"
            const ymd = ymdOf(inc.occurredDate);
            const dateText = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)} ${inc.occurredTime ?? first.split(" ")[2]}`;
            // 진행 중: 마지막 안내 24시간 이내 / 진화 완료: 문자에 완진 / 그 외: 지난 화재 (종료를 단정하지 않음)
            const pill = current ? ["진행 중", "now"] : done ? ["진화 완료", "done"] : ["지난 화재", ""];
            const text = inc.latest.text;
            return (
              <Link
                key={inc.id}
                href={`/fire/${inc.id}?from=${ymd}`}
                className="rec-card"
                aria-label={`${incidentTitle(inc)}, ${dateText}, ${pill[0]}. 상세 안내 보기`}
              >
                <span className="rec-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#d24b3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z" />
                  </svg>
                </span>
                <span className="rec-main">
                  <span className="rec-top">
                    <span>
                      <span className="rec-title" style={{ display: "block" }}>{incidentTitle(inc)}</span>
                      <span className="rec-date" style={{ display: "block" }}>{dateText}</span>
                    </span>
                    <span className={`rec-pill ${pill[1]}`}>{pill[0]}</span>
                  </span>
                  <span className="rec-msg" style={{ display: "block" }}>
                    {text.length > 110 ? `${text.slice(0, 110)}…` : text}
                  </span>
                  {inc.messageCount > 1 && (
                    <span className="rec-meta" style={{ display: "block" }}>
                      같은 화재로 발송된 문자 {inc.messageCount}건 중 가장 최근 안내
                    </span>
                  )}
                  <span className="rec-btn">상세 안내 보기</span>
                </span>
              </Link>
            );
          })}
        </>
      )}

      <div className="caution">재난안전데이터공유플랫폼에서 제공하는 2023년 9월 이후 재난문자부터 조회할 수 있어요.</div>
    </main>
  );
}