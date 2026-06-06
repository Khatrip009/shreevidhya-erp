import { jsPDF } from "jspdf";
import { supabase } from "../api/supabase";

// Helper: load an image from a URL and return a base64 data URL
async function loadImageAsBase64(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateCertificatePdf(certificate) {
  // 1. Fetch organization details
  const { data: org } = await supabase
    .from("organization")
    .select("logo_dark_url, company_name")
    .eq("id", 1)
    .single();

  const logoUrl = org?.logo_dark_url || "/ShreeVidhyaDark.png";
  const academyName = org?.company_name || "ShreeVidhya Academy";

  // 2. Load logo
  const logoBase64 = await loadImageAsBase64(logoUrl).catch(() => null);

  // 3. Create PDF in landscape A4
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;

  // ---- Background decoration (subtle arcs) ----
  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.1);
  // Thin decorative lines at corners
  for (let i = 0; i < 20; i++) {
    const x = margin + i * 0.5;
    doc.line(x, margin, x, margin + 5);
    doc.line(pageWidth - x, margin, pageWidth - x, margin + 5);
    doc.line(x, pageHeight - margin - 5, x, pageHeight - margin);
    doc.line(pageWidth - x, pageHeight - margin - 5, pageWidth - x, pageHeight - margin);
  }

  // ---- Outer border ----
  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(1.5);
  doc.rect(margin - 4, margin - 4, pageWidth - 2 * margin + 8, pageHeight - 2 * margin + 8);

  // ---- Inner thin border ----
  doc.setLineWidth(0.3);
  doc.rect(margin + 1, margin + 1, pageWidth - 2 * margin - 2, pageHeight - 2 * margin - 2);

  let y = margin + 20;

  // ---- Logo centered at top ----
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", pageWidth / 2 - 15, y, 30, 30);
    y += 38;
  } else {
    y += 10;
  }

  // ---- Academy name ----
  doc.setFont("times", "bold");
  doc.setFontSize(32);
  doc.setTextColor("#0D47A1");
  doc.text(academyName, pageWidth / 2, y, { align: "center" });
  y += 12;

  // ---- Subtitle ----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(18);
  doc.setTextColor("#444");
  doc.text("Certificate of Completion", pageWidth / 2, y, { align: "center" });
  y += 14;

  // ---- Decorative line ----
  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.6);
  doc.line(pageWidth / 2 - 60, y, pageWidth / 2 + 60, y);
  y += 12;

  // ---- Body text ----
  doc.setFont("times", "normal");
  doc.setFontSize(16);
  doc.setTextColor("#333");
  doc.text("This is to certify that", pageWidth / 2, y, { align: "center" });
  y += 14;

  // ---- Student name (large, bold, serif) ----
  doc.setFont("times", "bold");
  doc.setFontSize(34);
  doc.setTextColor("#0D47A1");
  const studentName = `${certificate.students?.first_name} ${certificate.students?.last_name}`;
  doc.text(studentName, pageWidth / 2, y, { align: "center" });
  y += 18;

  // ---- Course line ----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor("#333");
  doc.text("has successfully completed the course", pageWidth / 2, y, { align: "center" });
  y += 14;

  // ---- Course name ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor("#0D47A1");
  doc.text(certificate.courses?.course_name || "", pageWidth / 2, y, { align: "center" });
  y += 10;

  if (certificate.course_levels?.level_name) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor("#555");
    doc.text(`Level: ${certificate.course_levels.level_name}`, pageWidth / 2, y, { align: "center" });
    y += 14;
  }

  // ---- Issue date and certificate number ----
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor("#666");
  doc.text(`Issue Date: ${certificate.issue_date}`, margin + 30, y);
  doc.text(`Certificate No: ${certificate.certificate_no}`, pageWidth - margin - 30, y, { align: "right" });
  y += 22;

  // ---- Signature lines ----
  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.5);
  doc.line(margin + 30, y, margin + 90, y);
  doc.line(pageWidth - margin - 90, y, pageWidth - margin - 30, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#666");
  doc.text("Authorized Signatory", margin + 60, y, { align: "center" });
  doc.text("Student", pageWidth - margin - 60, y, { align: "center" });
  y += 14;

  // ---- Seal (circle + text) ----
  doc.setDrawColor("#0D47A1");
  doc.circle(pageWidth / 2, y + 8, 14);
  doc.setFontSize(7);
  doc.setTextColor("#0D47A1");
  doc.text("SHREEVIDHYA", pageWidth / 2, y + 6, { align: "center" });
  doc.text("ACADEMY", pageWidth / 2, y + 10, { align: "center" });
  doc.setFontSize(9);
  doc.text("SEAL", pageWidth / 2, y + 15, { align: "center" });

  // ---- Footer ----
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor("#999");
  doc.text(
    `Computer-generated certificate – ${academyName}`,
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" }
  );

  // Save
  doc.save(`Certificate_${certificate.certificate_no}.pdf`);
}