/** Leg — 与 docs/schemas/leg.schema.json / data-contract-mock 对齐 */
export type TransportMode = 'train' | 'flight';
export type LegComfort = 'hard_seat' | 'soft_seat' | 'hard_sleeper' | 'soft_sleeper' | 'seat' | 'berth' | string;
export interface Leg {
    id?: string;
    mode: TransportMode;
    from_city: string;
    to_city: string;
    from_station: string;
    to_station: string;
    from_station_code?: string;
    to_station_code?: string;
    dep_at: string;
    arr_at: string;
    duration_min: number;
    price_ref_cny: number;
    price_min_cny?: number;
    price_max_cny?: number;
    seat_hint: string;
    /** 车次/航班号原样透传，引擎禁止改写或编造 */
    service_ref: string;
    source: string;
    as_of: string;
    comfort?: LegComfort | null;
}
