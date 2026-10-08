// 모든 화면을 감싸는 기본 틀
// 디자인은 팀원이 만든 index.html의 CSS를 옮긴 compass.css를 써요.

import "./globals.css";
import "./compass.css";
import Header from "./Header";
import TabBar from "./TabBar";

export const metadata = {
  title: "양주 재난나침반",
  description: "양주시 화재 재난문자를 나와의 거리와 바람 방향으로 보여주는 안내 서비스",
  appleWebApp: { capable: true, title: "양주 재난나침반", statusBarStyle: "default" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f7fa",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard: 아이폰 기본 글꼴(SF Pro) 느낌의 한글 글꼴, 무료(OFL) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <div className="app">
          <Header />
          {children}
          <TabBar />
        </div>
      </body>
    </html>
  );
}