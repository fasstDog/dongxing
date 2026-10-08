/**
 * 查询页装饰图形（纯 SVG → data URI，无图片资源、无依赖）。
 * 仅作装饰：小程序 / H5 渲染；RN 端 Image 不渲染 SVG 时自动缺省，不影响功能。
 * 只用 ASCII 字符，便于本地 base64 编码。
 */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Ascii(input: string): string {
  let out = '';
  let i = 0;
  while (i < input.length) {
    const a = input.charCodeAt(i++);
    const b = i < input.length ? input.charCodeAt(i++) : NaN;
    const c = i < input.length ? input.charCodeAt(i++) : NaN;
    const n = (a << 16) | ((isNaN(b) ? 0 : b) << 8) | (isNaN(c) ? 0 : c);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += isNaN(b) ? '=' : B64[(n >> 6) & 63];
    out += isNaN(c) ? '=' : B64[n & 63];
  }
  return out;
}

function svgUri(svg: string) {
  return `data:image/svg+xml;base64,${base64Ascii(svg)}`;
}

/** 头部：远山两层 + 夕阳 + 虚线航迹与小飞机 + 铁轨 */
export const HERO_SCENE = svgUri(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 750 260' preserveAspectRatio='xMidYMax slice'>" +
    "<circle cx='650' cy='70' r='34' fill='#ffd9b0' fill-opacity='0.9'/>" +
    "<circle cx='650' cy='70' r='58' fill='#ffd9b0' fill-opacity='0.12'/>" +
    "<path d='M40 206 Q 260 70 488 116' fill='none' stroke='#ffffff' stroke-opacity='0.55' stroke-width='3' stroke-dasharray='2 12' stroke-linecap='round'/>" +
    "<g transform='translate(496 118) rotate(16)'><path d='M18 0 L-6 -3 L-14 -14 L-19 -14 L-12 -3 L-21 -2 L-25 -8 L-29 -8 L-26 0 L-29 8 L-25 8 L-21 2 L-12 3 L-19 14 L-14 14 L-6 3 Z' fill='#ffffff'/></g>" +
    "<path d='M0 190 L70 150 L130 172 L230 96 L320 160 L400 124 L470 166 L560 112 L650 160 L750 120 L750 260 L0 260 Z' fill='#ffffff' fill-opacity='0.08'/>" +
    "<path d='M230 96 L252 113 L240 112 L226 120 L214 108 Z' fill='#ffffff' fill-opacity='0.35'/>" +
    "<path d='M560 112 L582 128 L568 126 L556 134 L546 124 Z' fill='#ffffff' fill-opacity='0.35'/>" +
    "<path d='M0 226 L100 180 L180 212 L290 160 L390 214 L480 186 L580 222 L670 182 L750 204 L750 260 L0 260 Z' fill='#ffffff' fill-opacity='0.14'/>" +
    "<path d='M0 244 L750 236' stroke='#ffffff' stroke-opacity='0.35' stroke-width='2'/>" +
    "<path d='M0 252 L750 244' stroke='#ffffff' stroke-opacity='0.35' stroke-width='2'/>" +
    "<path d='M0 248 L750 240' stroke='#ffffff' stroke-opacity='0.3' stroke-width='10' stroke-dasharray='3 22'/>" +
    '</svg>'
);

function mountainIcon() {
  return svgUri(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>" +
      "<circle cx='17.5' cy='6.5' r='2.2' fill='#ffffff' fill-opacity='0.85'/>" +
      "<path d='M2 20 L9 8 L12.5 13 L15.5 9.5 L22 20 Z' fill='#ffffff'/>" +
      "<path d='M9 8 L10.8 10.6 L9.6 10.2 L8.2 11 L7.6 10.4 Z' fill='#ffffff' fill-opacity='0.6'/>" +
      '</svg>'
  );
}

function trainIcon(accent: string) {
  return svgUri(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>" +
      "<rect x='5' y='2.5' width='14' height='15' rx='4.5' fill='#ffffff'/>" +
      `<rect x='7.5' y='5.5' width='9' height='4.5' rx='1.2' fill='${accent}'/>` +
      `<circle cx='9' cy='13.6' r='1.3' fill='${accent}'/>` +
      `<circle cx='15' cy='13.6' r='1.3' fill='${accent}'/>` +
      "<path d='M8.5 18.5 L6.5 21.5 M15.5 18.5 L17.5 21.5' stroke='#ffffff' stroke-width='1.8' stroke-linecap='round'/>" +
      '</svg>'
  );
}

export type RouteTheme = { tone: 'indigo' | 'teal' | 'coral' | 'amber'; icon: string };

/** 常用路线票根主题：按样例 key 区分颜色与图标 */
export const ROUTE_THEMES: Record<string, RouteTheme> = {
  'xz-lxa': { tone: 'indigo', icon: mountainIcon() },
  'xz-lxa-xn': { tone: 'teal', icon: mountainIcon() },
  'cd-cq': { tone: 'coral', icon: trainIcon('#ff6b4a') },
  'cd-cq-sn': { tone: 'amber', icon: trainIcon('#e99a2c') }
};
