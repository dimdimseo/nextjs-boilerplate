// 날짜 계산 도우미 (모두 한국 시간 기준, "20260806" 같은 8자리 형식)

const pad = (n) => String(n).padStart(2, "0");

// 어떤 시각의 한국 날짜 → "20260806"
export function ymdOf(date) {
  const k = new Date(date.getTime() + 9 * 3600 * 1000);
  return `${k.getUTCFullYear()}${pad(k.getUTCMonth() + 1)}${pad(k.getUTCDate())}`;
}

// "20260806"에 n일 더하기
export function addDaysYmd(ymd, n) {
  const d = new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8) + n));
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

// 오늘부터 n일 전 (진행 중 화재를 찾을 때 쓰는 조회 시작일)
export function recentStart(days = 3) {
  return addDaysYmd(ymdOf(new Date()), -days);
}

// 재난문자 발송 시각("2026/08/06 18:53:39") → "20260806"
export function sentYmd(sentAt) {
  return sentAt.slice(0, 10).replaceAll("/", "");
}

// 그 달의 마지막 날짜 (일)
export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export { pad };
