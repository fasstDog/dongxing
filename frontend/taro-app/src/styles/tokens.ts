/**
 * 懂行 · 设计 token（TS 镜像）
 * 用于组件 props 里的颜色（如 Switch color）等无法走 SCSS 的地方。
 * 单一来源是 ./tokens.scss，改值两边同步。
 */
export const color = {
  brand: '#1989fa',
  brandDark: '#0f6fd6',
  brandSoft: '#ecf5ff',
  cheap: '#07c160',
  fast: '#ee0a24',
  balanced: '#1989fa',
  danger: '#ee0a24',
  warning: '#ff976a',
  text: '#323233',
  text2: '#646566',
  text3: '#969799',
  text4: '#c8c9cc',
  border: '#ebedf0',
  bg: '#f7f8fa',
  surface: '#ffffff'
} as const;

export type PlanTypeKey = 'cheap' | 'fast' | 'balanced';

export const planColor: Record<PlanTypeKey, string> = {
  cheap: color.cheap,
  fast: color.fast,
  balanced: color.balanced
};

/** 旅行主题（v2，新增；与 tokens.scss 同步） */
export const travel = {
  sky900: '#0b3c49',
  sky700: '#0e5a6b',
  sky500: '#1f86a6',
  sky300: '#5fb8d3',
  coral: '#ff6b4a',
  coral2: '#ff9a5c',
  sand: '#ffd9b0',
  paper: '#fbf6ee',
  ink: '#1c2b33',
  ink3: '#97a3a9',
  ink4: '#c5ccd0',
  routeIndigo: '#4c5fd5',
  routeTeal: '#12867f',
  routeCoral: '#ff6b4a',
  routeAmber: '#e99a2c'
} as const;

/** 地点类型色，与 tokens.scss `$color-place-*` 一致 */
export const placeColor = {
  city: '#0e5a6b',
  station: '#ff6b4a',
  airport: '#4c5fd5',
  port: '#0a8fd8'
} as const;
