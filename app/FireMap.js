"use client";
// 카카오 지도에 화재 위치, 내 위치, 거리 점선, 연기 방향 화살표를 그리는 조각
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

// 지도 위에 올릴 작은 표시 (글자는 textContent로 넣어 안전하게)
function makeLabel(text, color, dot = true) {
  const box = document.createElement("div");
  box.style.cssText =
    "display:flex;align-items:center;gap:6px;transform:translateY(-4px);font:700 13px system-ui,sans-serif;";
  if (dot) {
    const d = document.createElement("span");
    d.style.cssText = `width:14px;height:14px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25);`;
    box.appendChild(d);
  }
  const t = document.createElement("span");
  t.textContent = text;
  t.style.cssText = `background:#fff;color:${color};padding:2px 6px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.25);white-space:nowrap;`;
  box.appendChild(t);
  return box;
}

export default function FireMap({ location, wind }) {
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
    const fireText =
      location.precision === "area" ? `${location.label} 중심 (대략적 위치)` : "화재 발생지";
    add(new kakao.maps.CustomOverlay({ position: fire, content: makeLabel(fireText, "#d93025"), yAnchor: 0.5, xAnchor: 0.1 }));

    // 내 위치, 점선, 거리
    let km = null;
    if (position) {
      const me = toLatLng(position);
      km = distanceKm(position, location);
      bounds.extend(me);
      const meText = position.source === "place" ? `나 (${position.label} 중심)` : "나";
      add(new kakao.maps.CustomOverlay({ position: me, content: makeLabel(meText, "#1a5fd1"), yAnchor: 0.5, xAnchor: 0.1 }));
      add(new kakao.maps.Polyline({ path: [me, fire], strokeWeight: 3, strokeColor: "#333333", strokeOpacity: 0.8, strokeStyle: "dash" }));
      const mid = { lat: (position.lat + location.lat) / 2, lon: (position.lon + location.lon) / 2 };
      add(new kakao.maps.CustomOverlay({ position: toLatLng(mid), content: makeLabel(`약 ${km.toFixed(1)}km`, "#111111", false), yAnchor: 0.5 }));
    }

    // 연기 방향 화살표 (바람이 거의 없으면 그리지 않음)
    if (wind && !wind.error && !wind.isCalm) {
      const length = km ? Math.max(0.4, Math.min(km * 0.3, 3)) : 0.8; // 화면 크기에 맞춘 화살표 길이(km)
      const tip = destination(location, wind.smokeTo, length);
      bounds.extend(toLatLng(tip));
      add(new kakao.maps.Polyline({ path: [fire, toLatLng(tip)], strokeWeight: 5, strokeColor: "#0a8f6a", strokeOpacity: 0.9, endArrow: true }));
      add(new kakao.maps.CustomOverlay({ position: toLatLng(tip), content: makeLabel("연기 방향", "#0a8f6a", false), yAnchor: 1.4 }));
    }

    // 표시들이 모두 보이게 화면 맞추기 (가장자리 여백 40px)
    map.setBounds(bounds, 40, 40, 40, 40);
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

  if (!location) {
    return <p style={styles.muted}>화재 위치를 찾지 못해 지도를 표시할 수 없어요.</p>;
  }

  return (
    <figure style={styles.figure}>
      {error ? <p style={styles.error}>{error}</p> : <div ref={boxRef} style={styles.map} />}
      <figcaption style={styles.caption}>
        지도: 카카오맵. 지도를 그리기 위해 카카오가 화면에 보이는 지역의 지도 이미지를 제공해요.
        {location.precision === "area"
          ? ` 화재 위치는 번지를 찾지 못해 ${location.label} 중심으로 표시했어요.`
          : " 화재 위치는 문자에 적힌 주소 기준이에요."}
      </figcaption>
    </figure>
  );
}

const styles = {
  figure: { margin: 0, position: "relative" },
  map: { width: "100%", height: "46vh", minHeight: "280px", background: "#e5e7eb" },
  caption: { padding: "6px 16px 22px", fontSize: "11px", color: "#6b7280", background: "#ffffff" },
  error: { color: "#b00020", fontWeight: 600, fontSize: "14px" },
  muted: { color: "#666", fontSize: "14px" },
};