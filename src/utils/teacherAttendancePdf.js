import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Helper: load an image from a URL and return base64
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

export async function generateTeacherAttendancePDF(data, monthLabel, org = {}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
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
      y = y + 24;
    }
  } else {
    // No logo – centre the academy name
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
  doc.text("Teacher Attendance Report", pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#333");
  doc.text(`Month: ${monthLabel}`, pageWidth / 2, y, { align: "center" });
  y += 8;

  if (!data.length) return doc;

  const daysInMonth = data[0].days.length;

  // ---------- Table header + rows ----------
  const headers = ["Teacher", "Code"];
  for (let d = 1; d <= daysInMonth; d++) headers.push(String(d));

  const rows = data.map((teacher) => {
    const row = [teacher.name, teacher.employee_code];
    teacher.days.forEach((day) => {
      row.push(
        day.status === "present" ? "P" :
        day.status === "absent" ? "A" :
        day.status === "leave" ? "L" :
        day.status === "half_day" ? "H" : "—"
      );
    });
    return row;
  });

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5, halign: "center" },
    headStyles: { fillColor: "#0D47A1", textColor: "#FFFFFF", fontSize: 7, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 40, halign: "left" },
      1: { cellWidth: 18, halign: "center" },
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      // Footer on every page
      const footerY = doc.internal.pageSize.getHeight() - 8;
      doc.setFontSize(6);
      doc.setTextColor("#999");
      doc.text(`Generated on ${new Date().toLocaleString()}  |  © ${org?.company_name || "ShreeVidhya Academy"}`, margin, footerY);
    },
  });

  return doc;
}