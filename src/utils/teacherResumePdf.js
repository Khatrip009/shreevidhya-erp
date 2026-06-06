import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../api/supabase";

// Load image as base64
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

export async function generateTeacherResumePdf(teacherId) {
  // 1. Fetch teacher data
  const { data: teacher } = await supabase
    .from("teachers")
    .select("*")
    .eq("id", teacherId)
    .single();
  if (!teacher) throw new Error("Teacher not found");

  // 2. Fetch organization details
  const { data: org } = await supabase
    .from("organization")
    .select("logo_dark_url, company_name")
    .eq("id", 1)
    .single();

  const logoUrl = org?.logo_dark_url || "/ShreeVidhyaDark.png";
  const academyName = org?.company_name || "ShreeVidhya Academy";

  // 3. Load logo
  const logoBase64 = await loadImageAsBase64(logoUrl).catch(() => null);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  // Header with logo and academy name
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, y, 30, 30);
    doc.setFontSize(22);
    doc.setTextColor("#0D47A1");
    doc.text(academyName, margin + 35, y + 10);
    doc.setFontSize(12);
    doc.setTextColor("#616161");
    doc.text("Teacher Profile", margin + 35, y + 18);
  } else {
    doc.setFontSize(22);
    doc.setTextColor("#0D47A1");
    doc.text(academyName, margin, y + 8);
    doc.setFontSize(12);
    doc.setTextColor("#616161");
    doc.text("Teacher Profile", margin, y + 16);
  }
  y += 40;

  // Decorative line
  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Personal Info
  doc.setFontSize(14);
  doc.setTextColor("#0D47A1");
  doc.text("Personal Information", margin, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [["Field", "Details"]],
    body: [
      ["Employee Code", teacher.employee_code || "-"],
      ["Name", `${teacher.first_name} ${teacher.last_name}`],
      ["Mobile", teacher.mobile],
      ["Email", teacher.email || "-"],
      ["Qualification", teacher.qualification || "-"],
      ["Joining Date", teacher.joining_date || "-"],
      ["Salary", teacher.salary ? `₹${Number(teacher.salary).toLocaleString()}` : "-"],
      ["Status", teacher.status],
    ],
    theme: "grid",
    styles: { fontSize: 10 },
    headStyles: { fillColor: [13, 71, 161], textColor: 255 },
    columnStyles: { 0: { cellWidth: 50 } },
    margin: { left: margin },
  });
  y = doc.lastAutoTable.finalY + 10;

  // Footer
  doc.setFontSize(8);
  doc.setTextColor("#9A9C9B");
  doc.text(
    `Computer-generated document – ${academyName}`,
    pageWidth / 2,
    290,
    { align: "center" }
  );

  doc.save(`Resume_${teacher.employee_code || teacherId}.pdf`);
}