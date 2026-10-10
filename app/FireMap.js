"use client";
// 카카오 지도: 화재 발생지, 내 위치, 바람 흐름선 (디자인은 팀원 버전과 같게)
// 지도 키(NEXT_PUBLIC_KAKAO_JS_KEY)는 등록한 사이트에서만 작동해요.

import { useEffect, useRef, useState } from "react";
import { useMyPosition } from "./LocationContext";
import { distanceKm } from "../lib/geo";

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

// 화재 발생지 표시 (팀원 디자인 .incident-marker)
function fireMarker(text) {
  const box = document.createElement("div");
  box.className = "incident-marker";
  const dot = document.createElement("span");
  dot.className = "red";
  const label = document.createElement("span");
  label.textContent = text;
  box.append(dot, label);
  return box;
}

// 바람 흐름선 (팀원 디자인과 같은 곡선 5개, 바람이 향하는 쪽으로 회전, 점선이 흘러감)
// 화재 지점 격자의 관측값 1개를 표현한 것이라 실제 연기 확산 범위를 뜻하지는 않아요.
function windField(toward) {
  const host = document.createElement("div");
  host.className = "wind-field";
  const rotation = toward - 90;
  const paths = [
    "M75 93 C104 77 137 100 168 88 S232 78 267 90",
    "M68 130 C105 111 138 141 175 126 S231 112 279 128",
    "M68 170 C103 151 145 184 181 166 S239 156 286 168",
    "M71 213 C115 195 143 223 180 207 S238 200 278 214",
    "M78 249 C112 232 144 261 178 245 S237 237 269 246",
  ];
  host.innerHTML =
    `<svg width="390" height="350" viewBox="0 0 390 350" aria-hidden="true">` +
    `<defs><marker id="compassWindArrow8" viewBox="0 0 12 12" markerWidth="8" markerHeight="8" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 2 L10 6 L1 10 Z" fill="#3489e6"/></marker></defs>` +
    `<g transform="rotate(${rotation} 195 175)" fill="none" stroke="#3489e6" stroke-linecap="round" stroke-linejoin="round">` +
    paths
      .map(
        (d, i) =>
          `<path d="${d}" class="wind-dash" style="animation-delay:-${(i * 0.37).toFixed(2)}s" stroke-width="${i === 2 ? 3.1 : 2.6}" stroke-dasharray="15 23" opacity="${i === 2 ? 0.86 : 0.72}" marker-end="url(#compassWindArrow8)"/>`
      )
      .join("") +
    `</g></svg>`;
  return host;
}

export default function FireMap({ location, wind, height, settled = true }) {
  const { position } = useMyPosition();
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const drawnRef = useRef([]);
  const [error, setError] = useState(null);

  function draw() {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao || !map || !location) return;

    drawnRef.current.forEach((o) => o.setMap(null));
    drawnRef.current = [];
    const add = (o) => {
      o.setMap(map);
      drawnRef.current.push(o);
    };
    const fire = new kakao.maps.LatLng(location.lat, location.lon);

        // 번지·시설로 찾았으면 "화재 발생지", 동·리 중심이면 "○○ 일대"
    const fireText =
      location.precision === "area"
        ? `${location.label} 일대`
        : location.precision === "facility"
          ? `화재 발생지 · ${location.label}`
          : "화재 발생지";
    add(new kakao.maps.CustomOverlay({ position: fire, content: fireMarker(fireText), xAnchor: 0.5, yAnchor: 0.5, zIndex: 7 }));

    // 바람 흐름선
    if (wind && !wind.error && !wind.isCalm) {
      add(new kakao.maps.CustomOverlay({ position: fire, content: windField(wind.smokeTo), xAnchor: 0.5, yAnchor: 0.5, zIndex: 2 }));
    }

    // 내 위치 (GPS는 파란 점, 동네를 고른 경우는 보라 점)
    if (position) {
      const me = new kakao.maps.LatLng(position.lat, position.lon);
      const dot = document.createElement("div");
      dot.className = "person-marker" + (position.source === "place" ? " demo" : "");
      add(new kakao.maps.CustomOverlay({ position: me, content: dot, yAnchor: 0.5, zIndex: 8 }));

      // 내 위치와 화재를 잇는 점선 + 가운데 거리 표시
      add(new kakao.maps.Polyline({
        path: [me, fire],
        strokeWeight: 3,
        strokeColor: "#2a4157",
        strokeOpacity: 0.75,
        strokeStyle: "shortdash",
        zIndex: 3,
      }));
      const km = distanceKm(position, location);
      const pill = document.createElement("div");
      pill.className = "distance-pill";
      pill.textContent = `${km.toFixed(1)} km`;
      add(new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng((position.lat + location.lat) / 2, (position.lon + location.lon) / 2),
        content: pill,
        yAnchor: 0.5,
        zIndex: 6,
      }));
      const bounds = new kakao.maps.LatLngBounds();
      bounds.extend(fire);
      bounds.extend(me);
      map.setBounds(bounds, 190, 45, 90, 45); // 위쪽은 헤더·알림·풍향 카드만큼 여백
    } else {
      map.setLevel(5);
      map.setCenter(fire);
    }
  }

  // 처음 한 번: 지도 만들기
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
          level: 5,
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

  // 시트가 멈춘 뒤 지도 높이가 바뀌면 카카오 지도에 알려주고 다시 맞추기
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !settled) return;
    const t = setTimeout(() => {
      map.relayout();
      draw();
    }, 300);
    return () => clearTimeout(t);
  }, [height, settled]); // eslint-disable-line react-hooks/exhaustive-deps

  // 카카오 로고가 지도 왼쪽 아래에 보이도록, 지도는 시트 위쪽까지만 차지해요
  const style = { height: height ? `${height}px` : "60dvh" };
  if (!location || error) {
    return (
      <div className="map-canvas" style={{ ...style, display: "grid", placeItems: "center", padding: "24px", textAlign: "center", color: "#617184", fontSize: "13px" }}>
        {error || "화재 위치를 찾지 못해 지도를 표시할 수 없어요."}
      </div>
    );
  }
  return <div ref={boxRef} className="map-canvas" style={style} aria-label="양주시 재난 지도" />;
}