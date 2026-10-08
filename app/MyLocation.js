"use client";
// ↑ 이 파일은 시민의 휴대폰 브라우저에서 실행돼요.
// 내 위치를 정하는 화면 조각이에요. 두 가지 방법이 있어요.
//   1) GPS로 내 위치 확인 → 위치는 이 휴대폰 안에서만 쓰고 서버로 보내지 않아요.
//   2) 동네 직접 고르기 → 동네 "이름"만 서버에 보내 그 동네의 중심 위치를 받아요.

import { useState } from "react";
import { useMyPosition } from "./LocationContext";
import { PLACES } from "../lib/places";

export default function MyLocation() {
  const { position, setPosition } = useMyPosition(); // 화재 카드들과 같이 쓰는 위치
  const [status, setStatus] = useState("idle"); // idle / loading / error
  const [message, setMessage] = useState("");

  // 1) GPS로 확인
  function requestGps() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setMessage("이 브라우저는 위치 확인을 지원하지 않아요. 아래에서 동네를 골라주세요.");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          source: "gps",
        });
        setStatus("idle");
      },
      (err) => {
        setStatus("error");
        if (err.code === err.PERMISSION_DENIED) {
          setMessage("위치 권한이 꺼져 있어요. 브라우저 설정에서 허용하거나, 아래에서 동네를 골라주세요.");
        } else if (err.code === err.TIMEOUT) {
          setMessage("위치를 찾는 데 시간이 너무 오래 걸렸어요. 다시 누르거나 동네를 골라주세요.");
        } else {
          setMessage("위치를 찾지 못했어요. 아래에서 동네를 골라주세요.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  // 2) 동네 고르기
  async function choosePlace(name) {
    if (!name) return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/place?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "위치를 찾지 못했어요.");
      setPosition({ lat: data.lat, lon: data.lon, source: "place", label: data.label });
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setMessage(e.message);
    }
  }

  return (
    <section style={styles.box}>
      <div style={styles.row}>
        <span style={styles.rowLabel}>내 위치</span>
        <select
          aria-label="동네 고르기"
          onChange={(e) => choosePlace(e.target.value)}
          disabled={status === "loading"}
          value={position?.source === "place" ? position.label : ""}
          style={styles.select}
        >
          <option value="">
            {position?.source === "gps" ? `GPS 위치 (오차 약 ${position.accuracy}m)` : "동네 고르기"}
          </option>
          {PLACES.map((name) => (
            <option key={name} value={name}>
              {name} (중심)
            </option>
          ))}
        </select>
      </div>
      <button onClick={requestGps} disabled={status === "loading"} style={styles.button}>
        {status === "loading" ? "확인 중..." : "GPS로 지금 위치 확인"}
      </button>
      {status === "error" && <p style={styles.error}>{message}</p>}
    </section>
  );
}

const styles = {
  box: { background: "#ffffff", borderRadius: "14px", padding: "12px 14px", margin: "4px 0 12px", boxShadow: "0 1px 3px rgba(0,0,0,.08)" },
  row: { display: "flex", alignItems: "center", gap: "10px" },
  rowLabel: { fontWeight: 800, fontSize: "15px", flexShrink: 0 },
  select: {
    flex: 1, fontSize: "15px", padding: "10px 12px", borderRadius: "10px",
    border: "1px solid #e5e7eb", background: "#f3f4f6", color: "#111827",
  },
  button: {
    marginTop: "8px", width: "100%", fontSize: "14px", fontWeight: 700, padding: "9px 12px",
    borderRadius: "10px", border: "1px solid #d1d5db", background: "#ffffff", color: "#111827", cursor: "pointer",
  },
  error: { margin: "8px 0 0", color: "#b42318", fontWeight: 600, fontSize: "14px" },
};