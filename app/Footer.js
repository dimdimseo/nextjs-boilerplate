// 페이지 맨 아래: 정보 출처와 개인정보 안내

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <p style={styles.p}>
        정보 출처: 행정안전부 긴급재난문자(재난안전데이터공유플랫폼), 기상청 초단기실황(기상청 API허브),
        양주시 공장등록현황(2026년 6월 22일 기준), 카카오 지도·주소 검색.
      </p>
      <p style={styles.p}>
        AI는 공개된 재난문자만 읽고 정리하며, 공식 안내를 대신하지 않아요. 항상 재난문자와 현장
        안내를 우선 따르세요.
      </p>
      <p style={styles.p}>
        GPS 위치는 우리 서버로 보내지 않아요. 동네를 고르면 동네 이름만 서버로 보내 위치를 찾아요.
        지도는 카카오가 화면에 보이는 지역의 지도 이미지를 제공해요.
      </p>
    </footer>
  );
}

const styles = {
  footer: { padding: "16px", color: "#6b7280", fontSize: "12px", lineHeight: 1.6 },
  p: { margin: "0 0 6px" },
};
