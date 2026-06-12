# CR Announcement Dashboard - Implementation Plan

## Overview
A PERN stack web application for Course Representatives (CR) to create, manage, and broadcast announcements to WhatsApp Community groups and Telegram course groups. Includes dynamic course/routine management, file handling with 15-day auto-cleanup, and JWT authentication.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js + Tailwind CSS (Vite) |
| Backend | Node.js + Express.js |
| Database | PostgreSQL (via Supabase) |
| Auth | JWT (jsonwebtoken + bcrypt) |
| File Storage | Supabase Storage (S3-compatible) |
| WhatsApp | whatsapp-web.js (QR code auth) |
| Telegram | node-telegram-bot-api |
| File Upload | multer |
| Hosting | Vercel (frontend) + Supabase (backend/db) |

---

## Project Structure

```
/CR-Announcement-Dashboard
├── /client                    # React frontend (Vite)
│   ├── /public
│   ├── /src
│   │   ├── /components
│   │   │   ├── /auth
│   │   │   │   └── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   ├── /dashboard
│   │   │   │   └── DashboardLayout.jsx
│   │   │   ├── /announcement
│   │   │   │   └── AnnouncementForm.jsx
│   │   │   │   └── AnnouncementList.jsx
│   │   │   │   └── AnnouncementPreview.jsx
│   │   │   ├── /course
│   │   │   │   └── CourseSelector.jsx
│   │   │   │   └── CourseManager.jsx
│   │   │   ├── /routine
│   │   │   │   └── RoutineManager.jsx
│   │   │   │   └── RoutineSelector.jsx
│   │   │   ├── /platform
│   │   │   │   └── PlatformSelector.jsx
│   │   │   │   └── PlatformManager.jsx
│   │   │   ├── /files
│   │   │   │   └── FileUpload.jsx
│   │   │   └── /common
│   │   │       └── Navbar.jsx
│   │   │       └── LoadingSpinner.jsx
│   │   ├── /services
│   │   │   └── api.js
│   │   ├── /context
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── /server
│   ├── /src
│   │   ├── /config
│   │   │   └── database.js
│   │   │   └── whatsapp.js
│   │   │   └── telegram.js
│   │   ├── /models
│   │   │   └── user.model.js
│   │   │   └── course.model.js
│   │   │   └── routine.model.js
│   │   │   └── file.model.js
│   │   │   └── announcement.model.js
│   │   │   └── platform.model.js
│   │   ├── /services
│   │   │   └── auth.service.js
│   │   │   └── course.service.js
│   │   │   └── routine.service.js
│   │   │   └── file.service.js
│   │   │   └── announcement.service.js
│   │   │   └── whatsapp.service.js
│   │   │   └── telegram.service.js
│   │   ├── /routes
│   │   │   └── auth.routes.js
│   │   │   └── courses.routes.js
│   │   │   └── routines.routes.js
│   │   │   └── files.routes.js
│   │   │   └── announcements.routes.js
│   │   │   └── platforms.routes.js
│   │   ├── /middleware
│   │   │   └── auth.middleware.js
│   │   │   └── upload.middleware.js
│   │   └── app.js
│   ├── /cron
│   │   └── cleanup.js
│   ├── /uploads
│   ├── server.js
│   ├── .env.example
│   └── package.json
│
├── schema.sql
└── PLAN.md
```

---

## Phase 1: Database Schema (schema.sql)

### Tables

#### 1. users — Authentication
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'cr', -- 'cr', 'admin'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

#### 2. courses — Dynamic course management
```sql
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    course_id VARCHAR(20) UNIQUE NOT NULL, -- e.g., "SE211"
    course_name VARCHAR(200) NOT NULL,     -- e.g., "Introduction to Software Engineering"
    teacher_name VARCHAR(200) NOT NULL,    -- e.g., "Dr. Nadirali"
    teacher_initials VARCHAR(20) NOT NULL, -- e.g., "NA"
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_course_id ON courses(course_id);
```

#### 3. routines — Class schedule with room assignment
```sql
CREATE TABLE routines (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    day_of_week VARCHAR(10) NOT NULL, -- Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_routines_course ON routines(course_id);
CREATE INDEX idx_routines_day ON routines(day_of_week);
```

#### 4. platforms — WhatsApp/Telegram destinations
```sql
CREATE TABLE platforms (
    id SERIAL PRIMARY KEY,
    platform_name VARCHAR(100) NOT NULL, -- "WhatsApp General", "Telegram: SWE Course"
    platform_type VARCHAR(20) NOT NULL CHECK (platform_type IN ('whatsapp', 'telegram')),
    chat_id VARCHAR(200) NOT NULL,       -- WhatsApp group ID or Telegram chat ID
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_platforms_type ON platforms(platform_type);
```

#### 5. announcements — Notice records
```sql
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'notice',
    -- Categories: 'notice', 'quiz', 'exam', 'class_reminder', 'online_class', 'routine_change', 'result', 'general'
    course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
    custom_room VARCHAR(50),         -- Override room if different from routine
    custom_time TIMESTAMP,           -- Override time if needed
    file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'sent', 'failed'
    scheduled_at TIMESTAMP,          -- For scheduled broadcasts
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_announcements_status ON announcements(status);
CREATE INDEX idx_announcements_created_by ON announcements(created_by);
CREATE INDEX idx_announcements_course ON announcements(course_id);
```

#### 6. announcement_platforms — Many-to-many: which platforms received which announcement
```sql
CREATE TABLE announcement_platforms (
    announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
    platform_id INTEGER REFERENCES platforms(id) ON DELETE CASCADE,
    platform_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'retrying'
    error_message TEXT,
    sent_at TIMESTAMP,
    PRIMARY KEY (announcement_id, platform_id)
);
```

#### 7. files — File metadata with 15-day expiry
```sql
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    original_name VARCHAR(500) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,    -- Supabase storage key
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,         -- uploaded_at + 15 days
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_files_expires ON files(expires_at) WHERE is_deleted = FALSE;
```

### Cleanup View (optional)
```sql
-- Files that are expired and need cleanup
CREATE VIEW expired_files AS
SELECT id, storage_path
FROM files
WHERE expires_at < NOW() AND is_deleted = FALSE;
```

---

## Phase 2: Backend Services

### 2.1 Server Setup (server.js)

```
- Express server with CORS, helmet, rate-limiting
- JSON body parser (limit: 50mb for file uploads)
- PostgreSQL connection via pg (node-postgres)
- Route mounting
- Error handling middleware
- Cron job for file cleanup (node-cron)
```

### 2.2 Database Connection (config/database.js)

```
- Singleton pg.Pool connection
- SSL enabled for Supabase
- Connection retry logic
- Health check endpoint
```

### 2.3 Authentication Service (services/auth.service.js)

```
- register(username, email, password) → hash password → insert user → return JWT
- login(username, password) → verify hash → return JWT
- verifyToken(token) → decode → return user payload
- getUserById(id) → return user without password_hash
```

### 2.4 Course Service (services/course.service.js)

```
- createCourse(data) → insert course
- getCourses() → return all active courses
- getCourseById(id) → return course + routines
- updateCourse(id, data) → update fields
- deleteCourse(id) → soft delete (is_active=false)
- getRoutineForCourse(courseId, dayOfWeek) → return matching routine
```

### 2.5 WhatsApp Service (services/whatsapp.service.js)

```
- Uses whatsapp-web.js
- QR code authentication: generates QR in terminal and emits via WebSocket
- Connection states: DISCONNECTED, QR_READY, CONNECTING, CONNECTED
- sendMessageToGroup(chatId, message, filePath) → send text/file
- getGroupByName(name) → find group ID by name
- Reconnection logic with exponential backoff
```

### 2.6 Telegram Service (services/telegram.service.js)

```
- Uses node-telegram-bot-api with polling
- getChat(chatId) → verify chat exists
- sendAnnouncement(chatId, message, fileId) → send text with markdown formatting
- sendDocument(chatId, filePath, caption) → send file with caption
- Formatter: buildBeautifulMessage() → structured emoji-rich message
```

### 2.7 File Service (services/file.service.js)

```
- Uses @supabase/supabase-js for storage
- uploadFile(buffer, originalName, mimetype, userId) → upload to Supabase → DB record
- deleteFile(fileId) → delete from Supabase + update DB
- getFileUrl(storagePath) → generate signed URL (1hr expiry)
- cleanupExpired() → delete all expired files from storage + DB
```

### 2.8 Announcement Service (services/announcement.service.js)

```
- createAnnouncement(data) → insert with draft status
- sendAnnouncement(id) → for each selected platform:
    1. Build formatted message
    2. Attach file if present
    3. Send via WhatsApp/Telegram
    4. Update announcement_platforms status
    5. Update announcement status to 'sent'
- getAnnouncements(filters) → paginated, filterable by date/course/status
- scheduleAnnouncement(id, dateTime) → set scheduled_at
```

### 2.9 Announcement Message Builder

Telegram message format (beautiful, emoji-rich):
```
📢 *ANNOUNCEMENT*

━━━━━━━━━━━━━━━━━━━

*📚 Course:* SE211 - Introduction to Software Engineering
*👨‍🏫 Teacher:* Dr. Nadirali (NA)
*📅 Date:* Thursday, June 12, 2026
*⏰ Time:* 2:30 PM - 4:00 PM
*🏠 Room:* 401

━━━━━━━━━━━━━━━━━━━

{content_body}

━━━━━━━━━━━━━━━━━━━

📎 *Attachment:* Quiz_1_Syllabus.pdf

━━━━━━━━━━━━━━━━━━━

_Brought to you by your CR Team_ 🤝
```

WhatsApp format (simpler, no markdown):
```
📢 ANNOUNCEMENT

━━━━━━━━━━━━━━━━

📚 Course: SE211 - Introduction to Software Engineering
👨‍🏫 Teacher: Dr. Nadirali (NA)
📅 Date: Thursday, June 12, 2026
⏰ Time: 2:30 PM - 4:00 PM
🏠 Room: 401

━━━━━━━━━━━━━━━━

{content_body}

━━━━━━━━━━━━━━━━

📎 Attachment: Quiz_1_Syllabus.pdf

━━━━━━━━━━━━━━━━

Brought to you by your CR Team 🤝
```

### 2.10 File Cleanup Cron (cron/cleanup.js)

```
- Runs daily at midnight
- Queries expired_files view
- Deletes each file from Supabase Storage
- Marks is_deleted = TRUE in DB
- Optional: Logs cleanup report
```

---

## Phase 3: API Routes

### Authentication Routes (/api/auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/auth/me | Get current user (protected) |
| PUT | /api/auth/password | Change password (protected) |

### Course Routes (/api/courses)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/courses | List all courses |
| POST | /api/courses | Create course |
| GET | /api/courses/:id | Get course + routines |
| PUT | /api/courses/:id | Update course |
| DELETE | /api/courses/:id | Soft delete course |

### Routine Routes (/api/routines)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/routines?course_id= | Get routines by course |
| POST | /api/routines | Create routine entry |
| PUT | /api/routines/:id | Update routine |
| DELETE | /api/routines/:id | Delete routine |

### Platform Routes (/api/platforms)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/platforms | List all active platforms |
| POST | /api/platforms | Add new platform |
| PUT | /api/platforms/:id | Update platform |
| DELETE | /api/platforms/:id | Soft delete platform |

### File Routes (/api/files)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/files/upload | Upload file (multipart) |
| GET | /api/files/:id | Get file info + signed URL |
| DELETE | /api/files/:id | Delete file |

### Announcement Routes (/api/announcements)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/announcements | List announcements (paginated) |
| POST | /api/announcements | Create announcement |
| GET | /api/announcements/:id | Get announcement details |
| PUT | /api/announcements/:id | Update draft announcement |
| POST | /api/announcements/:id/send | Send to selected platforms |
| POST | /api/announcements/:id/schedule | Schedule for later |
| DELETE | /api/announcements/:id | Delete announcement |

---

## Phase 4: Frontend Components

### 4.1 App Structure

```
/client/src/
├── main.jsx           → Entry point, renders App
├── App.jsx            → Router setup, AuthContext provider
├── index.css          → Tailwind imports
├── /context
│   └── AuthContext.jsx → JWT storage, login/logout, user state
├── /services
│   └── api.js         → Axios instance with JWT interceptor
└── /components
    ├── Auth/
    │   ├── Login.jsx
    │   └── Register.jsx
    ├── Dashboard/
    │   └── DashboardLayout.jsx
    ├── Announcement/
    │   ├── AnnouncementForm.jsx   → Main form: title, content, category, course, room, time, file, platforms
    │   ├── AnnouncementList.jsx   → Table of past announcements with status badges
    │   └── AnnouncementPreview.jsx → Live preview of formatted message
    ├── Course/
    │   ├── CourseSelector.jsx      → Dropdown, auto-fills ID/name, triggers routine
    │   └── CourseManager.jsx       → Full CRUD for courses
    ├── Routine/
    │   ├── RoutineSelector.jsx     → Shows routine for selected course + day
    │   └── RoutineManager.jsx      → CRUD for routines
    ├── Platform/
    │   ├── PlatformSelector.jsx    → Checkbox list of platforms
    │   └── PlatformManager.jsx     → Manage WhatsApp/Telegram destinations
    ├── Files/
    │   └── FileUpload.jsx          → Drag-and-drop file upload with progress
    └── Common/
        ├── Navbar.jsx
        ├── LoadingSpinner.jsx
        └── Alert.jsx
```

### 4.2 Key Component Behaviors

#### AnnouncementForm.jsx
```
1. User selects category (quiz, exam, notice, etc.)
2. User selects course → auto-fills course_id, course_name, teacher_initials
3. User selects day → auto-fills time + room from routine (if available)
4. User can override room/time manually (custom option)
5. User writes announcement content
6. User uploads file (PDF, image, video)
7. User selects destination platforms
8. Live preview shows formatted announcement
9. Buttons: "Save Draft", "Send Now", "Schedule"
```

#### CourseSelector.jsx
```
- Dropdown of all courses (course_id - course_name)
- On select: fills course_id, course_name, teacher_name inputs
- Displays teacher_initials badge
- "Custom" option allows manual entry
```

#### RoutineSelector.jsx
```
- Shows routine entries for selected course
- Day-of-week selector (Mon-Sun)
- On day select: fills start_time, end_time, room_number
- "Custom" checkbox to manually override
```

#### PlatformSelector.jsx
```
- Grouped by type: WhatsApp platforms, Telegram platforms
- Checkboxes with platform name
- Show status indicator (online/offline) for each
- "Select All" option per group
```

---

## Phase 5: Key Integration Flows

### 5.1 Announcement Creation Flow

```
User fills form → Frontend validates →
  POST /api/announcements { title, content, category, course_id,
    custom_room, custom_time, file_id, platform_ids[] }

Server creates announcement record (status: draft)
Server creates announcement_platforms relations

Return: 201 { announcement }

User clicks "Send" →
  POST /api/announcements/:id/send

Server iterates platforms:
  For WhatsApp:
    → whatsapp.service.sendMessageToGroup(chatId, message, filePath)
  For Telegram:
    → telegram.service.sendAnnouncement(chatId, message, fileId)
  
  Update announcement_platforms (sent/failed)
  Update announcement status (sent/partial/failed)
```

### 5.2 WhatsApp Auth Flow

```
Server starts → whatsapp-web.js Client initializes
Client emits 'qr' event → QR code displayed in terminal
User scans QR with WhatsApp → Client emits 'ready'
Service exposes isConnected() for status checks
WebSocket emits connection state to frontend
```

### 5.3 File Lifecycle

```
User uploads file:
  Frontend: FormData with file → POST /api/files/upload
  Backend: multer processes → Supabase Storage upload
  → File record created with expires_at = NOW() + 15 days
  → Returns file_id

File sent with announcement:
  File URL is attached to WhatsApp/Telegram messages

File cleanup (daily cron):
  Query: WHERE expires_at < NOW() AND is_deleted = FALSE
  For each: delete from Supabase Storage → mark is_deleted = TRUE
```

---

## Phase 6: Environment Variables

```env
# === Server ===
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# === Database (Supabase PostgreSQL) ===
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require

# === JWT ===
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=24h

# === Supabase Storage ===
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_BUCKET_NAME=announcement-files

# === WhatsApp (if using Business API) ===
# For whatsapp-web.js: no env vars needed, uses QR auth

# === Telegram ===
TELEGRAM_BOT_TOKEN=1234567890:ABCDEFghijklmnopQRSTUVwxyz

# === File Cleanup ===
FILE_EXPIRY_DAYS=15
```

---

## Phase 7: Deployment Strategy

### Vercel (Frontend)
```
- VITE front-end deployed to Vercel
- Environment variables set in Vercel dashboard
- Rewrites: /* → /index.html for SPA routing
```

### Supabase (Backend + Database)
```
- PostgreSQL database hosted on Supabase
- Express server as Supabase Edge Function or separate Render/Railway deployment
- Storage bucket for announcement files
- Auto-generated RLS policies (optional)
```

### Alternative: Monolithic Deployment
```
- Express server on Render, Railway, or Fly.io
- PostgreSQL on Supabase (managed)
- Frontend Vite build served from Express /static
- OR: Frontend on Vercel, backend on Render
```

---

## Phase 8: Edge Cases & Error Handling

### WhatsApp
- QR code timeout (60s) → regenerate
- Disconnected mid-send → queue and retry
- Group not found → log error, mark platform as failed
- Message too long → split into multiple messages
- Rate limiting (429) → exponential backoff

### Telegram
- Bot not in group → 403 error, mark platform inactive
- File too large (>50MB) → reject upload with message
- Chat not found → verify bot is admin in group

### File Upload
- File size > 50MB → reject
- Unsupported format → reject with allowed types list
- Supabase storage full → log admin alert
- Upload fails mid-way → cleanup partial file

### Database
- Connection pool exhausted → wait and retry
- Unique constraint violation → return 409 with message
- Record not found → return 404

### Auth
- Expired JWT → 401, prompt re-login
- Invalid credentials → 401, rate-limit after 5 attempts
- Weak password → validate on frontend + backend

---

## Phase 9: Future Enhancements (Post-MVP)

- [ ] **Multi-language support** (English + local language)
- [ ] **Analytics dashboard** (sent count, open rates, platform stats)
- [ ] **Template system** (save reusable announcement templates)
- [ ] **Email notification** as additional platform
- [ ] **SMS fallback** for critical announcements
- [ ] **Course year system** (multiple CRs for different batches)
- [ ] **Push notifications** via Web Push API
- [ ] **Admin panel** for user management
- [ ] **WebSocket** for real-time announcement status updates
- [ ] **Export announcements** as CSV/PDF

---

## Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|---------------|
| 1 | Database schema + migration | 2-3 hours |
| 2 | Server setup + models + middleware | 4-6 hours |
| 3 | Authentication (backend + frontend) | 4-5 hours |
| 4 | Course + Routine management | 6-8 hours |
| 5 | WhatsApp integration | 4-6 hours |
| 6 | Telegram integration | 3-4 hours |
| 7 | File upload + Supabase Storage | 4-5 hours |
| 8 | Announcement form + preview | 6-8 hours |
| 9 | Announcement list + history | 3-4 hours |
| 10 | Platform management | 3-4 hours |
| 11 | Dashboard UI + polish | 6-8 hours |
| 12 | Testing + bug fixes | 4-6 hours |
| 13 | Deployment | 2-3 hours |
| **Total** | | **~55-70 hours** |

---

## Roadmap

### Week 1: Foundation
- Database schema (Phase 1)
- Server setup with Express + PostgreSQL (Phase 2.1-2.2)
- Authentication system (Phase 3)

### Week 2: Core Feature
- Course + Routine CRUD (Phase 4)
- File upload with Supabase Storage (Phase 5)
- Platform management (WhatsApp/Telegram)

### Week 3: Frontend
- React app setup with Vite + Tailwind
- Authentication UI
- Announcement form with all features
- Live preview

### Week 4: Integration & Polish
- WhatsApp + Telegram send flow
- Announcement history
- File cleanup cron
- Error handling
- Deployment

---

*This plan is designed to be built incrementally. Each phase can be tested independently before moving to the next.*
