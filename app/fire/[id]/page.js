// 화재별 페이지: /fire/화재번호
// 이 파일 하나가 화재마다 다른 페이지를 자동으로 만들어줘요.
// 예) /fire/265435 → 봉양동 화재, /fire/266885 → 율정동 화재

import Link from "next/link";
import { cache } from "react";
import { loadIncidents, findIncident } from "../../../lib/loadIncidents";
import { getCurrentWind } from "../../../lib/weather";
import { START_DATE } from "../../../lib/config";
import { LocationProvider } from "../../LocationContext";
import MyLocation from "../../MyLocation";
import { Incident, Wind, incidentTitle, styles } from "../../ui";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 주소의 번호로 화재 하나 찾기 (한 번 접속 중엔 한 번만 계산)
const getIncident = cache(async (id) => {
  const { incidents } = await loadIncidents(START_DATE);
  return findIncident(incidents, id);
});

// 카카오톡 등으로 공유할 때 미리보기에 뜨는 제목과 설명
export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const incident = await getIncident(id);
    if (incident) {
      return {
        title: `${incidentTitle(incident)} | 양주시 AI 재난 거리 안내`,
        description: incident.latest.text.slice(0, 80),
      };
    }
  } catch {
    // 불러오지 못하면 기본 제목 사용
  }
  return { title: "화재 정보 | 양주시 AI 재난 거리 안내" };
}

export default async function FirePage({ params }) {
  const { id } = await params;
  const windPromise = getCurrentWind().catch((e) => ({ error: e.message }));

  let incident = null;
  let error = null;
  try {
    incident = await getIncident(id);
  } catch (e) {
    error = e.message;
  }
  const wind = await windPromise;

  return (
    <LocationProvider>
    <main style={styles.main}>
      <Link href="/" style={styles.backLink}>
        ← 양주시 화재 전체 목록
      </Link>

      {error && <p style={styles.error}>{error}</p>}

      {!error && !incident && (
        <p>
          이 화재 정보를 찾을 수 없어요. 조회 기간(2026년 8월 1일 이후)을 벗어났거나 주소가
          잘못됐을 수 있어요.
        </p>
      )}

      {incident && (
        <>
          <Wind wind={wind} />
          <MyLocation />
          <ul style={styles.list}>
            <Incident incident={incident} />
          </ul>
        </>
      )}
    </main>
    </LocationProvider>
  );
}