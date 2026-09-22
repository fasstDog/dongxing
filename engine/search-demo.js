#!/usr/bin/env node
'use strict';

const { searchLegs } = require('./adapters');

async function main() {
  const legs = await searchLegs({
    from: '徐州',
    to: '拉萨',
    date: '2026-10-01',
  });

  process.stdout.write(`徐州→拉萨 mock leg count: ${legs.length}\n`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
