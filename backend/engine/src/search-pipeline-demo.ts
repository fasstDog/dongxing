/**
 * Demo: programmatic pipeline 徐州→拉萨 (auto hubs) and via 西宁.
 * Prints main card labels + prices; exits 0.
 *
 *   cd backend/engine && npm run demo
 */
type PlanLike = {
  id?: string;
  label?: string;
  price_ref_cny?: number;
  play_hint?: string;
  summary?: { price_ref_cny?: number; route_text?: string };
};

type SearchResult = {
  ok: boolean;
  reason?: string;
  main?: {
    cheapest?: PlanLike;
    fastest?: PlanLike;
    balanced?: PlanLike;
  };
  more?: unknown[];
};

// allowJs CJS modules
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { searchPlans } = require('./pipeline.js') as {
  searchPlans: (q: {
    from: string;
    to: string;
    date?: string;
    vias?: string[];
  }) => Promise<SearchResult>;
};

function cardLine(slot: string, plan?: PlanLike): string {
  if (!plan) return `  ${slot}: (none)`;
  const price =
    plan.price_ref_cny != null
      ? plan.price_ref_cny
      : plan.summary && plan.summary.price_ref_cny;
  const label = plan.label || (plan.summary && plan.summary.route_text) || plan.id;
  return `  ${slot}: ${label} · ¥${price}`;
}

function printResult(title: string, result: SearchResult): void {
  console.log('=== ' + title + ' ===');
  console.log('ok:', result.ok, result.reason ? '(' + result.reason + ')' : '');
  console.log('plans:', (result.more || []).length);
  const main = result.main || {};
  console.log(cardLine('cheapest', main.cheapest));
  console.log(cardLine('fastest', main.fastest));
  console.log(cardLine('balanced', main.balanced));
  if (main.cheapest && main.cheapest.play_hint) {
    console.log('  play_hint (cheapest):', main.cheapest.play_hint);
  }
  if (main.balanced && main.balanced.play_hint) {
    console.log('  play_hint (balanced):', main.balanced.play_hint);
  }
  console.log('');
}

async function main(): Promise<void> {
  const date = '2026-10-01';

  const auto = await searchPlans({
    from: '徐州',
    to: '拉萨',
    date,
    vias: [],
  });
  printResult('徐州 → 拉萨 (auto hubs)', auto);

  const via = await searchPlans({
    from: '徐州',
    to: '拉萨',
    date,
    vias: ['西宁'],
  });
  printResult('徐州 → 拉萨 via 西宁', via);

  process.exit(0);
}

main().catch((err: unknown) => {
  const e = err as { stack?: string };
  console.error(e && e.stack ? e.stack : err);
  process.exit(1);
});
