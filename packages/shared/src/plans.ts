/** Plans search API — docs/api-plans-contract.md（snake_case） */

import type { TransportMode } from './leg';

export type PathMode = 'auto' | 'user';
export type PlanType = 'cheap' | 'fast' | 'balanced';
export type XferKind = 'same_station' | 'same_city';

export interface PlansSearchRequest {
  from_city: string;
  to_city: string;
  date_flexible?: boolean;
  date?: string | null;
  vias?: string[];
  path_mode?: PathMode;
  /** 引擎内部短途样例用，客户端可不传 */
  extra_hubs?: string[];
}

export interface PlansSearchError {
  code: 'INVALID_REQUEST' | 'NO_LEGS' | 'NO_FEASIBLE' | 'INTERNAL' | string;
  message: string;
}

export interface PlansSearchMeta {
  request: PlansSearchRequest;
  path_mode: PathMode;
  data_source: string;
  as_of: string;
  disclaimer: string;
}

export interface DirectBaseline {
  price_ref_cny: number | null;
  duration_min: number | null;
  summary: string;
  leg_id: string | null;
}

export interface PathInfo {
  cities: string[];
  hubs: string[];
  note: string | null;
}

export interface WhyFacts {
  hubs: string[];
  user_via: boolean;
  price_ref_cny: number;
  direct_price_ref_cny: number | null;
  price_delta_cny: number | null;
  duration_min: number;
  direct_duration_min: number | null;
  duration_delta_min: number | null;
  transfers: number;
  comfort_score: number | null;
  playable: boolean;
  notes: string[];
}

export interface TimelineLegItem {
  kind: 'leg';
  mode: TransportMode;
  mode_label: string;
  from_station: string;
  to_station: string;
  dep_at: string;
  arr_at: string;
  duration_min: number;
  duration_display: string;
  seat_hint: string;
  price_ref_cny: number;
  price_display: string;
  service_ref: string;
  leg_id: string | null;
  comfort: string | null;
}

export interface TimelineXferItem {
  kind: 'xfer';
  city: string;
  xfer_kind: XferKind;
  xfer_kind_label: string;
  buffer_min: number;
  buffer_display: string;
  tip: string;
}

export type TimelineItem = TimelineLegItem | TimelineXferItem;

export interface PlayCard {
  hub_city: string;
  name: string;
  dist_text: string;
  suggest_text: string;
  /** ← TransferPlay.back_ok_note */
  ok: string;
  min_buffer_hours: number;
}

export interface BuyLeg {
  name: string;
  sub: string;
  mode: TransportMode;
  deep_link_hint: string | null;
}

export interface Plan {
  id: string;
  type: PlanType;
  type_label: string;
  price_ref_cny: number;
  price_display: string;
  price_note: string;
  duration_min: number;
  duration_display: string;
  transfers: number;
  route_one_line: string;
  vs_direct: string;
  why: string;
  why_detail: string;
  why_facts: WhyFacts;
  play_hint: string | null;
  path_note: string | null;
  timeline: TimelineItem[];
  play: PlayCard[] | null;
  buy_legs: BuyLeg[];
}

export interface MoreItem {
  id: string;
  type_label: string;
  title: string;
  sub: string;
  price_display: string;
  plan_id: string;
}

export interface PlansSearchResponse {
  ok: boolean;
  error: PlansSearchError | null;
  meta?: PlansSearchMeta;
  direct_baseline?: DirectBaseline | null;
  path?: PathInfo;
  main: Plan[];
  more: MoreItem[];
}
