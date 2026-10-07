// 재난문자 분석 결과를 저장해두고 다시 쓰는 파일
// 재난문자는 한 번 발송되면 내용이 바뀌지 않아요.
// 그래서 같은 문자(고유번호 SN)는 AI에게 한 번만 보내고, 그 뒤로는 저장된 결과를 써요.
// → 접속자가 아무리 많아도 AI 호출은 "새 문자 수"만큼만 생겨요.

import { unstable_cache } from "next/cache";
import { analyzeMessage, cleanResult } from "./ai.mjs";

// AI 지시문을 크게 고치면 이 숫자를 올리세요. 그러면 모든 문자를 새로 분석해요.
const ANALYSIS_VERSION = "v2"; // v2: 행동요령 규칙 보완 추가

// AI 분석 → 코드 검증까지 거친 결과
async function analyzeAndClean(text) {
  const raw = await analyzeMessage(text);
  return cleanResult(raw, text);
}

// 문자 한 건의 분석 결과를 가져오기 (저장된 게 있으면 그걸 쓰고, 없으면 새로 분석)
export function getAnalysis(id, text) {
  const cached = unstable_cache(
    () => analyzeAndClean(text),
    ["analysis", ANALYSIS_VERSION, String(id)], // 저장 이름표: 버전 + 문자 고유번호
    { revalidate: false } // 기한 없이 계속 보관
  );
  return cached();
}