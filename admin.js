// ===== CONFIG =====
let SERVER_URL = '';
let ADMIN_SECRET = '1111';

// ===== LOGIN =====
async function doAdminLogin() {
  SERVER_URL = document.getElementById('l-url').value.trim().replace(/\/$/, '');
  ADMIN_SECRET = document.getElementById('l-secret').value.trim();
  const errEl = document.getElementById('l-error');

  try {
    const res = await fetch(`${SERVER_URL}/admin/keys`, {
      headers: { 'x-admin-secret': ADMIN_SECRET }
    });
    if (!res.ok) throw new Error('Unauthorized');
    errEl.style.display = 'none';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    loadKeys();
  } catch {
    errEl.style.display = 'block';
  }
}

function doLogout() {
  SERVER_URL = '';
  ADMIN_SECRET = '';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

// ===== HELPERS =====
function maskKey(k) { return k.slice(0, 8) + '••••••••••••••••' + k.slice(-4); }
function maskHwid(h) { return h ? h.slice(0, 8) + '...' + h.slice(-4) : null; }
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ===== LOAD KEYS =====
async function loadKeys() {
  const res = await fetch(`${SERVER_URL}/admin/keys`, {
    headers: { 'x-admin-secret': ADMIN_SECRET }
  });
  const keys = await res.json();

  document.getElementById('s-total').textContent = keys.length;
  document.getElementById('s-active').textContent = keys.filter(k => k.status === 'active').length;
  document.getElementById('s-locked').textContent = keys.filter(k => k.status === 'locked').length;
  document.getElementById('s-hwid').textContent = keys.filter(k => k.hwid).length;

  const list = document.getElementById('key-list');
  if (!keys.length) {
    list.innerHTML = '<div class="empty">🔐 ยังไม่มี Key — กด "สร้าง Key ใหม่"</div>';
    return;
  }

  list.innerHTML = keys.map(k => `
    <div class="row">
      <div class="key-name">${esc(k.label || '—')}</div>
      <div class="key-mono" onclick="copyText('${k.key}')">📋 ${maskKey(k.key)}</div>
      <div>
        ${k.hwid
          ? `<span class="hwid-val" title="${k.hwid}">🖥 ${maskHwid(k.hwid)}</span>`
          : '<span class="hwid-none">ยังไม่ผูก</span>'}
      </div>
      <div>
        <span class="badge-${k.status}">${k.status === 'active' ? '● Active' : '🔒 Locked'}</span>
      </div>
      <div class="date-text">${fmtDate(k.created_at)}</div>
      <div class="actions">
        <button class="act-btn" onclick="toggleLock('${k.id}')" title="${k.status === 'active' ? 'ล็อค' : 'ปลดล็อค'}">
          ${k.status === 'active' ? '🔒' : '🔓'}
        </button>
        <button class="act-btn warn" onclick="resetHwid('${k.id}')" title="รีเซ็ต HWID">🔄</button>
        <button class="act-btn danger" onclick="deleteKey('${k.id}')" title="ลบ">🗑</button>
      </div>
    </div>
  `).join('');
}

// ===== ACTIONS =====
async function toggleLock(id) {
  await fetch(`${SERVER_URL}/admin/keys/${id}/lock`, {
    method: 'PATCH',
    headers: { 'x-admin-secret': ADMIN_SECRET }
  });
  showToast('✅ อัปเดตสถานะแล้ว');
  loadKeys();
}

async function resetHwid(id) {
  if (!confirm('รีเซ็ต HWID? ผู้ใช้จะสามารถใช้ key นี้กับเครื่องใหม่ได้')) return;
  await fetch(`${SERVER_URL}/admin/keys/${id}/reset-hwid`, {
    method: 'PATCH',
    headers: { 'x-admin-secret': ADMIN_SECRET }
  });
  showToast('🔄 รีเซ็ต HWID แล้ว');
  loadKeys();
}

async function deleteKey(id) {
  if (!confirm('ลบ Key นี้จริงหรือไม่?')) return;
  await fetch(`${SERVER_URL}/admin/keys/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-secret': ADMIN_SECRET }
  });
  showToast('🗑 ลบ Key แล้ว');
  loadKeys();
}

// ===== CREATE =====
function openCreate() {
  document.getElementById('f-label').value = '';
  document.getElementById('newKeyBox').style.display = 'none';
  document.getElementById('createConfirmBtn').style.display = '';
  document.getElementById('createModal').classList.add('show');
}

function closeCreate() {
  document.getElementById('createModal').classList.remove('show');
}

async function doCreate() {
  const label = document.getElementById('f-label').value.trim();
  const res = await fetch(`${SERVER_URL}/admin/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
    body: JSON.stringify({ label })
  });
  const data = await res.json();
  document.getElementById('newKeyVal').textContent = data.key;
  document.getElementById('newKeyBox').style.display = 'block';
  document.getElementById('createConfirmBtn').style.display = 'none';
  loadKeys();
}

// ===== UTILS =====
function copyText(text) {
  navigator.clipboard.writeText(text)
    .then(() => showToast('✅ คัดลอกแล้ว'))
    .catch(() => showToast('❌ คัดลอกไม่ได้'));
}

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// Enter key on login
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('l-secret').addEventListener('keydown', e => {
    if (e.key === 'Enter') doAdminLogin();
  });
  document.getElementById('createModal').addEventListener('click', e => {
    if (e.target === document.getElementById('createModal')) closeCreate();
  });
});
