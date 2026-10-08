// 기본 주소(/)로 들어왔을 때
// - 현재 화재(마지막 안내 24시간 이내) 1건 → 그 화재 페이지로 바로 이동
// - 2건 이상 → 화재 제목 목록
// - 없음 → "진행 중인 화재 문자가 없어요"

import Link from "next/link";
import { redirect } from "next/navigation";
import { loadIncidents } from "../lib/loadIncidents";
import { START_DATE } from "../lib/config";
import { isCurrent, formatKstTime } from "../lib/incidents";
import { incidentTitle } from "./ui";
import Footer from "./Footer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function Home() {
  let current = [];
  let error = null;
  try {
    const { incidents } = await loadIncidents(START_DATE);
    current = incidents.filter((inc) => isCurrent(inc));
  } catch (e) {
    error = e.message;
  }

  if (!error && current.length === 1) {
    redirect(`/fire/${current[0].id}`); // 화재가 하나면 바로 그 화면으로
  }

  return (
    <main style={s.page}>
      <h1 style={s.title}>양주시 AI 재난 거리 안내</h1>

      {error && <p style={s.error}>정보를 불러오지 못했어요. ({error})</p>}

      {!error && current.length === 0 && (
        <div style={s.card}>
          <p style={s.big}>현재 양주시에 진행 중인 화재 문자가 없어요</p>
          <p style={s.sub}>최근 24시간 안에 발송된 양주시 화재 재난문자가 없을 때 이렇게 보여요. 화재 문자가 오면 이 화면에서 바로 확인할 수 있어요.</p>
        </div>
      )}

      {!error && current.length > 1 && (
        <div style={s.card}>
          <p style={s.big}>지금 양주시 화재 {current.length}건</p>
          {current.map((inc) => (
            <Link key={inc.id} href={`/fire/${inc.id}`} style={s.link}>
              {incidentTitle(inc)} <span style={s.time}>마지막 안내 {formatKstTime(inc.latest.sentDate)}</span>
            </Link>
          ))}
        </div>
      )}

      <Footer />
    </main>
  );
}

const s = {
  page: { maxWidth: "560px", margin: "0 auto", minHeight: "100vh", background: "#f3f4f6", color: "#111827", fontFamily: "system-ui, sans-serif", lineHeight: 1.55, padding: "24px 0 0" },
  title: { fontSize: "20px", margin: "0 16px 12px" },
  card: { background: "#ffffff", borderRadius: "14px", padding: "16px", margin: "0 16px 12px", boxShadow: "0 1px 3px rgba(0,0,0,.08)" },
  big: { margin: "0 0 6px", fontSize: "18px", fontWeight: 800 },
  sub: { margin: 0, fontSize: "14px", color: "#4b5563" },
  link: { display: "block", padding: "8px 0", color: "#1d4ed8", fontWeight: 600, borderTop: "1px solid #f3f4f6" },
  time: { color: "#6b7280", fontWeight: 400, fontSize: "13px" },
  error: { margin: "0 16px", color: "#b42318", fontWeight: 600 },
};