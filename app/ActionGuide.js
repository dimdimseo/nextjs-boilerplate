"use client";
// 행동 안내 탭: 재난문자 안내 + 내 위치·풍향을 합쳐 순서대로

import { useMyPosition } from "./LocationContext";
import { buildGuidance } from "../lib/guidance";

export default function ActionGuide({ location, wind, actions }) {
  const { position } = useMyPosition();
  const g = buildGuidance({ actions, location, position, wind });

  return (
    <div>
      <h2 style={s.h2}>지금 확인할 행동</h2>
      <p style={s.sub}>내 위치와 문자 내용에 따라 안내 순서가 달라져요.</p>
      <p style={s.summary}>{g.summary}</p>

      <ol style={s.list}>
        {g.items.map((item, i) => (
          <li key={item.title} style={{ ...s.card, ...(i === 0 ? s.cardFirst : null), ...(item.tone === "alert" ? s.cardAlert : null) }}>
            <p style={s.cardTitle}>
              <span style={{ ...s.num, ...(item.tone === "alert" ? s.numAlert : null) }}>{i + 1}</span>
              {item.title}
            </p>
            <p style={s.cardBody}>{item.body}</p>
          </li>
        ))}
      </ol>

      <p style={s.foot}>
        안내 순서는 재난문자와 위치 정보를 바탕으로 정리한 것이며, 거리만으로 위험도나 대피 필요성을 판단할 수
        없어요. 소방·지자체 지시가 최우선이에요.
      </p>
      <a href="https://www.safekorea.go.kr" target="_blank" rel="noopener noreferrer" style={s.link}>
        국민재난안전포털 행동요령 ↗
      </a>
    </div>
  );
}

const s = {
  h2: { margin: 0, fontSize: "20px", fontWeight: 800 },
  sub: { margin: "4px 0 12px", fontSize: "14px", color: "#4B5563" },
  summary: { margin: "0 0 14px", padding: "12px 14px", borderRadius: "12px", background: "#F4F6F9", fontSize: "13.5px", color: "#374151" },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "12px" },
  card: { padding: "14px 16px", borderRadius: "16px", background: "#FFFFFF", border: "1px solid #E5E8EC" },
  cardFirst: { background: "#F2F6FE", borderColor: "#DCE6FB" },
  cardAlert: { background: "#FDECEC", borderColor: "#F5C2C0" },
  cardTitle: { margin: 0, display: "flex", alignItems: "center", gap: "10px", fontSize: "16px", fontWeight: 700 },
  num: { width: "28px", height: "28px", flexShrink: 0, borderRadius: "8px", background: "#E8EFFE", color: "#2F5BC9", fontSize: "14px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" },
  numAlert: { background: "#FAD3D1", color: "#9B1C1C" },
  cardBody: { margin: "8px 0 0", fontSize: "15px", lineHeight: 1.6, color: "#1F2937" },
  foot: { margin: "16px 0 8px", fontSize: "12.5px", color: "#6B7280" },
  link: { color: "#1D4ED8", fontSize: "14px", fontWeight: 700, textDecoration: "none" },
};
