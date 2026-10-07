// 재난문자 API에서 양주시 화재 문자를 가져오는 파일
// 이 파일은 서버에서만 실행돼요. 그래서 API 키가 시민의 브라우저로 나가지 않아요.

const API_URL = "https://www.safetydata.go.kr/V2/api/DSSP-IF-00247";
const ROWS_PER_PAGE = 100; // 한 번에 받을 문자 수

// 수신지역이 양주시인지 확인하는 함수
// 예) "경기도 양주시 "          → true
//     "경기도 양주시 은현면"     → true  (읍면 단위로 온 문자)
//     "경기도 남양주시 "        → false (남양주시는 제외)
//     "경기도 가평군 ,경기도 양주시 " → true (여러 지역에 같이 보낸 문자)
export function isYangju(regionText) {
  if (!regionText) return false;
  return regionText
    .split(",") // 쉼표로 지역 나누기
    .map((region) => region.trim()) // 앞뒤 공백 지우기
    .some(
      (region) =>
        region === "경기도 양주시" || region.startsWith("경기도 양주시 ")
    );
}

// 재난문자 API를 한 페이지 부르는 함수
async function fetchPage(startDate, pageNo) {
  const params = new URLSearchParams({
    serviceKey: process.env.DISASTER_SERVICE_KEY, // .env.local에 넣은 키
    returnType: "json",
    pageNo: String(pageNo),
    numOfRows: String(ROWS_PER_PAGE),
    crtDt: startDate, // 이 날짜 이후 문자 전부
    rgnNm: "양주시", // 남양주시도 섞여 오므로 아래에서 다시 거름
  });

  const res = await fetch(`${API_URL}?${params}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`재난문자 API에 연결하지 못했어요 (HTTP ${res.status})`);
  }

  const data = await res.json();
  if (data?.header?.resultCode !== "00") {
    const reason = data?.header?.errorMsg || data?.header?.resultMsg;
    throw new Error(`재난문자 API 오류: ${reason}`);
  }
  return data;
}

// 양주시 화재 문자만 골라서 최신순으로 돌려주는 함수
export async function getYangjuFires(startDate) {
  if (!process.env.DISASTER_SERVICE_KEY) {
    throw new Error(".env.local에 DISASTER_SERVICE_KEY가 없어요.");
  }

  // 1페이지를 먼저 받고, 전체 건수를 보고 나머지 페이지도 받기
  const first = await fetchPage(startDate, 1);
  let messages = first.body ?? [];
  const totalPages = Math.ceil((first.totalCount ?? 0) / ROWS_PER_PAGE);

  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchPage(startDate, page);
    messages = messages.concat(next.body ?? []);
  }

  return messages
    .filter((m) => isYangju(m.RCPTN_RGN_NM)) // 양주시만
    .filter((m) => m.DST_SE_NM === "화재") // 화재만
    .sort((a, b) => b.CRT_DT.localeCompare(a.CRT_DT)) // 최신순
    .map((m) => ({
      id: m.SN, // 문자 고유번호
      sentAt: m.CRT_DT, // 발송 시각
      text: m.MSG_CN, // 문자 내용
      region: m.RCPTN_RGN_NM.trim(), // 수신지역
    }));
}