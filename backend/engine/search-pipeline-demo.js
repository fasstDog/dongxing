#!/usr/bin/env node
/**
 * Demo: programmatic pipeline 徐州→拉萨 (auto hubs) and via 西宁.
 * Prints main card labels + prices; exits 0.
 */
'use strict';

const { searchPlans } = require('./pipeline');

function cardLine(slot, plan) {
  if (!plan) return `  ${slot}: (none)`;
  const price =
    plan.price_ref_cny != null
      ? plan.price_ref_cny
      : plan.summary && plan.summary.price_ref_cny;
  const label = plan.label || (plan.summary && plan.summary.route_text) || plan.id;
  return `  ${slot}: ${label} · ¥${price}`;
}

function printResult(title, result) {
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

async function main() {
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

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
