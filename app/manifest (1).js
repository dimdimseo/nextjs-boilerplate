// PWA 설치 정보 파일
// 휴대폰이 이 파일을 읽고 "홈 화면에 추가"를 할 수 있게 돼요.
// Next.js가 /manifest.webmanifest 주소로 자동 제공해요.

export default function manifest() {
  return {
    name: "양주 재난나침반", // 설치 화면에 보이는 전체 이름
    short_name: "재난나침반", // 홈 화면 아이콘 아래 이름 (짧게)
    description: "양주시 화재 재난문자를 나와의 거리와 바람 방향으로 보여주는 안내 서비스",
    start_url: "/", // 아이콘을 누르면 열리는 주소
    display: "standalone", // 주소창 없이 앱처럼 열기
    background_color: "#f5f7fa", // 앱을 열 때 잠깐 보이는 바탕색 (화면 바탕과 같게)
    theme_color: "#f5f7fa", // 상단 상태 표시줄 색
    lang: "ko",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // 안드로이드가 아이콘을 원형 등으로 잘라도 그림이 안 잘리게 여백을 둔 버전
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
