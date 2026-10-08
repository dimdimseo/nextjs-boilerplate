"use client";
// 위치·바람 탭: 내 위치와 재난의 관계

import { useMyPosition } from "./LocationContext";
import { relationOf } from "../lib/guidance";

export default function RelationTable({ location, wind, stale }) {
  const { position } = useMyPosition();
  const r = relationOf(location, position, wind);
  const windOk = wind && !wind.error;

  const rows = [
    ["화재까지 직선거리", r.km !== null ? `${r.km.toFixed(1)} km` : "내 위치를 정하면 나와요"],
    ["화재가 있는 방향", r.dir ? `${r.dir}쪽` : "–"],
    ["거리 기준", position ? (position.source === "place" ? `${position.label} 중심` : "GPS 위치") : "–"],
    ["화재 위치 기준", location ? (location.precision === "area" ? `${location.label} 중심 (번지 미확인)` : `${location.label} (문자 주소)`) : "위치 미확인"],
    ["관측 풍향·풍속", windOk ? (wind.isCalm ? `바람 거의 없음 · ${wind.speed} m/s` : `${wind.windFromName}풍 · ${wind.speed} m/s`) : "정보 없음"],
    ["바람이 향하는 방향", windOk && !wind.isCalm ? `${wind.smokeToName}쪽 (풍향 기준)` : "–"],
  ];

  return (
    <div>
      <h2 style={s.h2}>내 위치와 재난의 관계</h2>
      <dl style={s.dl}>
        {rows.map(([k, v]) => (
          <div key={k} style={s.row}>
            <dt style={s.dt}>{k}</dt>
            <dd style={s.dd}>{v}</dd>
          </div>
        ))}
      </dl>
      <p style={s.note}>
        풍향은 화재 지점 부근 기상청 격자의 현재 관측값이에요
        {windOk ? ` (${wind.observedAt} 관측)` : ""}.
        {stale ? " 과거 화재 당시의 연기 확산이나 내 위치의 위험도를 재현하지 않아요." : " 바람은 바뀔 수 있어요."}
      </p>
    </div>
  );
}

const s = {
  h2: { margin: "0 0 4px", fontSize: "20px", fontWeight: 800 },
  dl: { margin: 0 },
  row: { display: "flex", justifyContent: "space-between", gap: "12px", padding: "16px 2px", borderBottom: "1px solid #E5E8EC" },
  dt: { color: "#4B5563", fontSize: "15px" },
  dd: { margin: 0, fontSize: "15px", fontWeight: 700, textAlign: "right" },
  note: { margin: "12px 0 0", fontSize: "13px", color: "#6B7280", lineHeight: 1.6 },
};
