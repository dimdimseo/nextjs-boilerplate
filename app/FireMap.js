"use client";
// 카카오 지도에 화재 위치, 내 위치, 거리 점선, 연기 방향 화살표를 그리는 조각
// 휴대폰 브라우저에서 실행돼요. 지도 키(NEXT_PUBLIC_KAKAO_JS_KEY)는 등록한 사이트에서만 작동해요.

import { useEffect, useRef, useState } from "react";
import { useMyPosition } from "./LocationContext";
import { distanceKm, destination, isSmokeTowardMe } from "../lib/geo";

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
// textFirst: 글씨를 점의 왼쪽에 둘 때 true
function makeLabel(text, color, dot = true, dark = false, textFirst = false) {
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
  t.style.cssText = dark
    ? "background:#111418;color:#fff;padding:3px 10px;border-radius:999px;white-space:nowrap;"
    : `background:#fff;color:${color};padding:3px 8px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.25);white-space:nowrap;`;
  if (textFirst) box.insertBefore(t, box.firstChild);
  else box.appendChild(t);
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
    // 연기가 동쪽(오른쪽)으로 가면 "화재 발생지" 글씨는 왼쪽에, 서쪽으로 가면 오른쪽에 (글씨 겹침 방지)
    const smokeGoesEast = wind && !wind.error && !wind.isCalm && wind.smokeTo > 0 && wind.smokeTo < 180;
    add(new kakao.maps.CustomOverlay({
      position: fire,
      content: makeLabel(fireText, "#D9480F", true, false, smokeGoesEast),
      yAnchor: 0.5,
      xAnchor: smokeGoesEast ? 0.93 : 0.07,
    }));

    // 내 위치, 점선, 거리
    let km = null;
    if (position) {
      const me = toLatLng(position);
      km = distanceKm(position, location);
      bounds.extend(me);
      const meText = position.source === "place" ? `나 (${position.label} 중심)` : "나";
      add(new kakao.maps.CustomOverlay({ position: me, content: makeLabel(meText, "#1D4ED8"), yAnchor: 0.5, xAnchor: 0.1 }));
      add(new kakao.maps.Polyline({ path: [me, fire], strokeWeight: 2, strokeColor: "#111418", strokeOpacity: 0.9, strokeStyle: "dash" }));
      const mid = { lat: (position.lat + location.lat) / 2, lon: (position.lon + location.lon) / 2 };
      add(new kakao.maps.CustomOverlay({ position: toLatLng(mid), content: makeLabel(`약 ${km.toFixed(1)} km`, "#111418", false, true), yAnchor: 0.5 }));
    }

    // 연기 방향 화살표 (바람이 거의 없으면 그리지 않음)
    if (wind && !wind.error && !wind.isCalm) {
      const length = km ? Math.max(0.4, Math.min(km * 0.3, 3)) : 0.8; // 화면 크기에 맞춘 화살표 길이(km)
      const tip = destination(location, wind.smokeTo, length);
      bounds.extend(toLatLng(tip));
      // 연기가 내 쪽이면 빨간 화살표, 아니면 초록 화살표
      const arrowColor = isSmokeTowardMe(location, position, wind) ? "#B42318" : "#0B6E4F";
      add(new kakao.maps.Polyline({ path: [fire, toLatLng(tip)], strokeWeight: 5, strokeColor: arrowColor, strokeOpacity: 0.95, endArrow: true }));
      // "연기 방향" 글씨는 화살표 끝보다 조금 더 나아간 곳에, 화살표가 가는 쪽으로
      const labelAt = destination(location, wind.smokeTo, length * 1.15);
      const goesEast = wind.smokeTo > 0 && wind.smokeTo < 180;
      add(new kakao.maps.CustomOverlay({
        position: toLatLng(labelAt),
        content: makeLabel("연기 방향", arrowColor, false),
        xAnchor: goesEast ? 0 : 1,
        yAnchor: 0.5,
      }));
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
    return (
      <div style={{ ...styles.map, ...styles.empty }}>
        화재 위치를 찾지 못해 지도를 표시할 수 없어요. 아래 공식 안내의 장소를 확인하세요.
      </div>
    );
  }

  // 카카오 로고가 지도 왼쪽 아래에 표시돼요. 그 위를 가리지 않도록 지도 위에 아무것도 겹치지 않아요.
  return error ? (
    <div style={{ ...styles.map, ...styles.empty }}>{error}</div>
  ) : (
    <div ref={boxRef} style={styles.map} aria-label="화재 위치와 내 위치를 보여주는 지도" />
  );
}

const styles = {
  map: { width: "100%", height: "52vh", minHeight: "340px", maxHeight: "480px", background: "#E9EDE5" },
  empty: { display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", boxSizing: "border-box", textAlign: "center", color: "#374151", fontSize: "14px" },
};