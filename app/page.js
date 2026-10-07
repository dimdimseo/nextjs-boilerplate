// 첫 화면 파일
// 서버에서 양주시 화재 문자를 가져오고, 문자마다 AI 분석 결과를 붙여서 보여줘요.

import { getYangjuFires } from "../lib/disasters";
import { getAnalysis } from "../lib/analysis";

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

  // 문자마다 AI 분석 결과 가져오기 (동시에 요청). 실패한 문자는 분석 없이 원문만 보여줌
  const analyses = await Promise.all(
    fires.map((fire) => getAnalysis(fire.id, fire.text).catch(() => null))
  );

  return (
    <main style={styles.main}>
      <h1 style={styles.title}>양주시 화재 재난문자</h1>
      <p style={styles.summary}>
        2026년 8월 1일 이후 발송된 문자 {fires.length}건
      </p>

      {error && <p style={styles.error}>{error}</p>}

      {!error && fires.length === 0 && (
        <p>이 기간에 양주시로 발송된 화재 문자가 없어요.</p>
      )}

      <ul style={styles.list}>
        {fires.map((fire, i) => (
          <li key={fire.id} style={styles.item}>
            <p style={styles.time}>{fire.sentAt} 발송</p>
            <p style={styles.text}>{fire.text}</p>
            <Analysis result={analyses[i]} />
          </li>
        ))}
      </ul>
    </main>
  );
}

// AI가 정리한 정보 (확인된 값만 표시)
function Analysis({ result }) {
  if (!result) {
    return <p style={styles.muted}>정리된 정보를 불러오지 못했어요. 위 원문을 확인하세요.</p>;
  }

  const place = [result.address, result.facility].filter(Boolean).join(" ");
  const rows = [
    ["상태", result.status === "완진" ? "진화 완료" : "발생"],
    ["대상", result.target],
    ["장소", place ? `${place}${result.modifier ? ` ${result.modifier}` : ""}` : null],
    ["발생 시각", result.occurredTime],
    ["위험 요인", result.hazards.length ? result.hazards.join(", ") : null],
  ].filter(([, value]) => value); // 확인되지 않은 항목은 아예 표시하지 않음

  return (
    <div style={styles.box}>
      <dl style={styles.dl}>
        {rows.map(([label, value]) => (
          <div key={label} style={styles.row}>
            <dt style={styles.dt}>{label}</dt>
            <dd style={styles.dd}>{value}</dd>
          </div>
        ))}
      </dl>
      {result.actions.length > 0 && (
        <>
          <p style={styles.actionsTitle}>안내된 행동</p>
          <ul style={styles.actions}>
            {result.actions.map((code) => (
              <li key={code}>{ACTION_LABELS[code]}</li>
            ))}
          </ul>
        </>
      )}
    </div>
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
  },
  title: { fontSize: "24px", marginBottom: "4px" },
  summary: { color: "#555", marginTop: 0 },
  error: { color: "#b00020", fontWeight: 600 },
  muted: { color: "#777", fontSize: "14px" },
  list: { listStyle: "none", padding: 0 },
  item: { borderTop: "1px solid #ddd", padding: "16px 0" },
  time: { fontWeight: 600, margin: 0 },
  text: { margin: "4px 0 12px" },
  box: { background: "#f4f6f8", padding: "12px 14px", borderRadius: "8px" },
  dl: { margin: 0 },
  row: { display: "flex", gap: "12px" },
  dt: { width: "72px", flexShrink: 0, color: "#555" },
  dd: { margin: 0, fontWeight: 600 },
  actionsTitle: { margin: "10px 0 2px", color: "#555" },
  actions: { margin: 0, paddingLeft: "20px" },
};