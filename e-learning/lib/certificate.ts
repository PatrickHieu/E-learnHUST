import { jsPDF } from "jspdf";

// Landscape A4 (297 × 210mm) certificate generated entirely client-side.
// No images bundled — the layout is text + drawn rectangles so the function
// works offline and the bundle stays small.
export function downloadCertificatePdf(
  userName: string,
  courseTitle: string,
  completedAt: Date = new Date(),
) {
  const doc = new jsPDF({ orientation: "landscape", format: "a4", unit: "mm" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Outer decorative double border in the brand yellow.
  doc.setDrawColor(250, 204, 21); // yellow-400
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.5);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  // Top label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(120, 120, 120);
  doc.text("CODE BLOCK · E-LEARNHUST", pageWidth / 2, 30, { align: "center" });

  // Heading
  doc.setFont("helvetica", "bold");
  doc.setFontSize(44);
  doc.setTextColor(20, 20, 20);
  doc.text("Certificate of Completion", pageWidth / 2, 60, { align: "center" });

  // Sub-line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor(80, 80, 80);
  doc.text("This certificate is proudly presented to", pageWidth / 2, 80, {
    align: "center",
  });

  // Recipient name (large)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
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

  // Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor(80, 80, 80);
  doc.text(
    "for successfully completing every lesson in the course",
    pageWidth / 2,
    125,
    { align: "center" },
  );

  // Course title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(37, 99, 235); // blue-500
  const wrappedTitle = doc.splitTextToSize(courseTitle, pageWidth - 80);
  doc.text(wrappedTitle, pageWidth / 2, 145, { align: "center" });

  // Footer: date on the left, signature placeholder on the right
  const formattedDate = completedAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const footerY = pageHeight - 35;
  doc.setLineWidth(0.4);
  doc.setDrawColor(120, 120, 120);
  doc.line(40, footerY, 100, footerY);
  doc.line(pageWidth - 100, footerY, pageWidth - 40, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text("Issued on", 70, footerY + 6, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text(formattedDate, 70, footerY + 12, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text("Issued by", pageWidth - 70, footerY + 6, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text("Code Block", pageWidth - 70, footerY + 12, { align: "center" });

  const slug = courseTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  doc.save(`certificate-${slug || "course"}.pdf`);
}
