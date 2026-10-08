"use client";
// 화면 아래 탭바: 지도 / 재난 기록

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TabBar() {
  const path = usePathname();
  const onRecords = path.startsWith("/records");

  return (
    <nav className="nav" aria-label="주요 메뉴">
      <Link href="/" className={!onRecords ? "active" : ""} aria-current={!onRecords ? "page" : undefined}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
          <path d="M9 4v14M15 6v14" />
        </svg>
        지도
      </Link>
      <Link href="/records" className={onRecords ? "active" : ""} aria-current={onRecords ? "page" : undefined}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M8 6h13M8 12h13M8 18h13" />
          <circle cx="4" cy="6" r="1" fill="currentColor" />
          <circle cx="4" cy="12" r="1" fill="currentColor" />
          <circle cx="4" cy="18" r="1" fill="currentColor" />
        </svg>
        재난 기록
      </Link>
    </nav>
  );
}