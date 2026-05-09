# HWID Key System

ระบบ Key + HWID Lock — 1 Key ต่อ 1 เครื่องเท่านั้น

## โครงสร้าง

```
hwid-system/
├── server/        ← Node.js API (deploy บน Railway)
│   ├── index.js
│   ├── package.json
│   └── railway.toml
├── admin/         ← หน้าจัดการ Key (เปิดใน browser)
│   ├── admin.html
│   ├── admin.css
│   └── admin.js
└── client/        ← หน้า Login สำหรับผู้ใช้
    ├── client.html
    ├── client.css
    └── client.js
```

## วิธี Deploy Server บน Railway

1. ไปที่ https://railway.app → New Project → Deploy from GitHub
2. อัปโหลดโฟลเดอร์ server/ ขึ้น GitHub ก่อน
3. ตั้ง Environment Variable:
   - `ADMIN_SECRET` = รหัสลับสำหรับ admin (เปลี่ยนจาก default!)
4. Railway จะให้ URL เช่น `https://xxx.railway.app`

## วิธีใช้งาน

### Admin Panel
1. เปิด `admin/admin.html`
2. ใส่ Server URL และ Admin Secret
3. สร้าง Key → แจกให้ผู้ใช้

### Client
1. แก้ `client/client.js` บรรทัดแรก:
   ```js
   const SERVER_URL = 'https://xxx.railway.app';
   ```
2. เปิด `client/client.html` → ใส่ Key → เข้าใช้งานได้

## ระบบทำงานอย่างไร

1. ผู้ใช้ใส่ Key
2. Client สร้าง HWID fingerprint จาก Canvas, WebGL, Screen, Audio
3. ส่ง Key + HWID ไปเช็คที่ Server
4. ถ้า Key ยังไม่มี HWID → ผูกกับเครื่องนี้ทันที
5. ถ้า Key มี HWID แล้ว → ตรวจว่าตรงมั้ย
6. ตรง = เข้าได้ / ไม่ตรง = ❌ บล็อก

## Admin Actions

- **🔒 ล็อค Key** — บล็อกผู้ใช้ทันที
- **🔄 รีเซ็ต HWID** — ให้ผู้ใช้ย้ายเครื่องใหม่ได้
- **🗑 ลบ Key** — ลบออกจากระบบ
