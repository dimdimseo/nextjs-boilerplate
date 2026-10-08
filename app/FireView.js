// 화재 1건 화면 (시안 레이아웃): 지도 → 시트(제목, 거리·바람, 참고, 내 위치, 공식 안내…)

import Link from "next/link";
import { LocationProvider } from "./LocationContext";
import FireMap from "./FireMap";
import DistanceCard from "./DistanceCard";
import MyLocation from "./MyLocation";
import Footer from "./Footer";
import { ACTION_LABELS, incidentTitle } from "./ui";
import { formatKst, formatKstTime, timeAgo } from "../lib/incidents";
import { findFactories } from "../lib/factories";

export default function FireView({ incident, stale, otherCurrent = [] }) {
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
            마지막 공식 안내({formatKst(latest.sentDate)}) 후 24시간이 지난 화재예요. 지금 상황과 다를 수 있어요.
          </p>
        )}

        <FireMap location={incident.location} wind={incident.wind} />

        <section style={s.sheet}>
          <div style={s.header}>
            <span style={incident.status === "완진" ? s.badgeDone : s.badgeActive}>
              {incident.status === "완진" ? "진화 완료" : "진화 여부 미확인"}
            </span>
            <h1 style={s.title}>{title}</h1>
            <p style={s.subtitle}>{subtitle}</p>
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
              마지막 공식 안내 ({formatKst(latest.sentDate)}, {timeAgo(latest.sentDate)})
            </p>
            <p style={s.noticeText}>{latest.text}</p>
            {actions.length > 0 && (
              <ul style={s.actions}>
                {actions.map((code) => (
                  <li key={code}>{ACTION_LABELS[code]}</li>
                ))}
              </ul>
            )}
          </div>

          {incident.hazards.length > 0 && (
            <p style={s.line}>
              <strong>문자에 적힌 위험 요인</strong> {incident.hazards.join(", ")}
            </p>
          )}

          {factoryInfo && (
            <div style={s.factory}>
              <p style={s.factoryTitle}>참고: 등록 공장 정보</p>
              <p style={s.factoryText}>
                {factoryInfo.products.length > 0
                  ? `같은 번지에 등록된 공장 ${factoryInfo.products.length}곳 (생산품: ${factoryInfo.products.join(", ")}). 화재가 난 곳과 같은 공장인지는 확인되지 않았어요.`
                  : "이 번지로 등록된 공장은 없어요. 등록되지 않은 시설이거나 다른 번지로 등록됐을 수 있어요."}
              </p>
              <p style={s.factorySub}>
                {factoryInfo.area} 전체 등록 공장 {factoryInfo.areaCount}곳, 2026년 6월 22일 기준 양주시 공장등록현황
              </p>
            </div>
          )}

          {incident.earlier.length > 0 && (
            <details style={s.details}>
              <summary style={s.summary}>이전 공식 안내 {incident.earlier.length}건 보기</summary>
              {incident.earlier.map((m) => (
                <div key={m.id} style={s.earlier}>
                  <p style={s.earlierTime}>{formatKst(m.sentDate)}</p>
                  <p style={s.noticeText}>{m.text}</p>
                </div>
              ))}
            </details>
          )}

          {otherCurrent.length > 0 && (
            <div style={s.others}>
              <p style={s.othersTitle}>지금 양주시의 다른 화재 {otherCurrent.length}건</p>
              {otherCurrent.map((o) => (
                <Link key={o.id} href={`/fire/${o.id}`} style={s.otherLink}>
                  {incidentTitle(o)}
                </Link>
              ))}
            </div>
          )}
        </section>

        <Footer />
      </main>
    </LocationProvider>
  );
}

const s = {
  page: { maxWidth: "560px", margin: "0 auto", minHeight: "100vh", background: "#f3f4f6", color: "#111827", fontFamily: "system-ui, sans-serif", lineHeight: 1.55 },
  stale: { margin: 0, padding: "10px 16px", background: "#fff4ce", color: "#6b4e00", fontWeight: 700, fontSize: "14px" },
  sheet: { position: "relative", marginTop: "-18px", background: "#f3f4f6", borderRadius: "20px 20px 0 0", padding: "18px 16px 8px" },
  header: { marginBottom: "4px" },
  badgeActive: { display: "inline-block", padding: "2px 8px", borderRadius: "6px", background: "#fde2e1", color: "#9b1c1c", fontSize: "12px", fontWeight: 700 },
  badgeDone: { display: "inline-block", padding: "2px 8px", borderRadius: "6px", background: "#e5e7eb", color: "#374151", fontSize: "12px", fontWeight: 700 },
  title: { margin: "6px 0 2px", fontSize: "22px", lineHeight: 1.3 },
  subtitle: { margin: 0, color: "#6b7280", fontSize: "13px" },
  notice: { background: "#000000", color: "#ffffff", borderRadius: "14px", padding: "12px 14px", marginBottom: "12px" },
  noticeTitle: { margin: 0, color: "#c8cdd3", fontSize: "13px", fontWeight: 700 },
  noticeText: { margin: "4px 0 8px" },
  actions: { margin: 0, paddingLeft: "20px" },
  line: { margin: "0 0 12px", fontSize: "14px" },
  factory: { background: "#ffffff", borderRadius: "14px", padding: "10px 14px", marginBottom: "12px", boxShadow: "0 1px 3px rgba(0,0,0,.08)" },
  factoryTitle: { margin: 0, fontSize: "14px", fontWeight: 700 },
  factoryText: { margin: "4px 0 0", fontSize: "14px" },
  factorySub: { margin: "4px 0 0", fontSize: "12px", color: "#6b7280" },
  details: { marginBottom: "12px" },
  summary: { cursor: "pointer", color: "#1d4ed8", fontSize: "14px" },
  earlier: { borderLeft: "3px solid #d1d5db", paddingLeft: "10px", marginTop: "8px" },
  earlierTime: { margin: 0, color: "#6b7280", fontSize: "13px" },
  others: { background: "#ffffff", borderRadius: "14px", padding: "10px 14px", marginBottom: "12px" },
  othersTitle: { margin: "0 0 4px", fontWeight: 700, fontSize: "14px" },
  otherLink: { display: "block", color: "#1d4ed8", fontSize: "14px", padding: "4px 0" },
};
