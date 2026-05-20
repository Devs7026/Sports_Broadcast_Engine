/* ─────────────────────────────────────────────────────────────
   Sports Broadcast Engine — Frontend App
   Connects to REST API + WebSocket at ws://localhost:8000/ws
───────────────────────────────────────────────────────────── */

const API = window.location.origin;
const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

// ── State ─────────────────────────────────────────────────────
const state = {
  matches: [],
  selectedMatchId: null,
  filter: 'all',
  autoScroll: true,
  eventCount: 0,
  eventsSent: 0,
  ws: null,
  wsConnected: false,
  pingStart: null,
};

// ── DOM refs ──────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const el = {
  wsDot: $('ws-dot'),
  wsLabel: $('ws-label'),
  matchList: $('match-list'),
  matchCount: $('match-count'),
  feedTitle: $('feed-title'),
  feedSubtitle: $('feed-subtitle'),
  feedList: $('feed-list'),
  feedPlaceholder: $('feed-placeholder'),
  feedScoreboard: $('feed-scoreboard'),
  scoreHomeTeam: $('score-home-team'),
  scoreAwayTeam: $('score-away-team'),
  scoreHomeVal: $('score-home-val'),
  scoreAwayVal: $('score-away-val'),
  scoreSport: $('score-sport'),
  eventCount: $('event-count'),
  subscribedLabel: $('subscribed-label'),
  commentaryMatchTag: $('commentary-match-tag'),
  formCommentary: $('form-commentary'),
  formCreateMatch: $('form-create-match'),
  modalOverlay: $('modal-overlay'),
  toastContainer: $('toast-container'),
  btnPostCommentary: $('btn-post-commentary'),
  statTotalMatches: $('stat-total-matches'),
  statLiveCount: $('stat-live-count'),
  statEventsSent: $('stat-events-sent'),
  statWsLatency: $('stat-ws-latency'),
};

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
  el.toastContainer.appendChild(div);
  setTimeout(() => {
    div.style.animation = 'toast-out 0.25s ease forwards';
    setTimeout(() => div.remove(), 250);
  }, duration);
}

// ── WebSocket ─────────────────────────────────────────────────
function connectWebSocket() {
  if (state.ws && state.ws.readyState < 2) return;

  const ws = new WebSocket(WS_URL);
  state.ws = ws;

  ws.onopen = () => {
    state.wsConnected = true;
    el.wsDot.className = 'ws-dot connected';
    el.wsLabel.textContent = 'Connected';
    if (state.selectedMatchId) subscribeToMatch(state.selectedMatchId);
    // Measure latency
    state.pingStart = Date.now();
    ws.send(JSON.stringify({ type: 'ping' }));
  };

  ws.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }

    if (msg.type === 'commentary') { onCommentaryEvent(msg.data); return; }
    if (msg.type === 'match_created') { onMatchCreated(msg.data); return; }
    if (msg.type === 'subscribed') {
      el.subscribedLabel.style.display = 'flex';
      toast(`Subscribed to match #${msg.matchId}`, 'success', 2000);
    }
    if (msg.type === 'Welcome' && state.pingStart) {
      const lat = Date.now() - state.pingStart;
      el.statWsLatency.textContent = `${lat}ms`;
    }
  };

  ws.onclose = () => {
    state.wsConnected = false;
    el.wsDot.className = 'ws-dot';
    el.wsLabel.textContent = 'Reconnecting…';
    el.subscribedLabel.style.display = 'none';
    setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = () => {
    state.wsConnected = false;
    el.wsDot.className = 'ws-dot error';
    el.wsLabel.textContent = 'Error';
  };
}

function subscribeToMatch(matchId) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
  state.ws.send(JSON.stringify({ type: 'subscribe', matchId }));
}

function unsubscribeFromMatch(matchId) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
  state.ws.send(JSON.stringify({ type: 'unsubscribe', matchId }));
}

// ── Matches ───────────────────────────────────────────────────
async function fetchMatches() {
  try {
    const res = await fetch(`${API}/matches`);
    if (!res.ok) throw new Error('Failed');
    const { data } = await res.json();
    state.matches = data || [];
    renderMatches();
    updateStats();
  } catch {
    toast('Failed to load matches', 'error');
  }
}

function renderMatches() {
  const filtered = state.filter === 'all'
    ? state.matches
    : state.matches.filter(m => m.status === state.filter);

  el.matchCount.textContent = filtered.length;

  if (!filtered.length) {
    el.matchList.innerHTML = `
      <div class="empty-state" id="matches-empty">
        <div class="empty-icon">🏟️</div>
        <p>No ${state.filter === 'all' ? '' : state.filter} matches</p>
        <span>${state.filter === 'all' ? 'Create a match to get started' : 'Try a different filter'}</span>
      </div>`;
    return;
  }

  el.matchList.innerHTML = filtered.map(m => matchCard(m)).join('');
  el.matchList.querySelectorAll('.match-card').forEach(card => {
    card.addEventListener('click', () => selectMatch(+card.dataset.id));
  });
}

function matchCard(m) {
  const statusBadge = {
    live: '<span class="badge badge-live">🔴 LIVE</span>',
    scheduled: '<span class="badge badge-scheduled">🕐 Scheduled</span>',
    finished: '<span class="badge badge-finished">✓ Finished</span>',
  }[m.status] || '';
  const active = m.id === state.selectedMatchId ? 'active' : '';
  const kickoff = m.startTime ? new Date(m.startTime).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
  return `
    <div class="match-card ${active}" data-id="${m.id}" id="match-card-${m.id}">
      <div class="match-card-sport">
        <span>${m.sport}</span>
        ${statusBadge}
      </div>
      <div class="match-card-teams">
        <span class="match-card-team">${m.homeTeam}</span>
        <span class="match-card-score">${m.homeScore}–${m.awayScore}</span>
        <span class="match-card-team away">${m.awayTeam}</span>
      </div>
      <div class="match-card-time">${kickoff}</div>
    </div>`;
}

function selectMatch(id) {
  if (state.selectedMatchId && state.selectedMatchId !== id) {
    unsubscribeFromMatch(state.selectedMatchId);
  }
  state.selectedMatchId = id;
  subscribeToMatch(id);

  const match = state.matches.find(m => m.id === id);
  if (!match) return;

  // Update all active states
  renderMatches();
  updateFeedHeader(match);
  updateAdminTag(match);
  fetchCommentary(id);
}

function updateFeedHeader(match) {
  el.feedTitle.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    ${match.homeTeam} vs ${match.awayTeam}`;
  el.feedSubtitle.textContent = `${match.sport} · ${match.status.charAt(0).toUpperCase() + match.status.slice(1)}`;
  el.feedScoreboard.style.display = 'flex';
  el.scoreHomeTeam.textContent = match.homeTeam;
  el.scoreAwayTeam.textContent = match.awayTeam;
  el.scoreHomeVal.textContent = match.homeScore;
  el.scoreAwayVal.textContent = match.awayScore;
  el.scoreSport.textContent = match.sport;
}

function updateAdminTag(match) {
  el.commentaryMatchTag.textContent = `#${match.id} · ${match.homeTeam} vs ${match.awayTeam}`;
}

// ── Commentary ────────────────────────────────────────────────
async function fetchCommentary(matchId) {
  clearFeed();
  try {
    const res = await fetch(`${API}/matches/${matchId}/commentary?limit=50`);
    if (!res.ok) throw new Error();
    const { data } = await res.json();
    if (!data.length) return;
    // Render oldest first
    [...data].reverse().forEach(ev => addEventCard(ev, false));
    scrollFeed();
  } catch {
    toast('Could not load commentary history', 'error');
  }
}

function clearFeed() {
  state.eventCount = 0;
  el.feedList.innerHTML = '';
  updateEventCount();
  el.feedPlaceholder && el.feedPlaceholder.remove();
}

function onCommentaryEvent(data) {
  // Update scoreboard if needed
  const match = state.matches.find(m => m.id === data.matchId);
  if (match && el.feedScoreboard.style.display !== 'none') {
    // re-fetch match for latest score on GOAL events
    if (data.eventType === 'GOAL') fetchMatches();
  }
  addEventCard(data, true);
}

function onMatchCreated(match) {
  state.matches.unshift(match);
  renderMatches();
  updateStats();
  toast(`New match: ${match.homeTeam} vs ${match.awayTeam}`, 'info');
}

function addEventCard(ev, isNew = false) {
  // Remove placeholder if present
  const placeholder = el.feedList.querySelector('.feed-placeholder');
  if (placeholder) placeholder.remove();

  state.eventCount++;
  updateEventCount();

  const typeClass = [
    'GOAL','YELLOW_CARD','RED_CARD','FOUL','SUBSTITUTION',
    'PENALTY','VAR','OFFSIDE'
  ].includes(ev.eventType) ? `type-${ev.eventType}` : 'type-default';

  const tags = (ev.tags || []).map(t => `<span class="event-tag">#${t}</span>`).join('');
  const time = ev.createdAt ? new Date(ev.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }) : '';
  const actor = ev.actor ? `<span class="event-actor">${ev.actor}${ev.team ? ` · ${ev.team}` : ''}</span>` : '';
  const typeBadge = ev.eventType ? `<span class="event-type-badge ${typeClass}">${ev.eventType.replace(/_/g,' ')}</span>` : '';
  const period = ev.period ? `<span class="event-tag">${ev.period}</span>` : '';

  const div = document.createElement('div');
  div.className = `event-card${isNew ? ' new-event' : ''}`;
  div.innerHTML = `
    <div class="event-minute">
      <span class="event-min-val">${ev.minute ?? '—'}'</span>
      <span class="event-min-label">min</span>
    </div>
    <div class="event-body">
      <div class="event-header">
        ${typeBadge}
        ${actor}
      </div>
      <p class="event-message">${ev.message}</p>
      <div class="event-meta">
        ${period}
        ${tags}
        ${time ? `<span class="event-time-label">${time}</span>` : ''}
      </div>
    </div>`;

  if (isNew) {
    el.feedList.prepend(div);
  } else {
    el.feedList.appendChild(div);
  }

  if (state.autoScroll && isNew) scrollFeed();
}

function scrollFeed() {
  const list = el.feedList;
  list.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateEventCount() {
  el.eventCount.textContent = `${state.eventCount} event${state.eventCount !== 1 ? 's' : ''}`;
}

// ── Stats ──────────────────────────────────────────────────────
function updateStats() {
  el.statTotalMatches.textContent = state.matches.length;
  el.statLiveCount.textContent = state.matches.filter(m => m.status === 'live').length;
  el.statEventsSent.textContent = state.eventsSent;
}

// ── Post Commentary ────────────────────────────────────────────
el.formCommentary.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.selectedMatchId) { toast('Select a match first', 'error'); return; }

  const message = $('inp-message').value.trim();
  if (!message) { toast('Message is required', 'error'); return; }

  const tagsRaw = $('inp-tags').value.trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : undefined;
  const minute = $('inp-minute').value !== '' ? +$('inp-minute').value : undefined;
  const sequence = $('inp-sequence').value !== '' ? +$('inp-sequence').value : undefined;
  const period = $('inp-period').value.trim() || undefined;
  const eventType = $('inp-event-type').value || undefined;
  const actor = $('inp-actor').value.trim() || undefined;
  const team = $('inp-team').value.trim() || undefined;

  const body = { message, minute, sequence, period, eventType, actor, team, tags };
  // Remove undefined keys
  Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);

  el.btnPostCommentary.disabled = true;
  el.btnPostCommentary.textContent = 'Sending…';

  try {
    const res = await fetch(`${API}/matches/${state.selectedMatchId}/commentary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed');

    state.eventsSent++;
    el.statEventsSent.textContent = state.eventsSent;
    toast('Commentary broadcasted!', 'success');
    el.formCommentary.reset();
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  } finally {
    el.btnPostCommentary.disabled = false;
    el.btnPostCommentary.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      Broadcast Event`;
  }
});

// ── Create Match Modal ─────────────────────────────────────────
function openModal() {
  el.modalOverlay.style.display = 'flex';
  // Pre-fill default times (now → +2h)
  const now = new Date();
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const fmt = d => d.toISOString().slice(0, 16);
  $('inp-start-time').value = fmt(now);
  $('inp-end-time').value = fmt(end);
}
function closeModal() {
  el.modalOverlay.style.display = 'none';
  el.formCreateMatch.reset();
}

$('btn-new-match').addEventListener('click', openModal);
$('btn-modal-close').addEventListener('click', closeModal);
$('btn-cancel-match').addEventListener('click', closeModal);
el.modalOverlay.addEventListener('click', e => { if (e.target === el.modalOverlay) closeModal(); });

el.formCreateMatch.addEventListener('submit', async (e) => {
  e.preventDefault();
  const sport    = $('inp-sport').value;
  const homeTeam = $('inp-home-team').value.trim();
  const awayTeam = $('inp-away-team').value.trim();
  const startTime = $('inp-start-time').value;
  const endTime   = $('inp-end-time').value;
  const homeScore = +($('inp-home-score').value || 0);
  const awayScore = +($('inp-away-score').value || 0);

  if (!sport || !homeTeam || !awayTeam || !startTime || !endTime) {
    toast('Please fill all required fields', 'error'); return;
  }

  const btn = $('btn-submit-match');
  btn.disabled = true;
  btn.textContent = 'Creating…';

  try {
    const res = await fetch(`${API}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sport, homeTeam, awayTeam,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        homeScore, awayScore,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed');
    toast(`Match created: ${homeTeam} vs ${awayTeam}`, 'success');
    closeModal();
    await fetchMatches();
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Create Match`;
  }
});

// ── Filters ────────────────────────────────────────────────────
$('match-filters').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.filter = btn.dataset.filter;
  renderMatches();
});

// ── Refresh ────────────────────────────────────────────────────
$('btn-refresh-matches').addEventListener('click', fetchMatches);

// ── Clear Feed ────────────────────────────────────────────────
$('btn-clear-feed').addEventListener('click', () => {
  el.feedList.innerHTML = '';
  state.eventCount = 0;
  updateEventCount();
});

// ── Auto-scroll toggle ─────────────────────────────────────────
$('btn-toggle-autoscroll').addEventListener('click', function() {
  state.autoScroll = !state.autoScroll;
  this.dataset.active = String(state.autoScroll);
  this.title = state.autoScroll ? 'Auto-scroll on' : 'Auto-scroll off';
});

// ── Boot ───────────────────────────────────────────────────────
(async function init() {
  connectWebSocket();
  await fetchMatches();
})();
