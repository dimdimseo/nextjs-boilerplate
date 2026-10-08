// 모든 화면을 감싸는 기본 틀
// 페이지 제목, 언어, 글꼴, 아이폰·안드로이드 앱 설정을 여기서 정해요.

import "./globals.css";
import TabBar from "./TabBar";

export const metadata = {
  title: "양주시 AI 재난 거리 안내",
  description: "양주시 화재 재난문자를 나와의 거리와 바람 방향으로 보여주는 안내 서비스",
  appleWebApp: {
    capable: true,
    title: "양주 재난안내",
    statusBarStyle: "default",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4F5F7", // 휴대폰 상단 상태 표시줄 색 (화면 바탕색과 맞춤)
  viewportFit: "cover", // 아이폰 아래쪽 홈 막대 영역까지 계산 (탭바 여백용)
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap"
        />
      </head>
      <body
        style={{
          margin: 0,
          background: "#F4F5F7",
          color: "#111418",
          fontFamily: "'IBM Plex Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
          // 아래 탭바에 내용이 가리지 않도록 여백
          paddingBottom: "calc(64px + env(safe-area-inset-bottom))",
        }}
      >
        {children}
        <TabBar />
      </body>
    </html>
  );
}
