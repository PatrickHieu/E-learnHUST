# Code Block · E-learnHUST — Test Case Catalogue

Comprehensive QA matrix covering every user-facing capability through Phase 5 (Auth.js migration). Test cases are grouped by **role** so a QA pass can be done one persona at a time.

**Test environment**
- URL: `https://e-learn-hust.vercel.app` (or `http://localhost:3000` for local)
- Recommended browser: Chrome / Edge (latest)
- Prereq seeds (run once on a fresh DB):
  ```bash
  npx drizzle-kit push
  npm run seed:demo            # demo course + 3 sample lessons
  npm run seed:fake-users      # 30 fake students
  npm run seed:fake-payments   # demo payment history
  npm run bootstrap:test-accounts
  ```
- Test account credentials (after `bootstrap:test-accounts`):
  | Role | Email | Password |
  |---|---|---|
  | Admin | `admin@codeblock.test` | `Password1!` |
  | Librarian | `librarian@codeblock.test` | `Password1!` |
  | Student | `student@codeblock.test` | `Password1!` |

Status legend used in result columns: ✅ pass · ❌ fail · 🟡 partial · ⏭ skipped.

---

## 1. Public / Guest (not signed in)

| ID  | Feature | Preconditions | Steps | Expected Result |
|-----|---------|---------------|-------|-----------------|
| G01 | Home loads | Anonymous, root URL | Visit `/` | Hero banner, "Get started" CTA, header with Courses / Leaderboard / Pricing / Sign in button |
| G02 | Header navigation visible | Anonymous | Click each top-nav link | Routes navigate to `/courses`, `/leaderboard`, `/pricing` respectively |
| G03 | Courses listing renders | Anonymous, ≥1 course in DB | Visit `/courses` | Card grid shows every course with banner, title, level chip, search box, level filter chips |
| G04 | Course search filters | Anonymous | Type a term that matches one course title | Grid filters to matching courses only after debounce |
| G05 | Level filter pre-selected by URL | Anonymous | Visit `/courses?level=beginner` | Beginner chip highlighted, only beginner cards visible |
| G06 | Locked card opens paywall modal | Anonymous, intermediate or advanced course exists | Click a locked card | Paywall modal opens with banner, description, cost (⭐ or ₫) |
| G07 | Star paywall blocks when no session | Anonymous | Open star paywall → click Unlock | Redirected to `/sign-in` or modal shows error; no DB write occurs |
| G08 | Pricing page renders 2 tiers | Anonymous | Visit `/pricing` | Free + Pro cards shown; Pro shows 199.000₫/month; CTA buttons present |
| G09 | Leaderboard page redirects when unauthed | Anonymous | Visit `/leaderboard` | Middleware redirects to `/sign-in` |
| G10 | `/dashboard` redirects unauthed | Anonymous | Visit `/dashboard` | Redirect to `/sign-in` |
| G11 | `/admin` redirects unauthed | Anonymous | Visit `/admin` | Redirect to `/sign-in` |
| G12 | Sign-in page renders | Anonymous | Visit `/sign-in` | Google button, OR divider, email + password form, "Create an account" link |
| G13 | Sign-up page renders | Anonymous | Visit `/sign-up` | Name + email + password form, password ≥6 helper text |
| G14 | Sign-up validation: short password | Anonymous | Try password "abc" | Client + server reject with "Password must be at least 6 characters" |
| G15 | Sign-up validation: duplicate email | Anonymous, email already in DB | Use the same email | 409 + error toast "An account with this email already exists" |
| G16 | Sign-up happy path → auto sign-in | Anonymous | Submit valid name + email + password | Account created, auto-signed-in, lands on `/dashboard` |
| G17 | Sign-in wrong password | Anonymous | Valid email, wrong password | "Invalid email or password" toast; stays on /sign-in |
| G18 | Sign-in correct credentials | Anonymous | Valid email + password | Lands on `/dashboard` |
| G19 | Sign-in Google OAuth | AUTH_GOOGLE_* env set | Click Continue with Google | Redirect to Google → consent → lands on `/dashboard`; new student row if first time |

---

## 2. Student role (`student@codeblock.test`)

### 2.1 Profile + dashboard

| ID  | Feature | Preconditions | Steps | Expected Result |
|-----|---------|---------------|-------|-----------------|
| S01 | Dashboard hero greets by name | Signed in as student | Visit `/dashboard` | "Welcome Back &lt;name&gt;…" banner shown |
| S02 | UserStatus card shows email + stars | Signed in | View dashboard | Email + total stars (from `usersTable.points`) shown |
| S03 | UserAvatar dropdown | Signed in | Click avatar in header | Dropdown shows name + email + role chip + Sign out item |
| S04 | Sign out works | Signed in | Click Sign out | Lands on `/`, header reverts to anonymous state |

### 2.2 Course browsing

| ID  | Feature | Preconditions | Steps | Expected Result |
|-----|---------|---------------|-------|-----------------|
| S05 | Free course listed without lock | Beginner course exists | Visit `/courses` | Card has no Lock badge, click navigates to detail |
| S06 | Locked card → paywall | Intermediate course exists | Click a star-locked card | PaywallModal opens with Cost / You have / Remaining after rows |
| S07 | Insufficient stars hint | User points < cost | Open star paywall | Red banner with "You need X more ⭐"; link to `/courses?level=beginner` |
| S08 | Beginner filter link from paywall | Insufficient stars banner showing | Click "Take free courses…" | Modal closes; `/courses?level=beginner` loads with chip filter applied |
| S09 | Star unlock happy path | User points ≥ cost | Confirm unlock | Toast "Course unlocked"; points deducted; lesson page opens; PaymentsTable row inserted (method='stars') |
| S10 | Star unlock double-click safe | Cost > balance after first unlock | Click unlock twice fast | Only one deduction; second click rejected (already enrolled) |
| S11 | Paid course paywall | Advanced course exists | Click an advanced card | Modal shows price in ₫, three methods (VNPay / MoMo / Visa) |
| S12 | Mock checkout success | Paid course paywall open | Pick a method, confirm | ~800ms spinner, toast "Payment successful", redirect to lesson, PaymentsTable row (method='mock_<method>') |

### 2.3 Course detail page

| ID  | Feature | Preconditions | Steps | Expected Result |
|-----|---------|---------------|-------|-----------------|
| S13 | Course detail loads | Enrolled in a course | Click an enrolled card | Banner + description + chapter accordion |
| S14 | Chapter accordion expands | Multi-chapter course | Click chapter row | Lessons list expands with type icons + XP buttons |
| S15 | Chapter 1 unlocked by default | Enrolled, no completions yet | View chapter 1 | All lessons clickable, no Lock icon |
| S16 | Chapter 2+ locked until prior chapter done | Enrolled, ch.1 has incomplete gating lessons | View chapter 2 | Lock icon on chapter header; lessons show "???" disabled button |
| S17 | Chapter unlocks after prior gating done | Complete every quiz + exercise + video-with-checkpoints in ch.1 | Refresh course detail | Chapter 2 unlocked, lessons clickable |
| S18 | Pro lock on chapter 3+ | Free user, ch ≥3 | View chapter 3 | "Pro" badge shown; lessons disabled with "Pro only" tooltip |

### 2.4 Lesson playground

| ID  | Feature | Preconditions | Steps | Expected Result |
|-----|---------|---------------|-------|-----------------|
| S19 | PDF lesson — Drive link renders | Lesson has Drive URL | Open PDF lesson | Drive `/preview` iframe loads inline with toolbar (Reload / Open in new tab) |
| S20 | PDF lesson — Cloudinary URL via Google Docs viewer | Lesson has Cloudinary URL | Open PDF lesson | docs.google.com/gview iframe loads; PDF rendered |
| S21 | PDF lesson — Mark Completed | Not yet completed | Click Mark Completed button | Toast "Lesson complete! +X XP", green "Lesson completed" card appears, sidebar updates |
| S22 | PDF lesson — XP credited | Mark complete a 10 XP lesson | Check user points | Points increased by 10 |
| S23 | Video lesson — YouTube renders | Video lesson with YouTube URL | Open video lesson | YouTube embed renders in 16:9 |
| S24 | Video lesson — Native MP4 renders | Video lesson with native URL | Open video lesson | HTML5 `<video controls>` element renders |
| S25 | Video lesson without checkpoints — Mark Completed | Video has no inVideoQuizzes | Click Mark Completed | Standard XP credit + transition |
| S26 | In-video quiz checkpoint pauses video | Video has checkpoints, learner has not done them | Play video to first checkpoint timestamp | Video pauses, overlay shows Q+ options, must answer correctly |
| S27 | Correct answer awards checkpoint XP | Overlay open | Click correct answer | Toast "Correct! +X XP"; overlay closes; video resumes |
| S28 | Wrong answer keeps overlay open | Overlay open | Click wrong answer | Toast "Try again"; can retry; video stays paused |
| S29 | All checkpoints done → lesson auto-completed | Final checkpoint passed | Pass last checkpoint | Toast "Lesson complete! +X XP"; lesson marked complete (no manual button) |
| S30 | Checkpoint markers visible | Native video, checkpoints exist | Open video lesson | Yellow / green dots on the marker strip below the video at correct timestamps |
| S31 | Quiz lesson — pick + submit | Quiz lesson | Pick option, submit | Server validates; correct → lesson complete + toast; wrong → red highlight, retry |
| S32 | Quiz wrong answer counted | Quiz lesson | Submit wrong | 422 from API; UI shows error; can retry |
| S33 | Exercise lesson — Sandpack loads | Exercise lesson | Open exercise | ContentSection (left) + Sandpack code editor (right); split layout |
| S34 | Exercise submit pass | Exercise with regex validator, code matches regex | Click Mark Completed | 200; lesson marks complete; XP credited |
| S35 | Exercise submit fail | Code doesn't match regex/expected output | Click Mark Completed | 422 + reason toast; lesson stays incomplete |
| S36 | Exercise hint costs XP | Hint available | Click reveal hint | Confirms hint XP cost; on confirm hint shown + points reduced |
| S37 | Lesson sidebar Mark Complete visible above bottom bar | Any video/PDF lesson | View lesson page | Mark Completed button is not obscured by Previous/Next bar |
| S38 | Already Completed pill shown | Lesson already done | Revisit lesson | Green "Lesson completed" card with XP earned message instead of button |
| S39 | Chapter-gated lesson access blocked via API | Locked chapter | Direct-navigate to lesson URL | API returns 403 "Chapter locked"; page shows "Chapter locked" friendly screen |
| S40 | Course-wide certificate button shown | All lessons completed | Visit course detail | "Download Certificate" button visible |
| S41 | Certificate PDF downloads | Click button | Click Download Certificate | "Preparing…" spinner; PDF downloads; filename `certificate-<slug>.pdf` |
| S42 | Certificate Vietnamese diacritics render | Name has ễ / ế etc. | Open downloaded PDF | Name renders correctly (e.g., "Nguyễn Thanh Hiếu") |

### 2.5 Leaderboard

| ID  | Feature | Preconditions | Steps | Expected Result |
|-----|---------|---------------|-------|-----------------|
| S43 | Leaderboard loads | Signed in | Visit `/leaderboard` | Top 100 by points; current user highlighted; mask shows email partially |
| S44 | Rank badges | Multiple users | Inspect top 3 | Crown / Trophy / Medal icons for ranks 1 / 2 / 3 |

### 2.6 Student admin access denied

| ID  | Feature | Preconditions | Steps | Expected Result |
|-----|---------|---------------|-------|-----------------|
| S45 | `/admin` blocked | Signed in as student | Visit `/admin` | Middleware redirect to `/` |
| S46 | `/admin/users` blocked | Signed in as student | Visit `/admin/users` | Middleware redirect to `/` |
| S47 | No Admin button in header | Signed in as student | Inspect header | No Shield-iconed Admin button visible |

---

## 3. Librarian role (`librarian@codeblock.test`)

### 3.1 Inherits all student capabilities

Run S01–S44 again to confirm librarians can still use the learner-side flow.

### 3.2 Admin shell access

| ID  | Feature | Preconditions | Steps | Expected Result |
|-----|---------|---------------|-------|-----------------|
| L01 | Admin button visible in header | Signed in as librarian | Inspect header | Yellow Shield-iconed "Librarian" button visible |
| L02 | `/admin` accessible | Signed in as librarian | Visit `/admin` | Overview dashboard with Total Courses / Users / Enrollments stats |
| L03 | Sidebar nav shows Courses only | Librarian view of `/admin` | Inspect sidebar | Overview + Courses links; Users + Analytics hidden (admin-only) |
| L04 | `/admin/users` blocked | Signed in as librarian | Visit `/admin/users` | Redirect to `/admin` (or `/` depending on middleware) |
| L05 | `/admin/analytics` blocked (UI only) | Signed in as librarian | Visit `/admin/analytics` | Redirect; analytics is admin-gated server-side |

### 3.3 Course CRUD (librarian)

| ID  | Feature | Preconditions | Steps | Expected Result |
|-----|---------|---------------|-------|-----------------|
| L06 | Course list shows all | Librarian | Visit `/admin/courses` | All courses shown with edit links |
| L07 | Create course | Librarian | Click Create Course → fill form → submit | Course inserted; redirect to /admin/courses; new row visible |
| L08 | Form pricing block matches level | Create form | Toggle level dropdown | Star input enables only when intermediate; ₫ input only when advanced; "0 = auto" placeholders |
| L09 | Upload course banner to Cloudinary | Create form, banner field | Pick image, submit | Image uploads; banner URL persisted; visible on listing |
| L10 | Edit course | Librarian | Click edit on a course | Form pre-fills; change name → save → redirect; new name on listing |
| L11 | Delete course (with chapters) | Course has chapters | Try to delete | Error "Delete all lessons in this chapter first" (cascade safety) |
| L12 | Course rejected by Auth gates | Logged-out user attempts /admin/courses | Visit URL | Redirect to /sign-in |

### 3.4 Chapter + lesson CRUD (librarian)

| ID  | Feature | Preconditions | Steps | Expected Result |
|-----|---------|---------------|-------|-----------------|
| L13 | Create chapter | Librarian on course detail | Click New Chapter → fill → save | Chapter id auto-increments; visible on course |
| L14 | Edit chapter | Existing chapter | Edit → save | Name + desc updated |
| L15 | Delete empty chapter | Chapter with no lessons | Delete | Row removed |
| L16 | Create video lesson with YouTube URL | Chapter exists | New lesson → type=Video → URL → save | Lesson inserted with provider=youtube |
| L17 | Create video lesson with checkpoints | Video form | Add 2 checkpoints (timestamp + Q + 4 options + correct + XP) | inVideoQuizzes JSON stored |
| L18 | Create PDF lesson via Google Drive URL | New lesson → type=PDF | Paste a Drive share link | pdfUrl saved; preview iframe wraps to Drive's `/preview` URL on student side |
| L19 | Create PDF lesson via Cloudinary upload | New lesson form | Choose .pdf file in Advanced section | File uploaded; URL persisted |
| L20 | Create quiz lesson | New lesson → type=Quiz | Question + 4 options + correct index + explanation | quizContent JSON saved |
| L21 | Create exercise lesson (Sandpack) | New lesson → type=Exercise | Fill HTML/CSS template + regex + expected output | Lesson stored; student side gets Sandpack |
| L22 | Edit any lesson | Existing lesson | Click edit | Form pre-fills correctly per type; can save without errors (no NEXT_REDIRECT bug) |
| L23 | Delete lesson | Existing lesson | Delete | Lesson + completion rows cleaned up |

### 3.5 Librarian role-change blocked

| ID  | Feature | Preconditions | Steps | Expected Result |
|-----|---------|---------------|-------|-----------------|
| L24 | Cannot promote student | Librarian | No access to /admin/users → no UI affordance | N/A — page redirects |

---

## 4. Admin role (`admin@codeblock.test`)

### 4.1 Inherits librarian + student capabilities

Re-run all S* and L* tests as admin to confirm no regression.

### 4.2 Sidebar + Users panel

| ID  | Feature | Preconditions | Steps | Expected Result |
|-----|---------|---------------|-------|-----------------|
| A01 | Sidebar shows Users + Analytics | Admin | View `/admin` sidebar | Both links present |
| A02 | `/admin/users` lists all users | Admin | Visit /admin/users | Table with name / email / stars / plan / role / actions |
| A03 | Search filters in-memory | Admin, users in DB | Type "nguyen" | Rows filter instantly to matching names/emails |
| A04 | Empty-state when no match | Admin, search "xyzzz" | View | "No users match your search" row |
| A05 | View button → per-user page | Admin | Click View on a row | Lands on `/admin/users/<id>` |
| A06 | Per-user profile header | Admin | Open user detail | Name + email; summary cards Stars / Enrolments / Lessons / Quizzes |
| A07 | Per-user enrolments with progress bars | User has enrolments | View detail | Each enrolment row with completion % bar + XP earned + level + tier |
| A08 | Per-user recent activity | User has completions | View detail | Up to 20 recent completions with type badge + relative time |
| A09 | Per-user payments table | User has PaymentsTable rows | View detail | Rows of When / Course / Method / Amount (₫ or ⭐) |
| A10 | Per-user seed/Clerk-orphaned data still visible | Inspect a seed user | View detail | Activity rows under `seed_<email>` userId still shown via dual-lookup |
| A11 | Promote student → librarian | Admin | Click "Make Librarian" on a student row | Confirm → role updates; row badge changes to "Librarian" |
| A12 | Demote librarian → student | Admin | Click "Revoke Librarian" on a librarian | Role reverts |
| A13 | Cannot demote admin via UI | Admin row | View admin row's Actions cell | Shows "Admin (not changeable here)" placeholder; no button |

### 4.3 Analytics dashboard

| ID  | Feature | Preconditions | Steps | Expected Result |
|-----|---------|---------------|-------|-----------------|
| A14 | Analytics page renders | Admin, seeded payments | Visit `/admin/analytics` | 4 stat cards + revenue area chart + top-grossing table + user-quality block |
| A15 | Stat cards correct | Seeded payments exist | View top strip | Lifetime + last-N-days revenue, paid txn count, star-unlock count |
| A16 | Range picker drives queries | Admin | Click 7d / 30d / 90d | URL updates with `?range=`; cards + charts re-render with new window |
| A17 | Revenue chart zero-fills gaps | Sparse payment data | View chart | Days with no payments still on x-axis at y=0 (continuous line) |
| A18 | Top-grossing courses table | Paid payments exist | View | Top 5 courses by revenue with course title joined |
| A19 | DAU bar chart renders | Completions in window | Scroll to user-quality | Green bars per day showing distinct learners with ≥1 completion |
| A20 | Funnel cards | Users + enrolments + completions exist | View | Registered → Enrolled → Active(30d) → Avg lessons / active; sub-line conversion % |
| A21 | Empty state with no payments | Fresh DB | View | "No paid transactions in this range yet" message |

### 4.4 Admin shortcut button

| ID  | Feature | Preconditions | Steps | Expected Result |
|-----|---------|---------------|-------|-----------------|
| A22 | Header shows yellow Admin button | Signed in as admin | View any page header | Yellow Shield button labelled "Admin" |
| A23 | Click button → /admin | Click | Lands on `/admin` overview |

### 4.5 RBAC server-side enforcement (cannot be bypassed by UI hacks)

| ID  | Feature | Preconditions | Steps | Expected Result |
|-----|---------|---------------|-------|-----------------|
| A24 | API `/api/course/unlock` rejects unauthed | Anonymous | curl POST | 401 |
| A25 | API `/api/course/purchase` rejects wrong tier | Authed student | POST courseId of a free course | 400 "isn't a paid course" |
| A26 | API `/api/lesson/complete` server-validates quiz | Authed student | POST wrong submission | 422 + reason |
| A27 | createCourseAction rejects student | Signed in as student | Try to invoke via DevTools | 500 "Forbidden: admin or librarian role required" |
| A28 | setUserRoleAction rejects librarian | Signed in as librarian | Try to invoke role toggle via direct call | Throws "Forbidden: admin only" |

---

## 5. Cross-cutting / regression sweep

| ID  | Feature | Preconditions | Steps | Expected Result |
|-----|---------|---------------|-------|-----------------|
| X01 | Sign-in works from `/api/auth/*` allow-listed | Sign-in page loads | Submit form | Credentials POST goes through; lands on dashboard |
| X02 | Sign-up auto-signs-in | Sign-up page | Submit valid form | One step → /dashboard logged in |
| X03 | Sign-out clears session | Any logged-in state | Sign out | Header reverts; protected routes redirect; cookie cleared |
| X04 | Header hides admin button for student | Signed in as student | View header | No Shield button |
| X05 | UserDetailContext refresh after star spend | Star-unlock action | After spend | useUserDetail re-fetches; header points value updates |
| X06 | useSearchParams Suspense fix | Direct visit `/courses` after build | Visit | Page renders (Suspense boundary present, no prerender bail) |
| X07 | Vercel build succeeds | After main merge | Inspect Vercel dashboard | `Generating static pages 21/21`; no NEXT_REDIRECT errors |
| X08 | All API routes responsive < 500 ms | Light load | Hit each route from DevTools | 200 responses under 500 ms (Neon HTTP) |
| X09 | Drizzle schema synced | After pull | `npx drizzle-kit push` | "No changes detected" |

---

## 6. Test execution checklist (recommend order)

1. **Smoke** (10 min) — G12 → G16 → S01 → S04 → A22 → A01 sign in/out cycle for all roles.
2. **Learner happy path** (30 min) — S05 → S42 as student. Covers paywall + every lesson type + certificate.
3. **Authoring** (45 min) — L06 → L23 as librarian.
4. **Admin-only** (30 min) — A01 → A28 as admin.
5. **Negative + RBAC** (20 min) — S45-S47, L04-L05, A24-A28.
6. **Cross-cutting** (15 min) — X01-X09.

**Total**: ~2.5 hours for a full pass.
