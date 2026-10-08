// 첫 화면: 양주시 화재 전체 목록

import { loadIncidents } from "../lib/loadIncidents";
import { getCurrentWind } from "../lib/weather";
import { START_DATE } from "../lib/config";
import { LocationProvider } from "./LocationContext";
import MyLocation from "./MyLocation";
import { Incident, Wind, styles } from "./ui";

// 접속할 때마다 재난문자 목록은 새로 확인하기 (AI 분석 결과는 저장된 걸 다시 씀)
export const dynamic = "force-dynamic";
// 처음 분석할 때 AI 응답을 기다릴 수 있도록 최대 60초 허용
export const maxDuration = 60;

export default async function Home() {
  const windPromise = getCurrentWind().catch((e) => ({ error: e.message }));

  let fires = [];
  let incidents = [];
  let error = null;
  try {
    ({ fires, incidents } = await loadIncidents(START_DATE));
  } catch (e) {
    error = e.message;
  }
  const wind = await windPromise;

  return (
    <LocationProvider>
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
          <Incident key={incident.id} incident={incident} showLink />
        ))}
      </ul>
    </main>
    </LocationProvider>
  );
}