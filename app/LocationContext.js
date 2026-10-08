"use client";
// 내 위치를 화면 여러 곳에서 같이 쓰기 위한 보관함
// "내 위치 확인하기"에서 받은 위치를 화재 카드들의 거리 계산이 함께 읽어요.
// 위치는 이 휴대폰 화면 안에만 있고, 서버로 보내지 않아요.

import { createContext, useContext, useState } from "react";

const PositionContext = createContext(null);

export function LocationProvider({ children }) {
  const [position, setPosition] = useState(null);
  return (
    <PositionContext.Provider value={{ position, setPosition }}>
      {children}
    </PositionContext.Provider>
  );
}

export function useMyPosition() {
  return useContext(PositionContext) ?? { position: null, setPosition: () => {} };
}
