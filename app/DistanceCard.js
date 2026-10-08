"use client";
// 화재까지 거리·방향과 바람 관계를 보여주는 카드 (휴대폰에서 계산)

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

  if (!location) {
    return (
      <p style={styles.muted}>
        화재 위치를 찾지 못해 거리를 계산할 수 없어요. 문자 원문의 장소를 확인하세요.
        {locationError ? ` (${locationError})` : ""}
      </p>
    );
  }

  // 정확도 안내
  const precisionNote =
    location.precision === "area"
      ? `정확한 화재 지점이 아니라 ${location.label} 중심까지의 거리예요.`
      : modifier
        ? `문자에 "${modifier}"으로 되어 있어 실제 지점과 차이가 있을 수 있어요.`
        : `문자에 적힌 주소(${location.label}) 기준이에요.`;

  // 바람 정보 (화재 지점 부근)
  let windLine = "화재 지점 부근 바람 정보를 불러오지 못했어요.";
  if (wind && !wind.error) {
    windLine = wind.isCalm
      ? `화재 지점 부근은 지금 바람이 거의 없어요 (${wind.speed}m/s).`
      : `${wind.windFromName}풍 ${wind.speed}m/s, 연기는 ${wind.smokeToName}쪽으로 (화재 지점 부근, 기상청 ${wind.observedAt} 관측)`;
  }

  if (!position) {
    return (
      <div style={styles.cards}>
        <div style={styles.card}>
          <p style={styles.label}>화재까지 거리</p>
          <p style={styles.hint}>위의 "내 위치 확인하기"를 누르면 거리가 나와요.</p>
        </div>
        <div style={styles.card}>
          <p style={styles.label}>바람</p>
          <p style={styles.sub}>{windLine}</p>
        </div>
      </div>
    );
  }

  const km = distanceKm(position, location);
  const dirFromMe = directionName(bearingDeg(position, location)); // 내가 볼 때 화재가 있는 쪽
  const fireToMe = bearingDeg(location, position); // 화재에서 볼 때 내가 있는 쪽

  let relation = null;
  if (wind && !wind.error && !wind.isCalm) {
    relation =
      angleDiff(fireToMe, wind.smokeTo) <= TOWARD_ME_DEG ? (
        <p style={styles.alert}>
          현재 바람이 내 위치 쪽으로 불고 있어요 (추정). 아래 공식 안내를 따르고, 대피할 때는
          바람이 불어오는 쪽이나 연기와 직각 방향으로 이동하세요 (화학물질사고 국민행동요령 기준).
        </p>
      ) : (
        <p style={styles.note}>
          현재 관측 풍향은 내 위치 쪽이 아니에요. 바람은 바뀔 수 있으니 공식 안내는 그대로
          따르세요.
        </p>
      );
  }

  return (
    <>
      <div style={styles.cards}>
        <div style={styles.card}>
          <p style={styles.label}>화재까지 거리</p>
          <p style={styles.big}>약 {km.toFixed(1)}km</p>
          <p style={styles.sub}>내 위치에서 {dirFromMe}쪽</p>
        </div>
        <div style={styles.card}>
          <p style={styles.label}>바람</p>
          <p style={styles.sub}>{windLine}</p>
        </div>
      </div>
      <p style={styles.precision}>{precisionNote}</p>
      {relation}
    </>
  );
}

const styles = {
  cards: { display: "flex", gap: "8px", margin: "10px 0 6px" },
  card: { flex: 1, border: "1px solid #d0d5db", borderRadius: "10px", padding: "10px 12px" },
  label: { margin: 0, fontSize: "13px", color: "#555" },
  big: { margin: "2px 0 0", fontSize: "24px", fontWeight: 800 },
  sub: { margin: "2px 0 0", fontSize: "14px" },
  hint: { margin: "4px 0 0", fontSize: "14px", color: "#555" },
  precision: { margin: "0 0 8px", fontSize: "13px", color: "#666" },
  note: { margin: "0 0 10px", padding: "8px 10px", borderRadius: "8px", background: "#e9f5ee", fontSize: "14px" },
  alert: { margin: "0 0 10px", padding: "8px 10px", borderRadius: "8px", background: "#fde2e1", color: "#7a1414", fontSize: "14px", fontWeight: 600 },
  muted: { color: "#666", fontSize: "14px" },
};
