"use client";
// 카카오 지도에 화재 위치, 내 위치, 거리 점선, 바람 흐름선을 그리는 조각
// 휴대폰 브라우저에서 실행돼요. 지도 키(NEXT_PUBLIC_KAKAO_JS_KEY)는 등록한 사이트에서만 작동해요.

import { useEffect, useRef, useState } from "react";
import { useMyPosition } from "./LocationContext";
import { distanceKm, destination } from "../lib/geo";

// 카카오 지도 프로그램을 한 번만 불러오기
let loadingPromise = null;
function loadKakao(key) {
  if (window.kakao?.maps?.LatLng) return Promise.resolve(window.kakao);
  if (!loadingPromise) {
    loadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
      script.async = true;
      script.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
      script.onerror = () => {
        loadingPromise = null;
        reject(new Error("카카오 지도를 불러오지 못했어요. 인터넷 연결이나 지도 키를 확인하세요."));
      };
      document.head.appendChild(script);
    });
  }
  return loadingPromise;
}

// 지도 위 표시 만들기 (글자는 textContent로 넣어 안전하게)
function el(tag, css, text) {
  const e = document.createElement(tag);
  e.style.cssText = css;
  if (text) e.textContent = text;
  return e;
}

// 화재 표시: 빨간 점 + 테두리 있는 알약 모양 글씨
function fireMarker(text) {
  const box = el("div", "display:flex;align-items:center;gap:8px;padding:7px 14px 7px 10px;background:#fff;border:2px solid #D24B3E;border-radius:999px;box-shadow:0 0 0 6px rgba(210,75,62,.18),0 2px 6px rgba(0,0,0,.2);font:800 15px system-ui,sans-serif;color:#B42318;white-space:nowrap;");
  box.appendChild(el("span", "width:14px;height:14px;border-radius:50%;background:#D24B3E;box-shadow:0 0 0 4px rgba(210,75,62,.25);"));
  box.appendChild(el("span", "", text));
  return box;
}

// 내 위치 표시: 파란 점 + 흰 알약 글씨
function meMarker(text) {
  const box = el("div", "display:flex;align-items:center;gap:6px;font:700 13px system-ui,sans-serif;");
  box.appendChild(el("span", "width:16px;height:16px;border-radius:50%;background:#2F6BEA;border:3px solid #fff;box-shadow:0 0 0 6px rgba(47,107,234,.2),0 1px 3px rgba(0,0,0,.3);"));
  box.appendChild(el("span", "background:#fff;color:#1F3F8F;padding:5px 10px;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,.15);white-space:nowrap;", text));
  return box;
}

// 거리 표시: 검은 알약
function distanceLabel(text) {
  return el("div", "background:#111418;color:#fff;padding:4px 10px;border-radius:999px;font:700 12px system-ui,sans-serif;white-space:nowrap;", text);
}

export default function FireMap({ location, wind, height = null, dragging = false }) {
  const { position } = useMyPosition();
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const drawnRef = useRef([]); // 지금 지도에 올라간 표시들 (다시 그릴 때 지우기 위해)
  const [error, setError] = useState(null);

  // 지도 그리기: 화재 표시 + (내 위치가 있으면) 내 위치, 점선, 거리 + 연기 화살표
  function draw() {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map || !location) return;

    drawnRef.current.forEach((item) => item.setMap(null));
    drawnRef.current = [];
    const add = (item) => {
      item.setMap(map);
      drawnRef.current.push(item);
    };
    const toLatLng = (p) => new kakao.maps.LatLng(p.lat, p.lon);

    const fire = toLatLng(location);
    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(fire);

    // 화재 표시 (번지를 못 찾았으면 "대략적 위치")
    const fireText = location.precision === "area" ? `${location.label} 중심 (대략)` : "화재 발생지";
    add(new kakao.maps.CustomOverlay({ position: fire, content: fireMarker(fireText), xAnchor: 0.12, yAnchor: 0.5, zIndex: 3 }));

    // 내 위치, 점선, 거리
    if (position) {
      const me = toLatLng(position);
      bounds.extend(me);
      const meText = position.source === "place" ? `${position.label} 중심` : "내 위치";
      add(new kakao.maps.CustomOverlay({ position: me, content: meMarker(meText), xAnchor: 0.08, yAnchor: 0.5, zIndex: 3 }));
      add(new kakao.maps.Polyline({ path: [me, fire], strokeWeight: 2, strokeColor: "#111418", strokeOpacity: 0.8, strokeStyle: "dash" }));
      const km = distanceKm(position, location);
      const mid = { lat: (position.lat + location.lat) / 2, lon: (position.lon + location.lon) / 2 };
      add(new kakao.maps.CustomOverlay({ position: toLatLng(mid), content: distanceLabel(`약 ${km.toFixed(1)} km`), yAnchor: 0.5, zIndex: 2 }));
    }

    // 화면 맞추기: 내 위치가 있으면 둘 다 보이게(위쪽은 지도 위 카드들만큼 여백), 없으면 화재 중심으로
    if (position) {
      map.setBounds(bounds, 200, 48, 48, 48);
    } else {
      map.setLevel(4);
      map.setCenter(fire);
    }

    // 바람 흐름선: 화재 지점 주변에 바람이 향하는 방향으로 점선 화살표 여러 개
    // (화재 지점 격자 관측값 1개를 표현한 것이라 지역별 바람 차이를 뜻하지는 않아요)
    if (wind && !wind.error && !wind.isCalm) {
      const b = map.getBounds();
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      const latSpan = ne.getLat() - sw.getLat();
      const lonSpan = ne.getLng() - sw.getLng();
      const spanKm = distanceKm({ lat: sw.getLat(), lon: sw.getLng() }, { lat: ne.getLat(), lon: ne.getLng() });
      const len = spanKm * 0.12;
      for (const i of [-1, 0, 1]) {
        for (const j of [-1, 0, 1]) {
          if (i === 0 && j === 0) continue; // 화재 표시 바로 위는 비우기
          const start = { lat: location.lat + i * latSpan * 0.22, lon: location.lon + j * lonSpan * 0.3 };
          const end = destination(start, wind.smokeTo, len);
          add(new kakao.maps.Polyline({ path: [toLatLng(start), toLatLng(end)], strokeWeight: 3, strokeColor: "#4C7DF0", strokeOpacity: 0.75, strokeStyle: "dash", endArrow: true, zIndex: 1 }));
        }
      }
    }
  }

  // 처음 한 번: 카카오 지도 불러와서 만들기
  useEffect(() => {
    if (!location) return;
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!key) {
      setError("NEXT_PUBLIC_KAKAO_JS_KEY가 없어요. (내 컴퓨터는 .env.local, Vercel은 환경변수를 확인하세요)");
      return;
    }
    let cancelled = false;
    loadKakao(key)
      .then((kakao) => {
        if (cancelled || !boxRef.current) return;
        mapRef.current = new kakao.maps.Map(boxRef.current, {
          center: new kakao.maps.LatLng(location.lat, location.lon),
          level: 6,
        });
        draw();
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [location?.lat, location?.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  // 내 위치나 바람이 바뀌면 다시 그리기
  useEffect(() => {
    draw();
  }, [position, wind]); // eslint-disable-line react-hooks/exhaustive-deps

  // 지도 크기가 바뀌면 카카오 지도에 알려주고(relayout) 표시들이 다 보이게 다시 맞추기
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const timer = setTimeout(() => {
      map.relayout();
      if (!dragging) draw();
    }, dragging ? 0 : 280); // 크기 변화 애니메이션이 끝난 뒤
    return () => clearTimeout(timer);
  }, [height, dragging]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!location) {
    return (
      <div style={{ ...styles.map, ...styles.empty }}>
        화재 위치를 찾지 못해 지도를 표시할 수 없어요. 아래 공식 안내의 장소를 확인하세요.
      </div>
    );
  }

  // 카카오 로고가 지도 왼쪽 아래에 표시돼요. 그 위를 가리지 않도록 지도 위에 아무것도 겹치지 않아요.
  const sized = height
    ? { height: `${height}px`, minHeight: 0, maxHeight: "none", transition: dragging ? "none" : "height 0.25s ease" }
    : {};
  return error ? (
    <div style={{ ...styles.map, ...sized, ...styles.empty }}>{error}</div>
  ) : (
    <div ref={boxRef} style={{ ...styles.map, ...sized }} aria-label="화재 위치와 내 위치를 보여주는 지도" />
  );
}

const styles = {
  map: { width: "100%", height: "52vh", minHeight: "340px", maxHeight: "480px", background: "#E9EDE5" },
  empty: { display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", boxSizing: "border-box", textAlign: "center", color: "#374151", fontSize: "14px" },
};