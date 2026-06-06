import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../api/supabase";

export async function generateProgressPdf(student, progressData) {
  // 1. Fetch organization details
  const { data: org } = await supabase
    .from("organization")
    .select("logo_dark_url, company_name")
    .eq("id", 1)
    .single();

  const logoUrl = org?.logo_dark_url || "/ShreeVidhyaDark.png";
  const academyName = org?.company_name || "ShreeVidhya Academy";

  // 2. Load logo as base64
  const loadImageAsBase64 = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  let logoBase64 = null;
  try {
    logoBase64 = await loadImageAsBase64(logoUrl);
  } catch (err) {
    console.warn("Logo could not be loaded for progress PDF", err);
  }

  // 3. Build PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  // ---- Header ----
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, y, 30, 30);
    doc.setFontSize(22);
    doc.setTextColor("#0D47A1");
    doc.text(academyName, margin + 35, y + 10);
    doc.setFontSize(12);
    doc.setTextColor("#616161");
    doc.text("Student Progress Report", margin + 35, y + 18);
  } else {
    doc.setFontSize(22);
    doc.setTextColor("#0D47A1");
    doc.text(academyName, margin, y + 8);
    doc.setFontSize(12);
    doc.setTextColor("#616161");
    doc.text("Student Progress Report", margin, y + 16);
  }
  y += 35;

  // Decorative line
  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Student info
  doc.setFontSize(14);
  doc.setTextColor("#0D47A1");
  doc.text(`${student.first_name} ${student.last_name}`, margin, y);
  doc.setFontSize(10);
  doc.setTextColor("#616161");
  doc.text(`Admission No: ${student.admission_no || "-"}`, margin, y + 6);
  y += 14;

  // ---- Subject tables ----
  for (const subject of progressData) {
    doc.setFontSize(13);
    doc.setTextColor("#0D47A1");
    doc.text(subject.subject_name, margin, y);
    y += 6;

    const body = subject.exams.map((e) => [
      e.exam_name,
      e.exam_date,
      `${e.marks_obtained} / ${e.total_marks || "?"}`,
      e.total_marks ? `${((e.marks_obtained / e.total_marks) * 100).toFixed(1)}%` : "-",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Exam", "Date", "Marks", "Percentage"]],
      body,
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [13, 71, 161], textColor: 255 },
      margin: { left: margin },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ---- Footer ----
  doc.setFontSize(8);
  doc.setTextColor("#9A9C9B");
  doc.text(
    `Computer-generated report – ${academyName}`,
    pageWidth / 2,
    290,
    { align: "center" }
  );

  doc.save(`Progress_${student.admission_no || student.id}.pdf`);
}