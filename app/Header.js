"use client";
// 맨 위 헤더: 로고, 서비스 이름, 공유 버튼 (모든 화면 공통)

import { useState } from "react";

export default function Header() {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url }); // 휴대폰: 카카오톡 등 공유 창
      } else {
        await navigator.clipboard.writeText(url); // 컴퓨터: 주소 복사
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // 공유 창을 닫은 경우 등은 무시
    }
  }

  return (
    <header className="header">
      <span className="logo" aria-hidden="true">
        <img src="/logo.svg" alt="" width="36" height="36" />
      </span>
      <span className="brand-name">양주 재난나침반</span>
      <span style={{ position: "relative" }}>
        <button type="button" className="share-btn" onClick={share} aria-label="이 화면 공유">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12" />
            <path d="M7 8l5-5 5 5" />
            <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
          </svg>
        </button>
        {copied && <span className="share-toast">주소를 복사했어요</span>}
      </span>
    </header>
  );
}
