"use client";
// 내 위치를 화면 여러 곳(지도 위 GPS 버튼, 내 위치 줄, 거리 카드, 지도)에서 같이 쓰는 보관함
// GPS 위치는 이 휴대폰 화면 안에만 있고, 서버로 보내지 않아요.
// 동네를 고르면 동네 "이름"만 서버(/api/place)로 보내 그 중심 위치를 받아요.

import { createContext, useCallback, useContext, useState } from "react";

const PositionContext = createContext(null);

export function LocationProvider({ children }) {
  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState("idle"); // idle / loading / error
  const [message, setMessage] = useState("");

  // GPS로 지금 위치 확인
  const requestGps = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setMessage("이 브라우저는 위치 확인을 지원하지 않아요. 동네를 골라주세요.");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          source: "gps",
        });
        setStatus("idle");
      },
      (err) => {
        setStatus("error");
        if (err.code === err.PERMISSION_DENIED) {
          setMessage("위치 권한이 꺼져 있어요. 브라우저 설정에서 허용하거나 동네를 골라주세요.");
        } else if (err.code === err.TIMEOUT) {
          setMessage("위치를 찾는 데 시간이 너무 오래 걸렸어요. 다시 누르거나 동네를 골라주세요.");
        } else {
          setMessage("위치를 찾지 못했어요. 동네를 골라주세요.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, []);

  // 동네 고르기
  const choosePlace = useCallback(async (name) => {
    if (!name) return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/place?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "위치를 찾지 못했어요.");
      setPosition({ lat: data.lat, lon: data.lon, source: "place", label: data.label });
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setMessage(e.message);
    }
  }, []);

  return (
    <PositionContext.Provider value={{ position, status, message, requestGps, choosePlace }}>
      {children}
    </PositionContext.Provider>
  );
}

export function useMyPosition() {
  return (
    useContext(PositionContext) ?? {
      position: null,
      status: "idle",
      message: "",
      requestGps: () => {},
      choosePlace: () => {},
    }
  );
}