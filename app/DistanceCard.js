"use client";
// 화재까지 거리 카드 + 화재 지점 바람 카드 + "내 쪽으로 오는지" 안내 (휴대폰에서 계산)

import { useMyPosition } from "./LocationContext";
import { distanceKm, bearingDeg, directionName } from "../lib/geo";

// 연기 방향과 "화재 → 내 위치" 방향의 차이가 이 각도 안이면 "내 쪽으로 온다(추정)"
// 공식 기준이 아닌 설계값 (16방위 한 칸). 팀 결정에 따라 바꾸세요.
const TOWARD_ME_DEG = 22.5;

function angleDiff(a, b) {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

export default function DistanceCard({ location, locationError, wind, modifier }) {
  const { position } = useMyPosition();
  const windOk = wind && !wind.error;

  // 왼쪽 카드: 거리
  let distBig = "–";
  let distSub = "아래에서 내 위치를 정하면 거리가 나와요.";
  let km = null;
  if (!location) {
    distSub = `화재 위치를 찾지 못했어요.${locationError ? ` (${locationError})` : ""}`;
  } else if (position) {
    km = distanceKm(position, location);
    distBig = km.toFixed(1);
    const from = position.source === "place" ? `${position.label} 중심에서` : "내 위치에서";
    distSub = `${from} ${directionName(bearingDeg(position, location))}쪽`;
  }

  // 오른쪽 카드: 화재 지점 바람
  let windBig = "–";
  let windSub = "바람 정보를 불러오지 못했어요.";
  if (windOk) {
    if (wind.isCalm) {
      windBig = `고요 ${wind.speed} m/s`;
      windSub = `바람이 거의 없어요 (기상청 ${wind.observedAt} 관측)`;
    } else {
      windBig = `${wind.windFromName}풍 ${wind.speed} m/s`;
      windSub = `화재 지점 기준 ${wind.smokeToName}쪽으로 흐름 (기상청 ${wind.observedAt} 관측)`;
    }
  }

  // 거리 정확도 안내
  let precisionNote = null;
  if (location) {
    precisionNote =
      location.precision === "area"
        ? `정확한 화재 지점이 아니라 ${location.label} 중심까지의 거리예요.`
        : modifier
          ? `문자에 "${modifier}"으로 되어 있어 실제 지점과 차이가 있을 수 있어요.`
          : `문자에 적힌 주소(${location.label}) 기준이에요.`;
  }

  // 바람이 내 쪽인지
  let relation = null;
  if (location && position && windOk && !wind.isCalm) {
    const fireToMe = bearingDeg(location, position);
    relation =
      angleDiff(fireToMe, wind.smokeTo) <= TOWARD_ME_DEG ? (
        <p style={styles.alert}>
          <strong>주의</strong> 현재 바람이 내 위치 쪽으로 불고 있어요 (추정). 아래 공식 안내를 따르고,
          대피할 때는 바람이 불어오는 쪽이나 연기와 직각 방향으로 이동하세요 (화학물질사고 국민행동요령 기준).
        </p>
      ) : (
        <p style={styles.note}>
          <strong style={styles.noteLabel}>참고</strong> 현재 관측 풍향은 내 위치 쪽이 아니에요. 바람은
          바뀔 수 있으니 공식 안내는 그대로 따르세요.
        </p>
      );
  }

  return (
    <>
      <div style={styles.cards}>
        <div style={styles.card}>
          <p style={styles.label}>화재까지 거리</p>
          <p style={styles.big}>
            {distBig}
            {km !== null && <span style={styles.unit}> km</span>}
          </p>
          <p style={styles.sub}>{distSub}</p>
        </div>
        <div style={styles.card}>
          <p style={styles.label}>화재 지점 바람</p>
          <p style={styles.big2}>{windBig}</p>
          <p style={styles.sub}>{windSub}</p>
        </div>
      </div>
      {position && precisionNote && <p style={styles.precision}>{precisionNote}</p>}
      {relation}
    </>
  );
}

const styles = {
  cards: { display: "flex", gap: "10px", margin: "14px 0 8px" },
  card: { flex: 1, background: "#ffffff", borderRadius: "14px", padding: "12px 14px", boxShadow: "0 1px 3px rgba(0,0,0,.08)" },
  label: { margin: 0, fontSize: "13px", color: "#6b7280" },
  big: { margin: "4px 0 2px", fontSize: "30px", fontWeight: 800, lineHeight: 1.1 },
  big2: { margin: "4px 0 2px", fontSize: "20px", fontWeight: 800, lineHeight: 1.25 },
  unit: { fontSize: "16px", fontWeight: 700 },
  sub: { margin: 0, fontSize: "13px", color: "#4b5563" },
  precision: { margin: "0 0 8px", fontSize: "12px", color: "#6b7280" },
  note: { margin: "0 0 10px", padding: "10px 12px", borderRadius: "12px", background: "#e7f6ee", fontSize: "14px" },
  noteLabel: { color: "#0a7a50", marginRight: "6px" },
  alert: { margin: "0 0 10px", padding: "10px 12px", borderRadius: "12px", background: "#fde2e1", color: "#7a1414", fontSize: "14px" },
};