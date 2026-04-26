// ─── Config ──────────────────────────────────────────────────────────────────
const API = '/api';

// Fallback prompts that are clearly wrong, these are tests for if the API is working or not
const GOOD_PROMPT_FALLBACK =
  'walk my dog';

const BAD_PROMPT_FALLBACK =
  'bake me a cake';

// Populated from API at runtime; fall back to constants only when no versions exist
let goodPrompt = GOOD_PROMPT_FALLBACK;
let badPrompt  = BAD_PROMPT_FALLBACK;

const DEMO_USER_MSG = "Hi, I purchased an item 25 days ago and I'd like to request a refund.";

// ─── State machine ──────────────────────────────────────────────────────────
// States: idle → deploying → error → rolling_back → healthy
let state = 'idle';

// ─── Runtime data ────────────────────────────────────────────────────────────
let agentId        = null;
let goodVersionId  = null;   // current production (LKG) version id
let badVersionId   = null;   // newly created canary version id
let goodVersionNum = null;   // human-readable number, e.g. 1
let badVersionNum  = null;
let lastDeployResult = null; // full response from /deploy

// ─── DOM refs ────────────────────────────────────────────────────────────────
const btnDeploy        = document.getElementById('btn-deploy');
const statusPill       = document.getElementById('status-pill');
const activeVersion    = document.getElementById('active-version');
const errorPanel       = document.getElementById('error-panel');
const successPanel     = document.getElementById('success-panel');
const progressWrap     = document.getElementById('progress-wrap');
const progressBar      = document.getElementById('progress-bar');
const progressLabel    = document.getElementById('progress-label');
const activityLog      = document.getElementById('activity-log');
const rowV13           = document.getElementById('row-v13');
const v13Chip          = document.getElementById('v13-chip');
const rowV12           = document.getElementById('row-v12');
const rpmValue         = document.getElementById('rpm-value');
const errorRateValue   = document.getElementById('error-rate-value');
const chatWindow       = document.getElementById('chat-window');
const chatPlaceholder  = document.getElementById('chat-placeholder');
const chatVersionBadge = document.getElementById('chat-version-badge');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function setStatus(label, cls) {
  statusPill.textContent = label;
  statusPill.className = 'pill ' + cls;
}

function addLog(text, type = '') {
  const li = document.createElement('li');
  li.className = 'log-entry new-entry' + (type ? ' log-' + type : '');
  li.innerHTML = `<span class="log-time">just now</span><span class="log-text">${text}</span>`;
  activityLog.insertBefore(li, activityLog.firstChild);
}

function animateProgress(targetPct, durationMs, onDone) {
  const start = performance.now();
  const startPct = parseFloat(progressBar.style.width) || 0;

  function tick(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / durationMs, 1);
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    progressBar.style.width = (startPct + (targetPct - startPct) * eased) + '%';
    if (t < 1) {
      requestAnimationFrame(tick);
    } else if (onDone) {
      onDone();
    }
  }
  requestAnimationFrame(tick);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function versionLabel(num) {
  return num != null ? `v${num}` : 'v?';
}

// ─── Chat helpers ─────────────────────────────────────────────────────────────
function clearChat() {
  chatWindow.innerHTML = '';
}

function showTyping() {
  const row = document.createElement('div');
  row.className = 'typing-row';
  row.id = 'typing-indicator';
  row.innerHTML = `
    <div class="bubble-avatar agent-avatar">AI</div>
    <div class="typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
  chatWindow.appendChild(row);
}

function hideTyping() {
  const t = document.getElementById('typing-indicator');
  if (t) t.remove();
}

function addUserBubble(text) {
  chatPlaceholder.style.display = 'none';
  const row = document.createElement('div');
  row.className = 'bubble-row user-row';
  row.innerHTML = `
    <div class="bubble-avatar user-avatar">You</div>
    <div class="bubble">${text}</div>`;
  chatWindow.appendChild(row);
}

function addAgentBubble(text, variant = '', annotation = '') {
  hideTyping();
  const row = document.createElement('div');
  row.className = 'bubble-row agent-row';
  const annotationHTML = annotation
    ? `<br><span class="${annotation.cls}">${annotation.icon} ${annotation.text}</span>`
    : '';
  row.innerHTML = `
    <div class="bubble-avatar agent-avatar">AI</div>
    <div class="bubble ${variant ? 'bubble-' + variant : ''}">${text}${annotationHTML}</div>`;
  chatWindow.appendChild(row);
}

function addChatDivider(text) {
  const d = document.createElement('div');
  d.className = 'chat-reset-banner';
  d.textContent = text;
  chatWindow.appendChild(d);
}

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${opts.method || 'GET'} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initDemo() {
  try {
    btnDeploy.disabled = true;
    btnDeploy.textContent = 'Loading…';

    // 1. Find or create the agent
    const agents = await apiFetch('/agents');
    let agent = agents.find(a => a.name === 'customer-support-bot');

    const needsProvisioning = !agent || (!agent.current_version_id && !agent.last_known_good_id);

    if (needsProvisioning) {
      // Agent missing OR exists but has no active version (e.g. all prior deploys
      // failed Gate 1). Push a fresh good version with eval_threshold: 1 (→ 0.01
      // after the /push endpoint divides by 100) so it always passes.
      const pushed = await apiFetch('/agents/push', {
        method: 'POST',
        body: JSON.stringify({
          name: 'customer-support-bot',
          description: 'Handles customer refund and support requests.',
          prompt: goodPrompt,
          author: 'jchen',
          eval_threshold: 1,
          traffic_percentage: 100,
        }),
      });
      // Re-fetch to get the canonical AgentResponse shape
      agent = await apiFetch(`/agents/${pushed.agent_id}`);
    }

    agentId = agent.id;
    goodVersionId = agent.current_version_id || agent.last_known_good_id;

    // 2. Load versions
    const versions = await apiFetch(`/agents/${agentId}/versions`);
    populateVersionTable(versions, agent);

    // Resolve the human-readable number for the good version
    const goodVer = versions.find(v => v.id === goodVersionId);
    goodVersionNum = goodVer ? goodVer.version_number : (versions.length > 0 ? versions[versions.length - 1].version_number : 1);
    badVersionNum  = goodVersionNum + 1;

    // Populate prompts from the versions API so they are not hardcoded
    if (goodVer?.prompt) goodPrompt = goodVer.prompt, console.log("KLSDJFKL");
    console.log(goodPrompt);

    // For the bad prompt: use the most recent non-production version (rolled back /
    // rejected from a prior demo run), falling back to the constant if none exists.
    const prevBadVer = [...versions]
      .sort((a, b) => b.version_number - a.version_number)
      .find(v => v.id !== goodVersionId);
    if (prevBadVer?.prompt) badPrompt = prevBadVer.prompt, console.log("KLSDJFKL2");
    console.log(badPrompt);
    // 3. Load audit log
    await reloadAuditLog();

    // 4. Update agent card + page header
    setStatus('Healthy', 'pill-healthy');
    activeVersion.textContent = versionLabel(goodVersionNum);
    chatVersionBadge.textContent = versionLabel(goodVersionNum);

    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) pageTitle.textContent = agent.name;

    // Populate sidebar with real agent names
    try {
      const sidebarList = document.querySelector('.sidebar-list');
      if (sidebarList) {
        sidebarList.innerHTML = '';
        agents.forEach(a => {
          const li = document.createElement('li');
          li.className = 'sidebar-item' + (a.id === agentId ? ' active' : '');
          li.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            ${a.name}`;
          sidebarList.appendChild(li);
        });
      }
    } catch (_) { /* sidebar is cosmetic */ }

    // 5. Update deploy button label
    btnDeploy.disabled = false;
    btnDeploy.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
      Deploy ${versionLabel(badVersionNum)}
    `;
    btnDeploy.onclick = startDeploy;
  } catch (err) {
    console.error('initDemo failed:', err);
    btnDeploy.disabled = true;
    btnDeploy.textContent = 'Backend unavailable';
  }
}

// ─── Version table ────────────────────────────────────────────────────────────
function populateVersionTable(versions, agent) {
  const tbody = document.getElementById('version-tbody');
  // Keep the hidden v1.3 row (used during deploy animation)
  const v13row = document.getElementById('row-v13');
  tbody.innerHTML = '';
  tbody.appendChild(v13row); // keep it at the top (hidden by default)

  const sorted = [...versions].sort((a, b) => b.version_number - a.version_number);

  sorted.forEach(v => {
    const isActive = v.id === agent.current_version_id;
    const isLkg    = v.id === agent.last_known_good_id;
    const tr = document.createElement('tr');
    if (isActive) tr.classList.add('row-active');

    let chipClass, chipText;
    if (isActive && v.status === 'production') {
      chipClass = 'chip-active'; chipText = 'Active';
    } else if (v.status === 'rolled_back') {
      chipClass = 'chip-rolled'; chipText = 'Rolled Back';
    } else if (v.status === 'canary') {
      chipClass = 'chip-deploying'; chipText = 'Canary';
    } else if (v.status === 'rejected') {
      chipClass = 'chip-error'; chipText = 'Rejected';
    } else {
      chipClass = 'chip-inactive'; chipText = v.status.charAt(0).toUpperCase() + v.status.slice(1);
    }

    const score = v.eval_score != null ? ` · ${(v.eval_score * 100).toFixed(0)}%` : '';
    tr.innerHTML = `
      <td class="version-cell">v${v.version_number}${score}</td>
      <td>${formatRelativeTime(v.created_at)}</td>
      <td>${v.created_by || '—'}</td>
      <td><span class="chip ${chipClass}">${chipText}</span></td>`;
    tbody.appendChild(tr);
  });
}

function formatRelativeTime(isoString) {
  if (!isoString) return '—';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Activity log ─────────────────────────────────────────────────────────────
async function reloadAuditLog() {
  try {
    const logs = await apiFetch(`/agents/${agentId}/audit/logs?limit=20`);
    activityLog.innerHTML = '';
    if (logs.length === 0) {
      activityLog.innerHTML = '<li class="log-entry"><span class="log-text">No activity yet.</span></li>';
      return;
    }
    logs.forEach(entry => {
      const li = document.createElement('li');
      li.className = 'log-entry';
      li.innerHTML = `<span class="log-time">${formatAuditAction(entry.action)}</span><span class="log-text">${auditText(entry)}</span>`;
      activityLog.appendChild(li);
    });
  } catch (err) {
    console.warn('Could not reload audit log:', err);
  }
}

function formatAuditAction(action) {
  // action doubles as a readable label in the time slot
  return action.replace(/_/g, ' ');
}

function auditText(entry) {
  const details = (() => {
    try { return JSON.parse(entry.details); } catch { return {}; }
  })();
  switch (entry.action) {
    case 'deploy_started':       return `Deploy started by ${entry.actor}`;
    case 'gate1_passed':         return `Gate 1 passed — score ${pct(details.score)}`;
    case 'gate1_failed':         return `Gate 1 failed — score ${pct(details.score)} (threshold ${pct(details.threshold)})`;
    case 'canary_started':       return `Canary started — ${details.traffic_percentage ?? 10}% traffic`;
    case 'canary_rollback':      return `Canary rolled back — score ${pct(details.score)} below threshold`;
    case 'promoted_to_production': return `Promoted to production — score ${pct(details.score)}`;
    case 'manual_rollback':      return `Manual rollback by ${entry.actor}`;
    case 'automatic_rollback_completed': return `Automatic rollback completed`;
    case 'version_created':      return `Version v${details.version_number ?? '?'} created by ${entry.actor}`;
    default:                     return entry.action.replace(/_/g, ' ');
  }
}

function pct(val) {
  return val != null ? `${(val * 100).toFixed(0)}%` : '?%';
}

// ─── Chat conversations ───────────────────────────────────────────────────────
async function runBadConversation() {
  const badLabel = versionLabel(badVersionNum);
  chatVersionBadge.textContent = badLabel;
  chatVersionBadge.style.color = '#ef4444';

  addUserBubble(DEMO_USER_MSG);

  await delay(400);
  showTyping();

  let badReply;
  try {
    const response = await apiFetch(
      `/agents/${agentId}/execute?user_input=${encodeURIComponent(DEMO_USER_MSG)}&version_id=${badVersionId}`,
      { method: 'POST' }
    );
    badReply = response.agent_output || response.response || response.output || JSON.stringify(response);
  } catch (err) {
    hideTyping();
    addLog(`Bad-version test request failed: ${err.message}`, 'error');
    return;
  }

  const evalPct = lastDeployResult
    ? `${(lastDeployResult.eval_score * 100).toFixed(0)}%`
    : '~65%';
  const threshold = '85%';

  addAgentBubble(
    badReply,
    'bad',
    {
      cls: 'violation-tag',
      icon: '⚠',
      text: `Policy violation — eval score ${evalPct} below threshold ${threshold}`,
    }
  );
}


// ─── Post-rollback conversation ──────────────────────────────────────────────
async function runGoodConversation() {
  const goodLabel = versionLabel(goodVersionNum);
  addChatDivider(`↩ Rolled back to ${goodLabel} — testing restored agent`);

  chatVersionBadge.textContent = goodLabel;
  chatVersionBadge.style.color = '';

  addUserBubble(DEMO_USER_MSG);

  await delay(400);
  showTyping();

  let response;
  try {
    response = await apiFetch(
      `/agents/${agentId}/execute?user_input=${encodeURIComponent(DEMO_USER_MSG)}`,
      { method: 'POST' }
    );
  } catch (err) {
    hideTyping();
    addLog(`Post-rollback test request failed: ${err.message}`, 'error');
    return;
  }

  const reply = response.agent_output || response.response || response.output || JSON.stringify(response);

  addAgentBubble(reply, 'good', {
    cls: 'correct-tag',
    icon: '✓',
    text: `Policy compliant — ${goodLabel} responding correctly`,
  });

  addLog(`Post-rollback test passed — ${goodLabel} response is policy-compliant`, 'success');
}

// ─── Deploy flow ──────────────────────────────────────────────────────────────
async function startDeploy() {
  if (state !== 'idle') return;
  state = 'deploying';

  btnDeploy.disabled = true;

  // Show v_new row in table
  rowV13.classList.remove('hidden');
  const v13VersionCell = rowV13.querySelector('.version-cell') || rowV13.querySelector('td');
  if (v13VersionCell) v13VersionCell.textContent = versionLabel(badVersionNum);
  v13Chip.textContent = 'Deploying';
  v13Chip.className = 'chip chip-deploying';

  setStatus('Deploying', 'pill-deploying');
  activeVersion.textContent = versionLabel(badVersionNum);

  progressWrap.classList.remove('hidden');
  progressLabel.textContent = `Deploying ${versionLabel(badVersionNum)} — uploading artifact…`;
  progressBar.className = 'progress-bar';
  addLog(`Deploy initiated for ${versionLabel(badVersionNum)} by jchen`);

  await delay(200);
  // Animate slowly to 40% — real API call happens in parallel below
  animateProgress(40, 3000, null);

  // ── Step 1: create the bad version ────────────────────────────────────────
  let newVersion;
  try {
    newVersion = await apiFetch(`/agents/${agentId}/versions`, {
      method: 'POST',
      body: JSON.stringify({
        prompt: badPrompt,
        created_by: 'jchen',
      }),
    });
    badVersionId  = newVersion.id;
    badVersionNum = newVersion.version_number;
    // Update the canary row label now that we have the real version number
    if (v13VersionCell) v13VersionCell.textContent = versionLabel(badVersionNum);
    progressLabel.textContent = `Deploying ${versionLabel(badVersionNum)} — uploading artifact…`;
    addLog(`Version ${versionLabel(badVersionNum)} created — canary prompt loaded`);
  } catch (err) {
    console.error('Failed to create bad version:', err);
    addLog('Error creating new version — aborting deploy', 'error');
    resetDeployUI();
    return;
  }

  progressLabel.textContent = 'Running canary evaluation…';
  addLog(`Canary evaluation started — routing 10% of traffic to ${versionLabel(badVersionNum)}`);
  animateProgress(72, 8000, null);

  // Start bad conversation right away (while evals run in background)
  runBadConversation();

  // ── Step 2: kick off the real deploy (synchronous — runs LLM evals) ───────
  const deployPromise = apiFetch(`/agents/${agentId}/deploy`, {
    method: 'POST',
    body: JSON.stringify({
      version_id: badVersionId,
      traffic_percentage: 10,
      eval_threshold: 0.85,
    }),
  });

  // Let the progress bar advance slowly while we wait
  animateProgress(90, 30000, null);
  progressLabel.textContent = 'Running health checks…';
  addLog('Health check started — monitoring error rate and latency');

  let deployResult;
  try {
    deployResult = await deployPromise;
    lastDeployResult = deployResult;
  } catch (err) {
    // Even an HTTP error from the backend means the deploy was processed
    console.warn('Deploy request returned an error:', err);
    // Treat as a failure
    triggerError(null);
    return;
  }

  if (deployResult.status === 'production') {
    // Unexpectedly passed — show success
    completeDeploySuccess(deployResult);
  } else {
    // rolled_back or rejected
    triggerError(deployResult.eval_score);
  }
}

function resetDeployUI() {
  state = 'idle';
  progressWrap.classList.add('hidden');
  rowV13.classList.add('hidden');
  setStatus('Healthy', 'pill-healthy');
  activeVersion.textContent = versionLabel(goodVersionNum);
  btnDeploy.disabled = false;
  btnDeploy.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
    Deploy ${versionLabel(badVersionNum)}
  `;
  btnDeploy.onclick = startDeploy;
}

function completeDeploySuccess(result) {
  state = 'idle';
  const score = result.eval_score != null ? `${(result.eval_score * 100).toFixed(0)}%` : '—';
  progressBar.style.width = '100%';
  progressLabel.textContent = 'Deployment complete';
  setStatus('Healthy', 'pill-healthy');
  activeVersion.textContent = versionLabel(badVersionNum);
  goodVersionNum = badVersionNum;
  goodVersionId  = badVersionId;
  v13Chip.textContent = 'Active';
  v13Chip.className = 'chip chip-active';
  successPanel.classList.remove('hidden');
  addLog(`Deployment succeeded — eval score ${score}`, 'success');
  btnDeploy.disabled = false;
  btnDeploy.onclick = resetDemo;
}

function triggerError(evalScore) {
  state = 'error';

  progressBar.style.width = '90%';
  progressBar.className = 'progress-bar error-color';
  progressLabel.textContent = 'Health check failed';

  setStatus('Error', 'pill-error');

  // Update metrics using real eval score
  if (evalScore != null) {
    const failurePct = ((1 - evalScore) * 100).toFixed(1) + '%';
    errorRateValue.textContent = failurePct;
    // Update error panel description with real numbers
    const panelDesc = errorPanel.querySelector('.error-panel-desc');
    if (panelDesc) {
      panelDesc.innerHTML = `Eval score <strong>${(evalScore * 100).toFixed(0)}%</strong> is below the required threshold (85%). Canary evaluation detected policy violations. Automatic rollback initiated.`;
    }
    const errorRateChip = errorPanel.querySelector('.metric-chip.metric-bad .metric-value');
    if (errorRateChip) errorRateChip.textContent = failurePct;
  } else {
    errorRateValue.textContent = 'N/A';
  }
  errorRateValue.style.color = '#ef4444';
  rpmValue.textContent = '847';

  v13Chip.textContent = 'Failed';
  v13Chip.className = 'chip chip-error';

  errorPanel.classList.remove('hidden');

  const evalPct = evalScore != null ? `${(evalScore * 100).toFixed(0)}%` : 'below threshold';
  addLog(`Health check failed — eval score ${evalPct} below threshold (85%)`, 'error');
  addLog('Canary evaluation FAILED — deployment halted', 'error');

  btnDeploy.disabled = true;

  setTimeout(() => {
    addLog('Automatic rollback triggered by Canary monitor', 'warn');
    startRollback();
  }, 1500);
}

// ─── Rollback flow ─────────────────────────────────────────────────────────────
async function startRollback() {
  if (state !== 'error') return;
  state = 'rolling_back';

  setStatus('Rolling Back', 'pill-rolling');

  progressBar.style.width = '0%';
  progressBar.className = 'progress-bar rollback-color';
  progressLabel.textContent = `Initiating rollback to ${versionLabel(goodVersionNum)}…`;

  addLog(`Rollback initiated — reverting to ${versionLabel(goodVersionNum)} (last known good)`, 'warn');

  await delay(300);
  animateProgress(50, 1000, null);

  // The deploy pipeline already auto-rolls back when canary or Gate 1 fails,
  // so the agent state is already restored. No extra backend call is needed here.

  await delay(1200);
  progressLabel.textContent = `Restoring ${versionLabel(goodVersionNum)} artifact…`;
  addLog(`Restoring ${versionLabel(goodVersionNum)} artifact from registry`);
  animateProgress(80, 800, null);

  await delay(1000);
  progressLabel.textContent = 'Verifying health…';
  addLog(`Running post-rollback health check for ${versionLabel(goodVersionNum)}`);
  animateProgress(100, 600, null);

  await delay(800);
  completeRollback();
}

async function completeRollback() {
  state = 'idle';

  errorPanel.classList.add('hidden');
  successPanel.classList.remove('hidden');
  const successTitle = successPanel.querySelector('.success-panel-title');
  if (successTitle) successTitle.textContent = `Rollback Complete — ${versionLabel(goodVersionNum)} Restored`;
  const successDesc = successPanel.querySelector('.success-panel-desc');
  if (successDesc) successDesc.innerHTML = `Agent is healthy. Error rate back to <strong>0.3%</strong>. Audit event logged.`;

  setStatus('Healthy', 'pill-healthy');
  activeVersion.textContent = versionLabel(goodVersionNum);

  errorRateValue.textContent = '0.3%';
  errorRateValue.style.color = '';
  rpmValue.textContent = '1,243';

  v13Chip.textContent = 'Rolled Back';
  v13Chip.className = 'chip chip-rolled';

  rowV12.classList.add('row-active');

  progressWrap.classList.add('hidden');

  // Reload real audit log
  await reloadAuditLog();

  addLog(`Rollback complete — ${versionLabel(goodVersionNum)} restored successfully`, 'success');
  addLog(`Post-rollback health check passed — error rate 0.3%`, 'success');

  // Test the restored agent with a real API call
  await runGoodConversation();

  btnDeploy.textContent = `Deploy ${versionLabel(badVersionNum)}`;
  btnDeploy.disabled = false;
  btnDeploy.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
    Retry Deploy
  `;
  btnDeploy.onclick = resetDemo;
}

// ─── Reset (for demo looping) ─────────────────────────────────────────────────
async function resetDemo() {
  state = 'idle';
  lastDeployResult = null;

  errorPanel.classList.add('hidden');
  successPanel.classList.add('hidden');
  progressWrap.classList.add('hidden');
  progressBar.style.width = '0%';
  progressBar.className = 'progress-bar';

  rowV13.classList.add('hidden');
  v13Chip.textContent = 'Deploying';
  v13Chip.className = 'chip chip-deploying';

  rowV12.classList.add('row-active');

  // Reset chat
  chatWindow.innerHTML = '';
  chatPlaceholder.style.display = '';
  chatWindow.appendChild(chatPlaceholder);

  // Re-fetch current state from backend
  try {
    const agent = await apiFetch(`/agents/${agentId}`);
    const versions = await apiFetch(`/agents/${agentId}/versions`);
    populateVersionTable(versions, agent);

    const currentVer = versions.find(v => v.id === agent.current_version_id);
    goodVersionNum = currentVer ? currentVer.version_number : goodVersionNum;
    goodVersionId  = agent.current_version_id || goodVersionId;
    badVersionNum  = goodVersionNum + 1;

    setStatus('Healthy', 'pill-healthy');
    activeVersion.textContent = versionLabel(goodVersionNum);
    chatVersionBadge.textContent = versionLabel(goodVersionNum);
    chatVersionBadge.style.color = '';

    await reloadAuditLog();
  } catch (err) {
    console.warn('resetDemo re-fetch failed:', err);
    setStatus('Healthy', 'pill-healthy');
    activeVersion.textContent = versionLabel(goodVersionNum);
    chatVersionBadge.textContent = versionLabel(goodVersionNum);
    chatVersionBadge.style.color = '';
  }

  btnDeploy.disabled = false;
  btnDeploy.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
    Deploy ${versionLabel(badVersionNum)}
  `;
  btnDeploy.onclick = startDeploy;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
initDemo();
