"use client";
// 크기를 바꿀 수 있는 지도 영역
// - 아래 손잡이를 아래로 끌면 지도가 커지고, 위로 올리면 작아져요
// - 손잡이를 눌러도 크게/작게가 바뀌어요 (키보드로도 가능)
// 시트가 지도를 덮지 않고 지도 높이 자체가 바뀌어서, 카카오 로고가 늘 보여요.

import { useEffect, useRef, useState } from "react";
import FireMap from "./FireMap";
import { ShareButton, GpsButton } from "./MapButtons";

const TAB_BAR = 64; // 아래 탭바 높이
const SHEET_PEEK = 170; // 지도를 크게 해도 아래 시트 윗부분(제목)은 보이게 남겨둘 높이

function sizes() {
  const vh = window.innerHeight;
  const small = Math.min(Math.max(vh * 0.52, 340), 480);
  const large = Math.max(small + 80, vh - TAB_BAR - SHEET_PEEK);
  return { small, large };
}

export default function ExpandableMap({ location, wind, title }) {
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
        <div style={s.mapTop}>
          <p style={s.brand}>양주시 재난 거리 안내</p>
          <ShareButton title={title} />
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

const s = {
  mapWrap: { position: "relative" },
  mapTop: { position: "absolute", left: "12px", right: "12px", top: "14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 10, pointerEvents: "none" },
  brand: { margin: 0, padding: "8px 12px", background: "#FFFFFF", borderRadius: "999px", fontSize: "13px", fontWeight: 600, boxShadow: "0 1px 4px rgba(17,20,24,0.14)" },
  mapGps: { position: "absolute", right: "14px", bottom: "20px", zIndex: 10 },
  handleArea: { background: "#F4F5F7", borderRadius: "24px 24px 0 0", boxShadow: "0 -2px 10px rgba(17,20,24,0.08)", position: "relative", zIndex: 5 },
  handleButton: {
    display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "32px",
    border: "none", background: "transparent", cursor: "grab", touchAction: "none", padding: 0,
  },
  handle: { width: "44px", height: "5px", borderRadius: "5px", background: "#AEB4BC" },
};
