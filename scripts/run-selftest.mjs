#!/usr/bin/env node

const DEFAULT_BASE = process.env.AXONCLAW_HOST_API_BASE || 'http://127.0.0.1:3210';
const args = process.argv.slice(2);
const watch = args.includes('--watch');
const intervalArg = args.find((arg) => arg.startsWith('--interval='));
const intervalSec = Math.max(10, Number(intervalArg?.split('=')[1] || 60));

const ansi = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function color(text, c) {
  return `${c}${text}${ansi.reset}`;
}

function stamp() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

async function runOnce() {
  const startedAt = Date.now();
  let response;
  try {
    response = await fetch(`${DEFAULT_BASE}/api/app/self-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoStartGateway: true }),
    });
  } catch (err) {
    console.error(color(`[self-test] request failed: ${String(err)}`, ansi.red));
    return { success: false, failed: 1 };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error(color(`[self-test] http ${response.status}: ${text || response.statusText}`, ansi.red));
    return { success: false, failed: 1 };
  }

  const report = await response.json();
  const checks = Array.isArray(report?.checks) ? report.checks : [];
  const summary = report?.summary || {};
  const failed = Number(summary.failed || 0);
  const warned = Number(summary.warned || 0);
  const passed = Number(summary.passed || 0);
  const durationMs = Number(report?.durationMs || (Date.now() - startedAt));

  console.log(color(`\n[self-test] ${stamp()} (${durationMs} ms)`, ansi.cyan));
  console.log(`  pass=${color(String(passed), ansi.green)} warn=${color(String(warned), ansi.yellow)} fail=${color(String(failed), ansi.red)}`);

  for (const item of checks) {
    const status = String(item?.status || '').toLowerCase();
    const tag = status === 'pass' ? color('PASS', ansi.green)
      : status === 'warn' ? color('WARN', ansi.yellow)
        : color('FAIL', ansi.red);
    const name = String(item?.name || item?.id || 'unknown');
    const detail = String(item?.detail || '');
    const autoFixed = item?.autoFixed ? color(' (auto-fixed)', ansi.cyan) : '';
    const cost = color(`${Number(item?.durationMs || 0)}ms`, ansi.gray);
    console.log(`  [${tag}] ${name} ${cost}${autoFixed}`);
    if (detail) {
      console.log(`      ${detail}`);
    }
  }

  return { success: failed === 0, failed };
}

async function main() {
  if (!watch) {
    const result = await runOnce();
    process.exit(result.success ? 0 : 1);
  }

  console.log(color(`[self-test] watch mode started, interval=${intervalSec}s, base=${DEFAULT_BASE}`, ansi.cyan));
  while (true) {
    await runOnce();
    await new Promise((resolve) => setTimeout(resolve, intervalSec * 1000));
  }
}

main().catch((err) => {
  console.error(color(`[self-test] fatal: ${String(err)}`, ansi.red));
  process.exit(1);
});
