# Phase 3 demo content — "HTML Foundations"

A single chapter with one of each lesson type, ready to seed into the LMS for the Phase 3 demo. Run `npm run seed:phase3-demo` to drop it into the DB; everything in this doc covers the *content* you'll need to actually record or generate (video file, finished PDF) and how to swap the placeholder URLs for yours.

The text content for the exercise and quiz lessons is fully written here and is also baked into the seed script — those land in the DB ready to use. The video script and PDF source are not auto-uploadable, so you produce those, host them, and update the URLs in the script.

---

## Course metadata

| Field | Value |
|---|---|
| `title` | HTML Foundations |
| `desc` | Learn the structure of an HTML document and build your first web page from scratch. |
| `level` | beginner |
| `unlockCost` | 0 (free) |
| `editorType` | static |
| `tags` | html, web, beginner |
| `bannerImage` | placeholder — pick any 1400×400 image from Unsplash (search "code", "html", "web") and upload via the admin course-create form, OR replace the URL constant in the seed script |

## Chapter

| Field | Value |
|---|---|
| `name` | Your First HTML Page |
| `desc` | What HTML is, what every page has in common, and how to write a working one. |

## Lessons in order

| # | Type | Title | XP |
|---|---|---|---|
| 1 | video | What is HTML? | 10 |
| 2 | pdf | HTML Quick Reference | 10 |
| 3 | exercise | Build the Web Skeleton | 20 |
| 4 | quiz | HTML Quick Check | 15 |

**Total: 55 XP. Completing all four triggers the certificate download (feat47).**

---

## Lesson 1 — Video: "What is HTML?"

### What you need to do
Record a ~2-minute Loom screen + narration video. Once uploaded, take the public Loom URL and either:
- Paste it into the admin lesson-edit form for this lesson (it's a `video` lesson, so it accepts a Loom URL as a "native" provider URL — Loom serves an embed-friendly URL), OR
- Replace the `VIDEO_URL_PLACEHOLDER` constant in `scripts/seed-phase3-demo.ts` before running the seed.

> **Loom note**: Loom's share URL works as a native video URL once the video is public. Switch the provider field to `native` in the seed payload if you go that route. If you'd rather use YouTube, set provider to `youtube` and paste your YouTube share link.

### Script (~2 min)

The voiceover script below times the on-screen actions. Numbers are approximate elapsed seconds.

**[0:00–0:15] Cold open with an empty VS Code window**

> Hey, welcome to your first HTML lesson. I'm going to show you what HTML actually is — it's just a way of telling the browser what each part of your page is. By the end of this lesson you'll be writing your first HTML page from scratch.

**[0:15–0:35] Start typing — explain DOCTYPE**

Type into the editor as you talk:
```html
<!DOCTYPE html>
```

> Every HTML file starts the same way. This DOCTYPE line tells the browser "this is HTML 5" so it knows what rules to use. You don't really need to think about it — just always have it at the top.

**[0:35–0:55] Wrap with `<html>`, explain head vs body**

Add:
```html
<!DOCTYPE html>
<html>
  <head>
  </head>
  <body>
  </body>
</html>
```

> Then we wrap everything in an `html` tag. Inside it, two parts. The `head` is for *metadata* — stuff the browser uses but the user never sees. The `body` is what people actually see on the page.

**[0:55–1:25] Add a title and an h1**

```html
<head>
  <title>My First Page</title>
</head>
<body>
  <h1>Hello, world!</h1>
</body>
```

> Let's add two more tags. `title` goes inside the head — that's the text that shows on the browser tab. And in the body let's put a heading. `h1` is the biggest heading — it's how you label the most important thing on the page.

**[1:25–1:45] Save and demo in browser**

Save as `index.html`. Open it in the browser.

> Save it as `index.html`, open it in a browser, and… there we go. See the tab — that's coming from `<title>`. And the big heading on the page — that's `<h1>`.

**[1:45–2:00] Wrap-up**

> That's all HTML is. Nested tags that describe what each piece of your page is. In the next lessons we'll go through the cheatsheet, then you'll write one yourself from scratch. See you there.

### On-screen things to keep in frame
- The editor (VS Code or anything visible)
- The browser window during the save-and-reload moment — show the tab title and the rendered `<h1>`

### Things to NOT do
- Don't introduce CSS yet — this course is HTML-only
- Don't use a fancy live-server with auto-reload; the manual save-and-refresh moment is the point

---

## Lesson 2 — PDF: "HTML Quick Reference"

### What you need to do
Copy the markdown source below into a converter (Google Docs paste-from-markdown → Save as PDF, Pandoc, or `npx md-to-pdf` if you have Node), upload the finished `.pdf` to Cloudinary via the admin lesson form (which handles the upload), and the URL gets set automatically.

Alternative: skip the upload UI by replacing `PDF_URL_PLACEHOLDER` in the seed script with a public PDF URL.

### Source markdown

````markdown
# HTML Quick Reference

## Document structure

Every HTML file starts the same way:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Page title</title>
  </head>
  <body>
    <!-- visible content goes here -->
  </body>
</html>
```

- **DOCTYPE** — tells the browser to use HTML 5 rules.
- **`<html>`** — wraps everything. `lang` helps screen readers and search engines.
- **`<head>`** — metadata that isn't rendered: title, encoding, stylesheet links.
- **`<body>`** — content the user actually sees.

---

## Headings and text

```html
<h1>Biggest heading</h1>
<h2>Section heading</h2>
<h3>Subsection</h3>
<p>A paragraph of body text.</p>
<strong>Important (bold)</strong>
<em>Emphasised (italic)</em>
<br>  <!-- line break -->
```

Use heading levels in order (`h1` → `h2` → `h3`) to keep your page outline meaningful.

---

## Links and images

```html
<a href="https://example.com">External link</a>
<a href="page2.html">Internal link</a>
<img src="photo.jpg" alt="Description for screen readers">
```

Always provide `alt` text on images.

---

## Lists

```html
<ul>          <!-- unordered: bullets -->
  <li>One</li>
  <li>Two</li>
</ul>

<ol>          <!-- ordered: numbered -->
  <li>First</li>
  <li>Second</li>
</ol>
```

---

## Common attributes

| Attribute | Used on | What it does |
|---|---|---|
| `id` | any element | unique identifier (one per page) |
| `class` | any element | reusable label for styling |
| `href` | `<a>` | link destination |
| `src` | `<img>`, `<script>` | source URL |
| `alt` | `<img>` | accessible description |
| `lang` | `<html>` | document language |

---

## What's next

Practice writing the document skeleton from memory. Most pages you'll ever build start with that exact same DOCTYPE + html + head + body. Once that's automatic, everything else is just nesting tags.
````

---

## Lesson 3 — Exercise: "Build the Web Skeleton"

Fully populated by the seed script — no recording or external work needed. Listed here so you know what students see.

### Content (rendered HTML — the prompt shown to the learner)
> You've watched how HTML pages are structured and you've got the cheatsheet. Now it's your turn. Write a complete HTML page that introduces yourself.
> The page needs to have:
> 1. The DOCTYPE declaration at the top
> 2. An `<html>` element wrapping everything
> 3. A `<head>` containing a `<title>` of **My First Page**
> 4. A `<body>` containing an `<h1>` with the text **Hello, world!**

### Task (rendered HTML)
> Edit the starter code on the right so the rendered page has the title **My First Page** and an `<h1>` heading reading **Hello, world!**. Click **Run Code** to preview, then **Mark Completed!** when it matches.

### Hint (rendered HTML, costs 5 XP to reveal)
> The structure goes:
> ```html
> <head><title>...</title></head>
> <body><h1>...</h1></body>
> ```
> The title text must read exactly "My First Page" and the heading text must read exactly "Hello, world!". Watch capitalisation and punctuation — the validator is case-sensitive on the comma.

### Validation
- **Regex** (case-insensitive on tags only): `(?i)<title>\s*My First Page\s*</title>[\s\S]*<h1>\s*Hello, world!\s*</h1>`
- **Expected output**: *(unset — regex alone gates this lesson)*

### Starter code (`/index.html`)
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title></title>
  </head>
  <body>
  </body>
</html>
```

### Difficulty
`easy`

---

## Lesson 4 — Quiz: "HTML Quick Check"

Fully populated by the seed script.

### Question (rendered HTML)
> Which element holds information that the user does NOT see on the page (like the title that appears on the browser tab and the character encoding)?

### Options
| Letter | Option |
|---|---|
| A | `<body>` |
| B | `<head>` ← correct |
| C | `<meta>` |
| D | `<html>` |

### `correctIndex`
`1`

### Explanation shown after answering
> The `<head>` element holds metadata — the title that shows on the browser tab, the character encoding, links to stylesheets and scripts. Visible content goes in `<body>`. `<meta>` lives *inside* `<head>` and describes one specific piece of metadata; `<html>` wraps everything.

---

## How to ship this content

1. `npm run seed:phase3-demo` — creates the course, chapter, exercise lesson, and quiz lesson immediately. The video and PDF lessons are also created but with placeholder URLs.
2. Record your Loom video → grab the public share URL → edit lesson 1 in the admin UI and paste it in. (Or replace the constant in the seed script and re-run; the script is idempotent.)
3. Generate the PDF from the markdown above → upload via the admin lesson-edit form (which routes through Cloudinary).
4. Pick a course banner image from Unsplash → upload via the admin course-edit form (the demo seeds a placeholder).
5. Done. Open `/courses/<the new courseId>` as a student to walk the full flow end to end.

**Tip**: After completing all four lessons as a student, the certificate button appears in the course-detail sidebar. Use this for the demo wrap.
