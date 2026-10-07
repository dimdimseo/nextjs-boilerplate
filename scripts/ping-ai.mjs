// AI 연결 시험 스크립트: 짧은 인사 한 마디를 보내고 걸린 시간을 재요
// 실행: node --env-file=.env.local scripts/ping-ai.mjs

const key = (process.env.NVIDIA_API_KEY || "").trim();
const model = (process.env.NVIDIA_MODEL || "nvidia/nemotron-3-super-120b-a12b").trim();

console.log("모델 이름:", model);
console.log("키 앞부분:", key.slice(0, 6)); // nvapi- 로 나와야 정상
console.log("요청 보내는 중... (최대 3분 기다려요)");

const started = Date.now();
try {
  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    signal: AbortSignal.timeout(180000), // 3분
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: 30,
      chat_template_kwargs: { enable_thinking: false }, // 생각 과정 끄기
      messages: [{ role: "user", content: "안녕하세요라고만 답해줘." }],
    }),
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const text = await res.text();
  console.log(`응답 받음: HTTP ${res.status}, ${seconds}초 걸림`);
  console.log(text.slice(0, 500));
} catch (e) {
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`실패 (${seconds}초 뒤): ${e.name} ${e.message}`);
}
