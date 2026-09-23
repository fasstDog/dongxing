/**
 * @dongxing/shared — 小程序 / App / 引擎共用契约类型
 * 文档源：docs/api-plans-contract.md、docs/schemas/*.schema.json
 * 运行时无逻辑；仅类型与常量。
 */

export type { TransportMode, LegComfort, Leg } from './leg';
export type { TransferPlay } from './transfer-play';
export type {
  PathMode,
  PlanType,
  XferKind,
  PlansSearchRequest,
  PlansSearchError,
  PlansSearchMeta,
  DirectBaseline,
  PathInfo,
  WhyFacts,
  TimelineLegItem,
  TimelineXferItem,
  TimelineItem,
  PlayCard,
  BuyLeg,
  Plan,
  MoreItem,
  PlansSearchResponse,
} from './plans';

export const DISCLAIMER =
  '价格、时刻均为参考，以购票平台为准' as const;

export const PLAN_TYPE_LABELS: Record<'cheap' | 'fast' | 'balanced', string> = {
  cheap: '最省钱',
  fast: '最快',
  balanced: '最综合',
};
