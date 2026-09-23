/**
 * @dongxing/shared — 小程序 / App / 引擎共用契约类型
 * 文档源：docs/api-plans-contract.md、docs/schemas/*.schema.json
 * 运行时无逻辑；仅类型与常量。
 */
export type { TransportMode, LegComfort, Leg } from './leg';
export type { TransferPlay } from './transfer-play';
export type { PathMode, PlanType, XferKind, PlansSearchRequest, PlansSearchError, PlansSearchMeta, DirectBaseline, PathInfo, WhyFacts, TimelineLegItem, TimelineXferItem, TimelineItem, PlayCard, BuyLeg, Plan, MoreItem, PlansSearchResponse, } from './plans';
export declare const DISCLAIMER: "\u4EF7\u683C\u3001\u65F6\u523B\u5747\u4E3A\u53C2\u8003\uFF0C\u4EE5\u8D2D\u7968\u5E73\u53F0\u4E3A\u51C6";
export declare const PLAN_TYPE_LABELS: Record<'cheap' | 'fast' | 'balanced', string>;
