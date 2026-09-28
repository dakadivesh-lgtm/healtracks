# WoundWise — Clinical Wound Care Tracking & Documentation Platform

A full-stack, responsive medical documentation and wound progression tracking application designed to help patients capture high-quality wound photos, track healing timelines, download medical records, and communicate with support teams.

Built with **React + Vite** for the frontend, **Node.js + Express** for the backend API, and **PostgreSQL** for secure relational data storage (with zero-config local fallback for instant local testing).

---

## 📸 Key Features

1. **Dashboard**
   - Displays the signed-in patient's name with contextual time-of-day greeting (*"Good morning/afternoon/evening, Divesh 👋"*).
   - Shows recent wound uploads with their assessment status pills.
   - When no records exist, displays the **"No Tests"** empty state card with circular icon and **"Upload Wound Image"** button matching the design reference.
   - 2×2 quick-action grid connecting all main navigation destinations (Upload Wound, History Tracker, My Records, Help & Support).

2. **Upload Wound**
   - Live camera capture with alignment guide frame (*"Position wound inside guide"*), camera switching, and shutter control.
   - Drag-and-drop file upload (JPG, PNG, WEBP).
   - Real-time client-side image quality checks: **Resolution**, **Sharpness**, and **Lighting**.
   - Option to start a **New Wound Case** (with anatomical location) or attach a **Follow-up Photo** to an existing wound over time.
   - Clinical observation notes recording.

3. **History Tracker**
   - Interactive chronological timeline of dated photos and assessments for each wound case.
   - Clear distinction between baseline photos and follow-up checks.
   - **Photo Comparison Tool**: Side-by-side modal allowing patients to compare earlier baseline photos against current follow-up photos to visually evaluate wound margin reduction and tissue progression.

4. **My Records**
   - Searchable and filterable table of all saved wound entries.
   - Direct download of private wound images.
   - Export and download of formatted clinical assessment log reports (`.txt` clinical summary with patient info, timestamps, and notes).

5. **Help & Support**
   - Photography guidelines (lighting, 90° angle, camera distance).
   - Critical medical red flag warning indicators for urgent clinical escalation.
   - Working support form saving tickets directly to the backend database (`/api/support`) with priority levels and categories.

6. **Settings & Preferences**
   - Profile management: Update full name and contact phone number.
   - Clinical preferences: Toggle email notifications, healing reminder notifications, and dark mode.
   - Security: Password change with current password verification.

7. **User Accounts & Data Isolation**
   - User registration and login with bcrypt password hashing and JWT authentication.
   - Strict data ownership: Each patient can only access, view, and download their own wounds and private photos.
   - Images are stored privately on the server and streamed only via authenticated endpoints that verify patient ownership.

8. **AI Assessment Integration Interface**
   - Connects to an external AI model (e.g., Google Gemini Vision) if an API key is provided in `.env`.
   - When not configured, it honestly and safely returns **"Analysis not configured"** without fabricating diagnoses, healing percentages, or clinical results.

---

## 🏗️ Architecture & Directory Structure

```text
HealTrack/
├── backend/
│   ├── database/
│   │   ├── schema.sql              # Complete PostgreSQL DDL schema & indexes
│   │   ├── migrate.js              # Database migration runner
│   │   └── local_store.json        # Automatic local dev database store
│   ├── src/
│   │   ├── config/                 # Environment and application configuration
│   │   │   └── index.js
│   │   ├── controllers/            # Request and response handling
│   │   │   ├── authController.js
│   │   │   ├── woundController.js
│   │   │   ├── recordController.js
│   │   │   ├── supportController.js
│   │   │   └── userController.js
│   │   ├── middleware/             # Auth, upload, validation, and error handlers
│   │   │   ├── auth.js
│   │   │   ├── upload.js
│   │   │   ├── validation.js
│   │   │   └── errorHandler.js
│   │   ├── models/                 # Relational models and universal query layer
│   │   │   ├── db.js
│   │   │   ├── userModel.js
│   │   │   ├── woundModel.js
│   │   │   ├── woundEntryModel.js
│   │   │   ├── assessmentModel.js
│   │   │   └── supportModel.js
│   │   ├── routes/                 # Express API endpoint definitions
│   │   │   ├── authRoutes.js
│   │   │   ├── woundRoutes.js
│   │   │   ├── recordRoutes.js
│   │   │   ├── supportRoutes.js
│   │   │   └── userRoutes.js
│   │   ├── services/               # Business logic & AI integration
│   │   │   ├── assessmentService.js
│   │   │   ├── fileService.js
│   │   │   └── reportService.js
│   │   └── server.js               # Main Express server entrypoint
│   ├── uploads/                    # Private server-side image storage
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Sidebar.jsx
│   │   │   ├── TopBar.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── QuickActionsGrid.jsx
│   │   │   ├── WoundCard.jsx
│   │   │   ├── CameraModal.jsx
│   │   │   ├── QualityCheckPanel.jsx
│   │   │   ├── ImageCompareModal.jsx
│   │   │   └── NotificationToast.jsx
│   │   ├── pages/                  # Application views
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── UploadPage.jsx
│   │   │   ├── HistoryPage.jsx
│   │   │   ├── RecordsPage.jsx
│   │   │   ├── HelpPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   └── AuthPage.jsx
│   │   ├── services/               # API clients
│   │   │   ├── api.js
│   │   │   ├── authService.js
│   │   │   ├── woundService.js
│   │   │   ├── recordService.js
│   │   │   ├── supportService.js
│   │   │   └── userService.js
│   │   ├── styles/                 # Theme tokens and responsive CSS
│   │   │   └── index.css
│   │   ├── App.jsx                 # Routing and session coordinator
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
│
├── test_e2e_flow.js                # Full-stack automated verification script
├── package.json                    # Root orchestration scripts
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher recommended; v24 tested)
- **npm** (v9 or higher)
- **PostgreSQL** (Optional for local testing; required for production)

---

### 1. Install Dependencies

You can install all dependencies from the root directory:
```bash
npm run install:all
```
Or manually:
```bash
cd backend && npm install
cd ../frontend && npm install
```

---

### 2. Configure Environment Variables

#### Backend Configuration
Copy the example environment file in `backend/`:
```bash
cd backend
cp .env.example .env
```
Edit `backend/.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_here
DATABASE_URL=postgresql://postgres:password@localhost:5432/woundwise_db
CLIENT_URL=http://localhost:5173

# Optional: To connect Gemini AI Vision assessment
AI_API_KEY=
AI_MODEL=gemini-1.5-flash
```

> **Note on Database:**
> If you have a running PostgreSQL database, provide your connection string in `DATABASE_URL`.
> If `DATABASE_URL` is omitted or PostgreSQL is not running locally, WoundWise automatically uses its persistent local storage engine (`backend/database/local_store.json`), allowing you to test the full stack immediately without database setup.

#### Database Migration (PostgreSQL)
To apply the PostgreSQL schema (`backend/database/schema.sql`) to your database:
```bash
cd backend
npm run migrate
```

---

### 3. Running the Application

#### Start the Backend API (Port 5000):
```bash
npm run dev:backend
# or: cd backend && npm start
```

#### Start the Frontend (Port 5173):
In a separate terminal window:
```bash
npm run dev:frontend
# or: cd frontend && npm run dev
```

Open your browser and navigate to:
**`http://localhost:5173`**

---

### 4. Demo Account Credentials

A default patient profile is seeded automatically for instant testing:
- **Email:** `divesh@woundwise.local`
- **Password:** `woundwise123`
- *Or click the **"👤 Sign in as Demo Patient (Divesh Reddy)"** button on the login screen.*

---

## 📡 API Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new patient account | No |
| `POST` | `/api/auth/login` | Authenticate patient & receive JWT | No |
| `GET` | `/api/auth/me` | Retrieve profile of authenticated user | Yes |
| `POST` | `/api/auth/logout` | Invalidate patient session | Yes |

### Wounds & Tracking (`/api/wounds`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/wounds/dashboard` | Dashboard metrics, greeting & recent uploads | Yes |
| `GET` | `/api/wounds` | List all wounds belonging to authenticated user | Yes |
| `GET` | `/api/wounds/:id` | Get wound case details with full photo timeline | Yes |
| `POST` | `/api/wounds/upload` | Upload photo (new wound or follow-up) & run assessment | Yes |
| `DELETE` | `/api/wounds/:id` | Delete wound case and associated image files | Yes |

### Records & Media (`/api/records`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/records` | List all wound records with search/filtering | Yes |
| `GET` | `/api/records/image/:filename` | View private wound photo (ownership verified) | Yes |
| `GET` | `/api/records/download-image/:filename` | Download image file as attachment | Yes |
| `GET` | `/api/records/download-report/:id` | Download clinical summary text report | Yes |

### Support (`/api/support`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/support` | Submit a new help or technical support ticket | Optional |
| `GET` | `/api/support/my-tickets` | View tickets submitted by current patient | Yes |

### User Settings (`/api/user`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/user/profile` | Get patient profile & preferences | Yes |
| `PUT` | `/api/user/profile` | Update patient name and phone number | Yes |
| `PUT` | `/api/user/preferences` | Update email, reminder, and theme preferences | Yes |
| `PUT` | `/api/user/change-password` | Update account password | Yes |

---

## 🧪 Automated Testing & Verification

An end-to-end verification script is included to test the complete full-stack flow:
```bash
node test_e2e_flow.js
```

This verifies:
1. Health check & database connection
2. User authentication (Login)
3. Dashboard state handling (empty state vs active records)
4. Photo upload & AI assessment integration
5. Follow-up photo attachment to existing wound case
6. History tracker timeline retrieval
7. My Records querying & clinical report generation
8. Support ticket submission & database persistence
9. User profile and preference updates

---

## ⚙️ External Configuration Guide

### 1. PostgreSQL Database
- The production schema is located at `backend/database/schema.sql`.
- In production, set `DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>` and run `npm run migrate`.
- All tables feature foreign key constraints with `ON DELETE CASCADE` on patient deletion, as well as indexing on `user_id` and `wound_id`.

### 2. AI Assessment Model
- By default, `AI_API_KEY` is not set. The assessment service strictly returns **"Analysis not configured"** without fabricating medical diagnoses, fulfilling clinical safety guidelines.
- To enable AI vision analysis, obtain a Google Gemini API key or compatible endpoint, configure `AI_API_KEY` in `backend/.env`, and restart the backend. The service will then invoke the model and store observations under the assessment details.
