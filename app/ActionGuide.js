"use client";
// 행동 안내 탭 (팀원 디자인: advice-card)

import { useState } from "react";
import { useMyPosition } from "./LocationContext";
import { buildGuidance } from "../lib/guidance";

export default function ActionGuide({ location, wind, actions, hazards }) {
  const { position } = useMyPosition();
  const g = buildGuidance({ actions, hazards, location, position, wind });
  const [where, setWhere] = useState(0);
  const situations = g.situations ?? []; // 예전 guidance.js여도 화면이 멈추지 않게
  const place = situations[where] ?? situations[0];

  return (
    <>
      <div className="panel-title">지금 확인할 행동</div>
      <p className="panel-description">내 위치와 문자 내용에 따라 안내 순서가 달라집니다.</p>
      <div className="guide-context">{g.summary}</div>

      {g.items.map((item, i) => (
        <div
          key={item.title}
          className={`advice-card${i === 0 ? " primary" : ""}${item.tone === "alert" ? " alert" : ""}`}
        >
          <div className="advice-title">
            <span className="advice-num">{i + 1}</span>
            {item.title}
          </div>
          <div className="advice-body">{item.body}</div>
          {item.details?.length > 0 && (
            <>
              <div className="advice-detail-title">구체적으로</div>
              <ul className="advice-detail">
                {item.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              <div className="advice-source">출처: {item.sources.join(", ")}</div>
            </>
          )}
        </div>
      ))}

      {place && (
        <>
      <div className="where-title">있는 곳에 따라</div>
      <div className="where-tabs" role="tablist" aria-label="있는 곳">
        {situations.map((sit, i) => (
          <button
            key={sit.where}
            type="button"
            role="tab"
            aria-selected={i === where}
            className={`where-tab${i === where ? " active" : ""}`}
            onClick={() => setWhere(i)}
          >
            {sit.where}
          </button>
        ))}
      </div>
      <div className="where-card" role="tabpanel">
        <ul className="advice-detail">
          {place.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
        <div className="advice-source">출처: {place.sources.join(", ")}</div>
      </div>

        </>
      )}

      <div className="caution">
        안내 순서는 재난문자와 위치 정보를 바탕으로 정리한 것이며, 거리만으로 위험도·대피 필요성을 판단할 수
        없습니다. &lsquo;구체적으로&rsquo;와 &lsquo;있는 곳에 따라&rsquo;의 일부 문구는 재난문자방송 표준문안의
        유해화학물질·위험물 사고 문안을 화재 연기 상황에 참고로 적용했습니다. 소방·지자체 지시가 최우선입니다.
      </div>
      <p style={{ margin: "10px 0 0" }}>
        <a className="official" href="https://www.safekorea.go.kr" target="_blank" rel="noopener noreferrer">
          공식 화재 행동요령 ↗
        </a>
      </p>
    </>
  );
}