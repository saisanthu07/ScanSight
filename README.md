# 🏥 ScanSight — AI-Powered Medical Imaging Platform

> A full-stack MERN application for medical professionals to upload, analyze, and report on CT/MRI scans using NVIDIA VISTA-3D AI — with an intelligent fallback model when the API is unavailable.

---

## 🚀 Features

- **AI Scan Analysis** — NVIDIA VISTA-3D primary, smart fallback model always available
- **Interactive Viewer** — Zoomable scan viewer with color-coded AI region overlays
- **Medical Reports** — Auto-generated PDF reports with findings, severity ratings, and recommendations
- **Patient Management** — Full patient profiles with medical history and scan history
- **Doctor Dashboard** — Analytics charts, recent activity, severity distribution
- **Secure Auth** — JWT-based authentication with bcrypt password hashing
- **Cloud Storage** — Scans stored on Cloudinary CDN
- **Responsive UI** — Works on desktop, tablet, and mobile

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, Framer Motion |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose) |
| AI Engine | NVIDIA VISTA-3D + Built-in fallback |
| Storage | Cloudinary |
| Auth | JWT + bcryptjs |
| Charts | Recharts |
| PDF | jsPDF |
| Deploy | Vercel |

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- npm or yarn
- MongoDB Atlas account (free)
- Cloudinary account (free)
- NVIDIA NGC account (optional — fallback works without it)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/scansight.git
cd scansight
npm run install:all
# or manually:
cd api && npm install
cd ../client && npm install
```

### 2. Configure Environment Variables

**API** — copy and fill in `api/.env`:
```bash
cp api/.env.example api/.env
```

```env
NODE_ENV=development
PORT=5000

# MongoDB Atlas — create free cluster at mongodb.com/atlas
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/scansight?retryWrites=true&w=majority

# JWT — use a strong random string (min 32 chars)
JWT_SECRET=replace_this_with_a_very_long_random_secret_string_32chars

# Cloudinary — free account at cloudinary.com
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# NVIDIA VISTA-3D — get from build.nvidia.com (optional)
NVIDIA_API_KEY=nvapi-your_key_here

# CORS
CLIENT_URL=http://localhost:5173
```

**Client** — copy and fill in `client/.env`:
```bash
cp client/.env.example client/.env
```
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run Development Servers

```bash
# From project root — runs both servers concurrently
npm install  # installs concurrently
npm run dev

# Or separately:
npm run dev:api    # API on :5000
npm run dev:client # Client on :5173
```

Open **http://localhost:5173** in your browser.

---

## 🌐 Vercel Deployment

### Option A: Deploy Both Frontend + API to Vercel

1. **Push to GitHub**
```bash
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/yourname/scansight.git
git push -u origin main
```

2. **Import into Vercel**
   - Go to [vercel.com](https://vercel.com) → New Project → Import your repo
   - Vercel auto-detects `vercel.json`

3. **Add Environment Variables in Vercel Dashboard**
   - Go to Project → Settings → Environment Variables
   - Add ALL variables from `api/.env.example`
   - Also add `VITE_API_URL=https://your-project.vercel.app/api`
   - Set `CLIENT_URL=https://your-project.vercel.app`

4. **Deploy!** — Vercel handles everything automatically.

### Option B: Separate Deployments (Recommended for Production)

**Backend (Render/Railway):**
- Deploy `api/` folder to [Render.com](https://render.com) (free tier available)
- Set all env vars in Render dashboard
- Note your API URL: `https://scansight-api.onrender.com`

**Frontend (Vercel):**
- Create `client/.env.production`:
  ```env
  VITE_API_URL=https://scansight-api.onrender.com/api
  ```
- Deploy `client/` to Vercel
- In Vercel env vars: `VITE_API_URL=https://scansight-api.onrender.com/api`

---

## 🔑 Getting API Keys

### MongoDB Atlas (Required)
1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a FREE M0 cluster
3. Database Access → Add user with password
4. Network Access → Allow from anywhere (0.0.0.0/0)
5. Connect → Drivers → Copy connection string
6. Replace `<password>` in the string

### Cloudinary (Required for image storage)
1. Create account at [cloudinary.com](https://cloudinary.com) (free 25GB)
2. Dashboard → Copy Cloud name, API Key, API Secret

### NVIDIA VISTA-3D (Optional — fallback works without it)
1. Create account at [build.nvidia.com](https://build.nvidia.com)
2. Search for "VISTA-3D" or "Medical Imaging"
3. Generate API key
4. Add to `NVIDIA_API_KEY` in `.env`

---

## 🎮 Demo Account

When running locally, register any account. For a quick demo:
- Email: `demo@scansight.ai`
- Password: `demo1234`

*(You need to create this account manually via the Register page)*

---

## 📁 Project Structure

```
scansight/
├── api/                      # Express.js backend
│   ├── config/
│   │   └── db.js             # MongoDB connection
│   ├── middleware/
│   │   └── auth.js           # JWT middleware
│   ├── models/
│   │   ├── User.js           # Doctor/user model
│   │   ├── Patient.js        # Patient model
│   │   └── Scan.js           # Medical scan model
│   ├── routes/
│   │   ├── auth.js           # Auth endpoints
│   │   ├── patients.js       # Patient CRUD
│   │   ├── scans.js          # Scan upload & analysis
│   │   └── reports.js        # Report generation
│   ├── utils/
│   │   ├── aiAnalysis.js     # NVIDIA VISTA-3D + fallback AI
│   │   └── cloudinary.js     # Image upload utility
│   ├── index.js              # Express app entry
│   ├── package.json
│   └── .env.example
│
├── client/                   # React frontend
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx         # Sidebar + navigation
│   │   │   ├── AddPatientModal.jsx
│   │   │   └── ReportModal.jsx    # PDF report viewer
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Auth state
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx      # Stats + charts
│   │   │   ├── Patients.jsx
│   │   │   ├── PatientDetail.jsx
│   │   │   ├── ScanAnalysis.jsx   # Upload + scan list
│   │   │   ├── ScanDetail.jsx     # AI viewer + findings
│   │   │   ├── Reports.jsx
│   │   │   └── Settings.jsx
│   │   ├── services/
│   │   │   └── api.js             # Axios API client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
│
├── vercel.json               # Vercel deployment config
├── package.json              # Root scripts
└── README.md
```

---

## 🔒 Security Features

- JWT tokens with configurable expiry
- Bcrypt password hashing (12 rounds)
- Helmet.js security headers
- CORS configured for specific origins
- Rate limiting (200 req/15min general, 20 req/15min auth)
- Input validation with express-validator
- Doctor-scoped data — doctors only see their own patients/scans

---

## 🤖 AI Analysis Flow

1. Doctor uploads scan image (JPEG/PNG/WebP/TIFF up to 50MB)
2. Image stored on Cloudinary
3. Backend responds immediately with scan ID (202 Accepted)
4. Background: tries NVIDIA VISTA-3D API
   - If NVIDIA available → uses real 3D medical segmentation
   - If unavailable → fallback model uses clinical knowledge base with realistic findings for the scan type + body part
5. Frontend polls for completion every 4 seconds
6. When complete → shows color-coded region overlays on scan
7. Doctor can generate PDF report with one click

---

## 📋 API Endpoints

```
POST   /api/auth/register       Register new doctor
POST   /api/auth/login          Login
GET    /api/auth/me             Get current user
PATCH  /api/auth/profile        Update profile

GET    /api/patients            List patients (with search/filter)
POST   /api/patients            Create patient
GET    /api/patients/:id        Get patient + scan history
PATCH  /api/patients/:id        Update patient
DELETE /api/patients/:id        Delete patient
GET    /api/patients/stats/summary  Dashboard stats

GET    /api/scans               List scans
POST   /api/scans/upload        Upload + analyze scan
GET    /api/scans/:id           Get scan with full analysis
POST   /api/scans/:id/reanalyze Re-run AI analysis
POST   /api/scans/reanalyze/bulk Re-run AI analysis for many scans
PATCH  /api/scans/:id/notes     Update clinical notes
DELETE /api/scans/:id           Delete scan
GET    /api/scans/analytics/overview  Charts data

GET    /api/reports/:scanId     Generate report JSON
```

---

## 🐛 Troubleshooting

**MongoDB connection fails:**
- Check MONGODB_URI format
- Verify IP allowlist in Atlas (add 0.0.0.0/0)
- Confirm username/password are URL-encoded

**Cloudinary upload fails:**
- Verify all 3 Cloudinary env vars are set
- Check Cloudinary account is active

**NVIDIA API fails (normal):**
- Fallback AI activates automatically — this is expected behavior
- Check your NVIDIA API key at build.nvidia.com

**CORS errors in browser:**
- Set `CLIENT_URL` in api/.env to your exact frontend URL
- No trailing slash

---

## 📄 License

MIT — Free for personal and commercial use.

---

Built with ❤️ for medical professionals worldwide.
