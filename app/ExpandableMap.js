"use client";
// 크기를 바꿀 수 있는 지도 영역
// - 아래 손잡이를 아래로 끌면 지도가 커지고, 위로 올리면 작아져요
// - 손잡이를 눌러도 크게/작게가 바뀌어요 (키보드로도 가능)
// 시트가 지도를 덮지 않고 지도 높이 자체가 바뀌어서, 카카오 로고가 늘 보여요.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import FireMap from "./FireMap";
import { ShareButton, GpsButton } from "./MapButtons";

const TAB_BAR = 64; // 아래 탭바 높이
const SHEET_PEEK = 170; // 지도를 크게 해도 아래 시트 윗부분(제목)은 보이게 남겨둘 높이

function sizes() {
  const vh = window.innerHeight;
  const small = Math.min(Math.max(vh * 0.6, 400), 560);
  const large = Math.max(small + 80, vh - TAB_BAR - SHEET_PEEK);
  return { small, large };
}

export default function ExpandableMap({ location, wind, title, placeText, timeText, stale, recordsHref }) {
  const [limits, setLimits] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [dragHeight, setDragHeight] = useState(null); // 끄는 중일 때의 높이
  const drag = useRef(null);
  const suppressClick = useRef(false);

  // 화면 크기에 맞춰 작게/크게 높이 계산
  useEffect(() => {
    const update = () => setLimits(sizes());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const clamp = (h) => Math.min(Math.max(h, limits.small), limits.large);
  const height = dragHeight ?? (limits ? (expanded ? limits.large : limits.small) : null);

  function onPointerDown(e) {
    if (!limits) return;
    drag.current = { startY: e.clientY, startH: height, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 4) d.moved = true;
    if (d.moved) setDragHeight(clamp(d.startH + dy));
  }

  function onPointerUp(e) {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return; // 그냥 누른 경우는 onClick에서 처리
    suppressClick.current = true;
    const finalH = clamp(d.startH + (e.clientY - d.startY));
    setExpanded(finalH > (limits.small + limits.large) / 2); // 가까운 쪽으로 맞추기
    setDragHeight(null);
  }

  function onClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setExpanded((x) => !x);
  }

  return (
    <>
      <div style={s.mapWrap}>
        <FireMap location={location} wind={wind} height={height} dragging={dragHeight !== null} />

        {/* 지도 위 카드들 (카카오 로고가 있는 왼쪽 아래는 비워둠) */}
        <div style={s.overlay}>
          <div style={s.brandCard}>
            <span style={s.brandIcon} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2F5BC9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M15.5 8.5l-2 5-5 2 2-5z" fill="#D24B3E" stroke="#D24B3E" />
              </svg>
            </span>
            <p style={s.brandName}>양주 재난나침반</p>
            <ShareButton title={title} />
          </div>

          <Link href={recordsHref} style={s.incident} aria-label="같은 달 재난 기록 보기">
            <span style={s.incDot} aria-hidden="true" />
            <span style={s.incText}>
              <span style={s.incTitle}>화재 · {placeText}</span>
              <span style={s.incSub}>
                {timeText} · {stale ? "지난 화재" : "진행 중"}
              </span>
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9B1C1C" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>

          <div style={s.chips}>
            {wind && !wind.error && (
              <p style={s.chip}>
                {!wind.isCalm && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2F5BC9" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ transform: `rotate(${wind.smokeTo}deg)` }}>
                    <path d="M12 20V4M6 10l6-6 6 6" />
                  </svg>
                )}
                {wind.isCalm ? `바람 거의 없음 · ${wind.speed}m/s` : `${wind.windFromName}풍 · ${wind.speed}m/s`}
              </p>
            )}
            <p style={s.chip}>
              <span style={{ ...s.legendDot, background: "#2F6BEA" }} aria-hidden="true" />내 위치
              <span style={{ ...s.legendDot, background: "#D24B3E", marginLeft: "8px" }} aria-hidden="true" />화재
              <span style={s.legendArrow} aria-hidden="true">→</span>바람 방향
            </p>
          </div>
        </div>

        <div style={s.mapGps}>
          <GpsButton />
        </div>
      </div>

      <div style={s.handleArea}>
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
            setDragHeight(null);
          }}
          onClick={onClick}
          aria-expanded={expanded}
          aria-label={expanded ? "지도 작게 보기" : "지도 크게 보기"}
          style={s.handleButton}
        >
          <span style={s.handle} />
        </button>
      </div>
    </>
  );
}

const shadow = "0 2px 8px rgba(17,20,24,0.12)";
const s = {
  mapWrap: { position: "relative" },
  overlay: { position: "absolute", left: "12px", right: "12px", top: "12px", display: "flex", flexDirection: "column", gap: "10px", zIndex: 10, pointerEvents: "none" },
  brandCard: { display: "flex", alignItems: "center", gap: "10px", padding: "8px 8px 8px 10px", background: "#FFFFFF", borderRadius: "18px", boxShadow: shadow, pointerEvents: "auto" },
  brandIcon: { width: "40px", height: "40px", borderRadius: "12px", background: "#EEF3FE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  brandName: { margin: 0, flex: 1, fontSize: "17px", fontWeight: 800 },
  incident: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "#FDEDEB", border: "1.5px solid #F2BDB7", borderRadius: "16px", textDecoration: "none", color: "inherit", boxShadow: shadow, pointerEvents: "auto" },
  incDot: { width: "10px", height: "10px", borderRadius: "999px", background: "#D24B3E", flexShrink: 0 },
  incText: { display: "flex", flexDirection: "column", flex: 1, minWidth: 0 },
  incTitle: { fontSize: "16px", fontWeight: 800, color: "#9B2C1F", lineHeight: 1.35 },
  incSub: { fontSize: "13px", color: "#7A4A44" },
  chips: { display: "flex", flexWrap: "wrap", gap: "8px" },
  chip: { margin: 0, display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px", background: "#FFFFFF", borderRadius: "999px", boxShadow: shadow, fontSize: "13px", fontWeight: 700 },
  legendDot: { width: "9px", height: "9px", borderRadius: "999px", display: "inline-block" },
  legendArrow: { color: "#2F6BEA", fontWeight: 800, marginLeft: "8px" },
  mapGps: { position: "absolute", right: "14px", bottom: "20px", zIndex: 10 },
  handleArea: { background: "#FFFFFF", borderRadius: "24px 24px 0 0", boxShadow: "0 -2px 10px rgba(17,20,24,0.08)", position: "relative", zIndex: 5 },
  handleButton: {
    display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "32px",
    border: "none", background: "transparent", cursor: "grab", touchAction: "none", padding: 0,
  },
  handle: { width: "44px", height: "5px", borderRadius: "5px", background: "#C9CDD3" },
};