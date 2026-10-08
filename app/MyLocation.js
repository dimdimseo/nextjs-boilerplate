"use client";
// 시트 안의 "내 위치" 줄: 동네 고르기 (GPS는 지도 위 버튼으로)

import { useMyPosition } from "./LocationContext";
import { PLACES } from "../lib/places";

export default function MyLocation() {
  const { position, status, message, choosePlace } = useMyPosition();

  return (
    <div style={s.box}>
      <div style={s.row}>
        <label htmlFor="my-place" style={s.label}>
          내 위치
        </label>
        <select
          id="my-place"
          onChange={(e) => choosePlace(e.target.value)}
          disabled={status === "loading"}
          value={position?.source === "place" ? position.label : ""}
          style={s.select}
        >
          <option value="">
            {status === "loading"
              ? "확인 중..."
              : position?.source === "gps"
                ? `GPS 위치 (오차 약 ${position.accuracy}m)`
                : "동네 고르기"}
          </option>
          {PLACES.map((name) => (
            <option key={name} value={name}>
              {name} (중심)
            </option>
          ))}
        </select>
      </div>
      {status === "error" && <p style={s.error}>{message}</p>}
      {!position && status !== "error" && (
        <p style={s.hint}>동네를 고르거나 지도 오른쪽 아래 버튼으로 GPS 위치를 확인하세요.</p>
      )}
    </div>
  );
}

const s = {
  box: { background: "#FFFFFF", borderRadius: "16px", padding: "10px 12px", boxShadow: "0 1px 3px rgba(17,20,24,0.08)" },
  row: { display: "flex", alignItems: "center", gap: "10px" },
  label: { fontSize: "15px", fontWeight: 700, flexShrink: 0 },
  select: {
    flex: 1, minWidth: 0, height: "44px", border: "1px solid #E2E5E9", borderRadius: "12px",
    background: "#F4F5F7", padding: "0 12px", fontFamily: "inherit", fontSize: "15px", color: "#111418",
  },
  hint: { margin: "8px 2px 0", fontSize: "12.5px", color: "#4B5563" },
  error: { margin: "8px 2px 0", fontSize: "13px", color: "#B42318", fontWeight: 600 },
};