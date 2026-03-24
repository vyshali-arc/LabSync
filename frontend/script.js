/* ========================================================
   script.js – LabSync Frontend Logic
   ======================================================== */

const API_BASE = 'http://localhost:3000/api';

// ---- State ----
let studentName = '';
let currentSubject = '';
let subjectsData = {};
let studentProgress = {};

// ---- Subject accent colors & CSS vars ----
const SUBJECT_META = {
  OS:    { accent: 'hsl(258, 90%, 66%)', color: 'var(--accent-1)' },
  ADSAA: { accent: 'hsl(190, 95%, 55%)', color: 'var(--accent-2)' },
  FSD:   { accent: 'hsl(320, 80%, 62%)', color: 'var(--accent-3)' }
};

// ---- Pages ----
const pages = {
  landing:   document.getElementById('page-landing'),
  dashboard: document.getElementById('page-dashboard'),
  tracker:   document.getElementById('page-tracker')
};

function showPage(name) {
  Object.values(pages).forEach(p => p.classList.remove('active'));
  pages[name].classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  // Load subject definitions
  try {
    const res = await fetch(`${API_BASE}/subjects`);
    subjectsData = await res.json();
  } catch {
    console.error('Could not connect to server.');
  }

  // Check saved session
  const saved = sessionStorage.getItem('labsync_name');
  if (saved) {
    studentName = saved;
    await loadDashboard();
  }
});

// ---- SVG Gradient patch ----
// Inject gradient defs into the SVG ring
const ringsvg = document.querySelector('.progress-ring');
if (ringsvg) {
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="hsl(258,90%,66%)"/>
      <stop offset="100%" stop-color="hsl(190,95%,55%)"/>
    </linearGradient>`;
  ringsvg.prepend(defs);
}

// ===========================
// LANDING PAGE LOGIC
// ===========================
const startBtn       = document.getElementById('start-btn');
const nameInput      = document.getElementById('student-name-input');

startBtn.addEventListener('click', handleStart);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleStart(); });

async function handleStart() {
  const val = nameInput.value.trim();
  if (!val) {
    nameInput.focus();
    nameInput.style.outline = '2px solid hsl(0,80%,60%)';
    setTimeout(() => { nameInput.style.outline = ''; }, 1200);
    return;
  }
  studentName = val;
  sessionStorage.setItem('labsync_name', studentName);
  await loadDashboard();
}

// ===========================
// DASHBOARD LOGIC
// ===========================
async function loadDashboard() {
  document.getElementById('display-name').textContent = studentName;

  try {
    const res = await fetch(`${API_BASE}/progress/${encodeURIComponent(studentName)}`);
    studentProgress = await res.json();
  } catch {
    studentProgress = {};
  }

  renderSubjectCards();
  updateOverallProgress();
  showPage('dashboard');
}

function getCompletionStats(code) {
  const total = subjectsData[code]?.programs?.length || 0;
  const done  = studentProgress[code]?.completedPrograms?.length || 0;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, pct };
}

function getStatusTag(pct) {
  if (pct === 0)        return { cls: 'status-start',  text: '🚀 Just Started' };
  if (pct < 30)         return { cls: 'status-behind', text: '⚠️ Behind Schedule' };
  if (pct < 70)         return { cls: 'status-ok',     text: '📈 On Track' };
  if (pct < 100)        return { cls: 'status-almost', text: '🎯 Almost Done!' };
  return                       { cls: 'status-done',   text: '✅ Completed!' };
}

function renderSubjectCards() {
  const grid = document.getElementById('subject-cards');
  grid.innerHTML = '';

  Object.entries(subjectsData).forEach(([code, info], i) => {
    const { total, done, pct } = getCompletionStats(code);
    const meta    = SUBJECT_META[code] || {};
    const isDone  = pct === 100;

    const card = document.createElement('div');
    card.className = 'subject-card';
    card.style.setProperty('--card-accent', meta.accent || 'var(--accent-1)');
    card.style.animationDelay = `${i * 0.08}s`;

    card.innerHTML = `
      <div class="card-top">
        <span class="card-icon">${info.icon}</span>
        <span class="card-badge ${isDone ? 'complete' : ''}">${isDone ? '⭐ COMPLETE' : code}</span>
      </div>
      <div class="card-name">${info.name}</div>
      <div class="card-code">${total} Programs</div>
      <div class="card-progress-bar">
        <div class="card-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="card-stats">
        <span class="card-percent">${pct}%</span>
        <span class="card-count">${done} / ${total} done</span>
      </div>
      <button class="card-open-btn" data-code="${code}">
        Open Tracker →
      </button>
    `;

    card.querySelector('.card-open-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openTracker(code);
    });
    card.addEventListener('click', () => openTracker(code));
    grid.appendChild(card);
  });
}

function updateOverallProgress() {
  const allSubjects = Object.keys(subjectsData);
  if (!allSubjects.length) return;
  const totalPct = allSubjects.reduce((sum, c) => sum + getCompletionStats(c).pct, 0);
  const avg = Math.round(totalPct / allSubjects.length);
  document.getElementById('overall-progress-bar').style.width = `${avg}%`;
  document.getElementById('overall-percent-label').textContent = `${avg}%`;
}

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem('labsync_name');
  studentName = '';
  nameInput.value = '';
  showPage('landing');
});

// ===========================
// TRACKER PAGE LOGIC
// ===========================
function openTracker(code) {
  currentSubject = code;
  const info  = subjectsData[code];
  const saved = studentProgress[code]?.completedPrograms || [];
  const meta  = SUBJECT_META[code] || {};

  // Inject gradient color
  const ringFill = document.getElementById('ring-fill');
  ringFill.style.stroke = `url(#ringGradient)`;

  document.getElementById('subject-heading').textContent = info.name;
  document.getElementById('subject-badge').textContent   = `${info.icon} ${code}`;
  document.getElementById('tracker-display-name').textContent = studentName;

  renderPrograms(info.programs, saved);
  updateRing(saved.length, info.programs.length);
  updateLastUpdated(studentProgress[code]?.lastUpdated);
  showPage('tracker');
}

function renderPrograms(programs, completed) {
  const list = document.getElementById('programs-list');
  list.innerHTML = '';

  programs.forEach((prog, i) => {
    const isDone = completed.includes(prog);

    const item = document.createElement('div');
    item.className = `program-item ${isDone ? 'done' : ''}`;
    item.style.animationDelay = `${i * 0.04}s`;
    item.dataset.prog = prog;

    item.innerHTML = `
      <div class="checkmark">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <span class="program-label">${prog}</span>
      <span class="program-num">#${String(i + 1).padStart(2, '0')}</span>
    `;

    item.addEventListener('click', () => toggleProgram(item, prog));
    list.appendChild(item);
  });
}

async function toggleProgram(item, prog) {
  const isDone = item.classList.toggle('done');
  const programs = subjectsData[currentSubject].programs;

  // Update local state
  let completed = studentProgress[currentSubject]?.completedPrograms || [];
  if (isDone) {
    if (!completed.includes(prog)) completed = [...completed, prog];
  } else {
    completed = completed.filter(p => p !== prog);
  }

  if (!studentProgress[currentSubject]) studentProgress[currentSubject] = {};
  studentProgress[currentSubject].completedPrograms = completed;
  studentProgress[currentSubject].lastUpdated = new Date().toISOString();

  // Update UI
  updateRing(completed.length, programs.length);
  updateLastUpdated(studentProgress[currentSubject].lastUpdated);
  updateDashboardCard(currentSubject, completed.length, programs.length);

  // Check for 100%
  if (completed.length === programs.length) {
    showBadgeToast();
  }

  // Save to backend (non-blocking)
  try {
    await fetch(`${API_BASE}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: studentName,
        subject: currentSubject,
        completedPrograms: completed
      })
    });
  } catch {
    console.warn('Save failed – check server connection.');
  }
}

function updateRing(done, total) {
  const pct = total > 0 ? done / total : 0;
  const circumference = 2 * Math.PI * 50; // r=50 → ~314.16
  const offset = circumference - pct * circumference;
  document.getElementById('ring-fill').style.strokeDashoffset = offset;
  document.getElementById('ring-percent').textContent = `${Math.round(pct * 100)}%`;
  document.getElementById('completion-count').textContent = `${done} / ${total} completed`;

  // Update status tag
  const pctN = Math.round(pct * 100);
  const { cls, text } = getStatusTag(pctN);
  const tag = document.getElementById('status-tag');
  tag.className = `status-tag ${cls}`;
  tag.textContent = text;
}

function updateLastUpdated(iso) {
  const el = document.getElementById('last-updated');
  if (!iso) { el.textContent = 'Last updated: –'; return; }
  const d = new Date(iso);
  el.textContent = `Last updated: ${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function updateDashboardCard(code, done, total) {
  // Refresh dashboard card stats silently
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  updateOverallProgress();
}

// Back button
document.getElementById('back-btn').addEventListener('click', async () => {
  await loadDashboard();
});

// Select All / Clear All
document.getElementById('select-all-btn').addEventListener('click', async () => {
  const programs   = subjectsData[currentSubject]?.programs || [];
  const items      = document.querySelectorAll('.program-item:not(.done)');

  if (items.length === 0) return;
  items.forEach(item => {
    item.classList.add('done');
  });

  const completed = [...programs];
  studentProgress[currentSubject] = {
    completedPrograms: completed,
    lastUpdated: new Date().toISOString()
  };

  updateRing(completed.length, programs.length);
  updateLastUpdated(studentProgress[currentSubject].lastUpdated);

  if (completed.length === programs.length) showBadgeToast();

  try {
    await fetch(`${API_BASE}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: studentName, subject: currentSubject, completedPrograms: completed })
    });
  } catch {}
});

document.getElementById('clear-all-btn').addEventListener('click', async () => {
  const programs = subjectsData[currentSubject]?.programs || [];
  const items    = document.querySelectorAll('.program-item.done');
  items.forEach(item => item.classList.remove('done'));

  studentProgress[currentSubject] = {
    completedPrograms: [],
    lastUpdated: new Date().toISOString()
  };

  updateRing(0, programs.length);
  updateLastUpdated(studentProgress[currentSubject].lastUpdated);

  try {
    await fetch(`${API_BASE}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: studentName, subject: currentSubject, completedPrograms: [] })
    });
  } catch {}
});

// ===========================
// BADGE TOAST
// ===========================
function showBadgeToast() {
  const toast = document.getElementById('badge-toast');
  toast.classList.remove('hidden');
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 20);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 450);
  }, 3500);
}
