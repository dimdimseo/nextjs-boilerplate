// 같은 화재에 대한 문자 여러 건을 "화재 1건"으로 묶는 파일
// 규칙: 검증된 주소가 같고, 앞 문자와 24시간 이내면 같은 화재로 봐요.
// (24시간은 공식 기준이 아니라 이 서비스의 설계값이에요)
// 주소가 확인되지 않은 문자는 섞이지 않도록 묶지 않아요.

const GROUP_WINDOW_MS = 24 * 3600 * 1000;
const squash = (s) => String(s ?? "").replace(/\s/g, "");

// 재난문자 발송 시각("2026/08/06 18:53:39", 한국 시간)을 날짜로 바꾸기
export function parseKst(crtDt) {
  const [date, time] = crtDt.split(" ");
  return new Date(`${date.replaceAll("/", "-")}T${time}+09:00`);
}

// 묶는 기준이 되는 장소 이름 (주소 우선, 없으면 시설명)
function placeKey(analysis) {
  if (analysis?.address) return squash(analysis.address);
  if (analysis?.facility) return squash(analysis.facility);
  return null;
}

// 여러 문자에서 처음으로 확인된 값 고르기 (오래된 문자부터)
const firstValue = (messages, field) =>
  messages.map((m) => m.analysis?.[field]).find((v) => v);

// 묶인 문자들을 화재 1건의 정보로 정리
function summarize(group) {
  const messages = group.messages; // 오래된 순
  const latest = messages[messages.length - 1];
  const first = messages[0];
  const analyses = messages.map((m) => m.analysis).filter(Boolean);

  return {
    id: first.id,
    address: firstValue(messages, "address"),
    facility: firstValue(messages, "facility"),
    // 한 문자라도 "인근/일원"이라고 했다면 정확한 지점이 아니라는 뜻이라 함께 표시
    modifier: firstValue(messages, "modifier"),
    target: firstValue(messages, "target"),
    // 발생 시각은 첫 문자 날짜 + 처음 확인된 시각
    occurredDate: first.sentDate,
    occurredTime: firstValue(messages, "occurredTime"),
    // 어느 문자든 "완진"이 있으면 진화 완료
    status: analyses.some((a) => a.status === "완진") ? "완진" : "발생",
    // 위험 요인은 모든 문자에서 모으기
    hazards: [...new Set(analyses.flatMap((a) => a.hazards ?? []))],
    latest, // 가장 최근 공식 안내
    earlier: messages.slice(0, -1).reverse(), // 이전 안내들 (최신순)
    messageCount: messages.length,
  };
}

// 문자 목록 + AI 분석 결과 → 화재 목록 (최근 안내가 있는 화재부터)
export function groupIntoIncidents(fires, analyses) {
  const items = fires
    .map((fire, i) => ({ ...fire, sentDate: parseKst(fire.sentAt), analysis: analyses[i] }))
    .sort((a, b) => a.sentDate - b.sentDate); // 오래된 순으로 훑으며 묶기

  const groups = [];
  for (const item of items) {
    const key = placeKey(item.analysis);
    const match =
      key &&
      groups.find(
        (g) => g.key === key && item.sentDate - g.lastDate <= GROUP_WINDOW_MS
      );
    if (match) {
      match.messages.push(item);
      match.lastDate = item.sentDate;
    } else {
      groups.push({ key, messages: [item], lastDate: item.sentDate });
    }
  }

  return groups
    .map(summarize)
    .sort((a, b) => b.latest.sentDate - a.latest.sentDate);
}

// "3시간 전", "2일 전" 같은 경과 시간
export function timeAgo(date, now = new Date()) {
  const minutes = Math.floor((now - date) / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

// 날짜를 "8월 6일 21:00" 형식으로 (한국 시간)
export function formatKst(date) {
  const kst = new Date(date.getTime() + 9 * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
}

// "현재 화재" 기준: 마지막 공식 안내가 24시간 이내 (팀 결정 설계값)
export const CURRENT_WINDOW_HOURS = 24;
export function isCurrent(incident, now = new Date()) {
  return now - incident.latest.sentDate <= CURRENT_WINDOW_HOURS * 3600 * 1000;
}

// "11:55"처럼 시각만 (한국 시간)
export function formatKstTime(date) {
  return formatKst(date).split(" ").slice(2).join(" ");
}