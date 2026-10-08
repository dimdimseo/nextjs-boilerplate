"use client";
// 시트 안의 탭 (행동 안내 / 재난문자 / 위치·바람)

import { useState } from "react";

export default function SheetTabs({ tabs }) {
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div role="tablist" aria-label="화재 정보" style={s.list}>
        {tabs.map((t) => {
          const on = t.id === current.id;
          return (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              onClick={() => setActive(t.id)}
              style={{ ...s.tab, ...(on ? s.tabOn : null) }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`panel-${current.id}`} aria-labelledby={`tab-${current.id}`} style={s.panel}>
        {current.content}
      </div>
    </div>
  );
}

const s = {
  list: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", paddingBottom: "12px", borderBottom: "1px solid #E5E8EC" },
  tab: { height: "44px", border: "none", borderRadius: "12px", background: "#F1F3F6", color: "#4B5563", fontFamily: "inherit", fontSize: "15px", fontWeight: 600, cursor: "pointer" },
  tabOn: { background: "#E8EFFE", color: "#1D4ED8", fontWeight: 700 },
  panel: { paddingTop: "16px" },
};
