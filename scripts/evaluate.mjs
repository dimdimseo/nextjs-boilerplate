// 정답표로 AI를 채점하는 스크립트
// 실행 방법 (프로젝트 맨 위 폴더의 터미널에서):
//   node --env-file=.env.local scripts/evaluate.mjs

import { readFile } from "node:fs/promises";
import { analyzeMessage, checkGrounded, cleanResult } from "../lib/ai.mjs";

const answerKey = JSON.parse(
  await readFile(new URL("../data/answer-key.json", import.meta.url), "utf8")
);

// 비교 규칙
const squash = (v) => (v == null ? null : String(v).replace(/\s/g, "")); // 띄어쓰기 무시
const sameText = (a, b) => squash(a) === squash(b);
const sameSet = (a, b) => {
  const A = new Set(a ?? []);
  const B = new Set(b ?? []);
  return A.size === B.size && [...A].every((x) => B.has(x)); // 순서 무시
};

// 채점할 항목: [항목 이름, 화면에 보일 이름, 비교 방법]
const FIELDS = [
  ["target", "대상", sameText],
  ["address", "장소", sameText],
  ["facility", "시설명", sameText],
  ["modifier", "인근/일원", sameText],
  ["occurredTime", "발생시각", sameText],
  ["hazards", "위험요인", sameSet],
  ["actions", "행동요령", sameSet],
  ["status", "상태", sameText],
];

const score = Object.fromEntries(FIELDS.map(([field]) => [field, 0])); // AI 원래 답
const scoreClean = Object.fromEntries(FIELDS.map(([field]) => [field, 0])); // 검증을 거친 답
let answered = 0; // AI가 응답한 문자 수
let grounded = 0; // 지어낸 값이 없었던 문자 수
const total = answerKey.items.length;

for (const item of answerKey.items) {
  console.log(`\n#${item.no} [${item.group}] ${item.text.slice(0, 40)}...`);

  let result;
  try {
    result = await analyzeMessage(item.text);
    answered++;
  } catch (e) {
    console.log(`  ❌ AI 호출 실패: ${e.message}`);
    continue;
  }

  const cleaned = cleanResult(result, item.text);
  const isCorrect = (value, field, same) => {
    const accepted = item.accept?.[field]; // 정답으로 인정하는 다른 표현이 있으면 함께 비교
    return accepted
      ? accepted.some((answer) => same(value, answer))
      : same(value, item.expected[field]);
  };

  for (const [field, label, same] of FIELDS) {
    const ok = isCorrect(result[field], field, same);
    if (ok) score[field]++;
    if (isCorrect(cleaned[field], field, same)) scoreClean[field]++;
    console.log(
      `  ${ok ? "✅" : "❌"} ${label}: AI=${JSON.stringify(result[field])}  정답=${JSON.stringify(item.expected[field])}`
    );
  }

  const problems = checkGrounded(result, item.text);
  if (problems.length === 0) grounded++;
  else console.log(`  ⚠️ 문자에 없는 값을 만들어냄: ${problems.join(", ")}`);
}

console.log("\n========== 항목별 정확도 (AI 원래 답 → 검증 후) ==========");
for (const [field, label] of FIELDS) {
  console.log(`${label.padEnd(8)} ${score[field]}/${total} → ${scoreClean[field]}/${total}`);
}
const sum = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);
console.log(`\n전체: AI 원래 답 ${sum(score)}/${total * FIELDS.length}, 검증 후 ${sum(scoreClean)}/${total * FIELDS.length} 항목 정답`);
console.log(`AI 응답 성공: ${answered}/${total}건`);
console.log(`지어낸 값 없음: ${grounded}/${answered}건`);
