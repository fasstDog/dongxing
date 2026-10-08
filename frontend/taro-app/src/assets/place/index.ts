/**
 * 地点类型图标（城市 / 火车站 / 机场 / 码头），72×72 透明底 PNG。
 * 来自 Tabler Icons v3.19.0 outline：building-community / train / plane / ship（MIT），见同目录 README.md。
 */
import city from './city.png';
import station from './station.png';
import airport from './airport.png';
import port from './port.png';
import type { PlaceType } from '../../services/places';

export const PLACE_ICON: Record<PlaceType, string> = { city, station, airport, port };
