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
