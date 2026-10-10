// 화재 1건 화면 (서버): 데이터와 서버에서 그릴 수 있는 부분을 준비해 FireScreen에 넘겨요

import { LocationProvider } from "./LocationContext";
import FireScreen from "./FireScreen";
import { formatKst } from "../lib/incidents";
import { findFactories } from "../lib/factories";
import { ymdOf } from "../lib/dates";

// "2026.08.06 18:11" 형식
function dotDate(date, time) {
  const ymd = ymdOf(date);
  const d = `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
  return time ? `${d} ${time}` : d;
}

export default function FireView({ incident, stale }) {
  const latest = incident.latest;
  const first = incident.earlier.length ? incident.earlier[incident.earlier.length - 1] : latest;
  const actions = latest.analysis?.actions ?? [];
  const factoryInfo = incident.target === "차량" ? null : findFactories(incident.address);

  const place = [incident.address, incident.facility].filter(Boolean).join(" ");
  const placeText = place ? `${place}${incident.modifier ? ` ${incident.modifier}` : ""}` : "위치 확인 필요";
  const timeOf = (d) => formatKst(d).split(" ")[2];
  const timeText = dotDate(first.sentDate, incident.occurredTime ?? timeOf(first.sentDate));

  // 재난문자 탭
  const messages = [latest, ...incident.earlier]; // 최신순
  const mentionsToday = messages.some((m) => m.text.includes("오늘"));
  const messagePanel = (
    <>
      <div className="panel-title">재난문자 원문</div>
      <p className="panel-description">
        {messages.length > 1 ? `같은 화재로 발송된 문자 ${messages.length}건, 최근 안내부터` : `${dotDate(latest.sentDate, timeOf(latest.sentDate))} 발송`}
      </p>
      {messages.map((m) => (
        <div key={m.id}>
          {messages.length > 1 && <p className="message-time">{dotDate(m.sentDate, timeOf(m.sentDate))} 발송</p>}
          <div className="message">{m.text}</div>
        </div>
      ))}
      {incident.hazards.length > 0 && (
        <>
          <p className="message-time">문자에 적힌 위험 요인</p>
          <div className="hazard-chips">
            {incident.hazards.map((h) => (
              <span key={h} className="hazard-chip">
                {h}
              </span>
            ))}
          </div>
        </>
      )}
      {stale && mentionsToday && (
        <div className="caution">지난 화재의 문자입니다. 문자에 포함된 &lsquo;오늘&rsquo;은 발송 당시 표현입니다.</div>
      )}
    </>
  );

  // 위치·바람 탭의 등록 공장 참고
  const factoryNode = factoryInfo ? (
    <div className="factory-card">
      <strong>참고: 등록 공장 정보</strong>
      <p>
        {factoryInfo.products.length > 0
          ? `같은 번지에 등록된 공장 ${factoryInfo.products.length}곳 (생산품: ${factoryInfo.products.join(", ")}). 화재가 난 곳과 같은 공장인지는 확인되지 않았어요.`
          : "이 번지로 등록된 공장은 없어요. 등록되지 않은 시설이거나 다른 번지로 등록됐을 수 있어요."}
      </p>
      <small>
        {factoryInfo.area} 전체 등록 공장 {factoryInfo.areaCount}곳, 2026년 6월 22일 기준 양주시 공장등록현황
      </small>
    </div>
  ) : null;

  const footer = (
    <div className="sheet-footer">
      <p>정보 출처: 행정안전부 긴급재난문자, 기상청 초단기실황, 양주시 공장등록현황(2026.6.22), 카카오 지도·주소 검색.</p>
      <p>AI는 공개된 재난문자만 읽고 정리하며 공식 안내를 대신하지 않아요. GPS 위치는 서버로 보내지 않아요.</p>
    </div>
  );

  return (
    <LocationProvider>
      <FireScreen
        location={incident.location}
        wind={incident.wind}
        placeText={placeText}
        timeText={timeText}
        stale={stale}
        done={incident.status === "완진"}
        actions={actions}
        hazards={incident.hazards}
        modifier={incident.modifier}
        messagePanel={messagePanel}
        factoryNode={factoryNode}
        footer={footer}
      />
    </LocationProvider>
  );
}