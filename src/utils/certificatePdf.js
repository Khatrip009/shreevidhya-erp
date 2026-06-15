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

  const pageWidth = doc.internal.pageSize.getWidth();  // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 15;

  // ---- Outer decorative border (double line) ----
  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(1.5);
  doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
  doc.setLineWidth(0.3);
  doc.rect(margin + 2, margin + 2, pageWidth - 2 * margin - 4, pageHeight - 2 * margin - 4);

  // ---- Logo centered at top ----
  let y = margin + 12;
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", pageWidth / 2 - 12, y, 24, 24);
    y += 28;
  } else {
    y += 12;
  }

  // ---- Academy name ----
  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor("#0D47A1");
  doc.text(academyName, pageWidth / 2, y, { align: "center" });
  y += 10;

  // ---- Subtitle ----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor("#444");
  doc.text("Certificate of Completion", pageWidth / 2, y, { align: "center" });
  y += 10;

  // ---- Decorative line ----
  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 50, y, pageWidth / 2 + 50, y);
  y += 10;

  // ---- Certificate body text ----
  doc.setFont("times", "normal");
  doc.setFontSize(14);
  doc.setTextColor("#333");
  doc.text("This is to certify that", pageWidth / 2, y, { align: "center" });
  y += 10;

  // ---- Student name (large, bold, serif) ----
  doc.setFont("times", "bold");
  doc.setFontSize(30);
  doc.setTextColor("#0D47A1");
  const studentName = `${certificate.students?.first_name} ${certificate.students?.last_name}`;
  doc.text(studentName, pageWidth / 2, y, { align: "center" });
  y += 14;

  // ---- Course completion text ----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor("#333");
  doc.text("has successfully completed the course", pageWidth / 2, y, { align: "center" });
  y += 10;

  // ---- Course name ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor("#0D47A1");
  // Ensure course name fits within width (split to multiple lines if necessary)
  const courseName = certificate.courses?.course_name || "";
  const courseLines = doc.splitTextToSize(courseName, pageWidth - 2 * margin - 40);
  doc.text(courseLines, pageWidth / 2, y, { align: "center" });
  y += courseLines.length * 8 + 4;

  // ---- Level (if present) ----
  if (certificate.course_levels?.level_name) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor("#555");
    doc.text(`Level: ${certificate.course_levels.level_name}`, pageWidth / 2, y, { align: "center" });
    y += 10;
  }

  // ---- Issue date and certificate number (two columns) ----
  y += 4;
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#666");
  doc.text(`Issue Date: ${certificate.issue_date}`, margin + 20, y);
  doc.text(`Certificate No: ${certificate.certificate_no}`, pageWidth - margin - 20, y, { align: "right" });
  y += 16;

  // ---- Signature lines ----
  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.5);
  // Left signature
  doc.line(margin + 30, y, margin + 80, y);
  // Right signature
  doc.line(pageWidth - margin - 80, y, pageWidth - margin - 30, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#666");
  doc.text("Authorized Signatory", margin + 55, y, { align: "center" });
  doc.text("Student", pageWidth - margin - 55, y, { align: "center" });
  y += 12;

  // ---- Seal (circle with text, centered bottom) ----
  const sealCenterY = pageHeight - margin - 14;
  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.8);
  doc.circle(pageWidth / 2, sealCenterY, 10);
  doc.setFontSize(6);
  doc.setTextColor("#0D47A1");
  doc.text("SHREEVIDHYA", pageWidth / 2, sealCenterY - 3, { align: "center" });
  doc.text("ACADEMY", pageWidth / 2, sealCenterY + 1, { align: "center" });
  doc.setFontSize(7);
  doc.text("SEAL", pageWidth / 2, sealCenterY + 5, { align: "center" });

  // ---- Footer ----
  doc.setFont("times", "italic");
  doc.setFontSize(7);
  doc.setTextColor("#999");
  doc.text(
    `Computer-generated certificate – ${academyName}`,
    pageWidth / 2,
    pageHeight - 6,
    { align: "center" }
  );

  // Save
  doc.save(`Certificate_${certificate.certificate_no}.pdf`);
}