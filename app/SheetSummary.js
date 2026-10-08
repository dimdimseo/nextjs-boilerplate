"use client";
// 시트 맨 위 요약: 상태, 큰 거리 숫자, 기준, "먼저 확인할 사항"

import { useMyPosition } from "./LocationContext";
import { buildGuidance } from "../lib/guidance";

export default function SheetSummary({ placeText, done, stale, location, wind, actions, modifier }) {
  const { position } = useMyPosition();
  const g = buildGuidance({ actions, location, position, wind });
  const r = g.relation;
  const first = g.items[0];
  const alert = g.items.find((i) => i.tone === "alert");

  const basis = position
    ? position.source === "place"
      ? `${position.label} 중심 기준`
      : "GPS 위치 기준"
    : "내 위치를 정하면 거리가 나와요";

  let precision = null;
  if (location && position) {
    precision =
      location.precision === "area"
        ? `번지를 찾지 못해 ${location.label} 중심까지의 거리예요.`
        : modifier
          ? `문자에 '${modifier}'으로 되어 있어 실제 지점과 차이가 있을 수 있어요.`
          : null;
  }

  return (
    <div style={s.wrap}>
      <div style={s.top}>
        <p style={{ ...s.status, color: done ? "#4B5563" : "#C2362B" }}>
          <span style={{ ...s.dot, background: done ? "#9AA3AD" : "#D24B3E" }} aria-hidden="true" />
          {done ? "진화 완료" : "화재 발생"}
        </p>
        <span style={stale ? s.badgePast : s.badgeNow}>{stale ? "지난 화재" : "진행 중"}</span>
      </div>

      <p style={s.big}>
        {r.km === null ? "–" : `${r.km.toFixed(1)} km`}
        {r.dir && <span style={s.dir}> {r.dir}쪽</span>}
      </p>
      <p style={s.basis}>
        {basis} · 화재 · {placeText}
        {r.km !== null ? " · 직선거리" : ""}
      </p>
      {precision && <p style={s.precision}>{precision}</p>}

      {alert && <p style={s.alert}>{alert.title}</p>}

      <div style={s.box}>
        <p style={s.boxTitle}>내 위치 기준 · 먼저 확인할 사항</p>
        <p style={s.boxBody}>{first.body}</p>
        <p style={s.boxNote}>거리·풍향은 위험도 또는 안전 여부를 뜻하지 않아요.</p>
      </div>
    </div>
  );
}

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: "6px" },
  top: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  status: { margin: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "16px", fontWeight: 700 },
  dot: { width: "10px", height: "10px", borderRadius: "999px" },
  badgePast: { padding: "3px 9px", borderRadius: "8px", background: "#EEF0F3", color: "#4B5563", fontSize: "12px", fontWeight: 700 },
  badgeNow: { padding: "3px 9px", borderRadius: "8px", background: "#FDE8E8", color: "#9B1C1C", fontSize: "12px", fontWeight: 700 },
  big: { margin: "4px 0 0", fontSize: "40px", fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.1 },
  dir: { fontSize: "16px", fontWeight: 600, color: "#4B5563", letterSpacing: 0 },
  basis: { margin: 0, fontSize: "13px", color: "#4B5563" },
  precision: { margin: 0, fontSize: "12px", color: "#6B7280" },
  alert: { margin: "6px 0 0", padding: "10px 12px", borderRadius: "12px", background: "#FDECEC", color: "#8A1C1C", fontSize: "14px", fontWeight: 700 },
  box: { marginTop: "8px", padding: "14px 16px", borderRadius: "16px", background: "#F2F6FE", border: "1px solid #DCE6FB" },
  boxTitle: { margin: 0, fontSize: "13px", fontWeight: 700, color: "#2F5BC9" },
  boxBody: { margin: "6px 0 0", fontSize: "16px", fontWeight: 600, lineHeight: 1.55, color: "#1F2937" },
  boxNote: { margin: "8px 0 0", fontSize: "12px", color: "#6B7280" },
};
