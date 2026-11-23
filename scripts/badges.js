// Generates the README's coverage and malware-check badges as SVG files.
// Coverage comes from a fresh unit and integration run. The malware badge reads the repository's open
// Dependabot malware alerts, so it needs GITHUB_TOKEN and GITHUB_REPOSITORY and is skipped without them.
//
//   node scripts/badges.js [output-dir]   default: dist/badges
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { badgen } = require('badgen');

const ROOT = path.resolve(__dirname, '..');
const out = path.resolve(ROOT, process.argv[2] || 'dist/badges');

function coverageBadge() {
  const lcov = path.join(out, 'lcov.info');
  const tests = ['unit', 'integration'].flatMap(dir => fs.readdirSync(path.join(ROOT, 'tests', dir))
    .filter(f => f.endsWith('.test.js')).map(f => `tests/${dir}/${f}`));
  const run = spawnSync(process.execPath, ['--test', '--experimental-test-coverage', '--test-coverage-include=extension/**',
    '--test-reporter=dot', '--test-reporter-destination=stdout', '--test-reporter=lcov', `--test-reporter-destination=${lcov}`,
    ...tests], { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] });
  if (run.status !== 0) throw new Error('tests failed, so no coverage badge was generated');

  let found = 0, hit = 0;
  for (const line of fs.readFileSync(lcov, 'utf8').split('\n')) {
    if (line.startsWith('LF:')) found += Number(line.slice(3));
    else if (line.startsWith('LH:')) hit += Number(line.slice(3));
  }
  fs.rmSync(lcov);
  if (!found) throw new Error('no coverage data for extension/');
  const pct = Math.round((hit / found) * 1000) / 10;
  fs.writeFileSync(path.join(out, 'coverage-badge.svg'),
    badgen({ label: 'coverage', status: `${pct}%`, color: pct >= 90 ? 'green' : pct >= 75 ? 'yellow' : 'red' }));
  console.log(`coverage: ${pct}% of extension/ lines, unit and integration tests`);
}

async function malwareBadge() {
  const { GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token } = process.env;
  if (!repo || !token) { console.log('malware: skipped, no GitHub token'); return; }
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'tweaks-for-linkedin-badges' };
  let count = 0;
  let url = `https://api.github.com/repos/${repo}/dependabot/alerts?classification=malware&state=open&per_page=100`;
  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
    count += (await res.json()).length;
    url = /<([^>]+)>;\s*rel="next"/.exec(res.headers.get('link') || '')?.[1];
  }
  fs.writeFileSync(path.join(out, 'malware-badge.svg'), badgen({ label: 'malware checks',
    status: count ? `${count} alert${count === 1 ? '' : 's'}` : 'passing', color: count ? 'red' : 'green' }));
  console.log(`malware: ${count} open alerts`);
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  coverageBadge();
  await malwareBadge();
})().catch(err => { console.error(err.message); process.exit(1); });
