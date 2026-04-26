// ─── State machine ──────────────────────────────────────────────────────────
// States: idle → deploying → error → rolling_back → healthy
let state = 'idle';

// ─── DOM refs ────────────────────────────────────────────────────────────────
const btnDeploy      = document.getElementById('btn-deploy');
const statusPill     = document.getElementById('status-pill');
const activeVersion  = document.getElementById('active-version');
const errorPanel     = document.getElementById('error-panel');
const successPanel   = document.getElementById('success-panel');
const progressWrap   = document.getElementById('progress-wrap');
const progressBar    = document.getElementById('progress-bar');
const progressLabel  = document.getElementById('progress-label');
const activityLog    = document.getElementById('activity-log');
const rowV13         = document.getElementById('row-v13');
const v13Chip        = document.getElementById('v13-chip');
const rowV12         = document.getElementById('row-v12');
const rpmValue       = document.getElementById('rpm-value');
const errorRateValue = document.getElementById('error-rate-value');

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
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out
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

// ─── Deploy flow ─────────────────────────────────────────────────────────────
async function startDeploy() {
  if (state !== 'idle') return;
  state = 'deploying';

  // Disable buttons
  btnDeploy.disabled = true;

  // Show v1.3 row in table
  rowV13.classList.remove('hidden');
  v13Chip.textContent = 'Deploying';
  v13Chip.className = 'chip chip-deploying';

  // Update agent card
  setStatus('Deploying', 'pill-deploying');
  activeVersion.textContent = 'v1.3';

  // Show + animate progress bar to 40%
  progressWrap.classList.remove('hidden');
  progressLabel.textContent = 'Deploying v1.3 — uploading artifact…';
  progressBar.className = 'progress-bar';
  addLog('Deploy initiated for v1.3 by jchen');

  await delay(200);
  animateProgress(40, 1200, null);

  await delay(1400);
  progressLabel.textContent = 'Running canary evaluation…';
  addLog('Canary evaluation started — routing 10% of traffic to v1.3');
  animateProgress(72, 900, null);

  await delay(1100);
  progressLabel.textContent = 'Running health checks…';
  addLog('Health check started — monitoring error rate and latency');
  animateProgress(90, 700, null);

  await delay(900);

  // ── Health check FAILS ────────────────────────────────────────────────────
  triggerError();
}

function triggerError() {
  state = 'error';

  // Progress bar goes red and stops
  progressBar.style.width = '90%';
  progressBar.className = 'progress-bar error-color';
  progressLabel.textContent = 'Health check failed';

  // Status → Error
  setStatus('Error', 'pill-error');

  // Spike the error rate display
  errorRateValue.textContent = '12.4%';
  errorRateValue.style.color = '#ef4444';
  rpmValue.textContent = '847';

  // v1.3 chip → Error
  v13Chip.textContent = 'Failed';
  v13Chip.className = 'chip chip-error';

  // Show error panel
  errorPanel.classList.remove('hidden');

  // Log entries
  addLog('Health check failed — error rate 12.4% exceeds threshold (5%)', 'error');
  addLog('P99 latency: 4,210ms — degraded performance detected', 'error');
  addLog('Canary evaluation FAILED — deployment halted', 'error');

  btnDeploy.disabled = true;

  // Automatically trigger rollback after a short pause
  setTimeout(() => {
    addLog('Automatic rollback triggered by Canary monitor', 'warn');
    startRollback();
  }, 1500);
}

// ─── Rollback flow ────────────────────────────────────────────────────────────
async function startRollback() {
  if (state !== 'error') return;
  state = 'rolling_back';

  // Status → Rolling back
  setStatus('Rolling Back', 'pill-rolling');

  // Update progress bar to rollback style
  progressBar.style.width = '0%';
  progressBar.className = 'progress-bar rollback-color';
  progressLabel.textContent = 'Initiating rollback to v1.2…';

  addLog('Rollback initiated — reverting to v1.2 (last known good)', 'warn');

  await delay(300);
  animateProgress(50, 1000, null);

  await delay(1200);
  progressLabel.textContent = 'Restoring v1.2 artifact…';
  addLog('Restoring v1.2 artifact from registry');
  animateProgress(80, 800, null);

  await delay(1000);
  progressLabel.textContent = 'Verifying health…';
  addLog('Running post-rollback health check for v1.2');
  animateProgress(100, 600, null);

  await delay(800);

  // ── Rollback success ──────────────────────────────────────────────────────
  completeRollback();
}

function completeRollback() {
  state = 'idle';

  // Hide error panel, show success panel
  errorPanel.classList.add('hidden');
  successPanel.classList.remove('hidden');

  // Status → Healthy
  setStatus('Healthy', 'pill-healthy');
  activeVersion.textContent = 'v1.2';

  // Reset metrics
  errorRateValue.textContent = '0.3%';
  errorRateValue.style.color = '';
  rpmValue.textContent = '1,243';

  // Update version table
  v13Chip.textContent = 'Rolled Back';
  v13Chip.className = 'chip chip-rolled';

  // Mark v1.2 row active again
  rowV12.classList.add('row-active');

  // Hide progress bar
  progressWrap.classList.add('hidden');

  // Log entries
  addLog('Rollback complete — v1.2 restored successfully', 'success');
  addLog('Post-rollback health check passed — error rate 0.3%', 'success');
  addLog('Audit event: automatic_rollback_completed logged', 'success');

  // Re-enable deploy as retry
  btnDeploy.textContent = 'Deploy v1.3';
  btnDeploy.disabled = false;
  btnDeploy.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
    Retry Deploy
  `;

  // Clicking Retry resets the whole demo
  btnDeploy.onclick = resetDemo;
}

// ─── Reset (for demo looping) ─────────────────────────────────────────────────
function resetDemo() {
  state = 'idle';

  setStatus('Healthy', 'pill-healthy');
  activeVersion.textContent = 'v1.2';

  errorRateValue.textContent = '0.3%';
  errorRateValue.style.color = '';
  rpmValue.textContent = '1,243';

  errorPanel.classList.add('hidden');
  successPanel.classList.add('hidden');
  progressWrap.classList.add('hidden');
  progressBar.style.width = '0%';
  progressBar.className = 'progress-bar';

  rowV13.classList.add('hidden');
  v13Chip.textContent = 'Deploying';
  v13Chip.className = 'chip chip-deploying';

  rowV12.classList.add('row-active');

  btnDeploy.disabled = false;
  btnDeploy.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
    Deploy v1.3
  `;
  btnDeploy.onclick = startDeploy;

  // Reset log
  activityLog.innerHTML = `
    <li class="log-entry">
      <span class="log-time">3d ago</span>
      <span class="log-text">v1.2 deployed successfully by jchen</span>
    </li>
    <li class="log-entry">
      <span class="log-time">3d ago</span>
      <span class="log-text">v1.2 health check passed — error rate 0.3%</span>
    </li>
    <li class="log-entry">
      <span class="log-time">10d ago</span>
      <span class="log-text">v1.1 superseded by v1.2</span>
    </li>
  `;
}
