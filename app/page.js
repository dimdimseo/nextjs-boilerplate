// 첫 화면 파일
// 서버에서 양주시 화재 문자를 가져온 뒤, 목록으로 그려서 보여줘요.

import { getYangjuFires } from "../lib/disasters";

// 접속할 때마다 재난문자를 새로 가져오기 (저장된 옛날 화면을 보여주지 않게)
export const dynamic = "force-dynamic";

// 1단계 확인용: 8월 1일 이후 문자를 가져와요.
// 나중에 실제 서비스에서는 "최근 며칠"로 바꿀 거예요.
const START_DATE = "20260801";

export default async function Home() {
  let fires = [];
  let error = null;

  try {
    fires = await getYangjuFires(START_DATE);
  } catch (e) {
    error = e.message;
  }

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
        {fires.map((fire) => (
          <li key={fire.id} style={styles.item}>
            <p style={styles.time}>{fire.sentAt}</p>
            <p style={styles.text}>{fire.text}</p>
            <p style={styles.region}>수신지역: {fire.region}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

// 화면 모양 (1단계 확인용이라 최소한으로)
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
  list: { listStyle: "none", padding: 0 },
  item: { borderTop: "1px solid #ddd", padding: "16px 0" },
  time: { fontWeight: 600, margin: 0 },
  text: { margin: "4px 0" },
  region: { color: "#666", fontSize: "14px", margin: 0 },
};