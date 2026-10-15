// 재난문자 API에서 양주시 화재 문자를 가져오는 파일
// 이 파일은 서버에서만 실행돼요. 그래서 API 키가 시민의 브라우저로 나가지 않아요.

const API_URL = "https://www.safetydata.go.kr/V2/api/DSSP-IF-00247";
const ROWS_PER_PAGE = 100; // 한 번에 받을 문자 수
const MAX_PAGES = 40; // 아주 오래된 날짜를 골라도 최대 4,000건까지만 (서버 부담 방지)

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

// 키를 읽어오는 함수 (앞뒤 공백·줄바꿈은 자동으로 지움)
function getKey() {
  const key = (process.env.DISASTER_SERVICE_KEY || "").trim();
  if (!key) {
    throw new Error(
      "서버에 DISASTER_SERVICE_KEY가 없어요. (내 컴퓨터는 .env.local, Vercel은 환경변수를 확인하세요)"
    );
  }
  return key;
}

// 재난문자 API를 한 페이지 부르는 함수
async function fetchPage(key, startDate, pageNo) {
  const params = new URLSearchParams({
    serviceKey: key,
    returnType: "json",
    pageNo: String(pageNo),
    numOfRows: String(ROWS_PER_PAGE),
    crtDt: startDate, // 이 날짜 이후 문자 전부
    rgnNm: "양주시", // 남양주시도 섞여 오므로 아래에서 다시 거름
  });

  // 10초 안에 답이 없으면 포기 (느린 서버에 다시 물으면 더 늦어져서 다시 묻지 않음)
  // 연결이 순간적으로 끊긴 경우에만 한 번 더 시도
  let res;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      res = await fetch(`${API_URL}?${params}`, {
        cache: "no-store", // 응답 그대로는 저장하지 않음 (오류 화면까지 저장되지 않도록)
        signal: AbortSignal.timeout(10000),
      });
      break;
    } catch (e) {
      const slow = e?.name === "TimeoutError" || e?.name === "AbortError";
      if (slow || attempt === 2) {
        throw new Error(
          slow
            ? "재난문자 서버 응답이 늦어요. 잠시 후 다시 열어주세요."
            : "재난문자 서버에 연결하지 못했어요. 잠시 후 다시 열어주세요."
        );
      }
    }
  }
  if (!res.ok) {
    throw new Error(`재난문자 API에 연결하지 못했어요 (HTTP ${res.status})`);
  }

  // 데이터(JSON) 대신 웹페이지(HTML)가 오면: 점검 화면이거나 사용량 초과 안내인 경우가 많아요
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.warn("[재난문자] JSON이 아닌 응답:", text.replace(/\s+/g, " ").slice(0, 300));
    throw new Error(
      "재난문자 서버가 데이터 대신 안내 화면을 보냈어요. 점검 중이거나 하루 사용량을 넘었을 수 있어요. 잠시 후 다시 열어주세요."
    );
  }
  if (data?.header?.resultCode !== "00") {
    const reason = data?.header?.errorMsg || data?.header?.resultMsg;
    throw new Error(`재난문자 API 오류: ${reason}`);
  }
  return data;
}

// 양주시 화재 문자만 골라서 최신순으로 돌려주는 함수
async function fetchYangjuFires(startDate) {
  const key = getKey();

  // 1페이지를 먼저 받고, 전체 건수를 보고 나머지 페이지도 받기
  const first = await fetchPage(key, startDate, 1);
  let messages = first.body ?? [];
  const totalPages = Math.min(Math.ceil((first.totalCount ?? 0) / ROWS_PER_PAGE), MAX_PAGES);

  // 2페이지부터는 동시에 받아서 빠르게
  const rest = await Promise.all(
    Array.from({ length: Math.max(totalPages - 1, 0) }, (_, i) => fetchPage(key, startDate, i + 2))
  );
  for (const page of rest) messages = messages.concat(page.body ?? []);

  const yangju = messages.filter((m) => isYangju(m.RCPTN_RGN_NM)); // 양주시만
  const fires = yangju.filter((m) => m.DST_SE_NM === "화재"); // 화재만

  // [확인용] 단계별로 몇 건이 남는지 기록 (키는 기록하지 않음)
  console.log(
    `[재난문자] API 전체 ${first.totalCount ?? "?"}건, 받은 ${messages.length}건, 양주시 ${yangju.length}건, 화재 ${fires.length}건`
  );

  return fires
    .sort((a, b) => b.CRT_DT.localeCompare(a.CRT_DT)) // 최신순
    .map((m) => ({
      id: m.SN, // 문자 고유번호
      sentAt: m.CRT_DT, // 발송 시각
      text: m.MSG_CN, // 문자 내용
      region: m.RCPTN_RGN_NM.trim(), // 수신지역
    }));
}

// 재난문자 API 장애 대비: 저장해둔 공식 문자(2026년 8~9월 양주시 화재 9건)
import backup from "../data/backup-messages.json";
import { unstable_cache } from "next/cache";

// 정상으로 읽은 결과만 저장해서 다시 쓰기 (오류가 나면 저장하지 않음)
// 최근 조회는 1분, 이미 지난 기간은 하루
const cachedRecent = unstable_cache((startDate) => fetchYangjuFires(startDate), ["yangju-fires-recent-v2"], { revalidate: 60 });
const cachedPast = unstable_cache((startDate) => fetchYangjuFires(startDate), ["yangju-fires-past-v2"], { revalidate: 86400 });

// 최근에 재난문자 서버가 실패했으면 잠시 동안은 기다리지 않고 바로 저장본 사용
const SKIP_AFTER_FAIL_MS = 2 * 60 * 1000; // 2분
let lastFailAt = 0;

function useBackup(startDate, reason) {
  const ymd = (sentAt) => sentAt.slice(0, 10).replaceAll("/", "");
  const fires = backup.messages.filter((m) => ymd(m.sentAt) >= startDate);
  fires.snapshot = { savedAt: backup.savedAt, reason };
  return fires;
}

// 양주시 화재 문자 (최신순). API가 고장 나면 저장본을 쓰고, 결과에 snapshot 표시를 붙여요
export async function getYangjuFires(startDate, revalidate = 60) {
  if (Date.now() - lastFailAt < SKIP_AFTER_FAIL_MS) {
    return useBackup(startDate, "최근 재난문자 서버 실패로 잠시 저장본 사용");
  }
  try {
    const fires = await (revalidate >= 3600 ? cachedPast : cachedRecent)(startDate);
    lastFailAt = 0;
    return fires;
  } catch (e) {
    lastFailAt = Date.now();
    // 개발 화면에 빨간 오류 상자가 뜨지 않도록 경고(warn)로 기록 (Vercel 기록에는 남아요)
    console.warn("[재난문자] API 실패, 저장본 사용:", e.message);
    return useBackup(startDate, e.message);
  }
}