// 화재 1건 화면 (UI 시안): 지도 → 시트(제목, 거리·바람, 참고, 내 위치, 공식 안내 …)

import { LocationProvider } from "./LocationContext";
import FireMap from "./FireMap";
import DistanceCard from "./DistanceCard";
import MyLocation from "./MyLocation";
import { ShareButton, GpsButton } from "./MapButtons";
import Footer from "./Footer";
import { ACTION_LABELS, incidentTitle } from "./ui";
import { formatKst, formatKstTime, timeAgo } from "../lib/incidents";
import { findFactories } from "../lib/factories";

// 행동요령 칩에 쓰는 짧은 이름
const ACTION_CHIPS = {
  차량우회: "차량 우회",
  건물밖대피: "건물 밖으로 대피",
  창문닫기: "창문 닫기",
  외출자제: "외출 자제",
  먼곳대피: "사고 지점에서 먼 곳으로",
};

export default function FireView({ incident, stale }) {
  const title = incidentTitle(incident);
  const latest = incident.latest;
  const first = incident.earlier.length ? incident.earlier[incident.earlier.length - 1] : latest;
  const actions = latest.analysis?.actions ?? [];
  const factoryInfo = incident.target === "차량" ? null : findFactories(incident.address);

  const dateText = formatKst(first.sentDate).split(" ").slice(0, 2).join(" ");
  const occurred = incident.occurredTime ? `${incident.occurredTime} 발생, ` : "";
  const subtitle = `${dateText} ${occurred}첫 문자 ${formatKstTime(first.sentDate)} 발송`;

  return (
    <LocationProvider>
      <main style={s.page}>
        {stale && (
          <p style={s.stale}>
            마지막 공식 안내({formatKst(latest.sentDate)}) 후 24시간이 지난 화재예요. 지금 상황과 다를 수
            있어요.
          </p>
        )}

        {/* 지도 + 지도 위 버튼 (카카오 로고가 있는 왼쪽 아래는 비워둠) */}
        <div style={s.mapWrap}>
          <FireMap location={incident.location} wind={incident.wind} />
          <div style={s.mapTop}>
            <p style={s.brand}>양주시 재난 거리 안내</p>
            <ShareButton title={title} />
          </div>
          <div style={s.mapGps}>
            <GpsButton />
          </div>
        </div>

        <section style={s.sheet}>
          <div style={s.handle} />

          <div style={s.header}>
            <div style={s.icon} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D9480F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z" />
              </svg>
            </div>
            <div style={s.headText}>
              <span style={incident.status === "완진" ? s.badgeDone : s.badgeActive}>
                {incident.status === "완진" ? "진화 완료" : "진화 여부 미확인"}
              </span>
              <h1 style={s.title}>{title}</h1>
              <p style={s.subtitle}>{subtitle}</p>
            </div>
          </div>

          <DistanceCard
            location={incident.location}
            locationError={incident.locationError}
            wind={incident.wind}
            modifier={incident.modifier}
          />

          <MyLocation />

          <div style={s.notice}>
            <p style={s.noticeTitle}>
              마지막 공식 안내, {formatKst(latest.sentDate)} ({timeAgo(latest.sentDate)})
            </p>
            <p style={s.noticeText}>{latest.text}</p>
            {actions.length > 0 && (
              <>
                <p style={s.noticeTitle2}>안내된 행동</p>
                <div style={s.chips}>
                  {actions.map((code) => (
                    <span key={code} style={s.chipDark} title={ACTION_LABELS[code]}>
                      {ACTION_CHIPS[code]}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {incident.hazards.length > 0 && (
            <div style={s.card}>
              <p style={s.cardTitle}>문자에 적힌 위험 요인</p>
              <div style={s.chips}>
                {incident.hazards.map((h) => (
                  <span key={h} style={s.chipWarm}>
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {factoryInfo && (
            <div style={s.card}>
              <p style={s.cardTitle}>참고: 등록 공장 정보</p>
              <p style={s.cardText}>
                {factoryInfo.products.length > 0
                  ? `같은 번지에 등록된 공장 ${factoryInfo.products.length}곳 (생산품: ${factoryInfo.products.join(", ")}). 화재가 난 곳과 같은 공장인지는 확인되지 않았어요.`
                  : "이 번지로 등록된 공장은 없어요. 등록되지 않은 시설이거나 다른 번지로 등록됐을 수 있어요."}
              </p>
              <p style={s.cardSub}>
                {factoryInfo.area} 전체 등록 공장 {factoryInfo.areaCount}곳, 2026년 6월 22일 기준 양주시 공장등록현황
              </p>
            </div>
          )}

          {incident.earlier.length > 0 && (
            <details style={s.card}>
              <summary style={s.summary}>이전 공식 안내 {incident.earlier.length}건</summary>
              <div style={s.timeline}>
                {incident.earlier.map((m, i) => (
                  <div key={m.id} style={s.tlItem}>
                    <div style={s.tlRail}>
                      <span style={s.tlDot} />
                      {i < incident.earlier.length - 1 && <span style={s.tlLine} />}
                    </div>
                    <div>
                      <p style={s.tlTime}>{formatKst(m.sentDate)}</p>
                      <p style={s.tlText}>{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          <Footer />
        </section>
      </main>
    </LocationProvider>
  );
}

const shadow = "0 1px 3px rgba(17,20,24,0.08)";
const s = {
  page: { maxWidth: "560px", margin: "0 auto", minHeight: "100vh", background: "#F4F5F7", color: "#111418", lineHeight: 1.55 },
  stale: { margin: 0, padding: "12px 16px", background: "#FFF4CE", color: "#5C4300", fontWeight: 700, fontSize: "13px", lineHeight: 1.45 },
  mapWrap: { position: "relative" },
  mapTop: { position: "absolute", left: "12px", right: "12px", top: "14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 10, pointerEvents: "none" },
  brand: { margin: 0, padding: "8px 12px", background: "#FFFFFF", borderRadius: "999px", fontSize: "13px", fontWeight: 600, boxShadow: "0 1px 4px rgba(17,20,24,0.14)" },
  mapGps: { position: "absolute", right: "14px", bottom: "20px", zIndex: 10 },
  sheet: { background: "#F4F5F7", borderRadius: "24px 24px 0 0", padding: "10px 16px 0", display: "flex", flexDirection: "column", gap: "12px", position: "relative", boxShadow: "0 -2px 10px rgba(17,20,24,0.08)" },
  handle: { width: "36px", height: "4px", borderRadius: "4px", background: "#C9CDD3", alignSelf: "center" },
  header: { display: "flex", gap: "12px", alignItems: "flex-start" },
  icon: { width: "44px", height: "44px", flexShrink: 0, borderRadius: "12px", background: "#FDEBE3", display: "flex", alignItems: "center", justifyContent: "center" },
  headText: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px", minWidth: 0 },
  badgeActive: { padding: "2px 8px", borderRadius: "6px", background: "#FDE8E8", color: "#9B1C1C", fontSize: "12px", fontWeight: 700 },
  badgeDone: { padding: "2px 8px", borderRadius: "6px", background: "#E5E7EB", color: "#374151", fontSize: "12px", fontWeight: 700 },
  title: { margin: "2px 0 0", fontSize: "19px", lineHeight: 1.3, fontWeight: 700 },
  subtitle: { margin: 0, fontSize: "13px", color: "#4B5563" },
  notice: { background: "#111418", color: "#FFFFFF", borderRadius: "16px", padding: "12px 14px" },
  noticeTitle: { margin: 0, fontSize: "12.5px", color: "#C8CDD3", fontWeight: 600 },
  noticeTitle2: { margin: "12px 0 6px", fontSize: "12.5px", color: "#C8CDD3", fontWeight: 600 },
  noticeText: { margin: "4px 0 0", fontSize: "14.5px", lineHeight: 1.55 },
  chips: { display: "flex", flexWrap: "wrap", gap: "6px" },
  chipDark: { padding: "6px 10px", borderRadius: "999px", background: "#2A2F36", fontSize: "13.5px", fontWeight: 600 },
  chipWarm: { padding: "5px 10px", borderRadius: "999px", background: "#FDEBE3", color: "#8A2C07", fontSize: "13px", fontWeight: 600 },
  card: { background: "#FFFFFF", borderRadius: "16px", padding: "12px 14px", boxShadow: shadow },
  cardTitle: { margin: "0 0 8px", fontSize: "13px", fontWeight: 700 },
  cardText: { margin: 0, fontSize: "14px", lineHeight: 1.5 },
  cardSub: { margin: "6px 0 0", fontSize: "12px", color: "#4B5563" },
  summary: { cursor: "pointer", fontSize: "14px", fontWeight: 700, minHeight: "32px", display: "flex", alignItems: "center" },
  timeline: { display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" },
  tlItem: { display: "flex", gap: "10px" },
  tlRail: { width: "8px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" },
  tlDot: { width: "8px", height: "8px", borderRadius: "999px", background: "#9AA3AD", marginTop: "6px" },
  tlLine: { flex: 1, width: "2px", background: "#E2E5E9", marginTop: "4px" },
  tlTime: { margin: 0, fontSize: "12px", color: "#4B5563", fontWeight: 600 },
  tlText: { margin: "2px 0 0", fontSize: "13.5px", lineHeight: 1.5 },
  recentRow: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderTop: "1px solid #EEF0F2", color: "#111418", textDecoration: "none", minHeight: "44px" },
  tagNow: { flexShrink: 0, padding: "2px 8px", borderRadius: "6px", background: "#FDE8E8", color: "#9B1C1C", fontSize: "12px", fontWeight: 700 },
  tagPast: { flexShrink: 0, padding: "2px 8px", borderRadius: "6px", background: "#E5E7EB", color: "#374151", fontSize: "12px", fontWeight: 700 },
  recentText: { display: "flex", flexDirection: "column", minWidth: 0, flex: 1 },
  recentTitle: { fontSize: "14px", fontWeight: 600, lineHeight: 1.4 },
  recentTime: { fontSize: "12px", color: "#4B5563" },
};