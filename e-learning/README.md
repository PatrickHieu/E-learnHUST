# ByteCraft · E-learnHUST

Nền tảng học lập trình tương tác (Next.js 16 + React 19) cho sinh viên HUST.
Hỗ trợ HTML/CSS/JS (Sandpack), Python (Pyodide trong trình duyệt) và C/C++
(Judge0 sandbox cloud). Bài tập chấm bằng bộ test stdin/stdout — phải pass
hết mới được full XP.

## Yêu cầu

- Node.js ≥ 20
- npm (đi kèm Node)
- Tài khoản Neon (Postgres miễn phí) — https://console.neon.tech
- (Tùy chọn) Tài khoản RapidAPI để dùng Judge0 chấm C/C++/Python

## Cài đặt

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file .env từ template
cp .env.example .env

# 3. Mở .env và điền tối thiểu:
#    - DATABASE_URL  (từ Neon dashboard)
#    - AUTH_SECRET   (sinh bằng: openssl rand -base64 32)
#    - JUDGE0_RAPIDAPI_KEY  (nếu muốn chấm test case C/C++/Python)

# 4. Đẩy schema lên DB (tạo bảng + unique constraint)
npx drizzle-kit push
```

## Chạy

```bash
# Dev server (hot reload, port 3000)
npm run dev

# Build production
npm run build

# Chạy bản build
npm start
```

Mở http://localhost:3000

## Khởi tạo dữ liệu

```bash
# Tài khoản admin đầu tiên (đọc ADMIN_EMAIL/PASSWORD/NAME từ .env)
npm run bootstrap:admin

# 3 tài khoản test cho từng role (admin / instructor / student)
# password chung: Password1!
npm run bootstrap:test-accounts

# 3 khóa demo: Web Foundations, Python Quickstart, C++ Foundations
npm run seed:language-demos

# Chapter "Test-case exercises" cho Python + C++ (4 bài/khóa, mỗi bài 4 testcases)
npm run seed:testcase-exercises

# Convert các bài cũ (regex/expectedOutput) sang dùng test case
npm run migrate:legacy-to-testcases
```

Các script khác (chạy khi cần dữ liệu báo cáo / biểu đồ):

```bash
npm run seed:demo            # khóa học mẫu HTML/CSS/JS đầu tiên
npm run seed:phase3-demo     # nội dung Phase 3 (video + checkpoint quiz)
npm run seed:fake-users      # ~50 user giả để vẽ leaderboard
npm run seed:fake-payments   # giao dịch stars + VND giả cho admin chart
```

## Test

```bash
npm test          # chạy một lần
npm run test:watch
```

## Cấu trúc thư mục

```
app/                Next.js App Router (routes + API)
  (admin)/admin    Trang quản trị (admin + instructor)
  (auth)/sign-in   Trang đăng nhập
  (routes)/...     Trang dành cho học viên
  api/...          API routes
components/         shadcn/ui components
config/             Drizzle ORM (db.tsx, schema.tsx)
context/            React Context providers
hooks/              React hooks dùng chung
lib/                Helper logic (chấm bài, course access, v.v.)
public/             Asset tĩnh + Python worker (Pyodide)
scripts/            Seed / bootstrap / migration scripts
types/              Type declaration toàn cục
```

## Tech stack

| Lớp | Công nghệ |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Auth | Auth.js v5 (Credentials + Google OAuth, JWT) |
| Database | Neon Postgres + Drizzle ORM |
| UI | Tailwind CSS 4, shadcn/ui (Radix primitives) |
| Code runtime | Sandpack (web), Pyodide WASM (Python), Judge0 cloud (C/C++/Python) |
| Charts | Recharts |
| Certificate | jsPDF + DejaVu Sans (hỗ trợ tiếng Việt) |

## Cơ chế chấm bài

- **C / C++ / Python**: server chạy mỗi test case qua Judge0 sandbox (CPU
  5s / wall 8s / memory 256MB), so output đã chuẩn hoá whitespace. Phải
  pass HẾT mới được cộng XP. Test case `hidden` ẩn input/expected khỏi
  payload trả về client.
- **HTML/CSS/JS Sandpack**: dùng regex / substring trên source (legacy,
  ghi rõ trong báo cáo là "kiểm tra mẫu", không phải chấm thuật toán).

Source: `lib/code-grading.ts` + `app/api/lesson/complete/route.ts`.

## Deploy

Project tương thích Vercel. Trên dashboard Vercel:

1. Import repo
2. Project Settings → Environment Variables: copy toàn bộ `.env`
3. Deploy

Sau lần deploy đầu, chạy `npx drizzle-kit push` từ máy local (trỏ
`DATABASE_URL` về Neon production) để tạo bảng. Sau đó chạy
`npm run bootstrap:admin` để có tài khoản đăng nhập.
