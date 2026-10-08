// 화재별 페이지: /fire/화재번호 (서비스의 메인 화면)
// 이 파일 하나가 화재마다 다른 페이지를 자동으로 만들어줘요.

import { cache } from "react";
import { loadIncidents, findIncident } from "../../../lib/loadIncidents";
import { START_DATE } from "../../../lib/config";
import { isCurrent } from "../../../lib/incidents";
import FireView from "../../FireView";
import Footer from "../../Footer";
import { incidentTitle } from "../../ui";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 주소의 번호로 화재 찾기 (한 번 접속 중엔 한 번만 계산)
const getData = cache(async (id) => {
  const { incidents } = await loadIncidents(START_DATE);
  const incident = findIncident(incidents, id);
  const otherCurrent = incidents.filter((inc) => inc !== incident && isCurrent(inc));
  return { incident, otherCurrent };
});

// 카카오톡 등으로 공유할 때 미리보기 제목과 설명
export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const { incident } = await getData(id);
    if (incident) {
      return {
        title: `${incidentTitle(incident)} | 양주시 AI 재난 거리 안내`,
        description: incident.latest.text.slice(0, 80),
      };
    }
  } catch {
    // 불러오지 못하면 기본 제목
  }
  return { title: "화재 정보 | 양주시 AI 재난 거리 안내" };
}

export default async function FirePage({ params }) {
  const { id } = await params;
  let data = null;
  let error = null;
  try {
    data = await getData(id);
  } catch (e) {
    error = e.message;
  }

  if (error || !data?.incident) {
    return (
      <main style={s.page}>
        <p style={s.msg}>
          {error
            ? `정보를 불러오지 못했어요. (${error})`
            : "이 화재 정보를 찾을 수 없어요. 조회 기간을 벗어났거나 주소가 잘못됐을 수 있어요."}
        </p>
        <Footer />
      </main>
    );
  }

  return (
    <FireView
      incident={data.incident}
      stale={!isCurrent(data.incident)}
      otherCurrent={data.otherCurrent}
    />
  );
}

const s = {
  page: { maxWidth: "560px", margin: "0 auto", minHeight: "100vh", background: "#f3f4f6", fontFamily: "system-ui, sans-serif", padding: "24px 0 0" },
  msg: { margin: "0 16px 12px", fontWeight: 600 },
};