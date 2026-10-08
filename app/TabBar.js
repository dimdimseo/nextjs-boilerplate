"use client";
// 화면 아래 탭바: 지도 / 재난 기록

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TabBar() {
  const path = usePathname();
  const onRecords = path.startsWith("/records");

  return (
    <nav style={s.bar} aria-label="주요 메뉴">
      <div style={s.inner}>
        <Link href="/" style={s.tab} aria-current={!onRecords ? "page" : undefined}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={!onRecords ? "#1D4ED8" : "#4B5563"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
            <path d="M9 4v14M15 6v14" />
          </svg>
          <span style={{ ...s.label, color: !onRecords ? "#1D4ED8" : "#4B5563" }}>지도</span>
        </Link>
        <Link href="/records" style={s.tab} aria-current={onRecords ? "page" : undefined}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={onRecords ? "#1D4ED8" : "#4B5563"} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M8 6h13M8 12h13M8 18h13" />
            <circle cx="4" cy="6" r="1" fill="currentColor" />
            <circle cx="4" cy="12" r="1" fill="currentColor" />
            <circle cx="4" cy="18" r="1" fill="currentColor" />
          </svg>
          <span style={{ ...s.label, color: onRecords ? "#1D4ED8" : "#4B5563" }}>재난 기록</span>
        </Link>
      </div>
    </nav>
  );
}

const s = {
  bar: {
    position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50, background: "#FFFFFF",
    borderTop: "1px solid #E2E5E9", paddingBottom: "env(safe-area-inset-bottom)",
  },
  inner: { maxWidth: "560px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
  tab: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px", height: "60px", textDecoration: "none", color: "#4B5563" },
  label: { fontSize: "12px", fontWeight: 600 },
};
