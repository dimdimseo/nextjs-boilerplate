"use client";
// 위치·바람 탭 (팀원 디자인: context-row)

import { useMyPosition } from "./LocationContext";
import { relationOf } from "../lib/guidance";

export default function RelationTable({ location, wind, stale }) {
  const { position } = useMyPosition();
  const r = relationOf(location, position, wind);
  const windOk = wind && !wind.error;

  const rows = [
    ["화재까지 직선거리", r.km !== null ? `${r.km.toFixed(1)} km` : "위치 확인 필요"],
    ["화재가 있는 방향", r.dir ? `${r.dir}쪽` : "—"],
    ["거리 기준", position ? (position.source === "place" ? `${position.label} 중심` : "GPS 위치") : "—"],
    ["화재 위치 기준", location ? (location.precision === "area" ? `${location.label} 일대 (번지 미확인)` : location.precision === "facility" ? `${location.label} (시설 위치)` : `${location.label}`) : "위치 미확인"],
    ["관측 풍향·풍속", windOk ? (wind.isCalm ? `바람 거의 없음 · ${wind.speed} m/s` : `${wind.windFromName}풍 · ${wind.speed} m/s`) : "—"],
    ["바람이 향하는 방향", windOk && !wind.isCalm ? `${wind.smokeToName}쪽 (풍향 기준)` : "—"],
  ];

  return (
    <>
      <div className="panel-title">내 위치와 재난의 관계</div>
      {rows.map(([k, v]) => (
        <div key={k} className="context-row">
          <span>{k}</span>
          <strong>{v}</strong>
        </div>
      ))}
      <div className="caution">
        풍향은 화재 지점 부근 기상청 격자의 현재 관측값입니다{windOk ? ` (${wind.observedAt} 관측)` : ""}.
        {stale ? " 과거 화재 당시 연기 확산이나 내 위치의 위험도를 재현하지 않습니다." : " 바람은 바뀔 수 있어요."}
      </div>
    </>
  );
}