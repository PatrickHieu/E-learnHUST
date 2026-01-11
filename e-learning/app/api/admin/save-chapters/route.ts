import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/db";
import { CourseChapterTable } from "@/config/schema";


const DATA = 
[
  {
    "id": 1,
    "name": "Introduction to HTML",
    "desc": "Discover the foundation of every webpage and learn how HTML shapes the digital world.",
    "excercises": [
      {"name": "Explore the Web Skeleton", "slug": "explore-the-web-skeleton", "xp": 20, "difficulty": "easy"},
      {"name": "Build Your Base Camp", "slug": "build-your-base-camp", "xp": 25, "difficulty": "easy"},
      {"name": "Name Your World", "slug": "name-your-world", "xp": 15, "difficulty": "easy"},
      {"name": "Break & Repair", "slug": "break-and-repair", "xp": 20, "difficulty": "easy"},
      {"name": "HTML Detective", "slug": "html-detective", "xp": 20, "difficulty": "easy"},
      {"name": "Element Collector", "slug": "element-collector", "xp": 25, "difficulty": "easy"}
    ]
  },
  {
    "id": 2,
    "name": "HTML Boilerplate",
    "desc": "Understand the core structure that every HTML document begins with.",
    "excercises": [
      {"name": "Build the Core Structure", "slug": "build-the-core-structure", "xp": 35, "difficulty": "medium"},
      {"name": "Fix the Broken Blueprint", "slug": "fix-the-broken-blueprint", "xp": 30, "difficulty": "easy"},
      {"name": "Boost Meta Power", "slug": "boost-meta-power", "xp": 20, "difficulty": "easy"},
      {"name": "Add Language Identity", "slug": "add-language-identity", "xp": 10, "difficulty": "easy"},
      {"name": "Viewport Setup", "slug": "viewport-setup", "xp": 20, "difficulty": "easy"},
      {"name": "Author Credit", "slug": "author-credit", "xp": 15, "difficulty": "easy"}
    ]
  },
  {
    "id": 3,
    "name": "Head & Body Tags",
    "desc": "Learn the difference between behind-the-scenes metadata and visible page content.",
    "excercises": [
      {"name": "Mind vs Body", "slug": "mind-vs-body", "xp": 20, "difficulty": "easy"},
      {"name": "Activate Styles", "slug": "activate-styles", "xp": 30, "difficulty": "medium"},
      {"name": "Display Your Content", "slug": "display-your-content", "xp": 15, "difficulty": "easy"},
      {"name": "Add External Script", "slug": "add-external-script", "xp": 20, "difficulty": "easy"},
      {"name": "Meta Collection", "slug": "meta-collection", "xp": 25, "difficulty": "easy"},
      {"name": "Body Structure Challenge", "slug": "body-structure-challenge", "xp": 25, "difficulty": "easy"}
    ]
  },
  {
    "id": 4,
    "name": "Text Formatting",
    "desc": "Format your content with headings, paragraphs, bold, italic, and more.",
    "excercises": [
      {"name": "Create the Text Realm", "slug": "create-the-text-realm", "xp": 30, "difficulty": "easy"},
      {"name": "Power Words", "slug": "power-words", "xp": 20, "difficulty": "easy"},
      {"name": "Build a Story Block", "slug": "build-a-story-block", "xp": 30, "difficulty": "medium"},
      {"name": "Line Break Mastery", "slug": "line-break-mastery", "xp": 15, "difficulty": "easy"},
      {"name": "Quote Chamber", "slug": "quote-chamber", "xp": 25, "difficulty": "easy"},
      {"name": "Code Snippet Display", "slug": "code-snippet-display", "xp": 30, "difficulty": "medium"}
    ]
  },
  {
    "id": 5,
    "name": "Links & Navigation",
    "desc": "Create portals between pages and build simple navigation.",
    "excercises": [
      {"name": "Create a Warp Gate", "slug": "create-a-warp-gate", "xp": 20, "difficulty": "easy"},
      {"name": "Open a New Dimension", "slug": "open-a-new-dimension", "xp": 25, "difficulty": "easy"},
      {"name": "Navigation Builder", "slug": "navigation-builder", "xp": 40, "difficulty": "medium"},
      {"name": "Anchor Teleport", "slug": "anchor-teleport", "xp": 20, "difficulty": "easy"},
      {"name": "Email Portal", "slug": "email-portal", "xp": 20, "difficulty": "easy"},
      {"name": "Button Link Trick", "slug": "button-link-trick", "xp": 25, "difficulty": "medium"}
    ]
  },
  {
    "id": 6,
    "name": "Images",
    "desc": "Display images, control sizing, and optimize accessibility.",
    "excercises": [
      {"name": "Summon an Image", "slug": "summon-an-image", "xp": 20, "difficulty": "easy"},
      {"name": "Vision for All", "slug": "vision-for-all", "xp": 15, "difficulty": "easy"},
      {"name": "Image Grid Challenge", "slug": "image-grid-challenge", "xp": 35, "difficulty": "medium"},
      {"name": "Resize Hero", "slug": "resize-hero", "xp": 20, "difficulty": "easy"},
      {"name": "Caption Creator", "slug": "caption-creator", "xp": 25, "difficulty": "medium"},
      {"name": "Broken Image Test", "slug": "broken-image-test", "xp": 15, "difficulty": "easy"}
    ]
  },
  {
    "id": 7,
    "name": "Lists",
    "desc": "Structure grouped information using ordered, unordered, and description lists.",
    "excercises": [
      {"name": "Bullet Creator", "slug": "bullet-creator", "xp": 20, "difficulty": "easy"},
      {"name": "Number Builder", "slug": "number-builder", "xp": 20, "difficulty": "easy"},
      {"name": "Nested List Challenge", "slug": "nested-list-challenge", "xp": 35, "difficulty": "medium"},
      {"name": "Description Vault", "slug": "description-vault", "xp": 25, "difficulty": "easy"},
      {"name": "Task Checklist", "slug": "task-checklist", "xp": 20, "difficulty": "easy"},
      {"name": "Navigation with Lists", "slug": "navigation-with-lists", "xp": 35, "difficulty": "medium"}
    ]
  },
  {
    "id": 8,
    "name": "Tables",
    "desc": "Represent information in structured grid format.",
    "excercises": [
      {"name": "Table Blueprint", "slug": "table-blueprint", "xp": 30, "difficulty": "medium"},
      {"name": "Add Column Headers", "slug": "add-column-headers", "xp": 20, "difficulty": "easy"},
      {"name": "Merge the Cells", "slug": "merge-the-cells", "xp": 35, "difficulty": "medium"},
      {"name": "Student Report Table", "slug": "student-report-table", "xp": 25, "difficulty": "easy"},
      {"name": "Border Styling", "slug": "border-styling", "xp": 20, "difficulty": "easy"},
      {"name": "Header Footer Rows", "slug": "header-footer-rows", "xp": 30, "difficulty": "medium"}
    ]
  },
  {
    "id": 9,
    "name": "Forms Basics",
    "desc": "Collect user input using form controls like input, labels, and buttons.",
    "excercises": [
      {"name": "Create a Login Portal", "slug": "create-a-login-portal", "xp": 40, "difficulty": "medium"},
      {"name": "Design a Contact Form", "slug": "design-a-contact-form", "xp": 45, "difficulty": "medium"},
      {"name": "Placeholder Magic", "slug": "placeholder-magic", "xp": 15, "difficulty": "easy"},
      {"name": "Label Linker", "slug": "label-linker", "xp": 20, "difficulty": "easy"},
      {"name": "Choose Wisely", "slug": "choose-wisely", "xp": 25, "difficulty": "easy"},
      {"name": "Dropdown Selector", "slug": "dropdown-selector", "xp": 30, "difficulty": "medium"}
    ]
  },
  {
    "id": 10,
    "name": "Semantic HTML",
    "desc": "Use meaningful HTML elements to improve page structure and accessibility.",
    "excercises": [
      {"name": "Build the Layout", "slug": "build-the-layout", "xp": 35, "difficulty": "medium"},
      {"name": "Blog Structure", "slug": "blog-structure", "xp": 40, "difficulty": "medium"},
      {"name": "Sidebar Creator", "slug": "sidebar-creator", "xp": 25, "difficulty": "easy"},
      {"name": "Navigation Map", "slug": "navigation-map", "xp": 35, "difficulty": "medium"},
      {"name": "Figure & Caption", "slug": "figure-and-caption", "xp": 25, "difficulty": "easy"},
      {"name": "Semantic Rebuild", "slug": "semantic-rebuild", "xp": 40, "difficulty": "medium"}
    ]
  },
  {
    "id": 11,
    "name": "Audio & Video",
    "desc": "Add multimedia components for richer experiences.",
    "excercises": [
      {"name": "Play the Sound", "slug": "play-the-sound", "xp": 25, "difficulty": "easy"},
      {"name": "Video Portal", "slug": "video-portal", "xp": 30, "difficulty": "medium"},
      {"name": "Autoplay Test", "slug": "autoplay-test", "xp": 20, "difficulty": "easy"},
      {"name": "Add Subtitles", "slug": "add-subtitles", "xp": 40, "difficulty": "medium"},
      {"name": "Audio Playlist", "slug": "audio-playlist", "xp": 20, "difficulty": "easy"},
      {"name": "Thumbnail Setup", "slug": "thumbnail-setup", "xp": 25, "difficulty": "easy"}
    ]
  },
  {
    "id": 12,
    "name": "HTML Best Practices",
    "desc": "Write clear, clean, and accessible HTML optimized for real-world use.",
    "excercises": [
      {"name": "Code Cleanup", "slug": "code-cleanup", "xp": 20, "difficulty": "easy"},
      {"name": "Accessibility Upgrade", "slug": "accessibility-upgrade", "xp": 35, "difficulty": "medium"},
      {"name": "Alt Text Review", "slug": "alt-text-review", "xp": 20, "difficulty": "easy"},
      {"name": "Heading Order Fix", "slug": "heading-order-fix", "xp": 25, "difficulty": "easy"},
      {"name": "Link Check", "slug": "link-check", "xp": 20, "difficulty": "easy"},
      {"name": "Semantic Improvement", "slug": "semantic-improvement", "xp": 40, "difficulty": "medium"}
    ]
  }
]


export async function GET(req: NextRequest) {
    DATA.forEach(async (item) => {
        await db.insert(CourseChapterTable).values({
            courseId: 2,
            desc: item?.desc,
            excercises: item.excercises,
            name: item?.name,
            chapterId: item?.id
        })
    })
    return NextResponse.json('Success')
}
