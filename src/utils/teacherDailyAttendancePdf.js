import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

async function loadImage(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateDailyTeacherAttendancePDF(data, startDate, endDate, org = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 12;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 12;

  // ---------- Header (Logo + Academy Name) ----------
  const logoUrl = org?.logo_dark_url || null;
  if (logoUrl) {
    const logoBase64 = await loadImage(logoUrl);
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", margin, y, 20, 20);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor("#0D47A1");
      doc.text(org?.company_name || "ShreeVidhya Academy", margin + 24, y + 10);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor("#555");
      doc.text(`${org?.address || ""}  |  Phone: ${org?.phone || ""}  |  Email: ${org?.email || ""}`, margin + 24, y + 16);
      y += 24;
    }
  } else {
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor("#0D47A1");
    doc.text(org?.company_name || "ShreeVidhya Academy", pageWidth / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#555");
    const subtitle = `${org?.address || ""}  |  Phone: ${org?.phone || ""}  |  Email: ${org?.email || ""}`;
    doc.text(subtitle, pageWidth / 2, y, { align: "center" });
    y += 6;
  }

  // ---------- Report Title ----------
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor("#0D47A1");
  doc.text("Teacher Daily Attendance Report", pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#333");
  doc.text(`Period: ${startDate} to ${endDate}`, pageWidth / 2, y, { align: "center" });
  y += 8;

  if (!data.length) return doc;

  // ---------- Table ----------
  const headers = ["Date", "Teacher", "Code", "Status"];
  const rows = data.map((r) => [
    r.date,
    r.teacher_name,
    r.employee_code,
    r.status === "present" ? "Present" :
    r.status === "absent" ? "Absent" :
    r.status === "leave" ? "Leave" :
    r.status === "half_day" ? "Half Day" : "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3, halign: "center" },
    headStyles: { fillColor: "#0D47A1", textColor: "#FFFFFF", fontSize: 10, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 30, halign: "left" },
      1: { cellWidth: 60, halign: "left" },
      2: { cellWidth: 25 },
      3: { cellWidth: 35 },
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      const footerY = doc.internal.pageSize.getHeight() - 8;
      doc.setFontSize(6);
      doc.setTextColor("#999");
      doc.text(`Generated on ${new Date().toLocaleString()}  |  © ${org?.company_name || "ShreeVidhya Academy"}`, margin, footerY);
    },
  });

  return doc;
}