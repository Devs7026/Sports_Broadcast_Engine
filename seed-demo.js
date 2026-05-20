/**
 * seed-demo.js — Burst Commentary Demo
 *
 * Creates a live Football match and fires 20 realistic commentary events
 * in rapid succession, simulating a live match burst.
 *
 * Run with:  node seed-demo.js
 * (Make sure the server is already running on port 8000)
 */

const API = 'http://localhost:8000';

// ── Colour helpers for terminal output ─────────────────────────
const C = {
  reset: '\x1b[0m',
  cyan:  '\x1b[36m',
  green: '\x1b[32m',
  yellow:'\x1b[33m',
  red:   '\x1b[31m',
  gray:  '\x1b[90m',
  bold:  '\x1b[1m',
  magenta: '\x1b[35m',
};
const log = (icon, msg, color = C.reset) => console.log(`${color}${icon}  ${msg}${C.reset}`);

// ── Commentary script ───────────────────────────────────────────
const SCRIPT = [
  { minute: 1,  period: '1H', eventType: 'KICKOFF',     actor: null,             team: null,       message: "Arsenal get us underway at the Emirates! The crowd is buzzing.", tags: [] },
  { minute: 7,  period: '1H', eventType: 'FOUL',        actor: 'Enzo Fernandez', team: 'Chelsea',  message: "Enzo Fernandez caught late on Martinelli. Free kick Arsenal, wide left.", tags: ['foul'] },
  { minute: 14, period: '1H', eventType: 'CORNER',      actor: 'Trossard',       team: 'Arsenal',  message: "Corner Arsenal! Trossard whips it in... headed wide by Saliba.", tags: [] },
  { minute: 23, period: '1H', eventType: 'GOAL',        actor: 'Bukayo Saka',    team: 'Arsenal',  message: "⚽ GOAL! BUKAYO SAKA fires a thunderous right-foot shot into the top corner! Arsenal lead 1-0!", tags: ['highlight', 'goal', 'key-moment'] },
  { minute: 26, period: '1H', eventType: 'VAR',         actor: null,             team: null,       message: "VAR check for a possible handball by White in the build-up. Review underway…", tags: ['var'] },
  { minute: 27, period: '1H', eventType: 'VAR',         actor: null,             team: null,       message: "VAR confirms the goal stands. Arsenal 1-0 Chelsea.", tags: ['var'] },
  { minute: 31, period: '1H', eventType: 'YELLOW_CARD', actor: 'Reece James',    team: 'Chelsea',  message: "🟨 Reece James into the book for a cynical foul on Martinelli. He'll need to be careful.", tags: ['yellow-card'] },
  { minute: 38, period: '1H', eventType: 'FOUL',        actor: 'Nicolas Jackson', team: 'Chelsea', message: "Jackson goes in studs-up on Gabriel. Rash challenge, free kick Gunners.", tags: [] },
  { minute: 43, period: '1H', eventType: 'GOAL',        actor: 'Cole Palmer',    team: 'Chelsea',  message: "⚽ EQUALISER! Cole Palmer curls a stunning free kick around the wall. 1-1! What a strike!", tags: ['highlight', 'goal', 'free-kick'] },
  { minute: 45, period: '1H', eventType: 'COMMENT',     actor: null,             team: null,       message: "Three minutes of added time signalled. Arsenal searching for a response.", tags: [] },
  { minute: 47, period: '1H', eventType: 'HALFTIME',    actor: null,             team: null,       message: "⏸ HALF-TIME: Arsenal 1-1 Chelsea. A breathless first 45 minutes at the Emirates.", tags: ['halftime'] },
  { minute: 46, period: '2H', eventType: 'KICKOFF',     actor: null,             team: null,       message: "Chelsea kick off the second half. Enzo Fernandez has a fresh spring in his step.", tags: [] },
  { minute: 54, period: '2H', eventType: 'OFFSIDE',     actor: 'Havertz',        team: 'Arsenal',  message: "🚩 Havertz latches onto a through ball but the flag is up. Offside by a hair.", tags: ['offside'] },
  { minute: 61, period: '2H', eventType: 'SUBSTITUTION',actor: 'Leandro Trossard', team: 'Arsenal', message: "🔄 Arsenal make a change: Trossard off, Gabriel Jesus on. Fresh legs up front.", tags: ['substitution'] },
  { minute: 67, period: '2H', eventType: 'PENALTY',     actor: 'Ben White',      team: 'Arsenal',  message: "🎯 PENALTY ARSENAL! Ben White is bundled over in the box by Gusto. Clear foul, no debate.", tags: ['penalty', 'key-moment'] },
  { minute: 68, period: '2H', eventType: 'GOAL',        actor: 'Martin Ødegaard', team: 'Arsenal', message: "⚽ ØDEGAARD SCORES FROM THE SPOT! Ice cool down the middle! Arsenal retake the lead 2-1!", tags: ['highlight', 'goal', 'penalty'] },
  { minute: 74, period: '2H', eventType: 'RED_CARD',    actor: 'Malo Gusto',     team: 'Chelsea',  message: "🟥 RED CARD! Gusto receives his second yellow for a professional foul. Chelsea down to ten!", tags: ['red-card', 'key-moment'] },
  { minute: 82, period: '2H', eventType: 'GOAL',        actor: 'Gabriel Jesus',  team: 'Arsenal',  message: "⚽ JESUS MAKES IT THREE! He pounces on a loose ball and side-foots into an empty net! 3-1!", tags: ['highlight', 'goal'] },
  { minute: 90, period: '2H', eventType: 'COMMENT',     actor: null,             team: null,       message: "Five minutes of stoppage time. Arsenal fans are in full voice. A dominant second-half display.", tags: [] },
  { minute: 95, period: '2H', eventType: 'FULLTIME',    actor: null,             team: null,       message: "🏁 FULL-TIME: Arsenal 3-1 Chelsea. A statement performance from Mikel Arteta's side!", tags: ['fulltime', 'highlight'] },
];

// ── Helpers ─────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════╗`);
  console.log(`║   Sports Broadcast Engine — Burst Demo      ║`);
  console.log(`╚══════════════════════════════════════════════╝${C.reset}\n`);

  // 1. Create match
  log('🏟️', 'Creating match: Arsenal vs Chelsea (Football)…', C.cyan);
  const now = new Date();
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  let matchId;
  try {
    const { data: match } = await post(`${API}/matches`, {
      sport: 'Football',
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      startTime: now.toISOString(),
      endTime: end.toISOString(),
      homeScore: 0,
      awayScore: 0,
    });
    matchId = match.id;
    log('✅', `Match created! ID: ${C.bold}#${matchId}${C.reset}${C.green}  →  Open the dashboard and click this match!`, C.green);
  } catch (err) {
    log('❌', `Failed to create match: ${err.message}`, C.red);
    process.exit(1);
  }

  // 2. Countdown so user can open the browser
  console.log(`\n${C.yellow}${C.bold}⚡ Starting burst in 4 seconds — select Match #${matchId} in the dashboard now!${C.reset}`);
  for (let i = 4; i >= 1; i--) {
    process.stdout.write(`\r${C.gray}   ${i}…${C.reset}  `);
    await sleep(1000);
  }
  console.log(`\r${C.green}   Go! Broadcasting ${SCRIPT.length} events…${C.reset}\n`);

  // 3. Fire commentary events
  const EVENT_COLORS = {
    GOAL: C.yellow, RED_CARD: C.red, YELLOW_CARD: '\x1b[33m',
    HALFTIME: C.magenta, FULLTIME: C.magenta, VAR: C.cyan,
  };

  let seq = 0;
  for (const event of SCRIPT) {
    seq++;
    const delay = event.eventType === 'GOAL' ? 1400 : event.eventType === 'HALFTIME' || event.eventType === 'FULLTIME' ? 1200 : 700;

    try {
      await post(`${API}/matches/${matchId}/commentary`, {
        minute: event.minute,
        sequence: seq,
        period: event.period,
        eventType: event.eventType,
        actor: event.actor ?? undefined,
        team: event.team ?? undefined,
        message: event.message,
        tags: event.tags.length ? event.tags : undefined,
      });

      const color = EVENT_COLORS[event.eventType] || C.gray;
      const tag = `[${event.period} ${event.minute}']`.padEnd(10);
      const type = (event.eventType || '').padEnd(13);
      log('📡', `${C.gray}${tag}${C.reset} ${color}${type}${C.reset}  ${event.message.slice(0, 72)}…`, '');
    } catch (err) {
      log('⚠️', `Event ${seq} failed: ${err.message}`, C.red);
    }

    await sleep(delay);
  }

  console.log(`\n${C.green}${C.bold}✅ Burst complete! All ${SCRIPT.length} events broadcasted via WebSocket.${C.reset}`);
  console.log(`${C.gray}   Check the dashboard at http://localhost:8000 — select Match #${matchId}${C.reset}\n`);
}

main().catch(err => {
  console.error(`${C.red}Fatal error: ${err.message}${C.reset}`);
  process.exit(1);
});
