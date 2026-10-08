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
import Footer from "./Footer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STEPS = [
  "양주시 화재 재난문자를 읽어 장소, 시각, 행동요령을 정리해요",
  "내 위치에서 화재까지의 거리와 방향을 보여줘요",
  "화재 지점 바람이 내 쪽으로 부는지 알려줘요",
];

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
    <main style={s.page}>
      <div style={s.brandRow}>
        <div style={s.logo} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="8" />
            <path d="M10 14l5-5" />
            <path d="M15 9h-3M15 9v3" />
            <circle cx="17.5" cy="6.5" r="2" fill="#D9480F" stroke="none" />
          </svg>
        </div>
        <h1 style={s.title}>양주 재난나침반</h1>
      </div>

      {error && <p style={s.error}>정보를 불러오지 못했어요. ({error})</p>}

      {!error && current.length === 0 && (
        <div style={s.empty}>
          <div style={s.check} aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0B6E4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5 9-10" />
            </svg>
          </div>
          <p style={s.emptyTitle}>현재 양주시에 진행 중인 화재 문자가 없어요</p>
          <p style={s.emptyText}>
            최근 24시간 안에 발송된 양주시 화재 재난문자가 없을 때 이렇게 보여요. 화재 문자가 오면 이
            화면에서 바로 그 화재로 이동해요.
          </p>
        </div>
      )}

      {!error && current.length > 1 && (
        <div style={s.card}>
          <p style={s.cardTitle}>지금 양주시 화재 {current.length}건</p>
          {current.map((inc) => (
            <Link key={inc.id} href={`/fire/${inc.id}?from=${ymdOf(inc.occurredDate)}`} style={s.link}>
              {incidentTitle(inc)}
              <span style={s.time}> 마지막 안내 {formatKstTime(inc.latest.sentDate)}</span>
            </Link>
          ))}
        </div>
      )}

      <div style={s.card}>
        <p style={s.cardTitle}>이렇게 알려드려요</p>
        {STEPS.map((text, i) => (
          <div key={text} style={s.step}>
            <span style={s.stepNum}>{i + 1}</span>
            <p style={s.stepText}>{text}</p>
          </div>
        ))}
      </div>

      <div style={s.install}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M12 8v6M9 11h6" />
        </svg>
        <p style={s.installText}>홈 화면에 추가해두면 화재 문자를 받았을 때 앱처럼 바로 열 수 있어요.</p>
      </div>

      <Footer />
    </main>
  );
}

const shadow = "0 1px 3px rgba(17,20,24,0.08)";
const s = {
  page: { maxWidth: "560px", margin: "0 auto", minHeight: "100vh", boxSizing: "border-box", padding: "24px 16px 0", background: "#F4F5F7", color: "#111418", display: "flex", flexDirection: "column", gap: "14px", lineHeight: 1.55 },
  brandRow: { display: "flex", alignItems: "center", gap: "10px" },
  logo: { width: "40px", height: "40px", borderRadius: "12px", background: "#111418", display: "flex", alignItems: "center", justifyContent: "center" },
  title: { margin: 0, fontSize: "19px", fontWeight: 700 },
  empty: { background: "#FFFFFF", borderRadius: "20px", padding: "28px 20px", boxShadow: shadow, display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center" },
  check: { width: "64px", height: "64px", borderRadius: "999px", background: "#E6F4EC", display: "flex", alignItems: "center", justifyContent: "center" },
  emptyTitle: { margin: "6px 0 0", fontSize: "18px", fontWeight: 700, lineHeight: 1.4 },
  emptyText: { margin: 0, fontSize: "14px", color: "#374151" },
  card: { background: "#FFFFFF", borderRadius: "16px", padding: "14px 16px", boxShadow: shadow, display: "flex", flexDirection: "column", gap: "8px" },
  cardTitle: { margin: 0, fontSize: "14px", fontWeight: 700 },
  step: { display: "flex", gap: "10px", alignItems: "flex-start" },
  stepNum: { width: "22px", height: "22px", flexShrink: 0, borderRadius: "999px", background: "#111418", color: "#FFFFFF", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" },
  stepText: { margin: 0, fontSize: "14px" },
  install: { background: "#111418", color: "#FFFFFF", borderRadius: "16px", padding: "14px 16px", display: "flex", gap: "12px", alignItems: "center" },
  installText: { margin: 0, fontSize: "14px" },
  link: { display: "block", padding: "8px 0", color: "#1D4ED8", fontWeight: 600, borderTop: "1px solid #F4F5F7" },
  time: { color: "#4B5563", fontWeight: 400, fontSize: "13px" },
  error: { margin: 0, color: "#B42318", fontWeight: 600 },
};