// "지금 확인할 행동" 목록을 만드는 규칙 (휴대폰에서 실행)
// 순서: ① 재난문자의 공식 안내 → ② 연기가 내 쪽인지 → ③ 거리 → ④ 도로 우회 → ⑤ 풍향 참고 → ⑥ 긴급 상황
// 새로운 행동을 지어내지 않고, 문자에 있는 안내와 거리·풍향 사실만 정리해요.

import { distanceKm, bearingDeg, directionName, angleDiff, TOWARD_ME_DEG } from "./geo";

// 구체적 행동의 출처 (프로젝트 자료: 재난문자방송 표준문안 [별표 2], 화학물질사고 국민행동요령)
// 표준문안의 유해화학물질·위험물 사고 문구는 화재 연기 상황에 "참고"로 적용해요.
const SRC = {
  chemIndoor: "재난문자방송 표준문안 · 유해화학물질 유출사고(사고발생1)",
  chemCar: "재난문자방송 표준문안 · 유해화학물질 유출사고(사고발생2)",
  chemEvac: "재난문자방송 표준문안 · 유해화학물질 유출사고(주민소산)",
  hazmatIndoor: "재난문자방송 표준문안 · 위험물 사고(실내대피명령)",
  building: "재난문자방송 표준문안 · 다중밀집시설 대형화재",
  windGuide: "화학물질사고 국민행동요령",
};

// 내 위치와 화재의 관계 (거리, 방향, 바람 상태)
export function relationOf(location, position, wind) {
  const r = { km: null, dir: null, windState: "none" };
  if (location && position) {
    r.km = distanceKm(position, location);
    r.dir = directionName(bearingDeg(position, location)); // 내가 볼 때 화재가 있는 쪽
  }
  if (wind && !wind.error) {
    if (wind.isCalm) r.windState = "calm";
    else if (location && position) {
      const diff = angleDiff(bearingDeg(location, position), wind.smokeTo);
      r.windState = diff <= TOWARD_ME_DEG ? "toward" : diff >= 135 ? "opposite" : "side";
    } else r.windState = "unknown"; // 바람은 있지만 내 위치를 모름
  }
  return r;
}

export function buildGuidance({ actions = [], hazards = [], location, position, wind }) {
  const r = relationOf(location, position, wind);
  const has = (code) => actions.includes(code);
  const items = [];

  if (has("건물밖대피")) {
    items.push({
      title: "재난문자에 대피 안내 포함",
      body: "문자에 명시된 대상과 조건을 확인하세요. 화재 발생 건물에 있는 사람에게는 건물 밖 대피 안내가 포함돼 있어요. 관계기관의 현장 지시를 우선하세요.",
      details: [
        "화재가 난 건물 안에 있다면 건물 밖으로 대피하기",
        "대피할 때 물수건 등으로 코와 입을 막고 피부 노출 줄이기",
      ],
      sources: [SRC.building, SRC.chemEvac],
    });
  }
  if (has("먼곳대피")) {
    items.push({
      title: "사고 지점에서 멀리 이동 안내",
      body: "재난문자에 인근 주민은 사고 지점에서 먼 곳으로 이동하라는 안내가 있어요. 관계기관의 현장 지시를 우선하세요.",
      details: [
        "물수건 등으로 코와 입을 막고 피부 노출 줄이기",
        "바람을 안고 이동하고, 가려는 쪽에서 연기가 오면 바람의 직각 방향으로 피하기",
      ],
      sources: [SRC.chemEvac, SRC.windGuide],
    });
  }
  if (has("창문닫기") || has("외출자제")) {
    const what = [has("창문닫기") && "창문을 닫고", has("외출자제") && "외출을 자제하라는"].filter(Boolean).join(" ");
    items.push({
      title: "창문 닫기·외출 자제 안내",
      body: `재난문자에 ${what} 안내가 있어요. 연기나 냄새가 느껴지면 안내를 따르세요.`,
      details: [
        "환풍기 등 환기 시설 끄기",
        "창문을 닫고 틈새 막기",
        "다음 안내가 있을 때까지 실내에서 기다리기",
      ],
      sources: [SRC.chemIndoor],
    });
  }
  if (r.windState === "toward") {
    items.push({
      title: "연기가 내 쪽으로 올 수 있어요 (추정)",
      body: "화재 지점의 현재 바람이 내 위치 쪽을 향해요. 실내라면 창문을 닫고 기다리고, 이동해야 한다면 바람을 안고 이동하세요.",
      details: [
        "실내: 창문을 닫고 틈새를 막고, 환기 시설 끄기",
        "이동: 바람이 불어오는 쪽으로, 연기가 오면 바람의 직각 방향으로",
      ],
      sources: [SRC.chemIndoor, SRC.windGuide],
      tone: "alert",
    });
  }
  if (r.km !== null) {
    items.push({
      title: "주변 영향과 추가 알림 확인",
      body: `발생지까지 직선거리 약 ${r.km.toFixed(1)}km예요. 거리만으로 안전을 판단하지 말고 주변 연기·냄새와 추가 안내를 확인하세요.`,
    });
  }
  if (has("차량우회")) {
    items.push({
      title: "도로 우회",
      body: "재난문자에 안내된 현장 주변 도로를 우회하고 현장 통제에 따르세요.",
      details: ["운전 중이라면 창문을 닫고 내기순환으로 바꾼 뒤 해당 지역 우회하기"],
      sources: [SRC.chemCar],
    });
  }
  if (r.windState === "side" || r.windState === "opposite") {
    items.push({
      title: "풍향 참고",
      body: `현재 관측 바람은 ${r.windState === "opposite" ? "내 위치 반대 방향을" : "내 위치 쪽이 아닌 방향을"} 향해요. 그러나 풍향만으로 안전하다고 판단할 수 없어요.`,
    });
  }
  items.push({
    title: "이동·긴급 상황",
    body: `${r.dir ? `화재 발생지는 내 위치에서 ${r.dir}쪽이에요. ` : ""}이동할 때는 현장 방향의 도로 통제와 공식 안내를 확인하세요. 연기 유입·호흡 곤란 등 긴급 상황에는 119에 신고하세요.`,
  });

  // 있는 곳에 따라 (문자 내용·위험 요인·바람과 관련된 것만)
  const smoky = has("창문닫기") || has("외출자제") || (hazards ?? []).length > 0 || r.windState === "toward";
  const situations = [];
  const indoorSteps = [];
  const indoorSources = [];
  if (has("건물밖대피")) {
    indoorSteps.push("화재가 난 건물 안이라면 건물 밖으로 대피하기");
    indoorSources.push(SRC.building);
  }
  if (smoky) {
    indoorSteps.push("창문을 닫고 틈새 막기", "환풍기 등 환기 시설 끄기", "다음 안내가 있을 때까지 실내에서 기다리기");
    indoorSources.push(SRC.chemIndoor);
  } else {
    indoorSteps.push("화재와 떨어진 건물이라면 외부와 차단된 실내에 머무르기", "연기나 냄새가 들어오면 창문을 닫고 틈새 막기");
    indoorSources.push(SRC.hazmatIndoor, SRC.chemIndoor);
  }
  situations.push({ where: "집이나 건물 안", steps: indoorSteps, sources: indoorSources });
  situations.push({
    where: "밖",
    steps: [
      "물수건 등으로 코와 입을 막고 피부 노출 줄이기",
      "바람을 안고 이동하고, 연기가 오면 바람의 직각 방향으로 피하기",
      ...(has("먼곳대피") ? ["사고 지점에서 먼 곳으로 이동하기"] : []),
    ],
    sources: [SRC.chemEvac, SRC.windGuide],
  });
  situations.push({
    where: "차 안",
    steps: [
      "창문을 닫고 공기를 내기순환으로 바꾸기",
      has("차량우회") ? "문자에 안내된 현장 주변 도로 우회하기" : "현장 주변 도로를 피해 우회하기",
    ],
    sources: [SRC.chemCar],
  });

  // 한 줄 요약
  const parts = [];
  if (r.km !== null) parts.push(`직선거리 ${r.km.toFixed(1)}km`, `${r.dir}쪽`);
  else parts.push("내 위치를 정하면 거리가 나와요");
  const windText = {
    toward: "현재 관측 풍향은 내 위치 쪽을 향함",
    side: "현재 관측 풍향은 내 위치 쪽이 아님",
    opposite: "현재 관측 풍향은 내 위치 반대쪽을 향함",
    calm: "현재 바람이 거의 없음",
  }[r.windState];
  if (windText) parts.push(windText);

  return { items, situations, summary: parts.join(" · "), relation: r };
}