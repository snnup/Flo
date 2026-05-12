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

// ─── USER TRANSACTIONS HELPER ────────────────────────
function getUserTransactions() {
  if (!state.currentUser) return [];
  return state.transactions.filter(t => t.userId === state.currentUser.id);
}

// ─── INIT ─────────────────────────────────────────────
load();
if (state.darkMode) document.body.classList.add('dark');
updateThemeIcon();

const rememberMe = localStorage.getItem('flo_remember') === 'true';
if (state.currentUser && rememberMe) {
setTimeout(() => {
  showApp();
}, 50);
} else {
  state.currentUser = null;
  localStorage.removeItem('flo_current');
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

// ─── UTILITIES ────────────────────────────────────────
function normalizeCategory(cat) {
  if (!cat) return '';
  // Find the exact match in INCOME_CATS or EXPENSE_CATS
  const allCats = [...INCOME_CATS, ...EXPENSE_CATS];
  const normalized = allCats.find(c => c.toLowerCase() === cat.toLowerCase());
  return normalized || cat;
}

function calculateProjectedEndOfMonth() {
  const txs = getUserTransactions();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const daysInMonth = lastDayOfMonth;
  const dayOfMonth = today.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  
  // Get current balance
  const income = txs.filter(t=>t.type==='income').reduce((a,b)=>a+b.amount,0);
  const expense = txs.filter(t=>t.type==='expense').reduce((a,b)=>a+b.amount,0);
  const currentBalance = income - expense;
  
  // Get last 7 days transactions
  const last7DaysExpenses = txs.filter(t => {
    const txDate = new Date(t.date);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return txDate >= sevenDaysAgo && t.type === 'expense';
  }).reduce((a,b) => a+b.amount, 0);
  
  const avgDailyExpense = last7DaysExpenses / 7;
  const projectedExpense = avgDailyExpense * daysRemaining;
  const projectedBalance = currentBalance - projectedExpense;
  
  return {
    currentBalance,
    projectedBalance,
    avgDailyExpense,
    daysRemaining,
    projectedExpense
  };
}

function getCatIcon(cat, type) {
  const icons = {
    'Salary':'💼','Freelance':'💻','Investment':'📈','Gift':'🎁','Bonus':'🏆','Other Income':'💰',
    'Food':'🍔','Transport':'🚗','Housing':'🏠','Shopping':'🛍️','Health':'💊','Entertainment':'🎬',
    'Education':'📚','Utilities':'⚡','Travel':'✈️','Subscriptions':'📱','Other Expense':'💸'
  };
  return icons[cat] || (type === 'income' ? '💰' : '💸');
}

// ─── PASSWORD HASHING ──────────────────────────────
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── PASSWORD VALIDATION ───────────────────────────────
function validatePassword(pass) {
  const minLength = pass.length >= 8;
  const hasUpperCase = /[A-Z]/.test(pass);
  const hasNumber = /\d/.test(pass);
  const hasSpecial = /[!%&@#$*?_]/.test(pass);
  
  return {
    isValid: minLength && hasUpperCase && hasNumber && hasSpecial,
    minLength,
    hasUpperCase,
    hasNumber,
    hasSpecial
  };
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.textContent = isPassword ? '🙈' : '👀';
  btn.style.color = isPassword ? 'var(--income)' : 'var(--text-muted)';
}

function updatePasswordValidator() {
  const pass = document.getElementById('signup-pass').value;
  const validator = document.getElementById('password-validator');
  
  if (pass.length === 0) {
    validator.style.display = 'none';
    return;
  }
  
  validator.style.display = 'block';
  const result = validatePassword(pass);
  
  // Update indicators
  updateValidatorCheck('check-length', result.minLength);
  updateValidatorCheck('check-upper', result.hasUpperCase);
  updateValidatorCheck('check-number', result.hasNumber);
  updateValidatorCheck('check-special', result.hasSpecial);
}

function updateValidatorCheck(checkId, isValid) {
  const checkEl = document.getElementById(checkId);
  const parentEl = checkEl.parentElement;
  if (isValid) {
    checkEl.textContent = '✓';
    checkEl.style.color = 'var(--income)';
    parentEl.style.color = 'var(--income)';
  } else {
    checkEl.textContent = '✕';
    checkEl.style.color = 'var(--expense)';
    parentEl.style.color = 'var(--text-muted)';
  }
}

// ─── AUTH ─────────────────────────────────────────────
function showLogin() {
  document.getElementById('login-email').value = '';
  document.getElementById('login-pass').value = '';
  if (document.getElementById('login-remember')) document.getElementById('login-remember').checked = false;
  document.getElementById('login-card').style.display = 'block';
  document.getElementById('signup-card').style.display = 'none';
  document.getElementById('forgot-card').style.display = 'none';
  document.getElementById('reset-card').style.display = 'none';
}

function showForgotPassword() {
  document.getElementById('login-card').style.display = 'none';
  document.getElementById('signup-card').style.display = 'none';
  document.getElementById('reset-card').style.display = 'none';
  document.getElementById('forgot-card').style.display = 'block';
  document.getElementById('forgot-email').value = '';
  document.getElementById('forgot-success').style.display = 'none';
  document.getElementById('forgot-send-btn').style.display = 'block';
  hide('forgot-email-err'); hide('forgot-general-err');
}

function handleForgotPassword() {
  const email = document.getElementById('forgot-email').value.trim();
  hide('forgot-email-err'); hide('forgot-general-err');
  if (!email || !/\S+@\S+\.\S+/.test(email)) { show('forgot-email-err'); return; }

  const user = state.users.find(u => u.email === email);
  // Por segurança, sempre mostra sucesso mesmo se email não existir
  if (user) {
    // Gera token local para reset (simulado - em produção use Supabase/backend)
    const token = btoa(`${user.id}:${Date.now()}:reset`);
    localStorage.setItem('flo_reset_token', JSON.stringify({ token, userId: user.id, exp: Date.now() + 3600000 }));
    console.info(`[DEV] Link de reset: ${location.origin}${location.pathname}?token=${token}&type=recovery`);
  }

  document.getElementById('forgot-success').style.display = 'block';
  document.getElementById('forgot-send-btn').style.display = 'none';
}

function showResetPassword() {
  document.getElementById('login-card').style.display = 'none';
  document.getElementById('signup-card').style.display = 'none';
  document.getElementById('forgot-card').style.display = 'none';
  document.getElementById('reset-card').style.display = 'block';
  document.getElementById('reset-pass').value = '';
  document.getElementById('reset-confirm').value = '';
  document.getElementById('reset-validator').style.display = 'none';
  hide('reset-pass-err'); hide('reset-confirm-err'); hide('reset-general-err');
}

function updateResetValidator() {
  const pass = document.getElementById('reset-pass').value;
  const v = document.getElementById('reset-validator');
  if (pass.length === 0) { v.style.display = 'none'; return; }
  v.style.display = 'block';
  const r = validatePassword(pass);
  const upd = (id, ok) => {
    const el = document.getElementById(id);
    el.textContent = ok ? '✓' : '✕';
    el.style.color = ok ? 'var(--income)' : 'var(--expense)';
    el.parentElement.style.color = ok ? 'var(--income)' : 'var(--text-muted)';
  };
  upd('rcheck-length', r.minLength);
  upd('rcheck-upper', r.hasUpperCase);
  upd('rcheck-number', r.hasNumber);
  upd('rcheck-special', r.hasSpecial);
}

function handleResetPassword() {
  const pass = document.getElementById('reset-pass').value;
  const confirm = document.getElementById('reset-confirm').value;
  hide('reset-pass-err'); hide('reset-confirm-err'); hide('reset-general-err');
  let valid = true;
  const pv = validatePassword(pass);
  if (!pv.isValid) {
    showErr('reset-pass-err', 'A senha não atende aos requisitos mínimos.');
    valid = false;
  }
  if (pass !== confirm) { show('reset-confirm-err'); valid = false; }
  if (!valid) return;

  // Valida token local
  const raw = localStorage.getItem('flo_reset_token');
  if (!raw) { showErr('reset-general-err', 'Link inválido ou expirado. Solicite um novo.'); return; }
  const { token, userId, exp } = JSON.parse(raw);
  const urlToken = new URLSearchParams(location.search).get('token');
  if ((urlToken && urlToken !== token) || Date.now() > exp) {
    showErr('reset-general-err', 'Link expirado. Solicite um novo.'); return;
  }

  // Atualiza senha no estado
  const idx = state.users.findIndex(u => u.id === userId);
  if (idx === -1) { showErr('reset-general-err', 'Usuário não encontrado.'); return; }
  state.users[idx].password = pass;
  localStorage.removeItem('flo_reset_token');
  save();

  document.getElementById('reset-save-btn').textContent = '✓ Senha atualizada!';
  document.getElementById('reset-save-btn').style.opacity = '0.7';
  setTimeout(() => showLogin(), 1800);
}

// Verifica token na URL ao carregar (quando usuário vem do email)
(function checkResetToken() {
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const type = params.get('type');
  if (token && type === 'recovery') {
    // Valida e injeta token no localStorage para o fluxo local
    const raw = localStorage.getItem('flo_reset_token');
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored.token === token && Date.now() <= stored.exp) {
        setTimeout(() => showResetPassword(), 100);
      }
    } else {
      // Token externo (ex: Supabase) — mostra tela de reset direto
      setTimeout(() => showResetPassword(), 100);
    }
  }
})();

function showSignup() {
  document.getElementById('signup-name').value = '';
  document.getElementById('signup-email').value = '';
  document.getElementById('signup-pass').value = '';
  document.getElementById('password-validator').style.display = 'none';
  document.getElementById('login-card').style.display = 'none';
  document.getElementById('signup-card').style.display = 'block';
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const rememberMe = document.getElementById('login-remember').checked;
  let valid = true;

  hide('login-email-err'); hide('login-pass-err'); hide('login-general-err');

  if (!email || !/\S+@\S+\.\S+/.test(email)) { show('login-email-err'); valid = false; }
  if (pass.length < 8) { show('login-pass-err'); valid = false; }
  if (!valid) return;

  const passHash = await hashPassword(pass);
  const user = state.users.find(u => u.email === email && u.passwordHash === passHash);
  if (!user) { showErr('login-general-err', 'Invalid email or password.'); return; }

  state.currentUser = user;
  localStorage.setItem('flo_remember', rememberMe.toString());
  if (rememberMe) {
    localStorage.setItem('flo_current', JSON.stringify(user));
  }
  showApp();
}

async function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-pass').value;
  let valid = true;

  hide('signup-name-err'); hide('signup-email-err'); hide('signup-pass-err'); hide('signup-general-err');

  if (!name) { show('signup-name-err'); valid = false; }
  if (!email || !/\S+@\S+\.\S+/.test(email)) { show('signup-email-err'); valid = false; }
  
  // Validate password with new rules
  const passValidation = validatePassword(pass);
  if (!passValidation.isValid) {
    let errorMsg = 'Sua senha deve ter: ';
    const missing = [];
    if (!passValidation.minLength) missing.push('8+ caracteres');
    if (!passValidation.hasUpperCase) missing.push('1 letra maiúscula');
    if (!passValidation.hasNumber) missing.push('1 número');
    if (!passValidation.hasSpecial) missing.push('1 caractere especial');
    errorMsg += missing.join(', ');
    showErr('signup-pass-err', errorMsg);
    valid = false;
  }
  
  if (!valid) return;

  if (state.users.find(u => u.email === email)) { showErr('signup-general-err', 'Email already registered.'); return; }

  const passwordHash = await hashPassword(pass);
  const user = { id: Date.now(), name, email, passwordHash, createdAt: new Date().toISOString() };
  state.users.push(user);
  save();
  
  // Show success and redirect to login
  toast('Conta criada com sucesso! Faça login agora.', 'success');
  setTimeout(() => showLogin(), 800);
}

function handleLogout() {
  state.currentUser = null;
  localStorage.removeItem('flo_current');
  localStorage.removeItem('flo_remember');
  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('login-email').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-remember').checked = false;
  document.getElementById('signup-pass').value = '';
  document.getElementById('password-validator').style.display = 'none';
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

// ─── CURRENCY INPUT FORMATTING ────────────────────────
// Formata enquanto o usuário digita: 1000 → 1.000,00
function formatCurrencyInput(input) {
  // Guarda posição do cursor para não pular
  const oldLen = input.value.length;

  // Remove tudo que não é dígito
  let digits = input.value.replace(/\D/g, '');

  // Sem dígitos → limpa
  if (!digits) { input.value = ''; return; }

  // Trata como centavos: últimos 2 dígitos = decimais
  // Limita a 13 dígitos (R$ 99.999.999.999,99)
  if (digits.length > 13) digits = digits.slice(0, 13);

  const cents = parseInt(digits, 10);
  const reais = cents / 100;

  input.value = reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Lê o valor numérico de um campo formatado (ex: "1.234,56" → 1234.56)
function parseCurrency(id) {
  const raw = document.getElementById(id).value;
  // Remove pontos de milhar, troca vírgula decimal por ponto
  return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
}

// Preenche um campo formatado com um número (para edição)
function setCurrencyInput(id, value) {
  const input = document.getElementById(id);
  if (!value && value !== 0) { input.value = ''; return; }
  input.value = parseFloat(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
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

  const tx = getUserTransactions().find(t => t.id === id);

  if (!tx) return;

  currentTxType = tx.type;

  document.getElementById('tx-modal-title').textContent = 'Edit Transaction';

  document.getElementById('tx-edit-id').value = id;

  document.getElementById('type-tabs').style.display = 'none';

  setTxType(tx.type);

  document.getElementById('tx-desc').value = tx.desc;
  setCurrencyInput('tx-amount', tx.amount);
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
  const desc   = document.getElementById('tx-desc').value.trim();
  const amount = parseCurrency('tx-amount');
  let category = document.getElementById('tx-category').value;
  const date = document.getElementById('tx-date').value;
  const time = document.getElementById('tx-time').value;
  const editId = document.getElementById('tx-edit-id').value;
  let valid = true;

  // Normalize category
  category = normalizeCategory(category);

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
    state.transactions.push({ id: Date.now(), desc, amount, category, date, time, type: currentTxType, userId: state.currentUser.id });
    toast(`${currentTxType === 'income' ? 'Income' : 'Expense'} added!`, 'success');
  }

  save();
  closeModal('tx-modal');
  updateDashboard();
  updateChart();
  // refresh all modal if open
  if (document.getElementById('all-modal').classList.contains('open')) renderAllTx();
}

// Global variable to hold the ID to delete after confirmation
let deleteIdToConfirm = null;

function deleteTx(id) {
  currentDeleteType = 'transaction';
  deleteIdToConfirm = id;
  document.getElementById('confirm-modal-text').textContent = 'Tem certeza que deseja excluir esta transação?';
  openModal('confirm-modal');
}

function confirmDeleteTx() {
  if (deleteIdToConfirm !== null) {
    state.transactions = state.transactions.filter(t => t.id !== deleteIdToConfirm);
    toast('Transaction deleted!', 'success');
    save();
    updateDashboard();
    updateChart();
    renderAllTx();
    closeModal('confirm-modal');
    deleteIdToConfirm = null;
  }
}

// ─── DASHBOARD ────────────────────────────────────────
function updateDashboard() {
  const txs = getUserTransactions();
  const income = txs.filter(t=>t.type==='income').reduce((a,b)=>a+b.amount,0);
  const expense = txs.filter(t=>t.type==='expense').reduce((a,b)=>a+b.amount,0);
  const balance = income - expense;

  const balEl = document.getElementById('total-balance');
  balEl.textContent = fmtMoney(balance);
  balEl.style.color = balance < 0 ? 'var(--expense)' : '';
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

  // Cards summary
  updateCardsSummary();

  // Projected end of month
  const projection = calculateProjectedEndOfMonth();
  if (projection.daysRemaining > 0 && txs.length > 0) {
    const projectedSection = document.getElementById('projected-section');
    const projectedCard = document.getElementById('projected-card');
    const projectedBalance = document.getElementById('projected-balance');
    const projectedSub = document.getElementById('projected-sub');
    
    projectedBalance.textContent = fmtMoney(projection.projectedBalance);
    projectedBalance.style.color = projection.projectedBalance < 0 ? 'var(--expense)' : '';
    
    const trend = projection.projectedBalance < projection.currentBalance ? '📉' : '📈';
    const diff = Math.abs(projection.projectedBalance - projection.currentBalance);
    projectedSub.textContent = `${trend} ${projection.projectedBalance < projection.currentBalance ? 'Queda' : 'Ganho'} de ${fmtMoney(diff)} · ${projection.daysRemaining} dias restantes`;
    
    projectedCard.classList.remove('positive', 'negative');
    if (projection.projectedBalance < 0) {
      projectedCard.classList.add('negative');
    } else if (projection.projectedBalance > projection.currentBalance) {
      projectedCard.classList.add('positive');
    }
    
    projectedSection.style.display = 'grid';
  } else {
    document.getElementById('projected-section').style.display = 'none';
  }
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
  const txs = getUserTransactions();
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

function updateCardsSummary() {
  const cards = getCards();
  const plans = getPlans();
  const el = document.getElementById('dashboard-cards-summary');
  if (cards.length === 0) {
    el.innerHTML = `<div class="empty-state"><p>Nenhum cartão cadastrado</p></div>`;
    return;
  }
  
  el.innerHTML = cards.map(c => {
    const cardExpense = plans.filter(p => p.type === 'expense' && p.card == c.id).reduce((a,b) => a+b.amount, 0);
    const pct = c.limit > 0 ? Math.min((cardExpense / c.limit) * 100, 100) : 0;
    const available = Math.max(0, c.limit - cardExpense);
    const availColor = available > 0 ? 'var(--income)' : 'var(--expense)';
    return `
      <div style="display:flex;flex-direction:column;gap:8px;padding:12px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:1.2rem;">💳</span>
            <span style="font-weight:600;font-size:0.9rem;">${escHtml(c.name)}</span>
          </div>
          <span style="font-family:'Fraunces',serif;font-weight:600;font-size:0.9rem;color:${availColor}">${fmtMoney(available)}</span>
        </div>
        <div style="font-size:0.75rem;color:var(--text-muted);">
          Limite: ${fmtMoney(c.limit)} · Gasto: ${fmtMoney(cardExpense)} · Disponível: ${fmtMoney(available)}
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%;background:${pct > 80 ? 'var(--expense)' : pct > 50 ? 'var(--expense-mid)' : 'var(--income-mid)'}"></div>
        </div>
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

  let txs = [...getUserTransactions()];

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
  const userTxs = getUserTransactions();

  const incomeData = days.map(day => {
    return userTxs
      .filter(t => t.type === 'income' && t.date === day)
      .reduce((a, b) => a + Number(b.amount), 0);
  });

  const expenseData = days.map(day => {
    return userTxs
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
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart',
        onComplete: function() {
          // Animation complete
        }
      },

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
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          displayColors: false,

          callbacks: {
            title: function(ctx) {
              return ctx[0].label;
            },
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
            color: textMuted,
            font: { size: 12 }
          }
        },

        y: {
          beginAtZero: true,

          grid: {
            color: border + '55',
            drawBorder: false
          },

          ticks: {
            color: textMuted,
            font: { size: 11 },

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

function cardsKey() { return `flo_cards_${state.currentUser?.id || 'guest'}`; }

function getPlans() {
  if (!state.currentUser) return [];
  return JSON.parse(localStorage.getItem('flo_plans_' + planKey()) || '[]').filter(p => p.userId === state.currentUser.id);
}

function getCards() {
  if (!state.currentUser) return [];
  return JSON.parse(localStorage.getItem(cardsKey()) || '[]').filter(c => c.userId === state.currentUser.id);
}

function savePlans(plans) {
  localStorage.setItem('flo_plans_' + planKey(), JSON.stringify(plans));
}

function saveCards(cards) {
  localStorage.setItem(cardsKey(), JSON.stringify(cards));
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

  // Process recurring plans
  processRecurringPlans();

  // Comparison table
  renderCompTable(plans);

  // Card budget
  renderCardBudget(avail);

  // Financial calendar
  setTimeout(() => renderFinancialCalendar(), 100);
}

function planItemHTML(p) {
  const isInc = p.type === 'income';
  const isRealized = p.realized === true;
  return `
    <div class="plan-item ${isRealized ? 'plan-item-realized' : ''}">
      <div class="plan-item-icon">${getCatIcon(p.category, p.type)}</div>
      <div class="plan-item-info">
        <div class="plan-item-desc">${escHtml(p.desc)}</div>
        <div class="plan-item-cat">${escHtml(p.category)}${p.recurrence==='monthly'?' · 🔄 Mensal':''}</div>
      </div>
      <div class="plan-item-right">
        <div class="plan-item-value ${isInc?'income-val':'expense-val'}">${isInc?'+':'-'}${fmtMoney(p.amount)}</div>
      </div>
      <div class="plan-item-actions">
        <button class="plan-mini-btn ${isRealized ? 'realized' : ''}" title="${isRealized ? 'Desmarcar como realizado' : 'Marcar como realizado'}" onclick="toggleRealizePlanItem(${p.id})">${isRealized ? '✓' : '○'}</button>
        <button class="plan-mini-btn" onclick="openEditPlanModal(${p.id})">✏️</button>
        <button class="plan-mini-btn del" onclick="deletePlanItem(${p.id})">✕</button>
      </div>
    </div>`;
}

// ─── COMPARISON TABLE ─────────────────────────────────
function renderCompTable(plans) {
  // Get real transactions for this month
  const monthStr = `${plannerYear}-${String(plannerMonth+1).padStart(2,'0')}`;
  const realTxs = getUserTransactions().filter(t => t.date.startsWith(monthStr));

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
  setCurrencyInput('plan-amount', p.amount);
  document.getElementById('plan-category').value = p.category;
  document.getElementById('plan-recurrence').value = p.recurrence || 'once';
  populateCardDropdown(p.card || '');
  ['plan-desc-err','plan-amount-err','plan-cat-err','plan-card-err'].forEach(hide);
  openModal('plan-modal');
}

function savePlanItem() {
  const desc = document.getElementById('plan-desc').value.trim();
  const amount = parseCurrency('plan-amount');
  let category = document.getElementById('plan-category').value;
  const card = document.getElementById('plan-card').value;
  const recurrence = document.getElementById('plan-recurrence').value;
  const editId = parseInt(document.getElementById('plan-edit-id').value);
  const type = document.getElementById('plan-type').value;
  let valid = true;

  // Normalize category
  category = normalizeCategory(category);

  ['plan-desc-err','plan-amount-err','plan-cat-err','plan-card-err'].forEach(hide);
  if (!desc) { show('plan-desc-err'); valid = false; }
  if (!amount || amount <= 0) { show('plan-amount-err'); valid = false; }
  if (!category) { show('plan-cat-err'); valid = false; }
  if (!card) { show('plan-card-err'); valid = false; }
  if (!valid) return;

  const plans = getPlans();

  if (editId) {
    const idx = plans.findIndex(x => x.id === editId);
    if (idx > -1) plans[idx] = { ...plans[idx], desc, amount, category, recurrence, type, card, userId: state.currentUser.id };
    toast('Item atualizado!', 'success');
  } else {
    plans.push({ id: Date.now(), desc, amount, category, recurrence, type, card, userId: state.currentUser.id });
    toast(type === 'income' ? 'Receita prevista adicionada!' : 'Despesa prevista adicionada!', 'success');
  }

  savePlans(plans);
  closeModal('plan-modal');
  renderPlanner();
}

function deletePlanItem(id) {
  currentDeleteType = 'plan';
  deleteIdToConfirm = id;
  document.getElementById('confirm-modal-text').textContent = 'Tem certeza que deseja excluir este item de planejamento?';
  openModal('confirm-modal');
}

function confirmDeletePlanItem() {
  if (deleteIdToConfirm !== null) {
    const plans = getPlans().filter(p => p.id !== deleteIdToConfirm);
    savePlans(plans);
    renderPlanner();
    toast('Item removido.', '');
    closeModal('confirm-modal');
    deleteIdToConfirm = null;
  }
}

function toggleRealizePlanItem(id) {
  const plans = getPlans();
  const plan = plans.find(p => p.id === id);
  if (plan) {
    plan.realized = !plan.realized;
    savePlans(plans);
    renderPlanner();
    toast(plan.realized ? 'Marcado como realizado ✓' : 'Desmarcado', 'success');
  }
}

// ─── EXPORT TO PDF ────────────────────────────────────
function openExportModal() {
  openModal('export-modal');
}

function exportToPDF() {
  const exportType = document.querySelector('input[name="export-type"]:checked').value;
  const element = document.createElement('div');
  element.style.padding = '20px';
  element.style.background = 'white';
  element.style.color = '#1a1714';
  
  let content = '';
  const userName = state.currentUser?.name || 'User';
  const currentDate = new Date().toLocaleDateString('pt-BR');
  
  if (exportType === 'dashboard') {
    content = generateDashboardPDF();
  } else if (exportType === 'planner') {
    content = generatePlannerPDF();
  } else if (exportType === 'transactions') {
    content = generateTransactionsPDF();
  }
  
  element.innerHTML = `
    <div style="font-family: Arial, sans-serif;">
      <h1 style="color: #2d6a4f; margin-bottom: 10px;">Flo - Personal Finance</h1>
      <p style="color: #8a8178; margin-bottom: 20px;">Usuário: ${escHtml(userName)} | Data: ${currentDate}</p>
      ${content}
    </div>
  `;
  
  const opt = {
    margin: 10,
    filename: `flo-${exportType}-${new Date().toISOString().slice(0,10)}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };
  
  html2pdf().set(opt).from(element).save();
  closeModal('export-modal');
  toast('PDF exportado com sucesso!', 'success');
}

function generateDashboardPDF() {
  const txs = getUserTransactions();
  const income = txs.filter(t=>t.type==='income').reduce((a,b)=>a+b.amount,0);
  const expense = txs.filter(t=>t.type==='expense').reduce((a,b)=>a+b.amount,0);
  const balance = income - expense;
  
  let html = `
    <h2 style="margin-top: 0;">Dashboard</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
      <div style="border: 1px solid #e2ddd8; padding: 15px; border-radius: 8px;">
        <p style="margin: 0 0 5px 0; color: #8a8178; font-size: 12px;">Receita Total</p>
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #2d6a4f;">${fmtMoney(income)}</p>
      </div>
      <div style="border: 1px solid #e2ddd8; padding: 15px; border-radius: 8px;">
        <p style="margin: 0 0 5px 0; color: #8a8178; font-size: 12px;">Despesa Total</p>
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #c1440e;">${fmtMoney(expense)}</p>
      </div>
      <div style="border: 1px solid #e2ddd8; padding: 15px; border-radius: 8px;">
        <p style="margin: 0 0 5px 0; color: #8a8178; font-size: 12px;">Saldo</p>
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${balance < 0 ? '#c1440e' : '#2d6a4f'};">${fmtMoney(balance)}</p>
      </div>
    </div>
    
    <h3>Transações Recentes</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #f5f3ef; border-bottom: 2px solid #e2ddd8;">
          <th style="padding: 10px; text-align: left; font-weight: bold;">Descrição</th>
          <th style="padding: 10px; text-align: left; font-weight: bold;">Categoria</th>
          <th style="padding: 10px; text-align: right; font-weight: bold;">Valor</th>
          <th style="padding: 10px; text-align: left; font-weight: bold;">Data</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  const sorted = [...txs].sort((a,b)=> (b.date+b.time).localeCompare(a.date+a.time)).slice(0, 10);
  sorted.forEach(tx => {
    const isInc = tx.type === 'income';
    html += `
      <tr style="border-bottom: 1px solid #e2ddd8;">
        <td style="padding: 10px;">${escHtml(tx.desc)}</td>
        <td style="padding: 10px;">${escHtml(tx.category)}</td>
        <td style="padding: 10px; text-align: right; color: ${isInc ? '#2d6a4f' : '#c1440e'}; font-weight: bold;">${isInc ? '+' : '-'}${fmtMoney(tx.amount)}</td>
        <td style="padding: 10px;">${tx.date}</td>
      </tr>
    `;
  });
  
  html += `</tbody></table>`;
  return html;
}

function generatePlannerPDF() {
  const plans = getPlans();
  const incomes = plans.filter(p => p.type === 'income');
  const expenses = plans.filter(p => p.type === 'expense');
  
  const totalIncome = incomes.reduce((a,b) => a+b.amount, 0);
  const totalExpense = expenses.reduce((a,b) => a+b.amount, 0);
  const balance = totalIncome - totalExpense;
  
  const label = `${MONTHS_PT[plannerMonth]} ${plannerYear}`;
  
  let html = `
    <h2 style="margin-top: 0;">Planejamento - ${label}</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
      <div style="border: 1px solid #e2ddd8; padding: 15px; border-radius: 8px;">
        <p style="margin: 0 0 5px 0; color: #8a8178; font-size: 12px;">Receita Planejada</p>
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #2d6a4f;">${fmtMoney(totalIncome)}</p>
      </div>
      <div style="border: 1px solid #e2ddd8; padding: 15px; border-radius: 8px;">
        <p style="margin: 0 0 5px 0; color: #8a8178; font-size: 12px;">Despesa Planejada</p>
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #c1440e;">${fmtMoney(totalExpense)}</p>
      </div>
      <div style="border: 1px solid #e2ddd8; padding: 15px; border-radius: 8px;">
        <p style="margin: 0 0 5px 0; color: #8a8178; font-size: 12px;">Saldo Planejado</p>
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${balance < 0 ? '#c1440e' : '#2d6a4f'};">${fmtMoney(balance)}</p>
      </div>
    </div>
    
    <h3>Receitas</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #f5f3ef; border-bottom: 2px solid #e2ddd8;">
          <th style="padding: 10px; text-align: left; font-weight: bold;">Descrição</th>
          <th style="padding: 10px; text-align: left; font-weight: bold;">Categoria</th>
          <th style="padding: 10px; text-align: right; font-weight: bold;">Valor</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  incomes.forEach(p => {
    html += `
      <tr style="border-bottom: 1px solid #e2ddd8;">
        <td style="padding: 10px;">${escHtml(p.desc)}</td>
        <td style="padding: 10px;">${escHtml(p.category)}</td>
        <td style="padding: 10px; text-align: right; color: #2d6a4f; font-weight: bold;">+${fmtMoney(p.amount)}</td>
      </tr>
    `;
  });
  
  html += `</tbody></table><h3>Despesas</h3><table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;"><thead><tr style="background: #f5f3ef; border-bottom: 2px solid #e2ddd8;"><th style="padding: 10px; text-align: left; font-weight: bold;">Descrição</th><th style="padding: 10px; text-align: left; font-weight: bold;">Categoria</th><th style="padding: 10px; text-align: right; font-weight: bold;">Valor</th></tr></thead><tbody>`;
  
  expenses.forEach(p => {
    html += `
      <tr style="border-bottom: 1px solid #e2ddd8;">
        <td style="padding: 10px;">${escHtml(p.desc)}</td>
        <td style="padding: 10px;">${escHtml(p.category)}</td>
        <td style="padding: 10px; text-align: right; color: #c1440e; font-weight: bold;">-${fmtMoney(p.amount)}</td>
      </tr>
    `;
  });
  
  html += `</tbody></table>`;
  return html;
}

function generateTransactionsPDF() {
  const txs = [...getUserTransactions()].sort((a,b)=> (b.date+b.time).localeCompare(a.date+a.time));
  
  let html = `
    <h2 style="margin-top: 0;">Todas as Transações</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #f5f3ef; border-bottom: 2px solid #e2ddd8;">
          <th style="padding: 10px; text-align: left; font-weight: bold;">Descrição</th>
          <th style="padding: 10px; text-align: left; font-weight: bold;">Categoria</th>
          <th style="padding: 10px; text-align: right; font-weight: bold;">Valor</th>
          <th style="padding: 10px; text-align: left; font-weight: bold;">Data</th>
          <th style="padding: 10px; text-align: left; font-weight: bold;">Tipo</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  txs.forEach(tx => {
    const isInc = tx.type === 'income';
    html += `
      <tr style="border-bottom: 1px solid #e2ddd8;">
        <td style="padding: 10px;">${escHtml(tx.desc)}</td>
        <td style="padding: 10px;">${escHtml(tx.category)}</td>
        <td style="padding: 10px; text-align: right; color: ${isInc ? '#2d6a4f' : '#c1440e'}; font-weight: bold;">${isInc ? '+' : '-'}${fmtMoney(tx.amount)}</td>
        <td style="padding: 10px;">${tx.date}</td>
        <td style="padding: 10px;">${isInc ? 'Receita' : 'Despesa'}</td>
      </tr>
    `;
  });
  
  html += `</tbody></table>`;
  return html;
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
  const limit = parseCurrency('new-card-limit');
  if (!name || !limit || limit <= 0) { toast('Preencha nome e limite do cartão.', 'error'); return; }
  const cards = getCards();
  cards.push({ id: Date.now(), name, limit, userId: state.currentUser.id });
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

// ─── RECURRING EVENTS STORE ───────────────────────────
function recurringKey() { return `flo_recurring_${state.currentUser?.id || 'guest'}`; }

function getAllRecurring() {
  return JSON.parse(localStorage.getItem(recurringKey()) || '[]');
}

function saveAllRecurring(list) {
  localStorage.setItem(recurringKey(), JSON.stringify(list));
}

// Check if a recurring event fires on a given dateStr (YYYY-MM-DD)
function recurringMatchesDate(rec, dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day   = d.getDate();
  const month = d.getMonth(); // 0-based
  const wday  = d.getDay();   // 0=Sun

  if (rec.freq === 'monthly') {
    return day === rec.day;
  } else if (rec.freq === 'weekly') {
    return wday === rec.weekday;
  } else if (rec.freq === 'yearly') {
    return day === rec.yearDay && month === rec.yearMonth;
  }
  return false;
}

// Get all recurring events that match a given date
function getRecurringForDay(dateStr) {
  return getAllRecurring().filter(r => recurringMatchesDate(r, dateStr));
}

// ─── RECURRING MODAL UI ───────────────────────────────
function openRecurringModal() {
  clearRecurringForm();
  updateRecCategory();
  renderRecurringList();
  openModal('recurring-modal');
}

function updateRecCategory() {
  const type = document.getElementById('rec-type').value;
  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const sel = document.getElementById('rec-category');
  sel.innerHTML = '<option value="">Selecionar...</option>';
  cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
}

function updateRecFreqUI() {
  const freq = document.getElementById('rec-freq').value;
  document.getElementById('rec-day-group').style.display     = freq === 'monthly' ? '' : 'none';
  document.getElementById('rec-weekday-group').style.display = freq === 'weekly'  ? '' : 'none';
  document.getElementById('rec-yearly-group').style.display  = freq === 'yearly'  ? '' : 'none';
  document.getElementById('rec-day-label').textContent = 'Dia do mês';
}

function clearRecurringForm() {
  document.getElementById('rec-edit-id').value = '';
  document.getElementById('rec-desc').value = '';
  document.getElementById('rec-amount').value = '';
  document.getElementById('rec-type').value = 'income';
  document.getElementById('rec-freq').value = 'monthly';
  document.getElementById('rec-day').value = '';
  document.getElementById('rec-weekday').value = '1';
  document.getElementById('rec-yearly-date').value = '';
  document.getElementById('rec-cancel-btn').style.display = 'none';
  updateRecCategory();
  updateRecFreqUI();
  ['rec-desc-err','rec-amount-err','rec-cat-err','rec-day-err','rec-yearly-err'].forEach(hide);
}

function saveRecurring() {
  const desc     = document.getElementById('rec-desc').value.trim();
  const amount   = parseCurrency('rec-amount');
  const type     = document.getElementById('rec-type').value;
  const category = document.getElementById('rec-category').value;
  const freq     = document.getElementById('rec-freq').value;
  const editId   = parseInt(document.getElementById('rec-edit-id').value);
  let valid = true;

  ['rec-desc-err','rec-amount-err','rec-cat-err','rec-day-err','rec-yearly-err'].forEach(hide);
  if (!desc)              { show('rec-desc-err');   valid = false; }
  if (!amount || amount <= 0) { show('rec-amount-err'); valid = false; }
  if (!category)          { show('rec-cat-err');    valid = false; }

  let day = null, weekday = null, yearDay = null, yearMonth = null;

  if (freq === 'monthly') {
    day = parseInt(document.getElementById('rec-day').value);
    if (!day || day < 1 || day > 31) { show('rec-day-err'); valid = false; }
  } else if (freq === 'weekly') {
    weekday = parseInt(document.getElementById('rec-weekday').value);
  } else if (freq === 'yearly') {
    const raw = document.getElementById('rec-yearly-date').value.trim();
    const parts = raw.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) { show('rec-yearly-err'); valid = false; }
    else { yearDay = parseInt(parts[0]); yearMonth = parseInt(parts[1]) - 1; }
  }

  if (!valid) return;

  const all = getAllRecurring();
  const rec = { desc, amount, type, category, freq, day, weekday, yearDay, yearMonth,
                userId: state.currentUser.id };

  if (editId) {
    const idx = all.findIndex(r => r.id === editId);
    if (idx > -1) all[idx] = { ...all[idx], ...rec };
    toast('Evento atualizado!', 'success');
  } else {
    rec.id = Date.now();
    all.push(rec);
    toast('Evento recorrente criado!', 'success');
  }

  saveAllRecurring(all);
  clearRecurringForm();
  renderRecurringList();
  renderFinancialCalendar(); // refresh calendar
}

function editRecurring(id) {
  const rec = getAllRecurring().find(r => r.id === id);
  if (!rec) return;
  document.getElementById('rec-edit-id').value = id;
  document.getElementById('rec-desc').value = rec.desc;
  setCurrencyInput('rec-amount', rec.amount);
  document.getElementById('rec-type').value = rec.type;
  document.getElementById('rec-freq').value = rec.freq;
  updateRecCategory();
  document.getElementById('rec-category').value = rec.category;
  updateRecFreqUI();
  if (rec.freq === 'monthly')  document.getElementById('rec-day').value = rec.day;
  if (rec.freq === 'weekly')   document.getElementById('rec-weekday').value = rec.weekday;
  if (rec.freq === 'yearly')   document.getElementById('rec-yearly-date').value = `${String(rec.yearDay).padStart(2,'0')}/${String(rec.yearMonth+1).padStart(2,'0')}`;
  document.getElementById('rec-cancel-btn').style.display = '';
  document.getElementById('rec-desc').focus();
}

function deleteRecurring(id) {
  saveAllRecurring(getAllRecurring().filter(r => r.id !== id));
  renderRecurringList();
  renderFinancialCalendar();
  toast('Evento removido.', '');
}

const FREQ_LABEL = { monthly: 'Mensal', weekly: 'Semanal', yearly: 'Anual' };
const FREQ_ICON  = { monthly: '📆', weekly: '📅', yearly: '🗓️' };
const WDAY_NAMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
const MONTH_NAMES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function recFreqSummary(rec) {
  if (rec.freq === 'monthly') return `Todo dia ${rec.day} do mês`;
  if (rec.freq === 'weekly')  return `Toda ${WDAY_NAMES[rec.weekday]}-feira`;
  if (rec.freq === 'yearly')  return `Todo ano em ${rec.yearDay}/${rec.yearMonth !== null ? MONTH_NAMES_SHORT[rec.yearMonth] : '?'}`;
  return '';
}

function renderRecurringList() {
  const all = getAllRecurring().filter(r => r.userId === state.currentUser.id);
  const el = document.getElementById('recurring-list');
  if (all.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🔄</div><p>Nenhum evento recorrente ainda</p></div>`;
    return;
  }
  el.innerHTML = all.map(rec => {
    const isInc = rec.type === 'income';
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;margin-bottom:8px;transition:all 0.2s;">
        <div style="width:38px;height:38px;border-radius:10px;background:${isInc?'var(--income-light)':'var(--expense-light)'};border:1px solid ${isInc?'var(--income-mid)':'var(--expense-mid)'};display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;">${getCatIcon(rec.category, rec.type)}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:0.88rem;color:var(--text);">${escHtml(rec.desc)}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">
            ${FREQ_ICON[rec.freq]} ${recFreqSummary(rec)} · ${escHtml(rec.category)}
          </div>
        </div>
        <div style="font-family:'Fraunces',serif;font-weight:700;font-size:0.95rem;color:${isInc?'var(--income)':'var(--expense)'};white-space:nowrap;">${isInc?'+':'-'}R$ ${rec.amount.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="plan-mini-btn" onclick="editRecurring(${rec.id})" title="Editar">✏️</button>
          <button class="plan-mini-btn del" onclick="deleteRecurring(${rec.id})" title="Excluir">✕</button>
        </div>
      </div>`;
  }).join('');
}

// ─── FINANCIAL CALENDAR HELPERS ───────────────────────
function getEventsForDay(dateStr) {
  const events = { income: [], expense: [], cards: [] };
  const txs   = getUserTransactions().filter(t => t.date === dateStr);
  const plans = getPlans().filter(p => p.date === dateStr);
  const recs  = getRecurringForDay(dateStr).filter(r => r.userId === state.currentUser?.id);

  txs.filter(t => t.type === 'income').forEach(t => events.income.push({ ...t, source: 'tx' }));
  txs.filter(t => t.type === 'expense').forEach(t => events.expense.push({ ...t, source: 'tx' }));

  plans.filter(p => p.type === 'income').forEach(p => events.income.push({ ...p, source: 'plan' }));
  plans.filter(p => p.type === 'expense').forEach(p => events.expense.push({ ...p, source: 'plan' }));

  recs.filter(r => r.type === 'income').forEach(r => events.income.push({ ...r, source: 'recurring' }));
  recs.filter(r => r.type === 'expense').forEach(r => events.expense.push({ ...r, source: 'recurring' }));

  return events;
}

function getDayBalance(dateStr) {
  const events = getEventsForDay(dateStr);
  const income = events.income.reduce((a,b) => a + b.amount, 0);
  const expense = events.expense.reduce((a,b) => a + b.amount, 0);
  return { income, expense, net: income - expense };
}

function getDayBalanceClass(balance) {
  // Returns CSS class based on balance for border and bg color
  if (balance > 0) return 'calendar-day-positive';
  if (balance < 0) return 'calendar-day-negative';
  return 'calendar-day-neutral';
}

function renderFinancialCalendar() {
  const year = plannerYear;
  const month = plannerMonth;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  const el = document.getElementById('financial-calendar');
  if (!el) return;
  
  // Day headers
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  let html = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:14px;margin-bottom:16px;">`;
  dayLabels.forEach(label => {
    html += `<div style="text-align:center;font-weight:600;color:var(--text-muted);font-size:0.75rem;padding:8px;text-transform:uppercase;letter-spacing:0.05em;">${label}</div>`;
  });
  html += `</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:14px;">`;
  
  // Day cells
  let currentDate = new Date(startDate);
  const today = new Date();
  
  while (currentDate <= lastDay || currentDate.getDay() !== 0) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const balance = getDayBalance(dateStr);
    const balanceClass = getDayBalanceClass(balance.net);
    const isCurrentMonth = currentDate.getMonth() === month;
    const isToday = currentDate.toDateString() === today.toDateString();
    
    const events = getEventsForDay(dateStr);
    const hasIncome   = events.income.length > 0;
    const hasExpense  = events.expense.length > 0;
    const hasRecurring = [...events.income, ...events.expense].some(e => e.source === 'recurring');

    // Event indicators (mini dots)
    let indicators = '';
    if (hasIncome)    indicators += '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--income);margin-right:3px;" title="Receita"></span>';
    if (hasExpense)   indicators += '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--expense);margin-right:3px;" title="Despesa"></span>';
    if (hasRecurring) indicators += '<span style="display:inline-block;font-size:0.55rem;margin-right:2px;" title="Recorrente">🔄</span>';

    // Today badge
    const todayClass = isToday ? 'calendar-day-today' : '';
    const todayBadge = isToday ? `<div style="position:absolute;top:4px;right:6px;background:var(--accent);color:white;font-size:0.55rem;padding:3px 7px;border-radius:10px;font-weight:700;white-space:nowrap;letter-spacing:0.04em;">HOJE</div>` : '';
    // Recurring badge (only when no today badge)
    const recBadge = (!isToday && hasRecurring) ? `<div style="position:absolute;top:4px;right:5px;background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);font-size:0.5rem;padding:2px 5px;border-radius:8px;font-weight:700;letter-spacing:0.04em;white-space:nowrap;">🔄 REC</div>` : '';
    
    html += `
      <div class="calendar-day ${balanceClass} ${todayClass}" onclick="openDayDetails('${dateStr}')" style="${!isCurrentMonth?'opacity:0.4':''}">
        ${todayBadge}${recBadge}
        <div style="font-weight:700;font-size:1rem;color:var(--text);margin-bottom:8px;position:relative;z-index:1;line-height:1;">${currentDate.getDate()}</div>
        <div style="display:flex;gap:3px;margin-bottom:10px;font-size:0.6rem;height:8px;align-items:center;">${indicators}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);line-height:1.4;margin-bottom:10px;display:flex;flex-direction:column;gap:3px;">
          ${hasIncome  ? `<div style="color:var(--income);font-weight:600;font-size:0.8rem;">+${balance.income.toFixed(0)}</div>`  : ''}
          ${hasExpense ? `<div style="color:var(--expense);font-weight:600;font-size:0.8rem;">-${balance.expense.toFixed(0)}</div>` : ''}
        </div>
        <div style="font-size:0.8rem;font-family:'Fraunces',serif;font-weight:700;color:${balance.net>0?'var(--income)':balance.net<0?'var(--expense)':'var(--text-muted)'};margin-top:auto;letter-spacing:0.02em;">
          ${balance.net !== 0 ? (balance.net > 0 ? '+' : '') + balance.net.toFixed(0) : '—'}
        </div>
      </div>
    `;
    
    currentDate.setDate(currentDate.getDate() + 1);
    if (currentDate > lastDay && currentDate.getDay() === 0) break;
  }
  
  html += `</div>`;
  el.innerHTML = html;
}

function openDayDetails(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayNames = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const dayName   = dayNames[dateObj.getDay()];
  const monthName = monthNames[month - 1];

  const events  = getEventsForDay(dateStr);
  const balance = getDayBalance(dateStr);
  const isEmpty = events.income.length === 0 && events.expense.length === 0;

  const fmtAmt = n => 'R$ ' + n.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});

  const srcBadge = (src) => {
    if (src === 'recurring') return '<span style="font-size:0.62rem;background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);border-radius:4px;padding:2px 5px;margin-left:5px;">🔄 Recorrente</span>';
    if (src === 'plan')      return '<span style="font-size:0.62rem;background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);border-radius:4px;padding:2px 5px;margin-left:5px;">📋 Planejado</span>';
    return '';
  };

  const mkRow = (evt, type) => {
    const isInc = type === 'income';
    const icon  = getCatIcon(evt.category, type);
    const name  = escHtml(evt.desc || evt.description || '—');
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${isInc?'var(--income-light)':'var(--expense-light)'};border:1px solid ${isInc?'var(--income-mid)':'var(--expense-mid)'};border-radius:10px;margin-bottom:6px;">
        <span style="font-size:1.1rem;">${icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.85rem;font-weight:600;color:var(--text);">${name}${srcBadge(evt.source)}</div>
          <div style="font-size:0.72rem;color:var(--text-muted);">${escHtml(evt.category||'')}</div>
        </div>
        <div style="font-family:'Fraunces',serif;font-size:0.95rem;font-weight:700;color:${isInc?'var(--income)':'var(--expense)'};white-space:nowrap;">${isInc?'+':'-'}${fmtAmt(evt.amount)}</div>
      </div>`;
  };

  let html = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;">
      <div>
        <div style="font-family:'Fraunces',serif;font-size:1.6rem;font-weight:700;line-height:1;color:var(--text);">${day} ${monthName}</div>
        <div style="font-size:0.82rem;color:var(--text-muted);margin-top:4px;">${dayName}</div>
      </div>
      <button style="background:var(--surface2);border:1px solid var(--border);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1rem;color:var(--text-muted);display:flex;align-items:center;justify-content:center;flex-shrink:0;" onclick="closeModal('day-details-modal')">✕</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
      <div style="background:var(--income-light);border:1px solid var(--income-mid);border-radius:12px;padding:12px 14px;">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--income);margin-bottom:4px;">Receitas</div>
        <div style="font-family:'Fraunces',serif;font-size:1.15rem;font-weight:700;color:var(--income);">+${fmtAmt(balance.income)}</div>
      </div>
      <div style="background:var(--expense-light);border:1px solid var(--expense-mid);border-radius:12px;padding:12px 14px;">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--expense);margin-bottom:4px;">Despesas</div>
        <div style="font-family:'Fraunces',serif;font-size:1.15rem;font-weight:700;color:var(--expense);">-${fmtAmt(balance.expense)}</div>
      </div>
    </div>

    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:0.78rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Saldo do dia</span>
      <span style="font-family:'Fraunces',serif;font-size:1.3rem;font-weight:700;color:${balance.net>0?'var(--income)':balance.net<0?'var(--expense)':'var(--text-muted)'};">
        ${balance.net > 0 ? '+' : ''}${fmtAmt(balance.net)}
      </span>
    </div>`;

  if (isEmpty) {
    html += `<div style="text-align:center;padding:24px 0;color:var(--text-muted);font-size:0.9rem;">😴 Sem movimentações neste dia</div>`;
  } else {
    if (events.income.length > 0) {
      html += `<div style="font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--income);margin-bottom:8px;">💚 Receitas (${events.income.length})</div>`;
      html += events.income.map(e => mkRow(e, 'income')).join('');
    }
    if (events.expense.length > 0) {
      html += `<div style="font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--expense);margin-bottom:8px;${events.income.length>0?'margin-top:16px;':''}">🔴 Despesas (${events.expense.length})</div>`;
      html += events.expense.map(e => mkRow(e, 'expense')).join('');
    }
  }

  const modalBody = document.querySelector('#day-details-modal .modal-body');
  if (modalBody) { modalBody.innerHTML = html; openModal('day-details-modal'); }
}

// ─── RECURRENCE AUTOMATION ────────────────────────────
function processRecurringPlans() {
  const plans = getPlans();
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  
  let updated = false;
  
  plans.forEach(plan => {
    if (plan.recurrence === 'monthly') {
      const [year, month, day] = plan.date.split('-');
      const planDate = new Date(parseInt(year), parseInt(month)-1, parseInt(day));
      
      // Check if plan is from a past month and create recurring for future months
      if (planDate < today) {
        // Find the next month where this plan should appear
        let nextDate = new Date(today.getFullYear(), today.getMonth() + 1, parseInt(day));
        
        // Ensure the date is valid (handle months with fewer days)
        while (nextDate.getDate() !== parseInt(day)) {
          nextDate.setDate(0); // Move to last day of previous month
        }
        
        const nextDateStr = nextDate.toISOString().split('T')[0];
        
        // Check if next month's plan already exists
        const nextPlanExists = plans.some(p => 
          p.desc === plan.desc && 
          p.category === plan.category &&
          p.amount === plan.amount &&
          p.type === plan.type &&
          p.date === nextDateStr
        );
        
        if (!nextPlanExists) {
          const newPlan = {
            ...plan,
            id: Date.now() + Math.random(),
            date: nextDateStr,
            realized: false
          };
          plans.push(newPlan);
          updated = true;
        }
      }
    }
  });
  
  if (updated) {
    savePlans(plans);
  }
}

// ─── EVENT LISTENERS ───────────────────────────────────
document.getElementById('login-pass').addEventListener('keydown', e => { if(e.key==='Enter') handleLogin(); });
document.getElementById('login-email').addEventListener('keydown', e => { if(e.key==='Enter') handleLogin(); });
document.getElementById('signup-pass').addEventListener('keydown', e => { if(e.key==='Enter') handleSignup(); });

// Connect delete confirmation button
let currentDeleteType = null;
document.getElementById('confirm-delete-btn').addEventListener('click', () => {
  if (currentDeleteType === 'transaction') {
    confirmDeleteTx();
  } else if (currentDeleteType === 'plan') {
    confirmDeletePlanItem();
  }
});