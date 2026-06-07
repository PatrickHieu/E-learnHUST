import { jsPDF } from "jspdf";

// Vietnamese-capable fonts. DejaVu Sans is permissively licensed
// (DejaVu License, derived from Bitstream Vera) and covers basic Latin
// + every Vietnamese diacritic in a single TTF, which is exactly what
// jsPDF needs — addFont only takes one TTF per (family, style) pair.
// Hosted on jsDelivr, fetched the first time a learner downloads a
// certificate, then cached for the lifetime of the tab.
const FONT_REGULAR_URL =
  "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf";
const FONT_BOLD_URL =
  "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf";

type LoadedFonts = { regular: string; bold: string };
let cachedFonts: LoadedFonts | null = null;
let loadingPromise: Promise<LoadedFonts> | null = null;

async function loadVietnameseFonts(): Promise<LoadedFonts> {
  if (cachedFonts) return cachedFonts;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const [regularBuf, boldBuf] = await Promise.all([
      fetchAsArrayBuffer(FONT_REGULAR_URL),
      fetchAsArrayBuffer(FONT_BOLD_URL),
    ]);
    cachedFonts = {
      regular: arrayBufferToBase64(regularBuf),
      bold: arrayBufferToBase64(boldBuf),
    };
    return cachedFonts;
  })();

  try {
    return await loadingPromise;
  } finally {
    // Clear the promise reference so a failed fetch can be retried on
    // the next click.
    if (!cachedFonts) loadingPromise = null;
  }
}

async function fetchAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed (${res.status}): ${url}`);
  return res.arrayBuffer();
}

// btoa() chokes on long strings if you pass the whole buffer at once,
// so chunk into 32KB slices before joining.
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize)),
    );
  }
  return btoa(binary);
}

// Landscape A4 (297 × 210mm) certificate generated entirely client-side.
// No images bundled — the layout is text + drawn rectangles so the function
// works offline and the bundle stays small.
export async function downloadCertificatePdf(
  userName: string,
  courseTitle: string,
  completedAt: Date = new Date(),
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });

  // Try to embed DejaVu Sans for proper Vietnamese rendering. If the
  // CDN is unreachable we keep going with the default Helvetica — the
  // English text is still readable and we don't block the download.
  let fontFamily: "DejaVuSans" | "helvetica" = "helvetica";
  try {
    const { regular, bold } = await loadVietnameseFonts();
    doc.addFileToVFS("DejaVuSans.ttf", regular);
    doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
    doc.addFileToVFS("DejaVuSans-Bold.ttf", bold);
    doc.addFont("DejaVuSans-Bold.ttf", "DejaVuSans", "bold");
    fontFamily = "DejaVuSans";
  } catch (err) {
    console.warn(
      "Vietnamese font load failed; falling back to Helvetica. Vietnamese diacritics may not render correctly.",
      err,
    );
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Outer decorative double border in the brand yellow.
  doc.setDrawColor(250, 204, 21); // yellow-400
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.5);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  // Top label
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(14);
  doc.setTextColor(120, 120, 120);
  doc.text("CODE BLOCK · E-LEARNHUST", pageWidth / 2, 30, { align: "center" });

  // Heading
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(40);
  doc.setTextColor(20, 20, 20);
  doc.text("Certificate of Completion", pageWidth / 2, 60, { align: "center" });

  // Sub-line
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(16);
  doc.setTextColor(80, 80, 80);
  doc.text("This certificate is proudly presented to", pageWidth / 2, 80, {
    align: "center",
  });

  // Recipient name (large)
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(36);
  doc.setTextColor(20, 20, 20);
  const name = userName?.trim() || "Anonymous Learner";
  doc.text(name, pageWidth / 2, 105, { align: "center" });

  // Underline below the name — width-bound to the rendered text
  const nameWidth = doc.getTextWidth(name);
  const underlineY = 110;
  doc.setLineWidth(0.6);
  doc.setDrawColor(180, 180, 180);
  doc.line(
    (pageWidth - Math.min(nameWidth + 20, pageWidth - 60)) / 2,
    underlineY,
    (pageWidth + Math.min(nameWidth + 20, pageWidth - 60)) / 2,
    underlineY,
  );

  // Body — bilingual line so the certificate works for both audiences
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);
  doc.text(
    "for successfully completing the course",
    pageWidth / 2,
    125,
    { align: "center" },
  );

  // Course title
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(24);
  doc.setTextColor(37, 99, 235); // blue-500
  const wrappedTitle = doc.splitTextToSize(courseTitle, pageWidth - 80);
  doc.text(wrappedTitle, pageWidth / 2, 145, { align: "center" });

  // Footer: date on the left, signature placeholder on the right.
  // Vietnamese date format (dd/MM/yyyy) with English month name in
  // brackets so both audiences can read it at a glance.
  const dd = String(completedAt.getDate()).padStart(2, "0");
  const mm = String(completedAt.getMonth() + 1).padStart(2, "0");
  const yyyy = completedAt.getFullYear();
  const formattedDate = `${dd}/${mm}/${yyyy}`;

  const footerY = pageHeight - 35;
  doc.setLineWidth(0.4);
  doc.setDrawColor(120, 120, 120);
  doc.line(40, footerY, 100, footerY);
  doc.line(pageWidth - 100, footerY, pageWidth - 40, footerY);

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text("Date Issued", 70, footerY + 6, { align: "center" });
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text(formattedDate, 70, footerY + 12, { align: "center" });

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text("Issued by", pageWidth - 70, footerY + 6, {
    align: "center",
  });
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text("Code Block · E-learnHUST", pageWidth - 70, footerY + 12, {
    align: "center",
  });

  // Filename slug: strip diacritics so the filename stays ASCII-safe.
  const slug = courseTitle
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  doc.save(`certificate-${slug || "course"}.pdf`);
}
