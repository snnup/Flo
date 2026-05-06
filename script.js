// ─── STATE ───────────────────────────────────────────
const INCOME_CATS = ['Salary','Freelance','Investment','Gift','Bonus','Other Income'];
const EXPENSE_CATS = ['Food','Transport','Housing','Shopping','Health','Entertainment','Education','Utilities','Travel','Subscriptions','Other Expense'];

let currentTxType = 'income';
let currentCatFilter = 'all';
let currentPlanType = 'income';


let state = {
  users: [],
  currentUser: null,
  transactions: [],
  chartFilter: 'all',
  catFilter: 'all',
  darkMode: false,
};

// ─── LOCAL STORAGE ───────────────────────────────────
function save() {
  localStorage.setItem('flo_users', JSON.stringify(state.users));
  localStorage.setItem('flo_txs', JSON.stringify(state.transactions));
  localStorage.setItem('flo_dark', state.darkMode);
}

function load() {
  state.users = JSON.parse(localStorage.getItem('flo_users') || '[]');
  state.transactions = JSON.parse(localStorage.getItem('flo_txs') || '[]');
  state.darkMode = localStorage.getItem('flo_dark') === 'true';
  const cu = localStorage.getItem('flo_current');
  if (cu) state.currentUser = JSON.parse(cu);
}

// ─── INIT ─────────────────────────────────────────────
load();
if (state.darkMode) document.body.classList.add('dark');
updateThemeIcon();

if (state.currentUser) {
setTimeout(() => {
  showApp();
}, 50);
} else {
  document.getElementById('auth-screen').style.display = 'flex';
}

// ─── DATE ─────────────────────────────────────────────
function formatDate() {
  const d = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function fmtMoney(n) {
  const abs = Math.abs(n).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  return (n < 0 ? '-' : '') + '$' + abs;
}

function fmtDateShort(iso) {
  if (!iso) return '';
  const [y,m,d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m)-1]}`;
}

function getCatIcon(cat, type) {
  const icons = {
    'Salary':'💼','Freelance':'💻','Investment':'📈','Gift':'🎁','Bonus':'🏆','Other Income':'💰',
    'Food':'🍔','Transport':'🚗','Housing':'🏠','Shopping':'🛍️','Health':'💊','Entertainment':'🎬',
    'Education':'📚','Utilities':'⚡','Travel':'✈️','Subscriptions':'📱','Other Expense':'💸'
  };
  return icons[cat] || (type === 'income' ? '💰' : '💸');
}

// ─── AUTH ─────────────────────────────────────────────
function showLogin() {
  document.getElementById('login-card').style.display = 'block';
  document.getElementById('signup-card').style.display = 'none';
}

function showSignup() {
  document.getElementById('login-card').style.display = 'none';
  document.getElementById('signup-card').style.display = 'block';
}

function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  let valid = true;

  hide('login-email-err'); hide('login-pass-err'); hide('login-general-err');

  if (!email || !/\S+@\S+\.\S+/.test(email)) { show('login-email-err'); valid = false; }
  if (pass.length < 6) { show('login-pass-err'); valid = false; }
  if (!valid) return;

  const user = state.users.find(u => u.email === email && u.password === pass);
  if (!user) { showErr('login-general-err', 'Invalid email or password.'); return; }

  state.currentUser = user;
  localStorage.setItem('flo_current', JSON.stringify(user));
  showApp();
}

function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-pass').value;
  let valid = true;

  hide('signup-name-err'); hide('signup-email-err'); hide('signup-pass-err'); hide('signup-general-err');

  if (!name) { show('signup-name-err'); valid = false; }
  if (!email || !/\S+@\S+\.\S+/.test(email)) { show('signup-email-err'); valid = false; }
  if (pass.length < 6) { show('signup-pass-err'); valid = false; }
  if (!valid) return;

  if (state.users.find(u => u.email === email)) { showErr('signup-general-err', 'Email already registered.'); return; }

  const user = { id: Date.now(), name, email, password: pass };
  state.users.push(user);
  state.currentUser = user;
  localStorage.setItem('flo_current', JSON.stringify(user));
  save();
  showApp();
}

function handleLogout() {
  state.currentUser = null;
  localStorage.removeItem('flo_current');
  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('login-email').value = '';
  document.getElementById('login-pass').value = '';
}

function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').classList.add('active');
  const u = state.currentUser;
  const firstName = u.name.split(' ')[0];
  document.getElementById('greeting-name').textContent = firstName;
  document.getElementById('nav-username').textContent = firstName;
  document.getElementById('nav-avatar').textContent = firstName[0].toUpperCase();
  document.getElementById('greeting-date').textContent = formatDate();
  updateDashboard();
  initChart();
}

// ─── THEME ────────────────────────────────────────────
function toggleTheme() {
  state.darkMode = !state.darkMode;
  document.body.classList.toggle('dark', state.darkMode);
  updateThemeIcon();
  save();
  updateChart();
}

function updateThemeIcon() {
  const btn = document.querySelector('.theme-toggle');
  if (btn) btn.textContent = state.darkMode ? '☀️' : '🌙';
}

// ─── HELPERS ──────────────────────────────────────────
function show(id) { const el = document.getElementById(id); if (el) el.classList.add('show'); }
function hide(id) { const el = document.getElementById(id); if (el) el.classList.remove('show'); }
function showErr(id, msg) { const el = document.getElementById(id); if (el) { el.textContent = msg; el.classList.add('show'); } }

function toast(msg, type='') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(20px)'; t.style.transition='0.3s ease'; setTimeout(()=>t.remove(),300); }, 2800);
}

// ─── MODAL ────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); });
});

// ─── TRANSACTIONS ─────────────────────────────────────
function openAddModal(type='income') {
  currentTxType = type;
  document.getElementById('tx-modal-title').textContent = 'Add Transaction';
  document.getElementById('tx-edit-id').value = '';
  document.getElementById('tx-desc').value = '';
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-date').value = todayISO();
  document.getElementById('tx-time').value = nowTime();
  document.getElementById('type-tabs').style.display = 'flex';
  document.getElementById('tx-save-btn').textContent = 'Save Transaction';
  ['tx-desc-err','tx-amount-err','tx-cat-err','tx-date-err'].forEach(hide);
  setTxType(type);
  openModal('tx-modal');
}

function setTxType(type) {
  currentTxType = type;
  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const sel = document.getElementById('tx-category');
  sel.innerHTML = '<option value="">Select category...</option>';
  cats.forEach(c => { const o = document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o); });
  document.getElementById('tab-income').className = 'type-tab' + (type==='income'?' active-income':'');
  document.getElementById('tab-expense').className = 'type-tab' + (type==='expense'?' active-expense':'');
}

function openEditModal(id) {

  // fecha modal de listagem
  closeModal('all-modal');

  const tx = state.transactions.find(t => t.id === id);

  if (!tx) return;

  currentTxType = tx.type;

  document.getElementById('tx-modal-title').textContent = 'Edit Transaction';

  document.getElementById('tx-edit-id').value = id;

  document.getElementById('type-tabs').style.display = 'none';

  setTxType(tx.type);

  document.getElementById('tx-desc').value = tx.desc;
  document.getElementById('tx-amount').value = tx.amount;
  document.getElementById('tx-category').value = tx.category;
  document.getElementById('tx-date').value = tx.date;
  document.getElementById('tx-time').value = tx.time || '';

  document.getElementById('tx-save-btn').textContent = 'Update Transaction';

  ['tx-desc-err','tx-amount-err','tx-cat-err','tx-date-err'].forEach(hide);

  // pequeno delay pra animação ficar suave
  setTimeout(() => {
    openModal('tx-modal');
  }, 120);
}

function saveTx() {
  const desc = document.getElementById('tx-desc').value.trim();
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const category = document.getElementById('tx-category').value;
  const date = document.getElementById('tx-date').value;
  const time = document.getElementById('tx-time').value;
  const editId = document.getElementById('tx-edit-id').value;
  let valid = true;

  ['tx-desc-err','tx-amount-err','tx-cat-err','tx-date-err'].forEach(hide);
  if (!desc) { show('tx-desc-err'); valid = false; }
  if (!amount || amount <= 0) { show('tx-amount-err'); valid = false; }
  if (!category) { show('tx-cat-err'); valid = false; }
  if (!date) { show('tx-date-err'); valid = false; }
  if (!valid) return;

  if (editId) {
    const idx = state.transactions.findIndex(t => t.id === parseInt(editId));
    if (idx > -1) {
      state.transactions[idx] = { ...state.transactions[idx], desc, amount, category, date, time, type: currentTxType };
      toast('Transaction updated!', 'success');
    }
  } else {
    state.transactions.push({ id: Date.now(), desc, amount, category, date, time, type: currentTxType });
    toast(`${currentTxType === 'income' ? 'Income' : 'Expense'} added!`, 'success');
  }

  save();
  closeModal('tx-modal');
  updateDashboard();
  updateChart();
  // refresh all modal if open
  if (document.getElementById('all-modal').classList.contains('open')) renderAllTx();
}

function deleteTx(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  toast('Transaction deleted!', 'success');
  save();
  updateDashboard();
  updateChart();
  renderAllTx();
}

// ─── DASHBOARD ────────────────────────────────────────
function updateDashboard() {
  const txs = state.transactions;
  const income = txs.filter(t=>t.type==='income').reduce((a,b)=>a+b.amount,0);
  const expense = txs.filter(t=>t.type==='expense').reduce((a,b)=>a+b.amount,0);
  const balance = income - expense;

  const balEl = document.getElementById('total-balance');
  balEl.textContent = fmtMoney(balance);
  balEl.style.color = balance < 0 ? '#ff6b6b' : '';
  document.getElementById('total-income').textContent = fmtMoney(income);
  document.getElementById('total-expense').textContent = fmtMoney(expense);

  // Recent
  const sorted = [...txs].sort((a,b)=> (b.date+b.time).localeCompare(a.date+a.time));
  const recent = sorted.slice(0,2);
  const listEl = document.getElementById('recent-tx-list');
  if (recent.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🧾</div><p>No transactions yet</p></div>`;
  } else {
    listEl.innerHTML = recent.map(tx => txItemHTML(tx, false)).join('');
  }

  // Category summary
  updateCatSummary();
}

function txItemHTML(tx, showEdit=false) {
  const isInc = tx.type === 'income';
  return `
    <div class="tx-item">
      <div class="tx-icon ${isInc?'income-icon':'expense-icon'}">${getCatIcon(tx.category, tx.type)}</div>
      <div class="tx-info">
        <div class="tx-desc">${escHtml(tx.desc)}</div>
        <div class="tx-cat">${escHtml(tx.category)} · ${tx.time||''}</div>
      </div>
      <div class="tx-right">
        <div class="tx-amount ${isInc?'income-amt':'expense-amt'}">${isInc?'+':'-'}${fmtMoney(tx.amount)}</div>
        <div class="tx-date">${fmtDateShort(tx.date)}</div>
      </div>
      ${showEdit ? `<button class="tx-edit-btn visible" onclick="openEditModal(${tx.id})">Edit</button><button class="tx-delete-btn visible" onclick="deleteTx(${tx.id})">🗑️</button>` : ''}
      
    </div>`;
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function updateCatSummary() {
  const txs = state.transactions;
  const catTotals = {};
  txs.forEach(t => {
    if (!catTotals[t.category]) catTotals[t.category] = { income:0, expense:0 };
    catTotals[t.category][t.type] += t.amount;
  });
  const cats = Object.entries(catTotals).sort((a,b)=>(b[1].income+b[1].expense)-(a[1].income+a[1].expense)).slice(0,4);
  const el = document.getElementById('category-summary');
  if (cats.length === 0) { el.innerHTML = `<div class="empty-state"><p>No data yet</p></div>`; return; }
  el.innerHTML = cats.map(([cat, vals]) => {
    const net = vals.income - vals.expense;
    const isPos = net >= 0;
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:1.2rem">${getCatIcon(cat,'')}</span>
        <span style="flex:1;font-size:0.85rem;font-weight:500;color:var(--text)">${escHtml(cat)}</span>
        <span style="font-family:'Fraunces',serif;font-size:0.9rem;font-weight:600;color:${isPos?'var(--income)':'var(--expense)'}">${isPos?'+':'-'}${fmtMoney(Math.abs(net))}</span>
      </div>`;
  }).join('');
}

// ─── ALL TRANSACTIONS ──────────────────────────────────

function openAllModal() {
  currentCatFilter = 'all';
  document.querySelectorAll('.cat-filter').forEach(b => b.classList.remove('active'));
  document.querySelector('.cat-filter[data-filter="all"]').classList.add('active');
  document.getElementById('filter-from').value = '';
  document.getElementById('filter-to').value = '';
  renderAllTx();
  openModal('all-modal');
}

function setCatFilter(f, btn) {
  currentCatFilter = f;
  document.querySelectorAll('.cat-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAllTx();
}

function clearDateFilter() {
  document.getElementById('filter-from').value = '';
  document.getElementById('filter-to').value = '';
  renderAllTx();
}

const filterFrom = document.getElementById('filter-from');
const filterTo = document.getElementById('filter-to');

if (filterFrom) {
  filterFrom.addEventListener('change', renderAllTx);
}

if (filterTo) {
  filterTo.addEventListener('change', renderAllTx);
}

function formatDateSeparator(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const monthName = months[parseInt(m) - 1];
  return `${parseInt(d)} ${monthName}`;
}

function renderAllTx() {
  const fromVal = document.getElementById('filter-from').value;
  const toVal = document.getElementById('filter-to').value;

  let txs = [...state.transactions];

  if (currentCatFilter === 'income') txs = txs.filter(t=>t.type==='income');
  else if (currentCatFilter === 'expense') txs = txs.filter(t=>t.type==='expense');

  if (fromVal) txs = txs.filter(t=>t.date >= fromVal);
  if (toVal) txs = txs.filter(t=>t.date <= toVal);

  txs.sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));

  const el = document.getElementById('all-tx-list');
  if (txs.length === 0) {
    el.innerHTML = `<div class="no-results">No transactions found</div>`;
    return;
  }

  // Group by date
  const grouped = {};
  txs.forEach(tx => {
    if (!grouped[tx.date]) grouped[tx.date] = [];
    grouped[tx.date].push(tx);
  });

  // Render with date separators
  let html = '';
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  
  sortedDates.forEach(date => {
    html += `<div class="tx-date-separator">${formatDateSeparator(date)}</div>`;
    html += grouped[date].map(tx => txItemHTML(tx, true)).join('');
  });
  
  el.innerHTML = html;
}

// ─── CHART ────────────────────────────────────────────
let chart = null;

function getLast7Days() {
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  return days;
}

function getDayLabel(iso) {
  const [y, m, d] = iso.split('-');
  const dd = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));

  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return labels[dd.getDay()];
}

function initChart() {

  setTimeout(() => {
    updateChart();
  }, 50);

}

function setChartFilter(f, btn) {
  state.chartFilter = f;

  document.querySelectorAll('.filter-btn').forEach(b => {
    b.className = 'filter-btn';
  });

  btn.classList.add(`active-${f}`);

  const li = document.getElementById('legend-income');
  const le = document.getElementById('legend-expense');

  if (f === 'all') {
    li.style.opacity = '1';
    le.style.opacity = '1';
  } else if (f === 'income') {
    li.style.opacity = '1';
    le.style.opacity = '0.25';
  } else {
    li.style.opacity = '0.25';
    le.style.opacity = '1';
  }

  updateChart();
}

function getCSSVar(v) {
  return getComputedStyle(document.body)
    .getPropertyValue(v)
    .trim();
}

function updateChart() {

  // verifica se Chart.js existe
  if (typeof window.Chart === 'undefined') {
    console.error('Chart.js não carregou');
    return;
  }

  const canvas = document.getElementById('activityChart');

  if (!canvas) {
    console.error('Canvas #activityChart não encontrado');
    return;
  }

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.error('Contexto do canvas inválido');
    return;
  }

  // destrói gráfico antigo
  if (chart) {
    chart.destroy();
    chart = null;
  }

  const days = getLast7Days();
  const labels = days.map(getDayLabel);

  const incomeData = days.map(day => {
    return state.transactions
      .filter(t => t.type === 'income' && t.date === day)
      .reduce((a, b) => a + Number(b.amount), 0);
  });

  const expenseData = days.map(day => {
    return state.transactions
      .filter(t => t.type === 'expense' && t.date === day)
      .reduce((a, b) => a + Number(b.amount), 0);
  });

  const incomeColor = getCSSVar('--income-mid') || '#22c55e';
  const expenseColor = getCSSVar('--expense-mid') || '#ef4444';
  const textMuted = getCSSVar('--text-muted') || '#888';
  const border = getCSSVar('--border') || '#333';

  const datasets = [];

  if (state.chartFilter === 'all' || state.chartFilter === 'income') {
    datasets.push({
      label: 'Income',
      data: incomeData,
      backgroundColor: incomeColor + 'aa',
      borderColor: incomeColor,
      borderWidth: 2,
      borderRadius: 8,
    });
  }

  if (state.chartFilter === 'all' || state.chartFilter === 'expense') {
    datasets.push({
      label: 'Expenses',
      data: expenseData,
      backgroundColor: expenseColor + 'aa',
      borderColor: expenseColor,
      borderWidth: 2,
      borderRadius: 8,
    });
  }

  chart = new Chart(ctx, {
    type: 'bar',

    data: {
      labels,
      datasets
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: false
        },

        tooltip: {
          backgroundColor: getCSSVar('--surface') || '#111',
          titleColor: getCSSVar('--text') || '#fff',
          bodyColor: getCSSVar('--text-muted') || '#ccc',
          borderColor: border,
          borderWidth: 1,

          callbacks: {
            label: function(ctx) {
              return `${ctx.dataset.label}: ${fmtMoney(ctx.raw)}`;
            }
          }
        }
      },

      scales: {
        x: {
          grid: {
            display: false
          },

          ticks: {
            color: textMuted
          }
        },

        y: {
          beginAtZero: true,

          grid: {
            color: border + '55'
          },

          ticks: {
            color: textMuted,

            callback: function(value) {
              return '$' + value;
            }
          }
        }
      }
    }
  });
}

// ─── PAGE SWITCHING ───────────────────────────────────
function switchPage(page, btn) {
  document.querySelectorAll('.page-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const dp = document.getElementById('dashboard-page');
  const pp = document.getElementById('planner-page');
  if (page === 'dashboard') {
    dp.classList.remove('hidden');
    pp.classList.remove('active');
    updateDashboard();
    updateChart();
  } else {
    dp.classList.add('hidden');
    pp.classList.add('active');
    renderPlanner();
  }
}

// ─── PLANNER STATE ────────────────────────────────────
let plannerYear = new Date().getFullYear();
let plannerMonth = new Date().getMonth(); // 0-based

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function changeMonth(delta) {
  plannerMonth += delta;
  if (plannerMonth > 11) { plannerMonth = 0; plannerYear++; }
  if (plannerMonth < 0) { plannerMonth = 11; plannerYear--; }
  renderPlanner();
}

function planKey() { return `plan_${plannerYear}_${plannerMonth}`; }

function getPlans() {
  return JSON.parse(localStorage.getItem('flo_plans_' + planKey()) || '[]');
}

function getCards() {
  return JSON.parse(localStorage.getItem('flo_cards') || '[]');
}

function savePlans(plans) {
  localStorage.setItem('flo_plans_' + planKey(), JSON.stringify(plans));
}

function saveCards(cards) {
  localStorage.setItem('flo_cards', JSON.stringify(cards));
}

// ─── RENDER PLANNER ───────────────────────────────────
function renderPlanner() {
  const label = `${MONTHS_PT[plannerMonth]} ${plannerYear}`;
  document.getElementById('planner-month-label').textContent = label;
  document.getElementById('comp-month-label').textContent = label;

  const plans = getPlans();
  const incomes = plans.filter(p => p.type === 'income');
  const expenses = plans.filter(p => p.type === 'expense');

  const totalIncome = incomes.reduce((a,b) => a+b.amount, 0);
  const totalExpense = expenses.reduce((a,b) => a+b.amount, 0);
  const balance = totalIncome - totalExpense;

  // Summary cards
  document.getElementById('plan-income-total').textContent = fmtMoney(totalIncome);
  document.getElementById('plan-expense-total').textContent = fmtMoney(totalExpense);
  document.getElementById('plan-balance-total').textContent = fmtMoney(balance);
  document.getElementById('plan-income-footer').textContent = fmtMoney(totalIncome);
  document.getElementById('plan-expense-footer').textContent = fmtMoney(totalExpense);

  const balCard = document.getElementById('plan-balance-card');
  balCard.classList.remove('negative','positive','highlight');
  if (balance < 0) { balCard.classList.add('highlight','negative'); }
  else if (balance > 0) { balCard.classList.add('highlight','positive'); }
  else { balCard.classList.add('highlight'); }

  // Card available
  const avail = balance > 0 ? balance : 0;
  const availEl = document.getElementById('plan-card-available');
  availEl.textContent = fmtMoney(avail);
  availEl.style.color = avail > 0 ? 'var(--income)' : 'var(--expense)';

  // Income list
  const incEl = document.getElementById('plan-income-list');
  if (incomes.length === 0) {
    incEl.innerHTML = `<div class="plan-empty"><div class="ei">💰</div><p>Nenhuma receita prevista</p></div>`;
  } else {
    incEl.innerHTML = incomes.map(p => planItemHTML(p)).join('');
  }

  // Expense list
  const expEl = document.getElementById('plan-expense-list');
  if (expenses.length === 0) {
    expEl.innerHTML = `<div class="plan-empty"><div class="ei">💸</div><p>Nenhuma despesa prevista</p></div>`;
  } else {
    expEl.innerHTML = expenses.map(p => planItemHTML(p)).join('');
  }

  // Comparison table
  renderCompTable(plans);

  // Card budget
  renderCardBudget(avail);
}

function planItemHTML(p) {
  const isInc = p.type === 'income';
  return `
    <div class="plan-item">
      <div class="plan-item-icon">${getCatIcon(p.category, p.type)}</div>
      <div class="plan-item-info">
        <div class="plan-item-desc">${escHtml(p.desc)}</div>
        <div class="plan-item-cat">${escHtml(p.category)}${p.recurrence==='monthly'?' · 🔄 Mensal':''}</div>
      </div>
      <div class="plan-item-right">
        <div class="plan-item-value ${isInc?'income-val':'expense-val'}">${isInc?'+':'-'}${fmtMoney(p.amount)}</div>
      </div>
      <div class="plan-item-actions">
        <button class="plan-mini-btn" onclick="openEditPlanModal(${p.id})">✏️</button>
        <button class="plan-mini-btn del" onclick="deletePlanItem(${p.id})">✕</button>
      </div>
    </div>`;
}

// ─── COMPARISON TABLE ─────────────────────────────────
function renderCompTable(plans) {
  // Get real transactions for this month
  const monthStr = `${plannerYear}-${String(plannerMonth+1).padStart(2,'0')}`;
  const realTxs = state.transactions.filter(t => t.date.startsWith(monthStr));

  // Build per-category planned
  const catPlanned = {};
  const catType = {};
  plans.forEach(p => {
    if (!catPlanned[p.category]) { catPlanned[p.category] = 0; catType[p.category] = p.type; }
    catPlanned[p.category] += p.amount;
  });

  // Build per-category real
  const catReal = {};
  realTxs.forEach(t => {
    if (!catReal[t.category]) catReal[t.category] = { income:0, expense:0 };
    catReal[t.category][t.type] += t.amount;
  });

  // Union of all categories
  const allCats = new Set([...Object.keys(catPlanned), ...Object.keys(catReal)]);

  const tbody = document.getElementById('comp-table-body');
  if (allCats.size === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-soft);padding:24px;">Nenhum dado para este mês</td></tr>`;
    return;
  }

  let rows = '';
  allCats.forEach(cat => {
    const planned = catPlanned[cat] || 0;
    const type = catType[cat] || 'expense';
    const realVals = catReal[cat] || {income:0, expense:0};
    const real = type === 'income' ? realVals.income : realVals.expense;
    const diff = type === 'income' ? (real - planned) : (planned - real);
    const pct = planned > 0 ? Math.min((real / planned) * 100, 100) : (real > 0 ? 100 : 0);
    const rawPct = planned > 0 ? (real / planned) * 100 : 0;
    const barColor = type === 'income'
      ? (rawPct >= 100 ? 'var(--income)' : 'var(--income-mid)')
      : (rawPct > 100 ? 'var(--expense)' : rawPct > 80 ? 'var(--expense-mid)' : 'var(--income-mid)');

    let diffClass = 'zero', diffText = '—';
    if (diff > 0) { diffClass = 'under'; diffText = `+${fmtMoney(diff)}`; }
    else if (diff < 0) { diffClass = 'over'; diffText = fmtMoney(diff); }

    rows += `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:7px;">
            <span>${getCatIcon(cat,'')}</span>
            <div>
              <div style="font-weight:600;font-size:0.85rem;">${escHtml(cat)}</div>
              <div style="font-size:0.7rem;color:var(--text-soft)">${type==='income'?'Receita':'Despesa'}</div>
            </div>
          </div>
        </td>
        <td>${fmtMoney(planned)}</td>
        <td>${fmtMoney(real)}</td>
        <td><span class="comp-diff ${diffClass}">${diffText}</span></td>
        <td>
          <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:3px;">${Math.round(rawPct)}%</div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width:${pct}%;background:${barColor}"></div>
          </div>
        </td>
      </tr>`;
  });
  tbody.innerHTML = rows;
}

// ─── CARD BUDGET ──────────────────────────────────────
function renderCardBudget(available) {
  const cards = getCards();
  const el = document.getElementById('card-budget-section');
  if (cards.length === 0) {
    el.innerHTML = `<div class="plan-empty"><div class="ei">💳</div><p>Configure seus cartões para ver o limite disponível</p></div>`;
    return;
  }

  const plans = getPlans();
  
  el.innerHTML = `
    <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:14px;">
      Saldo disponível do planejamento: <strong style="color:${available>0?'var(--income)':'var(--expense)'};font-family:'Fraunces',serif">${fmtMoney(available)}</strong>
      — seus cartões estão alocados com os valores abaixo.
    </p>
    <div class="card-budget-grid">
      ${cards.map(c => {
        const cardIncome = plans.filter(p => p.type === 'income' && p.card == c.id).reduce((a,b) => a+b.amount, 0);
        const cardExpense = plans.filter(p => p.type === 'expense' && p.card == c.id).reduce((a,b) => a+b.amount, 0);
        const cardBalance = cardIncome - cardExpense;
        const pct = c.limit > 0 ? Math.min((cardExpense/c.limit)*100,100) : 0;
        return `
          <div class="card-budget-item">
            <div class="card-budget-name">💳 ${escHtml(c.name)}</div>
            <div class="card-budget-amount" style="color:${cardBalance>0?'var(--income)':cardBalance<0?'var(--expense)':'var(--text-soft)'}">${fmtMoney(cardBalance)}</div>
            <div class="card-budget-sub">Limite: ${fmtMoney(c.limit)} · Gasto: ${fmtMoney(cardExpense)}</div>
            <div class="progress-bar-wrap" style="margin-top:8px;">
              <div class="progress-bar-fill" style="width:${pct}%;background:var(--expense-mid)"></div>
            </div>
            <button class="plan-mini-btn del" style="margin-top:8px;font-size:0.7rem;" onclick="deleteCard(${c.id})">Remover</button>
          </div>`;
      }).join('')}
    </div>`;
}

// ─── PLAN MODAL ───────────────────────────────────────
function populateCardDropdown(selectedCardId = '') {
  const cards = getCards();
  const sel = document.getElementById('plan-card');
  sel.innerHTML = '';
  
  if (cards.length === 0) {
    sel.innerHTML = '<option value="" disabled selected>Adicione um cartão para continuar</option>';
    sel.disabled = true;
  } else {
    sel.innerHTML = '<option value="">Selecionar um cartão</option>';
    sel.disabled = false;
    cards.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = c.name;
      sel.appendChild(o);
    });
    if (selectedCardId) sel.value = selectedCardId;
  }
}

function openPlanModal(type) {
  currentPlanType = type;
  document.getElementById('plan-type').value = type;
  document.getElementById('plan-edit-id').value = '';
  document.getElementById('plan-desc').value = '';
  document.getElementById('plan-amount').value = '';
  document.getElementById('plan-recurrence').value = 'once';
  document.getElementById('plan-modal-title').textContent = type === 'income' ? 'Adicionar Receita Prevista' : 'Adicionar Despesa Prevista';
  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const sel = document.getElementById('plan-category');
  sel.innerHTML = '<option value="">Selecionar...</option>';
  cats.forEach(c => { const o = document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o); });
  populateCardDropdown('');
  ['plan-desc-err','plan-amount-err','plan-cat-err','plan-card-err'].forEach(hide);
  openModal('plan-modal');
}

function openEditPlanModal(id) {
  const plans = getPlans();
  const p = plans.find(x => x.id === id);
  if (!p) return;
  currentPlanType = p.type;
  document.getElementById('plan-type').value = p.type;
  document.getElementById('plan-edit-id').value = id;
  document.getElementById('plan-modal-title').textContent = p.type === 'income' ? 'Editar Receita Prevista' : 'Editar Despesa Prevista';
  const cats = p.type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const sel = document.getElementById('plan-category');
  sel.innerHTML = '<option value="">Selecionar...</option>';
  cats.forEach(c => { const o = document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o); });
  document.getElementById('plan-desc').value = p.desc;
  document.getElementById('plan-amount').value = p.amount;
  document.getElementById('plan-category').value = p.category;
  document.getElementById('plan-recurrence').value = p.recurrence || 'once';
  populateCardDropdown(p.card || '');
  ['plan-desc-err','plan-amount-err','plan-cat-err','plan-card-err'].forEach(hide);
  openModal('plan-modal');
}

function savePlanItem() {
  const desc = document.getElementById('plan-desc').value.trim();
  const amount = parseFloat(document.getElementById('plan-amount').value);
  const category = document.getElementById('plan-category').value;
  const card = document.getElementById('plan-card').value;
  const recurrence = document.getElementById('plan-recurrence').value;
  const editId = parseInt(document.getElementById('plan-edit-id').value);
  const type = document.getElementById('plan-type').value;
  let valid = true;

  ['plan-desc-err','plan-amount-err','plan-cat-err','plan-card-err'].forEach(hide);
  if (!desc) { show('plan-desc-err'); valid = false; }
  if (!amount || amount <= 0) { show('plan-amount-err'); valid = false; }
  if (!category) { show('plan-cat-err'); valid = false; }
  if (!card) { show('plan-card-err'); valid = false; }
  if (!valid) return;

  const plans = getPlans();

  if (editId) {
    const idx = plans.findIndex(x => x.id === editId);
    if (idx > -1) plans[idx] = { ...plans[idx], desc, amount, category, recurrence, type, card };
    toast('Item atualizado!', 'success');
  } else {
    plans.push({ id: Date.now(), desc, amount, category, recurrence, type, card });
    toast(type === 'income' ? 'Receita prevista adicionada!' : 'Despesa prevista adicionada!', 'success');
  }

  savePlans(plans);
  closeModal('plan-modal');
  renderPlanner();
}

function deletePlanItem(id) {
  const plans = getPlans().filter(p => p.id !== id);
  savePlans(plans);
  renderPlanner();
  toast('Item removido.', '');
}

// ─── CARD BUDGET MODAL ────────────────────────────────
function openCardBudgetModal() {
  renderCardEditor();
  openModal('card-budget-modal');
}

function renderCardEditor() {
  const cards = getCards();
  const el = document.getElementById('card-list-editor');
  if (cards.length === 0) {
    el.innerHTML = `<p style="font-size:0.82rem;color:var(--text-soft);">Nenhum cartão cadastrado ainda.</p>`;
    return;
  }
  el.innerHTML = cards.map(c => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 13px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;">
      <span style="font-size:1rem;">💳</span>
      <span style="flex:1;font-size:0.85rem;font-weight:600;">${escHtml(c.name)}</span>
      <span style="font-family:'Fraunces',serif;font-size:0.9rem;color:var(--text-muted);">${fmtMoney(c.limit)}</span>
      <button class="plan-mini-btn del" onclick="deleteCard(${c.id});renderCardEditor();renderCardBudget(getPlanAvailable())">✕</button>
    </div>`).join('');
}

function getPlanAvailable() {
  const plans = getPlans();
  const income = plans.filter(p=>p.type==='income').reduce((a,b)=>a+b.amount,0);
  const expense = plans.filter(p=>p.type==='expense').reduce((a,b)=>a+b.amount,0);
  return Math.max(0, income - expense);
}

function addCard() {
  const name = document.getElementById('new-card-name').value.trim();
  const limit = parseFloat(document.getElementById('new-card-limit').value);
  if (!name || !limit || limit <= 0) { toast('Preencha nome e limite do cartão.', 'error'); return; }
  const cards = getCards();
  cards.push({ id: Date.now(), name, limit });
  saveCards(cards);
  document.getElementById('new-card-name').value = '';
  document.getElementById('new-card-limit').value = '';
  renderCardEditor();
  renderCardBudget(getPlanAvailable());
  toast('Cartão adicionado!', 'success');
}

function deleteCard(id) {
  saveCards(getCards().filter(c => c.id !== id));
  renderCardBudget(getPlanAvailable());
  toast('Cartão removido.', '');
}
document.getElementById('login-pass').addEventListener('keydown', e => { if(e.key==='Enter') handleLogin(); });
document.getElementById('login-email').addEventListener('keydown', e => { if(e.key==='Enter') handleLogin(); });
document.getElementById('signup-pass').addEventListener('keydown', e => { if(e.key==='Enter') handleSignup(); });