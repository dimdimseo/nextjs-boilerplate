// 재난문자 한 건을 AI(Gemma 4)에게 보내서 정보를 뽑아오는 파일
// 서버나 내 컴퓨터 터미널에서만 실행돼요. 키가 시민의 브라우저로 나가지 않아요.
// 나중에 다른 AI로 바꾸고 싶으면 이 파일만 고치면 돼요.

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

// NVIDIA Build 모델 페이지의 코드 예시에 나오는 이름과 다르면,
// .env.local에 NVIDIA_MODEL=정확한이름 을 추가하세요.
const DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b";

// AI에게 주는 지시문
// 핵심 원칙: 문자에 적힌 것만 뽑고, 없으면 null. 행동요령은 정해진 코드에서만 고르기.
const INSTRUCTIONS = `너는 한국 재난문자에서 정보를 뽑아내는 도구다.
반드시 문자에 적힌 내용만 사용한다. 문자에 없는 정보는 추측하지 말고 null로 둔다.
설명이나 다른 글 없이 JSON 객체 하나만 출력한다.

출력 항목:
- "target": 화재가 난 대상 (예: "공장", "섬유공장", "공장건물", "건물", "차량"). 문자에 대상이 없으면 null.
- "address": 읍면동부터 번지까지 (예: "봉양동 356-8", "은현면 하패리 808-1", "장흥면 울대리 산59-14"). "경기도", "양주시"는 빼고, "인근", "일원"도 뺀다. 번지가 없으면 읍면동과 리까지만.
- "facility": 터널 이름 같은 시설명. 없으면 null.
- "modifier": 장소(번지나 시설명) 바로 뒤에 붙은 "인근" 또는 "일원" (예: "봉양동 356-8 인근", "유양동 718 일원"). "인근 주민", "인근 차량"처럼 사람이나 차량 앞에 붙은 "인근"은 해당하지 않는다. 없으면 null.
- "occurredTime": 문자 본문에 적힌 화재 발생 시각을 "HH:MM" 형식으로. 본문에 시각이 없으면 null.
- "hazards": 문자에 적힌 위험 요인 목록 (예: ["유독가스", "연기"], ["분진"]). 없으면 [].
- "actions": 문자가 안내한 행동을 아래 다섯 코드 중에서만 골라 목록으로.
    "차량우회": 차량은 우회
    "건물밖대피": 건물 안의 시민은 건물 밖으로 대피
    "창문닫기": 창문을 닫기
    "외출자제": 외출을 자제하거나 삼가기
    "먼곳대피": 사고지점에서 먼 곳이나 위험이 없는 지역으로 이동·대피
- "status": 문자에 "완진"이나 진화 완료가 적혀 있으면 "완진", 아니면 "발생".`;

// AI 응답에서 JSON 부분만 꺼내기 (앞뒤에 다른 글이 붙어 와도 처리)
function parseJson(content) {
  const cleaned = content
    .replace(/<think>[\s\S]*?<\/think>/g, "") // 혹시 생각 과정이 붙어 오면 지우기
    .replace(/```json|```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`AI 응답에서 JSON을 찾지 못했어요: ${content.slice(0, 200)}`);
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

// 재난문자 한 건을 분석하는 함수
export async function analyzeMessage(text) {
  const key = (process.env.NVIDIA_API_KEY || "").trim();
  if (!key) {
    throw new Error(
      "서버에 NVIDIA_API_KEY가 없어요. (내 컴퓨터는 .env.local, Vercel은 환경변수를 확인하세요)"
    );
  }
  const model = (process.env.NVIDIA_MODEL || DEFAULT_MODEL).trim();

  const res = await fetch(NVIDIA_URL, {
    signal: AbortSignal.timeout(90000), // 90초 넘게 답이 없으면 포기
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0, // 같은 문자에는 늘 같은 답이 나오도록
      max_tokens: 600,
      // Nemotron은 기본으로 "생각 과정"을 먼저 길게 써요. 우리 작업엔 필요 없으니 끄기
      chat_template_kwargs: { enable_thinking: false },
      messages: [
        { role: "user", content: `${INSTRUCTIONS}\n\n재난문자:\n${text}` },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`AI 호출 실패 (HTTP ${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  return parseJson(content);
}

// 비교용 도우미
const squash = (s) => String(s).replace(/\s/g, ""); // 띄어쓰기 무시
const digits = (s) => String(s).replace(/\D/g, ""); // 숫자만 남기기
const noParen = (s) => s.replace(/\([^)]*\)/g, ""); // 괄호 속 내용 지우기

// "인근/일원"이 장소 바로 뒤에 붙어 있는지 확인
// 예) "봉양동 356-8 인근 에서" → 통과
//     "인근 주민께서는"         → 장소 뒤가 아니므로 통과 못 함
function modifierFollowsPlace(result, text) {
  const t = noParen(squash(text));
  return [result.address, result.facility]
    .filter(Boolean)
    .some((place) => t.includes(noParen(squash(place)) + result.modifier));
}

// AI가 뽑은 값이 실제 문자 안에 있는지 확인하는 함수
// (AI가 문자에 없는 값을 지어냈는지 코드로 한 번 더 걸러요)
export function checkGrounded(result, text) {
  const textSquashed = squash(text);
  const textDigits = digits(text);
  const problems = [];

  for (const field of ["target", "address", "facility"]) {
    const value = result[field];
    if (value && !textSquashed.includes(squash(value))) problems.push(field);
  }
  if (result.modifier && !modifierFollowsPlace(result, text)) {
    problems.push("modifier");
  }
  // 시각은 "09: 42", "18시11분"처럼 형식이 제각각이라 숫자만 비교
  if (result.occurredTime && !textDigits.includes(digits(result.occurredTime))) {
    problems.push("occurredTime");
  }
  for (const hazard of result.hazards ?? []) {
    if (!textSquashed.includes(squash(hazard))) problems.push(`hazards(${hazard})`);
  }
  return problems;
}

// 검증을 통과하지 못한 값은 지우고 돌려주는 함수
// 실제 서비스에서는 AI 결과를 바로 쓰지 않고, 이 함수를 거친 결과를 써요.
// "확인되지 않은 정보는 보여주지 않는다"는 기획안 원칙을 코드로 지키는 부분이에요.
export function cleanResult(result, text) {
  const problems = checkGrounded(result, text);
  const cleaned = { ...result };
  for (const field of ["target", "address", "facility", "modifier", "occurredTime"]) {
    if (problems.includes(field)) cleaned[field] = null;
  }
  cleaned.hazards = (result.hazards ?? []).filter(
    (hazard) => !problems.includes(`hazards(${hazard})`)
  );
  const allowed = ["차량우회", "건물밖대피", "창문닫기", "외출자제", "먼곳대피"];
  cleaned.actions = (result.actions ?? []).filter((a) => allowed.includes(a));
  return cleaned;
}
