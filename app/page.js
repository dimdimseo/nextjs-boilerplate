// 첫 화면 파일
// 서버에서 양주시 화재 문자를 가져와 AI로 정리하고, 같은 화재끼리 묶어서 보여줘요.

import { getYangjuFires } from "../lib/disasters";
import { getAnalysis } from "../lib/analysis";
import { getCurrentWind } from "../lib/weather";
import { groupIntoIncidents, timeAgo, formatKst } from "../lib/incidents";
import { findFactories } from "../lib/factories";
import MyLocation from "./MyLocation";

// 접속할 때마다 재난문자 목록은 새로 확인하기 (AI 분석 결과는 저장된 걸 다시 씀)
export const dynamic = "force-dynamic";
// 처음 분석할 때 AI 응답을 기다릴 수 있도록 최대 60초 허용
export const maxDuration = 60;

// 확인용: 8월 1일 이후 문자. 나중에 "최근 며칠"로 바꿀 거예요.
const START_DATE = "20260801";

// AI가 고른 행동 코드를 시민이 읽을 문장으로
const ACTION_LABELS = {
  차량우회: "차량은 주변 도로로 우회",
  건물밖대피: "건물 안에 있다면 밖으로 대피",
  창문닫기: "창문 닫기",
  외출자제: "외출 자제",
  먼곳대피: "사고 지점에서 먼 곳으로 이동",
};

export default async function Home() {
  let fires = [];
  let error = null;

  try {
    fires = await getYangjuFires(START_DATE);
  } catch (e) {
    error = e.message;
  }

  // 문자마다 AI 분석 결과 + 현재 바람을 동시에 가져오기
  const [analyses, wind] = await Promise.all([
    Promise.all(fires.map((fire) => getAnalysis(fire.id, fire.text).catch(() => null))),
    getCurrentWind().catch((e) => ({ error: e.message })),
  ]);

  const incidents = groupIntoIncidents(fires, analyses);

  return (
    <main style={styles.main}>
      <h1 style={styles.title}>양주시 화재 재난문자</h1>
      <p style={styles.summary}>
        2026년 8월 1일 이후 화재 {incidents.length}건 (재난문자 {fires.length}건)
      </p>

      <Wind wind={wind} />
      <MyLocation />

      {error && <p style={styles.error}>{error}</p>}

      {!error && incidents.length === 0 && (
        <p>이 기간에 양주시로 발송된 화재 문자가 없어요.</p>
      )}

      <ul style={styles.list}>
        {incidents.map((incident) => (
          <Incident key={incident.id} incident={incident} />
        ))}
      </ul>
    </main>
  );
}

// 화재 1건
function Incident({ incident }) {
  const place = [incident.address, incident.facility].filter(Boolean).join(" ");
  const placeText = place
    ? `${place}${incident.modifier ? ` ${incident.modifier}` : ""}`
    : "위치 확인 필요 (원문 참고)";
  const title = `${placeText}${incident.target ? ` ${incident.target}` : ""} 화재`;

  const facts = [
    [
      "발생 시각",
      incident.occurredTime
        ? `${formatKst(incident.occurredDate).split(" ").slice(0, 2).join(" ")} ${incident.occurredTime}`
        : null,
    ],
    ["위험 요인", incident.hazards.length ? incident.hazards.join(", ") : null],
  ].filter(([, value]) => value); // 확인되지 않은 항목은 표시하지 않음

  const latest = incident.latest;
  const actions = latest.analysis?.actions ?? [];
  // 차량 화재는 공장과 관계없으니 대조하지 않음
  const factoryInfo = incident.target === "차량" ? null : findFactories(incident.address);

  return (
    <li style={styles.item}>
      <p style={incident.status === "완진" ? styles.badgeDone : styles.badgeActive}>
        {/* 문자에 "완진"이 있을 때만 진화 완료. 없으면 끝났는지 모르니 단정하지 않음 */}
        {incident.status === "완진" ? "진화 완료" : "진화 여부 미확인"}
      </p>
      <h2 style={styles.incidentTitle}>{title}</h2>

      {facts.length > 0 && (
        <dl style={styles.dl}>
          {facts.map(([label, value]) => (
            <div key={label} style={styles.row}>
              <dt style={styles.dt}>{label}</dt>
              <dd style={styles.dd}>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div style={styles.box}>
        <p style={styles.boxTitle}>
          마지막 공식 안내 ({formatKst(latest.sentDate)}, {timeAgo(latest.sentDate)})
        </p>
        <p style={styles.text}>{latest.text}</p>
        {actions.length > 0 && (
          <ul style={styles.actions}>
            {actions.map((code) => (
              <li key={code}>{ACTION_LABELS[code]}</li>
            ))}
          </ul>
        )}
        {!latest.analysis && (
          <p style={styles.mutedOnDark}>정리된 정보를 불러오지 못했어요. 위 원문을 확인하세요.</p>
        )}
      </div>

      {factoryInfo && <FactoryInfo info={factoryInfo} />}

      {incident.earlier.length > 0 && (
        <details style={styles.details}>
          <summary style={styles.summaryToggle}>이전 안내 {incident.earlier.length}건 보기</summary>
          {incident.earlier.map((message) => (
            <div key={message.id} style={styles.earlier}>
              <p style={styles.earlierTime}>{formatKst(message.sentDate)}</p>
              <p style={styles.text}>{message.text}</p>
            </div>
          ))}
        </details>
      )}
    </li>
  );
}

// 공장등록현황 대조 결과 (참고 정보)
function FactoryInfo({ info }) {
  const [year, month, day] = info.baseDate.split("-").map(Number);
  return (
    <div style={styles.factory}>
      <p style={styles.factoryTitle}>참고: 등록 공장 정보</p>
      {info.products.length > 0 ? (
        <p style={styles.factoryText}>
          같은 번지에 등록된 공장 {info.products.length}곳 (생산품: {info.products.join(", ")}).
          화재가 난 곳과 같은 공장인지는 확인되지 않았어요.
        </p>
      ) : (
        <p style={styles.factoryText}>
          이 번지로 등록된 공장은 없어요. 등록되지 않은 시설이거나 다른 번지로 등록됐을 수 있어요.
        </p>
      )}
      <p style={styles.factorySub}>
        {info.area} 전체 등록 공장 {info.areaCount}곳, {year}년 {month}월 {day}일 기준 양주시 공장등록현황
      </p>
    </div>
  );
}

// 현재 바람과 연기 이동 방향
function Wind({ wind }) {
  if (wind.error) {
    return <p style={styles.muted}>현재 바람 정보를 불러오지 못했어요. ({wind.error})</p>;
  }
  return (
    <section style={styles.wind}>
      {wind.isCalm ? (
        <p style={styles.windMain}>지금은 바람이 거의 없어요 ({wind.speed}m/s)</p>
      ) : (
        <p style={styles.windMain}>
          <span
            aria-hidden="true"
            style={{ ...styles.arrow, transform: `rotate(${wind.smokeTo}deg)` }}
          >
            ↑
          </span>
          연기는 {wind.smokeToName} 방향으로 이동해요
        </p>
      )}
      <p style={styles.windSub}>
        {wind.windFromName}풍 {wind.speed}m/s, 기상청 {wind.observedAt} 관측, 양주시청 부근 기준
      </p>
    </section>
  );
}

// 화면 모양 (기능 확인용이라 최소한으로)
const styles = {
  main: {
    maxWidth: "640px",
    margin: "0 auto",
    padding: "24px 16px",
    fontFamily: "system-ui, sans-serif",
    lineHeight: 1.6,
    // 휴대폰의 다크 모드 설정과 상관없이 항상 같은 색으로 보이게 직접 지정
    background: "#ffffff",
    color: "#1a1a1a",
    minHeight: "100vh",
  },
  title: { fontSize: "24px", marginBottom: "4px" },
  summary: { color: "#555", marginTop: 0 },
  error: { color: "#b00020", fontWeight: 600 },
  muted: { color: "#666", fontSize: "14px" },
  mutedOnDark: { color: "#c8cdd3", fontSize: "14px" },
  list: { listStyle: "none", padding: 0 },
  item: { borderTop: "1px solid #ddd", padding: "18px 0" },
  badgeActive: {
    display: "inline-block", margin: 0, padding: "2px 8px", borderRadius: "4px",
    background: "#fde2e1", color: "#9b1c1c", fontSize: "13px", fontWeight: 700,
  },
  badgeDone: {
    display: "inline-block", margin: 0, padding: "2px 8px", borderRadius: "4px",
    background: "#e3e8ee", color: "#374151", fontSize: "13px", fontWeight: 700,
  },
  incidentTitle: { fontSize: "19px", margin: "6px 0 8px" },
  dl: { margin: "0 0 10px" },
  row: { display: "flex", gap: "12px" },
  dt: { width: "72px", flexShrink: 0, color: "#555" },
  dd: { margin: 0, fontWeight: 600 },
  box: { background: "#000000", color: "#ffffff", padding: "12px 14px", borderRadius: "8px" },
  boxTitle: { margin: 0, color: "#c8cdd3", fontSize: "14px", fontWeight: 600 },
  text: { margin: "4px 0 8px" },
  actions: { margin: 0, paddingLeft: "20px" },
  factory: { marginTop: "10px", padding: "10px 12px", border: "1px solid #d0d5db", borderRadius: "8px" },
  factoryTitle: { margin: 0, fontSize: "14px", fontWeight: 700, color: "#333" },
  factoryText: { margin: "4px 0 0", fontSize: "14px" },
  factorySub: { margin: "4px 0 0", fontSize: "13px", color: "#666" },
  details: { marginTop: "10px" },
  summaryToggle: { cursor: "pointer", color: "#1d4ed8", fontSize: "14px" },
  earlier: { borderLeft: "3px solid #ddd", paddingLeft: "10px", marginTop: "8px" },
  earlierTime: { margin: 0, color: "#555", fontSize: "14px" },
  wind: { background: "#000000", color: "#ffffff", borderRadius: "8px", padding: "12px 14px", margin: "16px 0" },
  windMain: { margin: 0, fontSize: "18px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" },
  arrow: { display: "inline-block", fontSize: "24px", lineHeight: 1 },
  windSub: { margin: "4px 0 0", color: "#c8cdd3", fontSize: "14px" },
};