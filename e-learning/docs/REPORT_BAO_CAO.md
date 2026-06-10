# Báo cáo dự án: Code Block · E-learnHUST

> Tài liệu hỗ trợ báo cáo miệng — mô tả các tính năng chính, vị trí code, cách hoạt động.

---

## 1. Tổng quan

**Code Block / E-learnHUST** là nền tảng học lập trình theo phong cách gamified (Mario-pixel theme) dành cho học sinh / sinh viên Việt Nam. Đặc trưng chính:

- **Học đa phương tiện**: mỗi bài học có thể là Video / PDF / Bài tập code (Sandpack) / Câu hỏi trắc nghiệm.
- **Quest chương (chapter gating)**: chương sau bị khoá cho tới khi học sinh hoàn thành các bài gating của chương trước.
- **Quiz lồng trong video** (in-video checkpoints): video tự tạm dừng tại các mốc thời gian, người học phải trả lời đúng mới được tiếp tục.
- **Hai cấp truy cập có phí**: khoá học Intermediate đổi bằng sao (XP); Advanced trả tiền (mock VND checkout).
- **Bảng điều khiển admin**: CRUD khoá học / chương / bài, biểu đồ doanh thu + chất lượng người dùng, tìm kiếm chi tiết từng học viên.
- **Chứng chỉ PDF** sinh client-side, hỗ trợ font Việt (DejaVu Sans).

### Stack công nghệ

| Lớp | Công nghệ |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Database | Neon Postgres + Drizzle ORM |
| Authentication | **Auth.js v5** (Credentials + Google OAuth, JWT session) |
| Code execution | `@codesandbox/sandpack-react` |
| File hosting | Cloudinary (banner ảnh, fallback PDF) + Google Drive (PDF chính) |
| Chart | Recharts |
| PDF | jsPDF + DejaVu Sans (font Việt) |
| Deploy | Vercel |
| Styling | Tailwind CSS v4 |

---

## 2. Cấu trúc thư mục

```
e-learning/
├── app/
│   ├── (auth)/sign-in /(auth)/sign-up        — Trang đăng nhập / đăng ký
│   ├── (admin)/admin/                        — Bảng điều khiển admin/librarian
│   ├── (routes)/courses/                     — Trang công khai cho học viên
│   ├── (routes)/dashboard/                   — Dashboard cá nhân
│   ├── (routes)/leaderboard /pricing         — Bảng xếp hạng & bảng giá
│   ├── api/                                  — Endpoint server (Next API routes)
│   ├── _components/                          — Header, UserAvatar, Provider
│   ├── layout.tsx                            — Root layout (SessionProvider)
│   └── provider.tsx                          — Theme + UserDetailContext
├── auth.ts                                   — Cấu hình Auth.js (gốc dự án)
├── proxy.ts                                  — Middleware (route guard)
├── config/
│   ├── db.ts                                 — Khởi tạo Drizzle + Neon
│   └── schema.tsx                            — Drizzle schema (tất cả bảng)
├── lib/
│   ├── checkRole.ts                          — Cổng RBAC (admin/librarian)
│   ├── chapter-gating.ts                     — Logic mở khoá chương
│   ├── course-access.ts                      — Tier khoá học, giá auto
│   ├── lesson-validation.ts                  — Validate bài tập / quiz
│   ├── sanitize.ts                           — DOMPurify cho HTML user nhập
│   └── certificate.ts                        — Sinh chứng chỉ PDF
├── scripts/
│   ├── seed-fake-users.ts                    — 30 học viên giả
│   ├── seed-fake-payments.ts                 — Lịch sử giao dịch giả
│   ├── bootstrap-admin.ts                    — Tạo admin nhanh
│   └── bootstrap-test-accounts.ts            — 3 tài khoản theo role
└── docs/
    ├── REPORT_BAO_CAO.md                     — File này
    └── TESTCASES.md                          — Bảng test case
```

---

## 3. Các tính năng chính

### 3.1 Xác thực và phân quyền (Authentication & RBAC)

#### Mô tả
Hệ thống đăng nhập tự host với hai cách:
- **Email + mật khẩu** (Credentials provider): hash mật khẩu bằng `bcryptjs` (10 rounds), so sánh ở server.
- **Google OAuth**: đăng nhập 1-click bằng Gmail.

Mỗi user có một `role` trong DB: `student` (mặc định), `librarian`, hoặc `admin`.

#### Code chính

| Vai trò | File | Tóm tắt |
|---|---|---|
| Cấu hình Auth.js | `auth.ts` | Khởi tạo NextAuth với hai providers + callbacks `signIn` / `jwt` / `session` |
| Route handler | `app/api/auth/[...nextauth]/route.ts` | Re-export `handlers.GET` / `handlers.POST` |
| Đăng ký | `app/api/auth/register/route.ts` | POST email/password/name → hash + insert vào `usersTable` |
| Middleware | `proxy.ts` | Chặn route theo session + role; cho phép `/sign-in`, `/sign-up`, `/api/auth/*` công khai |
| Kiểm tra role | `lib/checkRole.ts` | `checkRole("admin")`, `hasAdminAccess()` — đọc role từ JWT |
| Trang sign-in | `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Form Credentials + nút Google |
| Trang sign-up | `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Form tạo tài khoản, tự đăng nhập sau khi tạo |
| Avatar / Sign out | `app/_components/UserAvatar.tsx` | Dropdown trong header |

#### Luồng đăng nhập (Credentials)

```
1. User nhập email + password trên /sign-in
2. Frontend gọi signIn("credentials") của next-auth/react
3. POST /api/auth/callback/credentials
4. auth.ts → Credentials.authorize() chạy:
   - Tìm user theo email trong usersTable
   - bcrypt.compare(password, user.passwordHash)
   - Trả về { id, email, name, role }
5. jwt callback ghi id + role vào token
6. session callback đẩy id + role lên session.user
7. Cookie session ký bằng AUTH_SECRET, lưu vào browser
8. Redirect về /dashboard
```

#### Luồng đăng nhập (Google OAuth)

```
1. User click "Continue with Google"
2. signIn("google") redirect tới Google OAuth
3. Google redirect lại /api/auth/callback/google
4. signIn callback chạy:
   - Tìm user trong usersTable theo email
   - Nếu chưa có → insert row mới (role='student')
   - Ghi đè user.id thành String(usersTable.id) để match hệ thống nội bộ
5. Tiếp tục như Credentials từ bước 5
```

#### Điểm cần chú ý
- **Middleware** phải cho `/api/auth/*` qua tự do, nếu không sign-in POST sẽ bị redirect → fail im lặng.
- **`AUTH_SECRET`** môi trường phải set (32 ký tự random), không có thì NextAuth không ký được JWT.
- Trước khi dùng Google, phải tạo OAuth client trên Google Cloud Console, set `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` trên Vercel.

---

### 3.2 Quản lý khoá học (Course CRUD — admin/librarian)

#### Mô tả
Admin / librarian tạo, sửa, xoá khoá học, chương, bài học. Mỗi bài học có 4 loại nội dung: video, PDF, exercise, quiz.

#### Code chính

| Tính năng | File | Tóm tắt |
|---|---|---|
| Schema khoá học | `config/schema.tsx` | `CoursesTable`, `CourseChapterTable`, `LessonsTable` |
| Trang list | `app/(admin)/admin/courses/page.tsx` | Server component, query toàn bộ khoá học |
| Trang tạo | `app/(admin)/admin/courses/create/page.tsx` | Client form, upload banner lên Cloudinary |
| Action tạo | `app/(admin)/admin/courses/create/actions.ts` | Server action `createCourseAction()` |
| Trang sửa khoá học | `app/(admin)/admin/courses/[courseId]/edit/` | Form sửa, lưu `priceVnd`, `unlockCost`, level |
| CRUD chapter / lesson | `app/(admin)/admin/courses/[courseId]/actions.ts` | `createLessonAction`, `updateLessonAction`, … |
| Form bài học | `app/(admin)/admin/courses/[courseId]/lessons/new/LessonForm.tsx` | Form đa loại; PDF có upload + URL fallback |

#### Luồng tạo bài học PDF (ví dụ điển hình)

```
1. Admin chọn "PDF / reading material" trong form
2. Form hiển thị:
   - Trường URL chính (Google Drive recommended)
   - Mục Advanced: upload file lên Cloudinary
3. Submit → handleSubmit:
   - Nếu chọn file → uploadToCloudinary() → set pdfUrl
   - Gọi server action createLessonAction(formData)
4. Server action:
   - hasAdminAccess() check
   - buildLessonContent("pdf", formData) → validate + tạo JSON
   - db.insert(LessonsTable).values({ ..., content: { pdfUrl } })
   - revalidatePath + redirect (Next ném NEXT_REDIRECT)
5. Form client bắt NEXT_REDIRECT và re-throw để framework xử lý
6. User landing về /admin/courses/<id>
```

#### Điểm đáng chú ý
- **Form ưu tiên Google Drive URL** thay vì upload Cloudinary, vì Cloudinary free tier chặn delivery PDF theo mặc định (lỗi 401).
- Tất cả form admin dùng `try/catch` với check `isRedirectError(err)` để không nuốt mất `NEXT_REDIRECT`.

---

### 3.3 Bài học đa phương tiện (Multi-modal lessons)

#### Mô tả
Trang playground của học viên render một trong bốn loại bài học. Mỗi loại có UI riêng nhưng dùng chung một `LessonRenderer` để chia layout.

#### Code chính

| Loại bài | File | Tóm tắt |
|---|---|---|
| Routing chung | `app/(routes)/courses/[courseId]/[chapterId]/[exercise-slug]/page.tsx` | Server page fetch lesson + siblings |
| Renderer chính | `_components/LessonRenderer.tsx` | Chọn component theo `lesson.type` |
| PDF | `_components/PdfLesson.tsx` | Auto-detect Drive URL → `/preview`, còn lại dùng Google Docs viewer |
| Video (YouTube) | `_components/VideoLesson.tsx` | Wrapper, route sang Native hay YouTube tuỳ provider |
| Video native + checkpoints | `_components/NativeVideoWithCheckpoints.tsx` | HTML5 video + onTimeUpdate trigger overlay |
| Video YouTube + checkpoints | `_components/YouTubeWithCheckpoints.tsx` | IFrame Player API, polling 4 lần/giây |
| Marker checkpoint | `_components/CheckpointMarkers.tsx` | Thanh chấm vàng/xanh dưới video |
| Overlay quiz | `_components/CheckpointOverlay.tsx` | Modal quiz lồng trong video |
| Quiz | `_components/QuizLesson.tsx` | 4 đáp án, submit server-validate |
| Exercise (Sandpack) | `_components/CodeEditor.tsx` + `ContentSection.tsx` | Split layout đề bài / code editor |
| API trả bài học | `app/api/lesson/route.ts` | POST { courseId, chapterId, slug } → lesson + siblings + completion |
| API hoàn thành | `app/api/lesson/complete/route.ts` | POST { lessonId, submission? } → validate + insert + cộng XP |

#### Luồng hoàn thành bài PDF

```
1. Học viên đọc PDF → click "Mark Completed"
2. LessonRenderer.markCompleted() chạy:
   - axios.post('/api/lesson/complete', { lessonId })
3. Server route:
   - auth() check session
   - SELECT từ LessonsTable lấy XP
   - PDF auto-pass (không cần submission)
   - INSERT vào CompletedLessonTable (id, userId, courseId, chapterId, lessonId)
   - UPDATE EnrolledCourseTable.xpEarned += xp
   - UPDATE usersTable.points += xp
4. Trả về { record, xpEarned }
5. Client refresh data + show toast "Lesson complete! +X XP"
6. Sidebar đổi sang card "Lesson completed" màu xanh
```

#### Luồng quiz lồng video

```
1. Bài học video có inVideoQuizzes = [{ timestamp: 30, question, options, correctIndex, xp }, ...]
2. Video phát đến giây 30 → onTimeUpdate trigger
3. NativeVideoWithCheckpoints.handleTimeUpdate:
   - Tìm checkpoint chưa hoàn thành có timestamp ≤ currentTime
   - video.pause() + show CheckpointOverlay
4. User chọn đáp án → submit → POST /api/video-quiz/complete
5. Server validate:
   - validateQuizSubmission(checkpoint, submission)
   - INSERT CompletedVideoQuizTable
   - Nếu đã pass mọi checkpoint → INSERT CompletedLessonTable + cộng XP
6. Trả về { lessonCompleted, checkpointXp }
7. Client: nếu lessonCompleted → toast + dừng; chưa hết → video.play() tiếp
```

---

### 3.4 Khoá chương (Chapter gating)

#### Mô tả
Học viên không thể nhảy thẳng đến chương 2 nếu chưa hoàn thành quiz + exercise + video-with-checkpoints của chương 1.

#### Code chính

| File | Tóm tắt |
|---|---|
| `lib/chapter-gating.ts` | `isLessonGating(lesson)` + `isChapterUnlocked(chapters, idx, completedIds)` |
| `app/(routes)/courses/[courseId]/_components/CourseChapter.tsx` | UI khoá chương (Lock icon + tooltip) |
| `app/api/lesson/route.ts` | Server enforcement: trả 403 nếu chương khoá |

#### Logic mở khoá

```ts
function isLessonGating(lesson) {
  if (type === "quiz") return true;
  if (type === "exercise") return true;
  if (type === "video" && content.inVideoQuizzes?.length > 0) return true;
  return false; // PDF + video thường không gate
}

function isChapterUnlocked(chapters, chapterIndex, completedLessonIds) {
  if (chapterIndex === 0) return true;
  for (i = 0; i < chapterIndex; i++) {
    const gatingLessons = chapters[i].lessons.filter(isLessonGating);
    if (gatingLessons.some(l => !completedLessonIds.includes(l.id))) {
      return false;
    }
  }
  return true;
}
```

#### Bảo mật
- **Client side** (`CourseChapter`): hiển thị Lock icon, disable button.
- **Server side** (`/api/lesson`): kiểm tra lại, trả 403 nếu user gọi API trực tiếp.

---

### 3.5 Hệ thống thanh toán (Star + mock VND)

#### Mô tả
- **Beginner**: miễn phí, ai cũng học được.
- **Intermediate**: mở khoá bằng sao (XP) tích luỹ. Mặc định 50⭐ × số chương.
- **Advanced**: thanh toán VND qua "mock checkout" (giả lập VNPay / MoMo / Visa).

#### Code chính

| File | Tóm tắt |
|---|---|
| `lib/course-access.ts` | `getAccessTier(level)`, `effectiveUnlockCost`, `effectivePriceVnd`, `formatVnd` |
| `config/schema.tsx` | `CoursesTable.unlockCost`, `priceVnd`; `PaymentsTable` |
| `app/(routes)/courses/_components/CourseList.tsx` | Hiển thị Lock icon + cost badge trên thẻ khoá học |
| `app/(routes)/courses/_components/PaywallModal.tsx` | Modal mở khoá / thanh toán |
| `app/api/course/unlock/route.ts` | Trừ sao + insert enrolment + log payment |
| `app/api/course/purchase/route.ts` | Mock checkout + insert enrolment + log payment |

#### Luồng mua khoá học bằng tiền

```
1. User click thẻ khoá học Advanced trên /courses
2. PaywallModal mở: hiển thị giá (formatVnd), 3 nút payment method
3. User chọn VNPay → click "Pay 199.000₫"
4. Frontend setTimeout 800ms (giả lập processing)
5. axios.post('/api/course/purchase', { courseId, method: 'vnpay' })
6. Server:
   - auth() check
   - getAccessTier(course.level) === 'paid' check
   - Kiểm tra chưa enrolled
   - Tính lại price server-side (chống tamper)
   - INSERT EnrolledCourseTable
   - INSERT PaymentsTable (method='mock_vnpay', amountVnd=199000, status='succeeded')
7. Trả success → toast → redirect tới lesson đầu
```

#### Điểm đáng chú ý
- **Server tự tính lại giá**, không tin client gửi lên → chống thay đổi giá bằng DevTools.
- **PaymentsTable** lưu cả star-unlocks (method='stars', amountVnd=null) lẫn mock checkouts → admin chart có dữ liệu thống nhất.

---

### 3.6 Bảng điều khiển admin — Analytics

#### Mô tả
Trang `/admin/analytics` cho admin xem doanh thu + chất lượng người dùng theo cửa sổ 7/30/90 ngày.

#### Code chính

| File | Tóm tắt |
|---|---|
| `app/(admin)/admin/analytics/page.tsx` | Server component, chạy 5+ aggregation queries song song |
| `_components/RevenueChart.tsx` | AreaChart (Recharts) — doanh thu theo ngày |
| `_components/UserActivityChart.tsx` | BarChart — DAU theo ngày |
| `_components/RangePicker.tsx` | Client component, push `?range=` lên URL |

#### Truy vấn chính (server-side, Postgres)

```sql
-- Daily revenue series
SELECT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS day,
       COALESCE(SUM(amount_vnd), 0)::bigint AS revenue,
       COUNT(*)::int AS txns
FROM payments
WHERE amount_vnd IS NOT NULL
  AND status = 'succeeded'
  AND created_at >= $cutoff
GROUP BY created_at::date
ORDER BY created_at::date;

-- DAU
SELECT TO_CHAR(completed_at::date, 'YYYY-MM-DD') AS day,
       COUNT(DISTINCT user_id)::int AS dau
FROM completedLesson
WHERE completed_at >= $cutoff
GROUP BY completed_at::date;
```

#### Funnel chất lượng người dùng

```
Registered       — COUNT(*) FROM users
   ↓
Enrolled         — COUNT(DISTINCT user_id) FROM enrolledCourse
   ↓
Active (N days)  — COUNT(DISTINCT user_id) FROM completedLesson WHERE completed_at >= cutoff
   ↓
Avg lessons/active — totalCompletions / activeInRange
```

#### Điểm đáng chú ý
- **Zero-fill**: ngày không có giao dịch vẫn hiển thị trên trục x (y=0) để đường biểu đồ liền mạch.
- **Range picker** push search param thay vì client state → server re-fetch khi đổi window.

---

### 3.7 Quản lý người dùng (admin only)

#### Mô tả
Admin tìm kiếm bất kỳ user nào theo tên / email, xem chi tiết enrolment + lịch sử hoạt động + lịch sử thanh toán.

#### Code chính

| File | Tóm tắt |
|---|---|
| `app/(admin)/admin/users/page.tsx` | Server fetch toàn bộ user + truyền sang client |
| `_components/UsersList.tsx` | Search in-memory + bảng + nút View / Toggle role |
| `app/(admin)/admin/users/[userId]/page.tsx` | Trang chi tiết: 4 stat cards + 4 cards (profile, enrolments, activity, payments) |
| `RoleToggleButton.tsx` | Promote/Revoke librarian |
| `actions.ts` → `setUserRoleAction` | UPDATE usersTable.role |

#### Match userId cho activity tables

Bảng `enrolledCourse`, `completedLesson`, `payments` dùng `userId VARCHAR`. Có 2 định dạng:
- `String(users.id)` — sau migration Auth.js (mới)
- `seed_<emailLocal>` — script seed user giả

Trang chi tiết query bằng `inArray(userId, [String(user.id), seed_<emailLocal>])` để hiển thị đầy đủ cả 2 nguồn.

---

### 3.8 Chứng chỉ PDF (client-side)

#### Mô tả
Học viên hoàn thành mọi bài học của khoá → click "Download Certificate" → trình duyệt sinh PDF A4 landscape với tên + tên khoá.

#### Code chính

| File | Tóm tắt |
|---|---|
| `lib/certificate.ts` | `downloadCertificatePdf(name, course, date)` — jsPDF + DejaVu Sans |
| `app/(routes)/courses/[courseId]/_components/CertificateButton.tsx` | Nút trigger, loading state |
| `app/(routes)/courses/[courseId]/_components/CourseStatus.tsx` | Kiểm tra completion để show button |

#### Tại sao DejaVu Sans?
- jsPDF mặc định dùng Helvetica (WinANSI) → không có ký tự ễ / ế → tên Việt bị mangled.
- DejaVu Sans (Apache-like license, 1 TTF) phủ Latin + đầy đủ Latin Extended Additional → render Việt đúng.
- Lazy fetch từ jsDelivr lần đầu, cache trong memory cho cả tab session.
- Fallback về Helvetica nếu CDN fail → English vẫn xài được.

#### Luồng

```
1. Click "Download Certificate"
2. CertificateButton.handleClick()
3. lib/certificate.downloadCertificatePdf(name, courseTitle):
   - new jsPDF({orientation: landscape, format: a4})
   - loadVietnameseFonts() — fetch 2 TTF, base64 encode (chunked)
   - doc.addFileToVFS + doc.addFont
   - Vẽ border, heading, name, course title, footer
   - doc.save(`certificate-<slug>.pdf`)
4. Browser download PDF
```

---

## 4. Quy trình end-to-end (kịch bản demo)

### Kịch bản A: Học viên mới (student)

```
1. Truy cập /sign-up → tạo tài khoản → auto sign-in → /dashboard
2. Click Dashboard → xem Welcome banner + UserStatus + Explore More Courses
3. Click 1 khoá học Beginner → /courses/<id> → enroll
4. Click bài học PDF chương 1 → đọc nội dung trong Drive viewer
5. Click Mark Completed → +XP → green card hiện
6. Quay lại course → chương 2 hiện lock (chưa đủ gating của ch.1)
7. Hoàn thành quiz + video-with-checkpoints chương 1 → ch.2 unlock
8. Tiếp tục cho đến khoá hoàn thành → tải Certificate
```

### Kịch bản B: Admin

```
1. Sign in admin@codeblock.test → header có nút Admin vàng
2. /admin → xem 3 stat cards Overview
3. /admin/courses → click Create → tạo khoá học mới
4. Thêm chương → thêm 4 loại bài (video, PDF, quiz, exercise)
5. /admin/users → search "Nguyễn" → click View → xem chi tiết
6. Toggle role student → librarian
7. /admin/analytics → đổi range 7d/30d/90d → biểu đồ refresh
```

---

## 5. Quyết định thiết kế quan trọng (talking points)

| Quyết định | Lý do |
|---|---|
| **JWT session** thay vì DB sessions | Stateless, không cần bảng `sessions`, middleware không phải query DB mỗi request |
| **Server tính lại giá** trong unlock/purchase | Chống tamper: client không thể thay đổi giá bằng DevTools |
| **Drive `/preview` cho PDF** | Cloudinary free tier chặn PDF delivery; Drive luôn render được nếu sharing public |
| **DejaVu Sans cho certificate** | jsPDF default Helvetica không có ký tự Việt; DejaVu là single TTF covers Latin + Vietnamese |
| **Idempotent seed scripts** | Re-run an toàn, dễ resetting dữ liệu demo |
| **Dual-userId lookup ở admin user detail** | Tương thích với cả seed data (`seed_<email>`) và Auth.js userId (`String(users.id)`) |
| **Mock checkout** thay vì Stripe real | Demo không cần API key thật; chuyển sang real provider chỉ cần đổi route logic, không ảnh hưởng UI |
| **`<object>` + Google Docs viewer fallback** cho PDF | Cover được mọi loại URL host, kể cả khi browser không hỗ trợ embed native |
| **Suspense quanh `useSearchParams`** | Next 16 yêu cầu để prerender; không có Suspense thì `/courses` fail build |

---

## 6. Hướng phát triển tiếp theo

| Tính năng | Ghi chú |
|---|---|
| Tích hợp Stripe / VNPay thật | Hiện chỉ mock; cần webhook + Status flow `pending` → `succeeded` |
| Subscription / Pro plan | Thay thế Clerk billing đã loại bỏ; chia khoá học theo tier |
| Forum / discussion | Chưa có; có thể thêm CompletedLessonTable.discussion |
| Mobile app | React Native hoặc PWA |
| Internationalisation | Hiện UI English-only; có thể i18n hoá |
| Email transactional | Hiện chưa gửi email; cần Resend / SendGrid |
| Real-time chat / notifications | WebSocket layer chưa có |

---

## Phụ lục: Lệnh thường dùng

```bash
# Setup dev local
npm install
npx drizzle-kit push           # sync schema
npm run seed:demo              # 1 khoá học mẫu
npm run seed:fake-users        # 30 user giả
npm run seed:fake-payments     # lịch sử giao dịch
npm run bootstrap:test-accounts # 3 tài khoản role
npm run dev                    # localhost:3000

# Tạo admin nhanh
$env:ADMIN_EMAIL="email@example.com"
$env:ADMIN_PASSWORD="strongpass"
$env:ADMIN_NAME="Tên Bạn"
npm run bootstrap:admin

# Build + test
npm run build
npm test
```
