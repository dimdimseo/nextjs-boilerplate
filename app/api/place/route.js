// 고른 동네의 중심 위치를 돌려주는 서버 주소: /api/place?name=옥정동
// 휴대폰에서 동네를 고르면 여기로 "동네 이름"만 보내요. (내 정확한 위치는 보내지 않음)
// 좌표는 저장하지 않고 매번 카카오에서 받아요.

import { geocode } from "../../../lib/geocode";
import { PLACES } from "../../../lib/places";

export async function GET(request) {
  const name = new URL(request.url).searchParams.get("name");

  // 목록에 있는 동네만 받기 (아무 주소나 검색하는 데 쓰이지 않도록)
  if (!PLACES.includes(name)) {
    return Response.json({ error: "목록에 없는 동네예요." }, { status: 400 });
  }

  try {
    const location = await geocode(name);
    if (!location) {
      return Response.json({ error: `${name}의 위치를 찾지 못했어요.` }, { status: 404 });
    }
    return Response.json({ lat: location.lat, lon: location.lon, label: name });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
