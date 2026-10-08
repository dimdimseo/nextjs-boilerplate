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
    <main style={s.page}>
      <h1 style={s.title}>재난 기록</h1>
      <p style={s.sub}>양주시로 발송된 화재 재난문자를 날짜별로 찾아볼 수 있어요.</p>

      <form method="get" action="/records" style={s.form}>
        <label style={s.field}>
          <span style={s.fieldLabel}>년</span>
          <select name="y" defaultValue={y} style={s.select}>
            {years.map((yy) => (
              <option key={yy} value={yy}>
                {yy}
              </option>
            ))}
          </select>
        </label>
        <label style={s.field}>
          <span style={s.fieldLabel}>월</span>
          <select name="m" defaultValue={m} style={s.select}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => (
              <option key={mm} value={mm}>
                {mm}
              </option>
            ))}
          </select>
        </label>
        <label style={s.field}>
          <span style={s.fieldLabel}>일</span>
          <select name="d" defaultValue={d} style={s.select}>
            <option value="0">전체</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((dd) => (
              <option key={dd} value={dd}>
                {dd}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" style={s.button}>
          조회
        </button>
      </form>

      <div style={s.monthNav}>
        {hasPrev ? (
          <Link href={`/records?y=${prev.y}&m=${prev.m}`} style={s.navLink}>
            ‹ {prev.m}월
          </Link>
        ) : (
          <span />
        )}
        <p style={s.navLabel}>{label}</p>
        {hasNext ? (
          <Link href={`/records?y=${next.y}&m=${next.m}`} style={s.navLink}>
            {next.m}월 ›
          </Link>
        ) : (
          <span />
        )}
      </div>

      {error && <p style={s.error}>정보를 불러오지 못했어요. ({error})</p>}

      {!error && (
        <section style={s.card}>
          <p style={s.count}>
            화재 {incidents.length}건 <span style={s.countSub}>(재난문자 {fires.length}건)</span>
          </p>

          {incidents.length === 0 && (
            <p style={s.empty}>이 기간에 양주시로 발송된 화재 재난문자가 없어요.</p>
          )}

          {incidents.map((inc) => {
            const current = isCurrent(inc);
            const firstTime = formatKst(inc.occurredDate);
            return (
              <Link key={inc.id} href={`/fire/${inc.id}?from=${ymdOf(inc.occurredDate)}`} style={s.row}>
                <span style={current ? s.tagNow : s.tagPast}>{current ? "진행 중" : "지난 화재"}</span>
                <span style={s.rowText}>
                  <span style={s.rowTitle}>{incidentTitle(inc)}</span>
                  <span style={s.rowTime}>
                    {firstTime.split(" ").slice(0, 2).join(" ")}
                    {inc.occurredTime ? ` ${inc.occurredTime} 발생` : ` 첫 문자 ${firstTime.split(" ")[2]}`}
                    , 문자 {inc.messageCount}건
                    {inc.status === "완진" ? ", 진화 완료" : ""}
                  </span>
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            );
          })}
        </section>
      )}

      <p style={s.note}>재난안전데이터공유플랫폼에서 제공하는 2023년 9월 이후 재난문자부터 조회할 수 있어요.</p>
    </main>
  );
}

const shadow = "0 1px 3px rgba(17,20,24,0.08)";
const s = {
  page: { maxWidth: "560px", margin: "0 auto", boxSizing: "border-box", padding: "24px 16px 8px", display: "flex", flexDirection: "column", gap: "12px", lineHeight: 1.55 },
  title: { margin: 0, fontSize: "21px", fontWeight: 700 },
  sub: { margin: 0, fontSize: "14px", color: "#4B5563" },
  form: { background: "#FFFFFF", borderRadius: "16px", padding: "12px", boxShadow: shadow, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr)) auto", gap: "8px", alignItems: "end" },
  field: { display: "flex", flexDirection: "column", gap: "4px" },
  fieldLabel: { fontSize: "12px", color: "#4B5563", fontWeight: 600 },
  select: { height: "44px", border: "1px solid #E2E5E9", borderRadius: "10px", background: "#F4F5F7", padding: "0 8px", fontFamily: "inherit", fontSize: "15px", color: "#111418", minWidth: 0 },
  button: { height: "44px", padding: "0 14px", border: "none", borderRadius: "10px", background: "#111418", color: "#FFFFFF", fontFamily: "inherit", fontSize: "15px", fontWeight: 700, cursor: "pointer" },
  monthNav: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  navLink: { color: "#1D4ED8", fontSize: "14px", fontWeight: 600, padding: "10px 4px", textDecoration: "none" },
  navLabel: { margin: 0, fontSize: "15px", fontWeight: 700 },
  card: { background: "#FFFFFF", borderRadius: "16px", padding: "12px 14px", boxShadow: shadow },
  count: { margin: "0 0 4px", fontSize: "14px", fontWeight: 700 },
  countSub: { fontWeight: 400, color: "#4B5563" },
  empty: { margin: "8px 0 4px", fontSize: "14px", color: "#374151" },
  row: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderTop: "1px solid #EEF0F2", color: "#111418", textDecoration: "none", minHeight: "44px" },
  tagNow: { flexShrink: 0, padding: "2px 8px", borderRadius: "6px", background: "#FDE8E8", color: "#9B1C1C", fontSize: "12px", fontWeight: 700 },
  tagPast: { flexShrink: 0, padding: "2px 8px", borderRadius: "6px", background: "#E5E7EB", color: "#374151", fontSize: "12px", fontWeight: 700 },
  rowText: { display: "flex", flexDirection: "column", minWidth: 0, flex: 1 },
  rowTitle: { fontSize: "14px", fontWeight: 600, lineHeight: 1.4 },
  rowTime: { fontSize: "12px", color: "#4B5563" },
  note: { margin: "4px 2px 0", fontSize: "12px", color: "#4B5563" },
  error: { margin: 0, color: "#B42318", fontWeight: 600 },
};