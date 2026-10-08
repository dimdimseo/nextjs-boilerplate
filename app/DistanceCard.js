"use client";
// 화재까지 거리 카드 + 화재 지점 바람 카드 + "내 쪽으로 오는지" 안내 (휴대폰에서 계산)

import { useMyPosition } from "./LocationContext";
import { distanceKm, bearingDeg, directionName, isSmokeTowardMe } from "../lib/geo";

export default function DistanceCard({ location, locationError, wind, modifier }) {
  const { position } = useMyPosition();
  const windOk = wind && !wind.error;

  // 왼쪽 카드: 거리
  let km = null;
  let distSub = "내 위치를 정하면 거리가 나와요";
  if (!location) {
    distSub = `화재 위치를 찾지 못했어요${locationError ? ` (${locationError})` : ""}`;
  } else if (position) {
    km = distanceKm(position, location);
    const from = position.source === "place" ? `${position.label} 중심에서` : "내 위치에서";
    distSub = `${from} ${directionName(bearingDeg(position, location))}쪽`;
  }

  // 오른쪽 카드: 화재 지점 바람
  let windBig = "정보 없음";
  let windSub = "바람 정보를 불러오지 못했어요";
  if (windOk) {
    windBig = wind.isCalm ? "바람 거의 없음" : `${wind.windFromName}풍 ${wind.speed} m/s`;
    windSub = wind.isCalm
      ? `${wind.speed} m/s, ${wind.observedAt} 관측`
      : `연기는 ${wind.smokeToName}쪽으로, ${wind.observedAt} 관측`;
  }

  // 거리 정확도 안내
  let precisionNote = null;
  if (location && position) {
    precisionNote =
      location.precision === "area"
        ? `정확한 화재 지점이 아니라 ${location.label} 중심까지의 거리예요.`
        : modifier
          ? `문자에 '${modifier}'으로 되어 있어 실제 지점과 차이가 있을 수 있어요.`
          : `문자에 적힌 주소(${location.label}) 기준이에요.`;
  }

  // 바람이 내 쪽인지
  let relation = null;
  if (location && position && windOk && !wind.isCalm) {
    relation = isSmokeTowardMe(location, position, wind) ? (
      <p style={s.alert}>
        <strong style={s.alertLabel}>주의</strong>
        현재 바람이 내 위치 쪽으로 불고 있어요 (추정). 아래 공식 안내를 따르고, 대피할 때는 바람이
        불어오는 쪽이나 연기와 직각 방향으로 이동하세요.
      </p>
    ) : (
      <p style={s.note}>
        <strong style={s.noteLabel}>참고</strong>
        현재 관측 풍향은 내 위치 쪽이 아니에요. 바람은 바뀔 수 있으니 공식 안내는 그대로 따르세요.
      </p>
    );
  }

  return (
    <>
      <div style={s.cards}>
        <div style={s.card}>
          <p style={s.label}>화재까지 거리</p>
          <p style={s.big}>
            {km === null ? "–" : km.toFixed(1)}
            {km !== null && <span style={s.unit}> km</span>}
          </p>
          <p style={s.sub}>{distSub}</p>
        </div>
        <div style={s.card}>
          <p style={s.label}>화재 지점 바람</p>
          <p style={s.big2}>{windBig}</p>
          <p style={s.sub}>{windSub}</p>
        </div>
      </div>
      {precisionNote && <p style={s.precision}>{precisionNote}</p>}
      {relation}
    </>
  );
}

const s = {
  cards: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" },
  card: { background: "#FFFFFF", borderRadius: "16px", padding: "12px 14px", boxShadow: "0 1px 3px rgba(17,20,24,0.08)" },
  label: { margin: 0, fontSize: "12px", color: "#4B5563" },
  big: { margin: "4px 0 2px", fontSize: "30px", fontWeight: 700, lineHeight: 1.1 },
  big2: { margin: "6px 0 4px", fontSize: "19px", fontWeight: 700, lineHeight: 1.25 },
  unit: { fontSize: "15px", fontWeight: 600 },
  sub: { margin: 0, fontSize: "12.5px", color: "#374151" },
  precision: { margin: "-4px 2px 0", fontSize: "12px", color: "#4B5563" },
  note: { margin: 0, padding: "12px 14px", borderRadius: "14px", background: "#E6F4EC", color: "#0F3D2A", fontSize: "14px", lineHeight: 1.5 },
  noteLabel: { color: "#0B6E4F", marginRight: "6px" },
  alert: { margin: 0, padding: "12px 14px", borderRadius: "14px", background: "#FDECEC", color: "#6F1414", fontSize: "14px", lineHeight: 1.5 },
  alertLabel: { color: "#B42318", marginRight: "6px" },
};