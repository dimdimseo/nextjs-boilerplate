"use client";
// 지도 위에 떠 있는 버튼들: 공유 버튼(오른쪽 위), GPS 버튼(오른쪽 아래)

import { useState } from "react";
import { useMyPosition } from "./LocationContext";

export function ShareButton({ title }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url }); // 휴대폰: 카카오톡 등 공유 창
      } else {
        await navigator.clipboard.writeText(url); // 컴퓨터: 주소 복사
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // 사용자가 공유 창을 닫은 경우 등은 무시
    }
  }

  return (
    <div style={{ position: "relative", pointerEvents: "auto" }}>
      <button onClick={share} aria-label="이 화재 페이지 공유" style={s.round}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111418" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12" />
          <path d="M7 8l5-5 5 5" />
          <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
        </svg>
      </button>
      {copied && <p style={s.toast}>주소를 복사했어요</p>}
    </div>
  );
}

export function GpsButton() {
  const { requestGps, status } = useMyPosition();
  return (
    <button
      onClick={requestGps}
      disabled={status === "loading"}
      aria-label="GPS로 지금 위치 확인"
      style={{ ...s.round, width: "48px", height: "48px", opacity: status === "loading" ? 0.6 : 1 }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="2.5" fill="#1D4ED8" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
    </button>
  );
}

const s = {
  round: {
    width: "44px", height: "44px", border: "none", borderRadius: "999px", background: "#FFFFFF",
    boxShadow: "0 1px 4px rgba(17,20,24,0.18)", display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer",
  },
  toast: {
    position: "absolute", right: 0, top: "50px", margin: 0, padding: "6px 10px", whiteSpace: "nowrap",
    background: "#111418", color: "#FFFFFF", borderRadius: "8px", fontSize: "12px",
  },
};
