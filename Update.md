# CR Announcement Dashboard — Update, Improvements & New Features

> Comprehensive codebase review conducted June 2026. Covers architecture, security, UX, technical debt, and feature gaps.

---

## Contents

1. [🔴 Critical Issues (Fix Now)](#-critical-issues-fix-now)
2. [🟠 High Priority](#-high-priority)
3. [🟡 Medium Priority](#-medium-priority)
4. [🟢 Low Priority / Nice to Have](#-low-priority--nice-to-have)
5. [💡 Suggested New Features](#-suggested-new-features)
6. [📊 Technical Debt Summary](#-technical-debt-summary)
7. [🎯 Recommended Next 10 Actions](#-recommended-next-10-actions)

---

## 🔴 Critical Issues (Fix Now)

### 1. Replace JSON DB Simulator with PostgreSQL

**File:** `server/src/config/database.js` (1084 lines)

The `simulateQuery` function is a hand-written SQL parser with ~40 string-matching handlers. Every new feature requires manually mapping SQL → JSON operations. Concurrent writes corrupt `db.json`. ID generation via `reduce(max)` is O(n) on every insert.

| Risk | Impact |
|------|--------|
| Silent data loss on concurrent requests | Critical |
| O(n) ID generation with every insert | Degrades with scale |
| No migrations, no rollbacks | Schema changes are manual |
| Duplicate IDs from stale `length` | Wrong records updated/deleted |

**Fix:** Set `DATABASE_URL` in `.env`, run `schema.sql`, remove the JSON fallback.

---

### 2. WhatsApp Engine Mock Mode Blocks Pairing

**File:** `server/src/services/whatsapp.service.js`

Baileys initialization fails on Windows (crypto polyfill issues). The engine falls into mock mode and `requestPairingCode()` previously returned `MOCK1234`. Now it throws an error, but users on this machine **cannot pair** at all.

**Fix options:**
- Resolve Baileys native dependencies on Windows (node-gyp, crypto)
- Add early-exit detection at startup with clear "WhatsApp unavailable" messaging
- Document that WhatsApp pairing requires Linux/macOS or Docker

---

### 3. No Concurrent-Write Safety on db.json

`fs.writeFileSync(db.json)` is called synchronously after every mutation. If two requests arrive simultaneously, the second write overwrites the first. This affects announcements, platforms, users — every write path.

**Fix:** File-level locking or (better) use PostgreSQL.

---

### 4. Broadcast Send Has No Guard Rails

**Route:** `POST /api/announcements/:id/send`

`sendAnnouncement` dispatches to ALL linked platforms with no rate limit, no confirmation step beyond a modal, no undo. If triggered accidentally with multiple file attachments, it sends everything immediately.

**Fix:**
- Add rate limiting on the send endpoint (1 per 5s per user)
- Require explicit "Confirm Broadcast" checkbox acknowledging platform count
- Add a "Send later (schedule)" nudge if files > 10MB

---

## 🟠 High Priority

### 5. Add Rate Limiting to All Auth Endpoints

**Current:** Only `POST /auth/login` has rate limiting (5 attempts/15min). Password reset, OTP verification, 2FA endpoints are unprotected.

| Endpoint | Current | Needed |
|----------|---------|--------|
| `POST /auth/register` | Unlimited | 3 per hour per IP |
| `POST /auth/forgot-password` | Unlimited | 3 per hour per email |
| `POST /auth/verify-otp` | Unlimited | 5 per 15min per email |
| `POST /auth/login-2fa` | Unlimited | 5 per 15min per user |

**Files:** `server/src/routes/auth.routes.js`, `server/src/services/auth.service.js`

---

### 6. Refactor AnnouncementForm (1600 Lines → 5 Components)

**File:** `client/src/components/announcement/AnnouncementForm.jsx`

Single component handles: message compilation, file upload, platform selection, course selection, routine auto-fill, scheduling, draft save/edit, send confirmation — all in one file. Zero tests.

**Proposed split:**

| Component | Responsibility |
|-----------|---------------|
| `MessageBuilder.jsx` | Category presets, title, content, topic/section/room/time fields |
| `PlatformSelector.jsx` | Checkbox list with offline indicators, select-all |
| `SchedulePicker.jsx` | Datetime-local input, confirm/cancel, scheduled state display |
| `FileUploader.jsx` | Drag-drop zone, file list with remove, size/type validation |
| `AnnouncementForm.jsx` | Orchestrator — composes children, manages submit/save/schedule/send |

---

### 7. Add Dashboard Search & Filters

**Current:** Backend supports `search` (ILIKE), `status`, `course_id`, `date_from`, `date_to` query params. Frontend ignores them all — users have no way to find past announcements.

**Add to `MainDashboard.jsx`:**

```
┌──────────────────────────────────────────────────────┐
│  🔍 [Search by title/content...]                      │
│                                                       │
│  Status: [All ▼]  Course: [All ▼]  Date: [— to —]   │
└──────────────────────────────────────────────────────┘
```

**Files:** `client/src/components/dashboard/MainDashboard.jsx`, `client/src/services/api.js`

---

### 8. Add Pagination UI

**Current:** Backend returns `{ announcements, totalCount, page, limit, totalPages }`. Frontend always requests `limit=50` and shows no "Load More" or page controls. Users with >50 announcements can't access older ones.

**Add:** Infinite scroll or "Load More" button + page indicator at bottom of list.

---

### 9. Lock Scheduled Announcement Processing

**File:** `server/server.js` L160-186

```js
const processScheduledAnnouncements = async () => {
    // ← NO LOCK. Two ticks can overlap if one takes >30s
    const due = await announcementService.getDueScheduledAnnouncements();
    // ...
    schedulerTimeout = setTimeout(processScheduledAnnouncements, 30000);
};
```

**Fix:**
```js
let processing = false;
const processScheduledAnnouncements = async () => {
    if (processing) return; // ← early exit if already running
    processing = true;
    try { /* ... */ }
    finally { processing = false; schedulerTimeout = setTimeout(...); }
};
```

---

### 10. Validate File Upload Types

**File:** `server/src/middleware/upload.middleware.js`

Accepts any file up to 50MB — `.exe`, scripts, archives. The `sharp` library is imported but only conditionally used.

**Fix:** Add MIME whitelist in multer config:
```js
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg','image/png','image/gif','image/webp',
                         'application/pdf','application/msword',
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'text/plain','text/csv'];
        cb(null, allowed.includes(file.mimetype));
    }
});
```

---

## 🟡 Medium Priority

### 11. Service Layer Bypasses Business Rules

`sendAnnouncement` directly calls `whatsappService.sendMessage` / `telegramService.sendMessage` without checking if the target platform is still active or if the user has permission to send to it.

**Fix:** Add platform validation in `sendAnnouncement`:
```js
for (const pid of platform_ids) {
    const platform = await db.query('SELECT * FROM platforms WHERE id = $1 AND is_active = true', [pid]);
    if (!platform.rows[0]) throw new Error(`Platform ${pid} is not active`);
}
```

---

### 12. WebSocket Reconnection Race

**Files:** `MainDashboard.jsx` L113-155, `AnnouncementDetail.jsx` L37-81

Both components create independent WebSocket connections. On disconnect, they reconnect every 5s **forever**, even if the user navigates away. The reconnect `setTimeout` isn't tracked in the cleanup.

**Fix:** Track reconnect timeout in a ref and clear it in the cleanup function.

---

### 13. Announcement Detail Page Shows Stale Data

**File:** `client/src/components/announcement/AnnouncementDetail.jsx`

The `useEffect` fetches only when `id` changes. If a user schedules from the form then navigates back to the detail page for the same `id`, they see cached (stale) state. Add a refresh trigger — either `navigate(0)` or a refetch on focus.

---

### 14. Routine `created_by` Filter Uses Wrong Column

**File:** `server/src/config/database.js` L443

```js
const userIdMatch = normalizedText.match(/c\.created_by\s*=\s*\$(\d+)/);
results = results.filter(r => r.created_by === userId);
```

This filters routines by the **course creator** (`c.created_by`), but `course_members` has been introduced. A CR assigned to a course via `course_members` won't see that course's routines.

**Fix:** Use `course_members` for assignment checking instead of `c.created_by`.

---

### 15. No Global Navigation Loading State

Navigating between Dashboard, Courses, Routines, Platforms shows individual spinners but no page-level transition. On slow connections, users see blank white flashes.

**Fix:** Add a global loading overlay or skeleton that renders on route change, tied to React Router's `useNavigation()`.

---

### 16. Mock Mode Detection Should Block Sends

**Current:** WhatsApp and Telegram mock modes log messages but don't actually send. The UI hides the phone pairing feature but the "Broadcast Notice" button still works. If a user broadcasts in mock mode, the announcement is marked "sent" but nothing actually happens.

**Fix:** Show a warning banner on the form when all selected platforms are in mock mode, and prevent sending unless at least one real platform is selected.

---

## 🟢 Low Priority / Nice to Have

### 17. Dark Mode Toggle

The UI uses CSS custom properties (`bg-canvas`, `text-ink`) suggesting theming support, but only one color scheme is wired. Add a toggle in the profile/sidebar that swaps the `data-theme` attribute.

**Files:** `client/src/index.css`, add dark variant + toggle component

---

### 18. Announcement Templates

CRs send the same patterns weekly (quiz reminders, class cancellations, exam schedules). Add a template system:

- Template CRUD (admin manages presets)
- Template variables: `{course_name}`, `{date}`, `{time}`, `{room}`
- Quick-fill from template in the announcement form

---

### 19. Bulk Operations

- Course management: import from CSV, delete selected
- Routine management: batch add (same course, multiple days)
- Platform management: test-connection-all, delete-selected
- Announcement list: select multiple → delete / resend

---

### 20. Activity Feed Frontend

The `audit_logs` table records admin actions. The `analytics_events` table tracks feature usage. Neither has a frontend view. Add:

- Recent activity panel on admin dashboard
- Per-announcement edit history in detail view
- Usage stats (announcements per day, platform delivery rates)

---

### 21. PWA / Offline Support

The React SPA has no service worker. Network drop during form composition loses all unsaved work.

- Add `vite-plugin-pwa` for service worker + manifest
- Cache form draft to `sessionStorage` (partially done — `announcement_draft` key exists but isn't comprehensive)
- Add "Install App" prompt

---

### 22. Expand Test Coverage

| Area | Current Tests | Needed |
|------|-------------|--------|
| Auth service | 4 (JWT) | + registration, password reset, 2FA |
| Announcement service | 0 | + create, update, schedule, send, list with filters |
| Telegram service | 3 (mock mode) | + real mode, error handling |
| WhatsApp service | 0 | + mock mode, pairing, send |
| File service | 2 (exports) | + upload, delete, cleanup |
| AnnouncementForm | 0 | + 5-10 integration tests for each flow |
| Dashboard | 0 | + fetch, filter, pagination |
| Total | **13 tests** | **→ 60+ tests** |

---

## 💡 Suggested New Features

| # | Feature | Effort | Impact | Description |
|---|---------|--------|--------|-------------|
| F1 | **Search + filters on dashboard** | Small | High | Find past announcements by keyword, status, course, date range |
| F2 | **Pagination / infinite scroll** | Small | High | >50 announcements currently invisible |
| F3 | **Announcement templates** | Medium | High | Reusable presets with variables: `{course}`, `{date}`, `{time}` |
| F4 | **Scheduled calendar view** | Medium | Medium | Calendar showing all upcoming scheduled broadcasts |
| F5 | **Activity feed** | Small | Medium | Recent actions panel (audit_logs frontend) |
| F6 | **Bulk CR assignment** | Medium | High | Admin assigns multiple CRs to courses at once |
| F7 | **Email digests** | Medium | Medium | Daily/weekly summary of sent announcements (SMTP exists) |
| F8 | **Export to PDF/Excel** | Small | Low | Download announcement history as spreadsheet |
| F9 | **Multi-language support** | Large | Low | Message templates in English + Bengali |
| F10 | **SMS fallback platform** | Large | Low | Critical announcements via SMS for users without WhatsApp/Telegram |

---

## 📊 Technical Debt Summary

| Item | Location | Size | Risk |
|------|----------|------|------|
| JSON DB simulator | `database.js` | 1084 lines | 🔴 Data corruption on concurrent writes |
| AnnouncementForm | `AnnouncementForm.jsx` | ~1600 lines | 🔴 Untestable, hard to maintain |
| SQL string-matching handlers | `database.js` | ~40 patterns | 🟠 Silent failures on new query patterns |
| WebSocket reconnect spam | `MainDashboard.jsx` + `Detail.jsx` | 2 components | 🟠 Resource leak on navigation |
| Routine filter by `c.created_by` | `database.js:443` | 1 line | 🟠 Wrong results for assigned CRs |
| Auth endpoints without rate limits | `auth.routes.js` | 6 endpoints | 🟠 Brute-force attack surface |
| No file MIME validation | `upload.middleware.js` | 1 filter | 🟠 Arbitrary file upload |

---

## 🎯 Recommended Next 10 Actions

Ordered by highest ROI (impact ÷ effort):

```
1.  Connect PostgreSQL & remove JSON DB fallback
    └─ Eliminates 1084 lines of fragile SQL simulation
    └─ Unlocks concurrent writes, migrations, proper queries

2.  Add search bar + filters to dashboard
    └─ Uses existing backend params (no backend changes needed)
    └─ Highest UX impact per line of code

3.  Split AnnouncementForm into 5 components
    └─ Makes the codebase testable and maintainable
    └─ Enables parallel work on form features

4.  Add rate limiting to all auth endpoints
    └─ Security hardening, small change per endpoint

5.  Add pagination UI to announcement list
    └─ Uses existing backend pagination (no backend changes)
    └─ Fixes invisible-announcements problem

6.  Lock scheduled announcement processor
    └─ Single mutex flag, prevents overlapping ticks

7.  Add file MIME type whitelist
    └─ 15-line change, prevents arbitrary uploads

8.  Validate platforms before sending
    └─ Prevents sends to inactive/deleted platforms

9.  Add announcement template system
    └─ Reusable presets for repeated message patterns

10. Add dark mode toggle
    └─ CSS variables already exist, needs wiring + toggle
```

---

Also need to make it for mobile apk so use Capacitor.js to make it apk for phone 
*Generated from comprehensive codebase review. Each item references specific files and line numbers for easy navigation.*
