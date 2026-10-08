// 화재 1건 화면: 지도(위 카드들) → 시트(요약, 내 위치, 탭: 행동 안내 / 재난문자 / 위치·바람)

import { LocationProvider } from "./LocationContext";
import ExpandableMap from "./ExpandableMap";
import SheetSummary from "./SheetSummary";
import SheetTabs from "./SheetTabs";
import ActionGuide from "./ActionGuide";
import RelationTable from "./RelationTable";
import MyLocation from "./MyLocation";
import Footer from "./Footer";
import { incidentTitle } from "./ui";
import { formatKst } from "../lib/incidents";
import { findFactories } from "../lib/factories";
import { ymdOf } from "../lib/dates";

// 2026년 8월 6일 18:11 → "2026.08.06 18:11"
function dotDate(date, time) {
  const ymd = ymdOf(date);
  const d = `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
  return time ? `${d} ${time}` : d;
}

export default function FireView({ incident, stale }) {
  const title = incidentTitle(incident);
  const latest = incident.latest;
  const first = incident.earlier.length ? incident.earlier[incident.earlier.length - 1] : latest;
  const actions = latest.analysis?.actions ?? [];
  const factoryInfo = incident.target === "차량" ? null : findFactories(incident.address);

  const place = [incident.address, incident.facility].filter(Boolean).join(" ");
  const placeText = place ? `${place}${incident.modifier ? ` ${incident.modifier}` : ""}` : "위치 확인 필요";
  const firstTime = formatKst(first.sentDate).split(" ")[2];
  const timeText = dotDate(first.sentDate, incident.occurredTime ?? firstTime);
  const ymd = ymdOf(first.sentDate);
  const recordsHref = `/records?y=${Number(ymd.slice(0, 4))}&m=${Number(ymd.slice(4, 6))}`;

  // 재난문자 탭 (서버에서 그림)
  const messages = [latest, ...incident.earlier]; // 최신순
  const mentionsToday = messages.some((m) => m.text.includes("오늘"));
  const messageTab = (
    <div>
      <h2 style={s.h2}>재난문자 원문</h2>
      {messages.map((m, i) => (
        <div key={m.id} style={{ marginTop: i === 0 ? "8px" : "16px" }}>
          <p style={s.msgTime}>
            {dotDate(m.sentDate, formatKst(m.sentDate).split(" ")[2])} 발송
            {i === 0 && messages.length > 1 ? " · 가장 최근 안내" : ""}
          </p>
          <p style={s.msgBox}>{m.text}</p>
        </div>
      ))}
      {incident.hazards.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <p style={s.msgTime}>문자에 적힌 위험 요인</p>
          <div style={s.chips}>
            {incident.hazards.map((h) => (
              <span key={h} style={s.chipWarm}>
                {h}
              </span>
            ))}
          </div>
        </div>
      )}
      {stale && mentionsToday && (
        <p style={s.note}>지난 화재의 문자예요. 문자에 포함된 &lsquo;오늘&rsquo;은 발송 당시의 표현이에요.</p>
      )}
    </div>
  );

  // 위치·바람 탭: 관계 표 + 등록 공장 참고
  const relationTab = (
    <div>
      <RelationTable location={incident.location} wind={incident.wind} stale={stale} />
      {factoryInfo && (
        <div style={s.factory}>
          <p style={s.factoryTitle}>참고: 등록 공장 정보</p>
          <p style={s.factoryText}>
            {factoryInfo.products.length > 0
              ? `같은 번지에 등록된 공장 ${factoryInfo.products.length}곳 (생산품: ${factoryInfo.products.join(", ")}). 화재가 난 곳과 같은 공장인지는 확인되지 않았어요.`
              : "이 번지로 등록된 공장은 없어요. 등록되지 않은 시설이거나 다른 번지로 등록됐을 수 있어요."}
          </p>
          <p style={s.factorySub}>
            {factoryInfo.area} 전체 등록 공장 {factoryInfo.areaCount}곳, 2026년 6월 22일 기준 양주시 공장등록현황
          </p>
        </div>
      )}
    </div>
  );

  return (
    <LocationProvider>
      <main style={s.page}>
        <ExpandableMap
          location={incident.location}
          wind={incident.wind}
          title={title}
          placeText={placeText}
          timeText={timeText}
          stale={stale}
          recordsHref={recordsHref}
        />

        <section style={s.sheet}>
          <SheetSummary
            placeText={placeText}
            done={incident.status === "완진"}
            stale={stale}
            location={incident.location}
            wind={incident.wind}
            actions={actions}
            modifier={incident.modifier}
          />

          <MyLocation />

          <SheetTabs
            tabs={[
              { id: "guide", label: "행동 안내", content: <ActionGuide location={incident.location} wind={incident.wind} actions={actions} /> },
              { id: "message", label: "재난문자", content: messageTab },
              { id: "relation", label: "위치·바람", content: relationTab },
            ]}
          />

          <Footer />
        </section>
      </main>
    </LocationProvider>
  );
}

const s = {
  page: { maxWidth: "560px", margin: "0 auto", minHeight: "100vh", background: "#FFFFFF", color: "#111418", lineHeight: 1.55 },
  sheet: { background: "#FFFFFF", padding: "4px 16px 0", display: "flex", flexDirection: "column", gap: "16px", position: "relative", zIndex: 5 },
  h2: { margin: 0, fontSize: "20px", fontWeight: 800 },
  msgTime: { margin: 0, fontSize: "13px", color: "#6B7280" },
  msgBox: { margin: "6px 0 0", padding: "16px 18px", borderRadius: "16px", background: "#F4F6F9", border: "1px solid #E5E8EC", fontSize: "16px", lineHeight: 1.65 },
  chips: { display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" },
  chipWarm: { padding: "5px 10px", borderRadius: "999px", background: "#FDEBE3", color: "#8A2C07", fontSize: "13px", fontWeight: 600 },
  note: { margin: "14px 0 0", fontSize: "12.5px", color: "#6B7280" },
  factory: { marginTop: "16px", padding: "12px 14px", borderRadius: "16px", background: "#F4F6F9" },
  factoryTitle: { margin: 0, fontSize: "14px", fontWeight: 700 },
  factoryText: { margin: "6px 0 0", fontSize: "14px", lineHeight: 1.55 },
  factorySub: { margin: "6px 0 0", fontSize: "12px", color: "#6B7280" },
};