const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ADMIN SECRET (เปลี่ยนได้) =====
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'supersecret-admin-2024';

// ===== DATABASE =====
const db = new Database(path.join(__dirname, 'keys.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS keys (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    label TEXT DEFAULT '',
    hwid TEXT DEFAULT NULL,
    status TEXT DEFAULT 'active',
    created_at INTEGER NOT NULL,
    last_used INTEGER DEFAULT NULL
  )
`);

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// ===== MIDDLEWARE: Admin Auth =====
function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ============================================================
// CLIENT ROUTES
// ============================================================

// POST /api/verify — ตรวจสอบ key + HWID
app.post('/api/verify', (req, res) => {
  const { key, hwid } = req.body;

  if (!key || !hwid) {
    return res.status(400).json({ success: false, error: 'Missing key or hwid' });
  }

  const row = db.prepare('SELECT * FROM keys WHERE key = ?').get(key);

  if (!row) {
    return res.json({ success: false, error: 'Key not found' });
  }

  if (row.status === 'locked') {
    return res.json({ success: false, error: 'Key is locked' });
  }

  // ถ้ายังไม่มี HWID — ผูกกับเครื่องนี้เลย
  if (!row.hwid) {
    db.prepare('UPDATE keys SET hwid = ?, last_used = ? WHERE key = ?')
      .run(hwid, Date.now(), key);
    return res.json({ success: true, message: 'Key activated on this device' });
  }

  // ถ้ามี HWID แล้ว — ตรวจว่าตรงมั้ย
  if (row.hwid !== hwid) {
    return res.json({ success: false, error: 'Key is bound to another device' });
  }

  // ตรงกัน — เข้าได้
  db.prepare('UPDATE keys SET last_used = ? WHERE key = ?').run(Date.now(), key);
  return res.json({ success: true, message: 'Access granted' });
});

// ============================================================
// ADMIN ROUTES
// ============================================================

// GET /admin/keys — ดู key ทั้งหมด
app.get('/admin/keys', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM keys ORDER BY created_at DESC').all();
  res.json(rows);
});

// POST /admin/keys — สร้าง key ใหม่
app.post('/admin/keys', requireAdmin, (req, res) => {
  const { label } = req.body;
  const key = 'ak_' + uuidv4().replace(/-/g, '').slice(0, 32);
  const id = uuidv4();
  const now = Date.now();

  db.prepare('INSERT INTO keys (id, key, label, status, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, key, label || '', 'active', now);

  res.json({ success: true, key, id });
});

// PATCH /admin/keys/:id/lock — ล็อค/ปลดล็อค key
app.patch('/admin/keys/:id/lock', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM keys WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const newStatus = row.status === 'active' ? 'locked' : 'active';
  db.prepare('UPDATE keys SET status = ? WHERE id = ?').run(newStatus, req.params.id);
  res.json({ success: true, status: newStatus });
});

// PATCH /admin/keys/:id/reset-hwid — รีเซ็ต HWID (ย้ายเครื่องได้)
app.patch('/admin/keys/:id/reset-hwid', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM keys WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  db.prepare('UPDATE keys SET hwid = NULL WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'HWID reset' });
});

// DELETE /admin/keys/:id — ลบ key
app.delete('/admin/keys/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM keys WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`✅ HWID Server running on port ${PORT}`);
  console.log(`🔑 Admin Secret: ${ADMIN_SECRET}`);
});
