# Testing guide — Code Block (E-learnHust)

This document covers how to:
1. Spin up test accounts for each role
2. Seed demo course content (video / PDF / exercise lessons)
3. Run the unit-test suite
4. Walk a manual QA checklist against every feature shipped through Phase 2

---

## 1. Roles & permissions

| Role | How granted | Can access | Cannot |
|---|---|---|---|
| **Student** | Default for any signed-in user | `/dashboard`, `/courses`, `/courses/:id`, playground, `/leaderboard`, `/pricing` | Anything under `/admin` |
| **Pro** | Subscribed via `/pricing` (Clerk Billing) | All Student routes + advanced course chapters (index ≥ 2) and `useAuth().has({plan:'pro'})` gated UI | Anything under `/admin` |
| **Librarian** | Granted by an Admin from `/admin/users` | All Student routes + `/admin/courses` + chapter/lesson CRUD | `/admin/users` (role assignment) |
| **Admin** | Set via Clerk dashboard → user → publicMetadata.role = `"admin"` | Everything | — |

---

## 2. Creating test accounts

There is no scripted way to mint Clerk users — they have to be created through the sign-up flow. The role is then a one-field edit in Clerk.

### Step-by-step for each role

Use a free email-alias provider if you want disposable inboxes (Gmail's `+tag` aliases work: `you+admin@gmail.com` and `you+librarian@gmail.com` route to the same inbox).

1. **Create the account** — open the app in an incognito window → `/sign-up` → finish the flow → verify the email.
2. **Set the role** — open Clerk dashboard → **Users** → click the user → **Metadata** tab → **Public** → add:
   ```json
   { "role": "admin" }
   ```
   (or `"librarian"`, `"student"`).
3. **Force a token refresh** — sign the user out and back in. The role lives in the session JWT and only updates on new sessions.

### Suggested test fixtures

| Role | Suggested email | Test credentials note |
|---|---|---|
| Admin | `qa-admin@<your-domain>` | Set `publicMetadata.role` to `"admin"` in Clerk |
| Librarian | `qa-librarian@<your-domain>` | Sign up first, then promote to `"librarian"` either via Clerk dashboard or by logging in as Admin and clicking **Make Librarian** on `/admin/users` |
| Student | `qa-student@<your-domain>` | Sign up; leave role unset (defaults to student behavior) |
| Pro | `qa-pro@<your-domain>` | Sign up as student, then subscribe to the Pro plan via `/pricing` |

> **First-time setup**: After the very first user signs up there is no admin yet — promote yourself via the Clerk dashboard manually. From that point on, the in-app **Make Librarian** button can grant the librarian role.

---

## 3. Seeding demo content

The repo includes a one-off script that adds a demo course with one of each lesson type:

```bash
npm run seed:demo
```

It creates **"Demo: Multi-Modal Lessons"** with:

| Lesson | Type | Source |
|---|---|---|
| Demo: Intro Video | `video` | Public YouTube URL (replace with your own when ready) |
| Demo: Reading Material | `pdf` | Public W3C sample PDF |
| Demo: Add a Title Tag | `exercise` | Single-file HTML with a regex check on `<title>Hello World</title>` |

The script is idempotent — re-running it skips items that already exist. You can also create the same content manually through `/admin/courses/<id>/lessons/new` once you've logged in as Admin.

> **Disclaimer on "videos and PDFs"**: This codebase doesn't host original course media — it embeds external URLs. Swap the URLs in `scripts/seed-demo-content.ts`, or upload your own files via Cloudinary and paste those URLs into the admin lesson form.

---

## 4. Running unit tests

```bash
npm test            # one-shot run, CI-friendly
npm run test:watch  # watch mode while developing
```

Covered by `lib/__tests__/*.test.ts`:

- **`sanitize.test.ts`** — confirms DOMPurify strips `<script>`, `<iframe>`, `<form>`, inline event handlers, and `javascript:` URLs while keeping safe markup (including inline `style` that seeded exercises depend on).
- **`lesson-validation.test.ts`** — confirms the regex / expectedOutput gate behaves as designed:
  - Auto-pass when no checks are set
  - Reject on empty submission when checks exist
  - Honor `(?i)` Perl-style inline flags
  - Auto-pass on malformed regex (don't lock students out)
  - Require BOTH checks to pass when both are set

These two modules are pure functions used by both the client and the API route, so unit-level coverage is high-value. UI/API integration tests are scoped to the manual QA checklist below.

---

## 5. Manual QA checklist

Run through this list when validating a release or after a large refactor. Tick each item.

### 5.1 Public + auth

- [ ] `/` renders the hero with the **Get Started** button
- [ ] `/sign-up` flow creates a user; check the row appears in `users` table (POST `/api/user` is idempotent on subsequent visits)
- [ ] `/sign-in` flow lets the user back in
- [ ] Signed-out users hitting `/dashboard` are redirected to `/sign-in`
- [ ] Signed-out users hitting `/admin` are redirected by the middleware
- [ ] `auth.protect()` is the fallback for any non-public route

### 5.2 Student dashboard

- [ ] `/dashboard` shows the welcome banner with the user's name
- [ ] **Trending Now** section appears when ≥1 course has any enrollment, and hides itself otherwise
- [ ] **Enrolled Courses** cards show `completedLessons / totalLessons` and the progress bar reflects them
- [ ] **User Status** sidebar shows the live star count (refreshed automatically after XP / star changes — feat39)

### 5.3 Course browsing & enrollment

- [ ] `/courses` lists every course with banner, level, and title
- [ ] `/courses/<id>` shows the banner, description, and **Enroll** button
- [ ] For a free course → click Enroll → toast says "Course enrolled successfully!" and row appears in `enrolledCourse` (userId is the Clerk `user.id`, not email — feat22)
- [ ] Re-clicking Enroll does not create a duplicate row (feat19 idempotency)
- [ ] For a paid course (`unlockCost > 0`) when the user lacks the stars → toast "This course costs N ⭐ — you don't have enough yet." No row written
- [ ] When the user has enough stars → click Enroll → toast confirms the spend, `users.points` decreases by the cost, sidebar balance updates without reload
- [ ] **Pro lock**: as a non-Pro student, chapters with index ≥ 2 render a yellow "Pro" badge and the lesson buttons show `???` with tooltip "Pro only"

### 5.4 Playground — video lesson

- [ ] Open a video lesson from the chapter listing
- [ ] YouTube embeds load (also test `youtu.be` short URLs and a Vimeo URL if you have one)
- [ ] **Mark Completed** button credits XP, row appears in `completedLesson`, course-detail progress bar updates after navigating back
- [ ] Clicking **Mark Completed** twice on the same lesson is a no-op (feat26 idempotency)

### 5.5 Playground — PDF lesson

- [ ] PDF iframe renders the file (Cloudinary `raw/upload` or any direct PDF URL)
- [ ] Mark Completed credits XP

### 5.6 Playground — exercise lesson

- [ ] Sandpack loads with the starter code on the right
- [ ] **Run Code** button refreshes the preview
- [ ] Clicking **Mark Completed!** on the unmodified starter → toast: "Your code doesn't match the expected pattern yet" — no XP credited (feat28)
- [ ] Edit the code so it matches the regex / expectedOutput → click Mark Completed → toast success, XP credited, button switches to "Already Completed !"
- [ ] Bypass attempt — open DevTools and `fetch('/api/lesson/complete', {method:'POST', body: JSON.stringify({lessonId: <id>}), headers: {'content-type':'application/json'}})` for an exercise lesson → server returns **422** with a `reason` field; no XP credited

### 5.7 Leaderboard

- [ ] `/leaderboard` ranks users by `points DESC`; your row is highlighted yellow with "(you)" suffix
- [ ] Top 3 rows show crown / trophy / medal icons
- [ ] Emails are masked (`pa***@domain.com`)
- [ ] Earn XP → refresh → rank updates

### 5.8 Admin — Courses

- [ ] `/admin/users` redirects librarians to `/admin` (feat33 middleware split)
- [ ] `/admin` overview shows real **Total Courses / Registered Users / Active Enrollments** counts (no `$2,450` placeholder — feat34)
- [ ] `/admin/courses` lists all courses with banner, level, unlock-cost ⭐ column, and **Edit / Manage / Delete** action icons
- [ ] **Create course** → fill the form → upload a banner image → row appears in `courses` with monotonic `courseId` (no `Math.random()` collisions — feat21) and the `unlockCost` is actually saved (feat21 bugfix)
- [ ] **Edit course** → change the title → save → list reflects the change
- [ ] **Delete course** → confirms before deleting → row gone

### 5.9 Admin — Chapters & Lessons (feat35, 36, 37, 38)

- [ ] Click the **ListTree** icon on a course row → lands on the per-course manager (was a 404 before feat35)
- [ ] **New Chapter** → fill in name + desc → save → chapter appears with auto-assigned `#N`
- [ ] **Edit Chapter** (pencil) → change name → save (feat37)
- [ ] **Delete Chapter** disabled while it has lessons; enabled once they're removed
- [ ] **New Lesson** → pick chapter → choose **Video** → paste YouTube URL → save (feat35)
- [ ] **New Lesson** → choose **PDF** → upload a `.pdf` file → "Uploading & Saving…" → row created with the Cloudinary URL (feat38)
- [ ] **New Lesson** → choose **Exercise** → fill content / task / starter file / regex / expected output → save (feat36)
- [ ] **Edit Lesson** (pencil on a lesson row) → form pre-populates from existing content per type → change a field → save (feat37)
- [ ] **Delete Lesson** removes the row and cleans up `completedLesson` references (no orphan rows)

### 5.10 Admin — Users & Librarian role

- [ ] Sign in as Admin → `/admin/users` loads (librarians get redirected to `/admin`)
- [ ] Each user row shows a colored role badge (Admin / Librarian / Student)
- [ ] **Make Librarian** on a student row → confirm prompt → page reloads → role flips to Librarian
- [ ] **Revoke Librarian** flips them back to Student
- [ ] Admin rows show **Admin (not changeable here)** — no accidental self-demotion
- [ ] Sign in as the newly-promoted Librarian (sign-out / sign-in for the new role to land in the session JWT)
- [ ] Sidebar header reads **"LIBRARIAN HUB"** (was **"ADMIN HUB"**) — feat33
- [ ] Sidebar does NOT show the **Users** link
- [ ] Librarian can still create / edit / delete chapters + lessons in `/admin/courses`

### 5.11 Cross-cutting

- [ ] XSS sanity: in an admin form, paste `<img src=x onerror=alert(1)>` into a lesson `content` field → save → open as a student → no alert fires; the `<img src=x>` may render (broken image) but the `onerror` is stripped (feat40)
- [ ] No `@ts-ignore` comments remain in `app/api/course/route.ts` (feat27 / Phase 2 type-safety principle)
- [ ] After completing a lesson, the **dashboard star count updates without a hard refresh** (feat39)

---

## 6. Test fixtures DB cleanup

After a full pass, you may want to reset the test DB. Safe truncate order respecting FK semantics:

```sql
TRUNCATE "completedLesson";
TRUNCATE "enrolledCourse";
TRUNCATE "lessons";
TRUNCATE "courseChapters";
-- Leave usersTable + CoursesTable in place if you want to keep
-- your test accounts and starting catalogue.
```

If you want a fresh demo state, run `npm run seed:demo` afterward.

---

## 7. What's intentionally NOT covered by automation

Things on the manual list that would be valuable to automate one day but aren't in scope:

- Playwright/E2E for the playground submit flow (Sandpack iframe automation is non-trivial)
- API integration tests against a real Postgres (we'd want a dedicated `TEST_DATABASE_URL` and migrations on it)
- Visual regression on the dashboard layout

Open follow-up branches if any of those become routine.
