# 🚀 SmartTech CRM — Deploy qo'llanmasi

Ilova 3 qismdan iborat va 3 ta bepul xizmatga joylashadi:

| Qism | Xizmat | Nima |
|------|--------|------|
| Ma'lumotlar bazasi | **Neon** | PostgreSQL (bor ✅) |
| Backend (server) | **Render** | REST API |
| Frontend | **Vercel** | React sayt |

Tartib: **1) GitHub → 2) Render (backend) → 3) Vercel (frontend) → 4) ulash**

---

## 1-qadam — Kodni GitHub'ga yuklash

GitHub'da yangi **repository** yarating (masalan `smarttech-crm`), keyin terminalda:

```bash
cd "/Users/home/Desktop/MY CRM 2/CRM 2/CRM"
git init
git add .
git commit -m "SmartTech CRM"
git branch -M main
git remote add origin https://github.com/FOYDALANUVCHI/smarttech-crm.git
git push -u origin main
```

> `.env` va `node_modules` avtomatik chiqmaydi (`.gitignore`da). Baza paroli xavfsiz.

---

## 2-qadam — Backend → Render

1. https://render.com → **Sign up** (GitHub bilan).
2. **New → Web Service** → repo'ingizni tanlang.
3. Sozlamalar:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
4. **Environment** bo'limida 3 ta o'zgaruvchi qo'shing:
   - `DATABASE_URL` = (Neon ulanish satringiz)
   - `JWT_SECRET` = (uzun tasodifiy satr — `server/.env`dagini oling)
   - `CLIENT_ORIGIN` = (hozircha bo'sh qoldiring, 4-qadamda to'ldiramiz)
5. **Create Web Service** → tugagach, sizga URL beradi, masalan:
   `https://smarttech-crm-api.onrender.com`
   **Shu URL'ni saqlang.**

> Tekshirish: `https://...onrender.com/api/health` → `{"ok":true,...}` chiqishi kerak.

---

## 3-qadam — Frontend → Vercel

1. https://vercel.com → **Sign up** (GitHub bilan).
2. **Add New → Project** → shu repo'ni tanlang.
3. Sozlamalar (Vercel Vite'ni o'zi taniydi):
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables** → qo'shing:
   - `VITE_API_URL` = (2-qadamdagi Render URL, masalan `https://smarttech-crm-api.onrender.com`)
5. **Deploy** → tugagach sizga URL beradi, masalan:
   `https://smarttech-crm.vercel.app`

---

## 4-qadam — Ikkalasini ulash (CORS)

1. **Render** → servisingiz → **Environment** →
   `CLIENT_ORIGIN` = (Vercel URL, masalan `https://smarttech-crm.vercel.app`)
2. Saqlang → Render avtomatik qayta ishga tushadi.

Tamom! Vercel URL'ni oching → `admin@smarttech.uz` / `demo1234` bilan kiring. 🎉

---

## Eslatmalar
- **Render bepul reja** faolsizlikdan keyin "uxlaydi" — birinchi ochilishda ~30 soniya kutish bo'lishi mumkin (keyin tez).
- Kod o'zgartirsangiz: `git push` → Render va Vercel **avtomatik** yangilaydi.
- **Xavfsizlik:** deploy'dan keyin Neon'da baza parolini yangilab, `DATABASE_URL`ni Render'da yangilashingiz mumkin (bu chatда parol ko'ringan).
- `JWT_SECRET`ni hech kimga bermang.

## Domen (ixtiyoriy)
O'z domeningiz bo'lsa (masalan `crm.sizningsayt.uz`), Vercel → **Settings → Domains** orqali ulaysiz.
