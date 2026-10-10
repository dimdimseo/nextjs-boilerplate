"use client";
// 화재 화면 전체 (팀원 디자인): 지도 + 위 카드들 + 끌어올리는 시트 + 탭
// 시트를 움직여 멈추면 지도 높이를 시트 위쪽까지로 맞춰서 카카오 로고가 가려지지 않게 해요.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import FireMap from "./FireMap";
import ActionGuide from "./ActionGuide";
import RelationTable from "./RelationTable";
import { useMyPosition } from "./LocationContext";
import { buildGuidance } from "../lib/guidance";
import { PLACES } from "../lib/places";

const NAV = 65; // 아래 탭바 높이

export default function FireScreen(props) {
  const { location, wind, placeText, timeText, stale, done, actions, hazards, modifier, messagePanel, factoryNode, footer } = props;
  const { position, status, message, requestGps, choosePlace } = useMyPosition();

  // ----- 시트 위치 (팀원 버전과 같은 멈춤 지점) -----
  const sheetRef = useRef(null);
  const handleRef = useRef(null);
  const summaryRef = useRef(null);
  const scrollRef = useRef(null); // 요약+탭 내용을 함께 스크롤하는 영역
  const tabsRef = useRef(null);
  const drag = useRef(null);
  const [offset, setOffset] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [settled, setSettled] = useState(true);
  const [ready, setReady] = useState(false);
  const [vh, setVh] = useState(800);

  function stops() {
    const h = sheetRef.current?.offsetHeight ?? 0;
    const medium = Math.max(0, h - Math.min(350, window.innerHeight * 0.46));
    const collapsed = Math.max(medium + 20, h - 98);
    return [0, medium, Math.min(h, collapsed)];
  }
  function moveSheet(v, anim = true) {
    const st = stops();
    setOffset(Math.max(0, Math.min(v, st[2])));
    setAnimate(anim);
  }

  useLayoutEffect(() => {
    setVh(window.innerHeight);
    const h = sheetRef.current.offsetHeight;
    const first = h - (handleRef.current.offsetHeight + summaryRef.current.offsetHeight);
    moveSheet(Math.max(0, first), false);
    setReady(true);
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onPointerDown(e) {
    drag.current = { startY: e.clientY, from: offset };
    setSettled(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (drag.current) moveSheet(drag.current.from + e.clientY - drag.current.startY, false);
  }
  function onPointerUp(e) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const st = stops();
    const delta = e.clientY - d.startY;
    if (Math.abs(delta) < 8) {
      moveSheet(offset > st[1] + 12 ? st[1] : offset > 15 ? 0 : st[2]); // 눌렀을 때
    } else {
      moveSheet(st.reduce((a, b) => (Math.abs(offset - a) < Math.abs(offset - b) ? a : b))); // 가까운 멈춤 지점
    }
    setSettled(true);
  }
  function onKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      moveSheet(offset > stops()[1] ? stops()[1] : 0);
    }
  }

  const sheetH = sheetRef.current?.offsetHeight ?? 0;
  const visible = Math.max(0, sheetH - offset);
  const mapHeight = ready ? Math.max(200, vh - NAV - visible) : null;
  const enough = vh - visible > 300;
  const floatStyle = { bottom: `${visible + 80}px`, opacity: enough ? 1 : 0, pointerEvents: enough ? "auto" : "none" };

  // ----- 탭 -----
  const [tab, setTab] = useState("guide");
  const tabChanged = useRef(false);
  function openTab(id) {
    if (id === tab) return;
    tabChanged.current = true;
    setTab(id);
    if (offset > 0) {
      moveSheet(0); // 덜 올라와 있으면 끝까지 펼치기
      setSettled(true);
    }
  }

  // 새 탭 내용이 다 그려진 다음, 항상 그 탭의 맨 처음(탭 버튼 바로 아래)부터 보이게
  useLayoutEffect(() => {
    if (!tabChanged.current) return;
    tabChanged.current = false;
    const sc = scrollRef.current;
    const tabs = tabsRef.current;
    if (!sc || !tabs) return;
    const detail = tabs.parentElement; // .sheet-detail (탭 버튼과 탭 내용을 담은 영역)
    if (detail.scrollTop) detail.scrollTop = 0; // 예전 스타일 파일처럼 상세 영역이 따로 스크롤되는 경우 대비
    // 탭 버튼은 맨 위에 붙어 있어서(고정) 위치를 재면 항상 맨 위로 나와요.
    // 그래서 움직이지 않는 상세 영역의 시작 위치를 기준으로 계산해요.
    const top = detail.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
    if (sc.scrollTop > top) sc.scrollTop = top; // 내려가 있으면 새 탭의 맨 처음으로
  }, [tab]);

  // ----- 요약 -----
  const g = buildGuidance({ actions, hazards, location, position, wind });
  const r = g.relation;
  const alert = g.items.find((i) => i.tone === "alert");
  const basis = position ? (position.source === "place" ? `${position.label} 중심 기준` : "GPS 위치 기준") : "내 위치를 정하면 거리가 나와요";
  let precision = null;
  if (location && position) {
    precision =
      location.precision === "area"
        ? `번지를 찾지 못해 ${location.label} 중심까지의 거리예요.`
        : location.precision === "facility"
          ? `문자에 적힌 시설(${location.label}) 위치 기준이에요. 터널·도로처럼 긴 시설은 실제 지점과 차이가 있을 수 있어요.`
          : modifier
            ? `문자에 '${modifier}'으로 되어 있어 실제 지점과 차이가 있을 수 있어요.`
            : null;
  }
  const windOk = wind && !wind.error;

  return (
    <>
      <FireMap location={location} wind={wind} height={mapHeight} settled={settled} />

      {/* 지도 위 화재 알림 카드 (누르지 않는 정보 표시) */}
      <div className="alert-bar" role="status">
        <span className="alert-dot" />
        <span className="alert-body">
          <span className="alert-title">화재 · {placeText}</span>
          <span className="alert-time">
            {timeText} · {stale ? "지난 화재" : "진행 중"}
          </span>
        </span>
      </div>

      {windOk && (
        <div className="wind-chip" aria-label="현재 풍향 정보">
          <span className="wind-logo" style={{ "--wind-angle": `${wind.isCalm ? 0 : wind.smokeTo}deg` }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#2478df" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V4M6 10l6-6 6 6" />
              <path d="M5 20h14" opacity=".35" />
            </svg>
          </span>
          <span>
            <strong>{wind.isCalm ? `바람 거의 없음 · ${wind.speed}m/s` : `${wind.windFromName}풍 · ${wind.speed}m/s`}</strong>
          </span>
        </div>
      )}

      <div className="map-legend" style={floatStyle}>
        <span><i className="dot you" />내 위치</span>
        <span><i className="dot fire" />화재</span>
        <span>
          <svg className="legend-wind" viewBox="0 0 24 24" fill="none" stroke="#247ce7" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12h17m-7-6 7 6-7 6" />
          </svg>
          바람 방향
        </span>
      </div>

      <div className="map-buttons" style={floatStyle}>
        {status === "error" && <p className="loc-status">{message}</p>}
        <select
          className="place-select"
          aria-label="동네 고르기"
          value={position?.source === "place" ? position.label : ""}
          onChange={(e) => choosePlace(e.target.value)}
          disabled={status === "loading"}
        >
          <option value="">{status === "loading" ? "확인 중..." : "양주시 동네 고르기"}</option>
          {PLACES.map((name) => (
            <option key={name} value={name}>
              {name} 중심
            </option>
          ))}
        </select>
        <button className="loc-button" type="button" aria-label="실제 내 위치 확인" onClick={requestGps} disabled={status === "loading"}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="2.4" fill="currentColor" />
            <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
          </svg>
        </button>
      </div>

      <section
        ref={sheetRef}
        className="sheet"
        aria-label="현재 재난 안내"
        style={{
          transform: `translateY(${offset}px)`,
          transition: animate ? "transform .28s cubic-bezier(.2,.72,.25,1)" : "none",
          visibility: ready ? "visible" : "hidden",
        }}
      >
        <div
          ref={handleRef}
          className="handle"
          role="button"
          tabIndex={0}
          aria-label="재난 정보 창을 위아래로 드래그하여 펼치거나 접기"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
            setSettled(true);
          }}
          onKeyDown={onKeyDown}
        />

        <div ref={scrollRef} className="sheet-scroll">
        <div ref={summaryRef} className="sheet-summary">
          <div className={`headline${done ? " done" : ""}`}>
            <i className="chip" />
            {done ? "진화 완료" : "화재 발생"}
            <span className="mini-demo">{stale ? "과거 사례 · 지난 화재" : "진행 중"}</span>
          </div>
          <div className="metric-row">
            <div className="metric">{r.km !== null ? `${r.km.toFixed(1)} km` : "위치 확인 필요"}</div>
            {r.dir && <span className="direction">{r.dir}쪽</span>}
          </div>
          <div className="sub">
            {basis} · 화재 · {placeText}
            {r.km !== null ? " · 직선거리" : ""}
          </div>
          {precision && <div className="sub-note">{precision}</div>}
          {alert && <div className="alert-strip">{alert.title}</div>}
          <div className="quick-guide">
            <div className="quick-label">내 위치 기준 · 먼저 확인할 사항</div>
            <div className="quick-text">{g.items[0].body}</div>
            <div className="quick-note">거리·풍향은 위험도 또는 안전 여부를 뜻하지 않아요.</div>
          </div>
        </div>

        <div className="sheet-detail">
          <div ref={tabsRef} className="detail-tabs" role="tablist" aria-label="재난 상세 정보 선택">
            {[
              ["guide", "행동 안내"],
              ["message", "재난문자"],
              ["context", "위치·바람"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`detail-tab${tab === id ? " active" : ""}`}
                onClick={() => openTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="detail-panel" role="tabpanel">
            {tab === "guide" && <ActionGuide location={location} wind={wind} actions={actions} hazards={hazards} />}
            {tab === "message" && messagePanel}
            {tab === "context" && (
              <>
                <RelationTable location={location} wind={wind} stale={stale} />
                {factoryNode}
              </>
            )}
          </div>
          {footer}
        </div>
        </div>
      </section>
    </>
  );
}