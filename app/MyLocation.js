"use client";
// ↑ 이 줄이 있으면 이 파일은 서버가 아니라 "시민의 휴대폰 브라우저"에서 실행돼요.
// 내 위치를 받아오는 화면 조각이에요.
// 받은 위치는 이 휴대폰 안에서만 쓰고, 서버로 보내지 않아요.

import { useState } from "react";
import { useMyPosition } from "./LocationContext";

export default function MyLocation() {
  // status: 아직 안 누름(idle) / 확인 중(loading) / 성공(done) / 실패(error)
  const [status, setStatus] = useState("idle");
  const { position, setPosition } = useMyPosition(); // 화재 카드들과 같이 쓰는 위치
  const [message, setMessage] = useState("");

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setMessage("이 브라우저는 위치 확인을 지원하지 않아요.");
      return;
    }

    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      // 성공했을 때
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy), // 오차 (m)
        });
        setStatus("done");
      },
      // 실패했을 때
      (err) => {
        setStatus("error");
        if (err.code === err.PERMISSION_DENIED) {
          setMessage("위치 권한이 꺼져 있어요. 브라우저 설정에서 이 사이트의 위치 권한을 허용한 뒤 다시 눌러주세요.");
        } else if (err.code === err.TIMEOUT) {
          setMessage("위치를 찾는 데 시간이 너무 오래 걸렸어요. 실외나 창가에서 다시 눌러주세요.");
        } else {
          setMessage("위치를 찾지 못했어요. 휴대폰의 위치 서비스가 켜져 있는지 확인해주세요.");
        }
      },
      {
        enableHighAccuracy: true, // 가능하면 GPS로 정확하게
        timeout: 15000, // 15초 안에 못 찾으면 실패
        maximumAge: 60000, // 1분 안에 찾은 위치는 다시 써도 됨
      }
    );
  }

  return (
    <section style={styles.box}>
      {status !== "done" && (
        <button onClick={requestLocation} disabled={status === "loading"} style={styles.button}>
          {status === "loading" ? "위치 확인 중..." : "내 위치 확인하기"}
        </button>
      )}

      {status === "idle" && (
        <p style={styles.note}>내 위치는 이 휴대폰 안에서만 쓰이고 서버로 보내지 않아요.</p>
      )}

      {status === "error" && <p style={styles.error}>{message}</p>}

      {status === "done" && position && (
        <>
          <p style={styles.main}>내 위치를 확인했어요</p>
          <p style={styles.note}>
            오차 약 {position.accuracy}m. 아래 화재마다 거리와 방향이 나와요.
          </p>
          <button onClick={requestLocation} style={styles.linkButton}>
            위치 다시 확인
          </button>
        </>
      )}
    </section>
  );
}

const styles = {
  box: { background: "#000000", color: "#ffffff", borderRadius: "8px", padding: "12px 14px", margin: "16px 0" },
  button: {
    fontSize: "16px", fontWeight: 700, padding: "10px 16px", borderRadius: "8px",
    border: "none", background: "#ffffff", color: "#000000", cursor: "pointer",
  },
  linkButton: {
    marginTop: "6px", background: "none", border: "none", padding: 0,
    color: "#9cc3ff", textDecoration: "underline", cursor: "pointer", fontSize: "14px",
  },
  main: { margin: 0, fontSize: "18px", fontWeight: 700 },
  note: { margin: "6px 0 0", color: "#c8cdd3", fontSize: "14px" },
  error: { margin: "8px 0 0", color: "#ff9b91", fontWeight: 600 },
};