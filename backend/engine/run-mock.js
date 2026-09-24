#!/usr/bin/env node
/**
 * Load mock plans JSON, run scoring, print a JSON summary to stdout.
 * Usage: node backend/engine/run-mock.js [path-to-plans.json]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { pickMainCards, planFeatures, scoreCheapest, scoreFastest, scoreBalanced } = require('./score');
const { DEFAULTS: MCT_DEFAULTS, checkConnection } = require('./mct');

const ROOT = path.resolve(__dirname, '..');

function resolvePlansPath(argvPath) {
  if (argvPath) return path.resolve(process.cwd(), argvPath);
  const candidates = [
    path.join(ROOT, 'data', 'plans-xuzhou-lhasa.json'),
    path.join(ROOT, 'data', 'mock', 'plans-xuzhou-lhasa.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

function extractPlans(data) {
  if (Array.isArray(data.plans)) return data.plans;
  if (data.response && Array.isArray(data.response.main)) return data.response.main;
  if (Array.isArray(data.main)) return data.main;
  if (Array.isArray(data.scenarios)) {
    const first = data.scenarios[0];
    if (first && first.response && Array.isArray(first.response.main)) {
      return first.response.main;
    }
  }
  return [];
}

function summarizePlan(plan) {
  if (!plan) return null;
  const f = planFeatures(plan);
  return {
    id: plan.id || null,
    kind: plan.kind || plan.type || null,
    label: plan.label || plan.type_label || null,
    features: f,
    scores: {
      cheapest: scoreCheapest(plan),
      fastest: scoreFastest(plan),
      balanced: scoreBalanced(plan),
    },
  };
}

function mctChecks(plan) {
  const legs = Array.isArray(plan && plan.legs) ? plan.legs : [];
  const out = [];
  for (let i = 0; i < legs.length - 1; i++) {
    out.push(checkConnection(legs[i], legs[i + 1]));
  }
  return out;
}

function main() {
  const plansPath = resolvePlansPath(process.argv[2]);
  if (!fs.existsSync(plansPath)) {
    console.error(JSON.stringify({ ok: false, error: 'PLANS_NOT_FOUND', path: plansPath }));
    process.exit(1);
  }

  const raw = fs.readFileSync(plansPath, 'utf8');
  const data = JSON.parse(raw);
  const plans = extractPlans(data);
  const picked = pickMainCards(plans);

  const summary = {
    ok: true,
    source: path.relative(ROOT, plansPath) || plansPath,
    note: '参考价/时刻；无实时余票。打分为程序规则，非 LLM。',
    mct_defaults_min: MCT_DEFAULTS,
    plan_count: plans.length,
    main_cards: {
      cheapest: summarizePlan(picked.cheapest),
      fastest: summarizePlan(picked.fastest),
      balanced: summarizePlan(picked.balanced),
    },
    mct_by_plan: plans.map((p) => ({
      id: p.id || null,
      connections: mctChecks(p),
    })),
  };

  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

main();
