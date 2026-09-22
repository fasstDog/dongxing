#!/usr/bin/env node
'use strict';

const { flight } = require('./adapters');

async function main() {
  const legs = await flight.searchLegs({
    from: '上海',
    to: '成都',
    date: '2026-10-08',
  });
  if (!legs.length || legs.some((leg) => leg.mode !== 'flight' || leg.source !== 'mock')) {
    throw new Error('flight mock returned no valid legs');
  }
  process.stdout.write(`上海→成都 flight mock leg count: ${legs.length}\n`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
