import "./_env";
import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { BIOMARKERS } from "@/lib/signals-catalog";

// Generates a realistic lab-style PDF with the May panel (ferritin LOW).
function main() {
  mkdirSync(resolve(process.cwd(), "public"), { recursive: true });
  const out = resolve(process.cwd(), "public/jane-doe-labs.pdf");
  const doc = new PDFDocument({ size: "LETTER", margin: 54 });
  doc.pipe(createWriteStream(out));

  const ink = "#0f172a";
  const muted = "#64748b";
  const accent = "#0d9488";

  // Header
  doc.fillColor(accent).fontSize(20).font("Helvetica-Bold").text("MERIDIAN CLINICAL LABORATORIES");
  doc.moveDown(0.1);
  doc.fillColor(muted).fontSize(9).font("Helvetica").text("420 Cedar Street, Suite 300 · San Francisco, CA 94110 · CLIA #05D1098765");
  doc.moveTo(54, doc.y + 6).lineTo(558, doc.y + 6).strokeColor("#e6e9ef").stroke();
  doc.moveDown(1);

  // Patient block
  const top = doc.y;
  doc.fillColor(ink).fontSize(10).font("Helvetica-Bold").text("PATIENT", 54, top);
  doc.font("Helvetica").fillColor(muted)
    .text("Name:  Jane Doe")
    .text("DOB:   1991-08-22  (Age 34)")
    .text("Sex:   Female")
    .text("MRN:   HX-204815");
  doc.fillColor(ink).font("Helvetica-Bold").text("SPECIMEN", 330, top);
  doc.font("Helvetica").fillColor(muted)
    .text("Collected:  2026-05-28 07:42", 330)
    .text("Received:   2026-05-28 11:10", 330)
    .text("Reported:   2026-05-29 09:05", 330)
    .text("Ordering:   Dr. A. Mehta, MD", 330);
  doc.moveDown(1.5);

  // Panel title
  doc.fillColor(ink).fontSize(13).font("Helvetica-Bold").text("Comprehensive Metabolic & Hematology Panel");
  doc.moveDown(0.6);

  // Table header
  const cols = { test: 54, result: 270, unit: 360, range: 430, flag: 520 };
  const headerY = doc.y;
  doc.fontSize(9).fillColor(muted).font("Helvetica-Bold");
  doc.text("TEST", cols.test, headerY);
  doc.text("RESULT", cols.result, headerY);
  doc.text("UNITS", cols.unit, headerY);
  doc.text("REFERENCE", cols.range, headerY);
  doc.text("FLAG", cols.flag, headerY);
  doc.moveTo(54, doc.y + 3).lineTo(558, doc.y + 3).strokeColor("#e6e9ef").stroke();
  doc.moveDown(0.6);

  doc.font("Helvetica").fontSize(10);
  for (const b of BIOMARKERS) {
    const y = doc.y;
    const isLow = b.refLow != null && b.uploadedMay < b.refLow;
    const isHigh = b.refHigh != null && b.uploadedMay > b.refHigh;
    const flag = isLow ? "LOW" : isHigh ? "HIGH" : "";
    const range =
      b.refLow != null && b.refHigh != null
        ? `${b.refLow} - ${b.refHigh}`
        : b.refHigh != null
        ? `< ${b.refHigh}`
        : "-";

    doc.fillColor(ink).font("Helvetica").text(b.name, cols.test, y);
    doc.fillColor(flag ? "#e11d48" : ink).font(flag ? "Helvetica-Bold" : "Helvetica")
      .text(String(b.uploadedMay), cols.result, y);
    doc.fillColor(muted).font("Helvetica").text(b.unit, cols.unit, y);
    doc.fillColor(muted).text(range, cols.range, y);
    doc.fillColor(flag ? "#e11d48" : muted).font(flag ? "Helvetica-Bold" : "Helvetica")
      .text(flag || "-", cols.flag, y);
    doc.moveDown(0.7);
  }

  doc.moveTo(54, doc.y + 4).lineTo(558, doc.y + 4).strokeColor("#e6e9ef").stroke();
  doc.moveDown(1);

  doc.fontSize(9).fillColor(muted).font("Helvetica")
    .text(
      "Interpretive note: Ferritin is below the reference interval, consistent with depleted iron stores. Hemoglobin is at the low end of normal. Correlate clinically. All other analytes within reference limits.",
      54,
      doc.y,
      { width: 504 }
    );
  doc.moveDown(1);
  doc.fontSize(8).fillColor("#94a3b8")
    .text(
      "This report is for wellness demonstration purposes. Reference ranges are method-specific. Results should be interpreted by a qualified clinician.",
      { width: 504 }
    );

  doc.end();
  console.log("Wrote", out);
}

main();
