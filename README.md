# Code Block / E-learnHUST

A multi-modal Learning Management System built with Next.js 16, React 19, Clerk, Neon Postgres, and Drizzle. Students enrol in courses, work through video / PDF / coding lessons, and earn XP that powers a leaderboard and unlocks paid courses. Admins (and the optional Librarian role) manage content end-to-end.

The Next.js app lives in [`e-learning/`](./e-learning).

---

## Quick links

- [Testing guide](./e-learning/TESTING.md) — roles, accounts, QA checklist
- `.env` template — [`e-learning/.env.example`](./e-learning/.env.example)

---

## Local development

```bash
cd e-learning
cp .env.example .env       # then fill in values — see "Environment variables" below
npm install
npx drizzle-kit push       # provisions tables in your Neon DB
npm run dev                # http://localhost:3000
```

### Useful scripts (in `e-learning/`)

```bash
npm test            # one-shot Vitest run (CI mode)
npm run test:watch  # watch mode while developing
npm run seed:demo   # one-off insert of a demo course with video + PDF + exercise
```

---

## Environment variables

| Name | Required | Used for | Where to get it |
|---|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres connection | [Neon dashboard](https://console.neon.tech) → Connection details → pooled string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk client SDK | [Clerk dashboard](https://dashboard.clerk.com) → API Keys |
| `CLERK_SECRET_KEY` | Yes | Clerk server SDK + middleware | Clerk dashboard → API Keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Optional | Override sign-in route | Defaults to `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Optional | Override sign-up route | Defaults to `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Optional | Where users land after sign-in | Defaults to `/dashboard` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Optional | Where users land after sign-up | Defaults to `/dashboard` |

> Cloudinary upload settings (`cloud_name`, `upload_preset`) are currently hard-coded in [`e-learning/lib/cloudinary.ts`](./e-learning/lib/cloudinary.ts). They're used for unsigned client-side uploads so they're public anyway. Swap them out there if you fork.

---

## Database setup (Neon)

1. Sign up at [neon.tech](https://neon.tech) → create a project.
2. Copy the pooled connection string (it ends with `?sslmode=require`).
3. Paste it into `e-learning/.env` as `DATABASE_URL`.
4. Run `npx drizzle-kit push` from `e-learning/`. Confirm any prompted renames as **rename**, not create.
5. (Optional) `npm run seed:demo` to populate a demo course.

The schema lives in [`e-learning/config/schema.tsx`](./e-learning/config/schema.tsx). Changes are applied via `drizzle-kit push` — there's no versioned migrations folder.

---

## Authentication setup (Clerk)

1. Sign up at [clerk.com](https://clerk.com) → create a new application.
2. Enable Email/Password and optionally Google sign-in.
3. Copy the **Publishable key** and **Secret key** from the API Keys page → paste into `.env`.
4. The middleware in [`e-learning/proxy.ts`](./e-learning/proxy.ts) routes `/admin/users` to admin-only and `/admin/*` to admin-or-librarian.
5. Set the first admin manually: Clerk dashboard → Users → your user → Metadata → Public → add:
   ```json
   { "role": "admin" }
   ```
6. After that, admins can promote others to Librarian via `/admin/users` in the app.

Full role walkthrough lives in [TESTING.md § 2](./e-learning/TESTING.md#2-creating-test-accounts).

---

## Deploying to Vercel

This is the **internal-demo deployment recipe**. Suitable for showing the project to reviewers; not hardened for public traffic.

### One-time setup

1. Push the repo to GitHub if you haven't already.
2. Go to [vercel.com](https://vercel.com) → **Add New… → Project** → import your GitHub repo.
3. On the configuration screen:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `e-learning` ← *important* — the Next.js app lives in this subdirectory, not the repo root.
   - Build / Output / Install commands: leave default
4. **Environment Variables**: paste in everything from your local `.env`. At minimum: `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. Set them for **Production** and **Preview** environments.
5. **Deploy.**

### After first deploy

- Vercel gives you a `your-project.vercel.app` URL. Visit it.
- Back in Clerk dashboard → **Domains** → add the Vercel URL so Clerk's redirect flow works.
- Subsequent pushes to `main` auto-deploy to production. PRs get preview deployments.

### Preview deployments

Every PR opened against `main` gets its own preview URL — useful for QA before merge. The CI workflow in [`.github/workflows/test.yml`](./.github/workflows/test.yml) blocks merge on test failures.

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| Build fails on `next build` step | Missing env var. Check Vercel project settings → Environment Variables for `Production`. |
| 500 on every page load | `DATABASE_URL` wrong or Neon project paused (Neon scales to zero on free tier). |
| Clerk widgets render blank | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` not set or the Vercel domain isn't whitelisted in Clerk. |
| Cloudinary uploads 4xx | Upload preset isn't unsigned, or it's image-only and you're uploading a PDF. See `lib/cloudinary.ts`. |

---

## Continuous integration

`.github/workflows/test.yml` runs `npm test` on every PR to `main` and every push to `main`. To make it a required check:

> GitHub → repo Settings → Branches → Add rule for `main` → tick **Require status checks to pass before merging** → search for "Lint + unit tests" → save.

---

## Project structure

```
.
├── README.md                  (this file)
├── .github/workflows/test.yml (CI: lint + unit tests)
└── e-learning/                Next.js app — everything below is rooted here
    ├── app/                   App Router routes
    │   ├── (admin)/admin/     Admin + Librarian content management
    │   ├── (auth)/            Sign-in / sign-up (Clerk Elements)
    │   ├── (routes)/          Public + student routes
    │   └── api/               Route handlers
    ├── components/ui/         shadcn primitives
    ├── config/
    │   ├── db.tsx             Drizzle client
    │   └── schema.tsx         All tables + types
    ├── context/               React contexts (UserDetailContext)
    ├── lib/                   Pure utilities
    │   ├── cloudinary.ts      Unsigned client-side upload
    │   ├── lesson-validation.ts  Regex/output gate (used by client + API)
    │   └── sanitize.ts        DOMPurify wrapper for rendered lesson HTML
    ├── scripts/               One-off Node scripts (npm run seed:demo, etc.)
    ├── TESTING.md             Roles + QA checklist
    └── vitest.config.ts       Unit test config
```

---

## Phase history

| Phase | Range | Theme |
|---|---|---|
| Phase 1 | feat01–feat16 | Initial build: pixel-themed student UI, basic admin CRUD, Sandpack playground |
| Phase 2 | feat17–feat41 | Security pass, multi-modal lessons, RBAC w/ Librarian, professional admin UI, unit tests + QA guide |
| Phase 3 | feat42–feat48 | CI/CD, Vercel deployment, dead-link cleanup, course search, quizzes, certificates, mobile playground |

See individual PR descriptions in GitHub for what each branch did.

---

## Phase 3 handoff

Done as of feat48. The project is a usable internal demo:

### What you can do today
- Sign in, enroll in a course, work through video / PDF / coding / quiz lessons
- Earn XP and stars; spend stars to unlock paid courses; appear on the leaderboard
- Complete every lesson in a course → download a PDF completion certificate
- As an admin: create / edit / delete courses, chapters, and lessons of all four types via shadcn admin UI
- As an admin: promote any user to Librarian for content-only access
- As a librarian: same content tools, no user management
- All of the above on a phone — the playground stacks vertically below 768px

### Live demo

| | |
|---|---|
| URL | `https://<your-vercel-project>.vercel.app` (paste yours here after deploy) |
| Demo accounts setup | See [TESTING.md § 2](./e-learning/TESTING.md#2-creating-test-accounts) — must be created via Clerk dashboard, no scripted bootstrap |
| QA checklist | [TESTING.md § 5](./e-learning/TESTING.md#5-manual-qa-checklist) — 14 areas, ~70 boxes, ties each back to the feat# that introduced the behaviour |

### What's intentionally NOT in this demo

Cut from the original 4-week roadmap because we compressed to 2 weeks:

| | Reason |
|---|---|
| Sentry / error monitoring | Internal demo; server logs are enough |
| SEO metadata / Open Graph / sitemap | No public traffic to optimize for |
| Real daily-streak + badges system | Engagement features for Phase 4 if this ever ships publicly |
| Email notifications | No SMTP wired up |
| i18n unification | Mixed Vietnamese / English strings stay |
| Performance / SSR audit | Defer until traffic data exists |
| Certificate issuance audit log | Certs are generated client-side; not recorded in DB |
| Multi-file Sandpack starter code editing | Admin form supports single file only — Phase 4 |
| Replace the hardcoded Cloudinary cloud-name / preset with env vars | They're public-side (unsigned upload) anyway |

### Known minor TODOs left intentionally

These came up during Phase 3 but weren't worth their own branch:

- `afterSignOutUrl` prop on `UserButton` is Clerk-deprecated (the warning appears in the IDE on the admin layout). Replace with the v6 equivalent when convenient.
- Pre-existing Tailwind canonical-class hints (`h-[100px]` → `h-25`) on a few legacy skeletons — purely cosmetic IDE warnings.
- A few `console.log` statements remain in fetch handlers — fine for the demo, strip before any real launch.

### If a future maintainer picks this up

Start with [TESTING.md § 1](./e-learning/TESTING.md#1-roles--permissions) and the Phase 2/3 PR descriptions on GitHub. The phase tables above tell you which `feat<N>` branch introduced what, so you can `git log feat<N>` to see the design rationale in commit messages.
