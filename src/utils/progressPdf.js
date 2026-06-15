import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../api/supabase";

// ─── Helper: load image as base64 ────────────────────────────────────────
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

// ─── Main function ───────────────────────────────────────────────────────
export async function generateProgressPdf(student, progressData) {
  // 1. Organization details
  const { data: org } = await supabase
    .from("organization")
    .select("logo_dark_url, company_name, address, phone, email")
    .eq("id", 1)
    .single();

  const logoUrl = org?.logo_dark_url || "/ShreeVidhyaDark.png";
  const academyName = org?.company_name || "ShreeVidhya Academy";
  const address = org?.address || "";
  const phone = org?.phone || "";
  const email = org?.email || "";

  // 2. Load logo
  let logoBase64 = null;
  try {
    logoBase64 = await loadImageAsBase64(logoUrl);
  } catch (err) {
    console.warn("Logo load failed", err);
  }

  // 3. Fetch student with medium
  const { data: fullStudent } = await supabase
    .from("students")
    .select("*, mediums(name)")
    .eq("id", student.id)
    .single();
  const mediumName = fullStudent?.mediums?.name || "";

  // 4. Active batch (for course/batch name)
  const { data: sb } = await supabase
    .from("student_batches")
    .select("batch_id, batches(batch_name, courses(course_name))")
    .eq("student_id", student.id)
    .eq("status", "active")
    .maybeSingle();

  const batchName = sb?.batches?.batch_name || "";
  const courseName = sb?.batches?.courses?.course_name || "";

  // 5. Attendance summary
  let attendancePercent = null;
  try {
    const { data: sessions } = await supabase
      .from("attendance_sessions")
      .select("id")
      .in("batch_id", [sb?.batch_id].filter(Boolean));
    if (sessions?.length) {
      const sessionIds = sessions.map(s => s.id);
      const { data: marks } = await supabase
        .from("student_attendance")
        .select("status")
        .eq("student_id", student.id)
        .in("session_id", sessionIds);
      const present = marks?.filter(m => m.status === "Present").length || 0;
      attendancePercent = marks?.length ? ((present / marks.length) * 100).toFixed(1) : null;
    }
  } catch (e) { /* ignore */ }

  // 6. Compute aggregate stats
  let totalObtained = 0, totalMax = 0, examCount = 0;
  progressData.forEach(subject => {
    subject.exams?.forEach(e => {
      totalObtained += Number(e.marks_obtained);
      totalMax += Number(e.total_marks);
      examCount++;
    });
  });
  const overallPercentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : null;

  // ─── PDF Creation ──────────────────────────────────────────────────────
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 20;

  // ── Header ──
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, y, 30, 30);
  }
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor("#0D47A1");
  doc.text(academyName, margin + 35, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#666");
  let infoY = y + 18;
  if (address) {
    doc.text(address, margin + 35, infoY);
    infoY += 4;
  }
  if (phone) {
    doc.text(`Phone: ${phone}`, margin + 35, infoY);
    infoY += 4;
  }
  if (email) {
    doc.text(`Email: ${email}`, margin + 35, infoY);
  }
  y += 40;

  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor("#0D47A1");
  doc.text("STUDENT PROGRESS REPORT", pageWidth / 2, y, { align: "center" });
  y += 12;

  // Horizontal divider
  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Student info card
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor("#333");
  doc.text(`${fullStudent?.first_name || student.first_name} ${fullStudent?.last_name || student.last_name}`, margin, y);
  doc.setFontSize(9);
  doc.setTextColor("#555");
  y += 6;
  doc.text(`Admission No: ${student.admission_no || "-"}`, margin, y);
  if (mediumName) doc.text(` | Medium: ${mediumName}`, margin + 50, y);
  if (batchName) doc.text(` | Batch: ${batchName}`, margin + 90, y);
  if (courseName) doc.text(` | Course: ${courseName}`, margin + 130, y);
  y += 8;

  // Attendance and overall percentage
  let statsLine = "";
  if (attendancePercent) statsLine += `Attendance: ${attendancePercent}%`;
  if (overallPercentage) {
    if (statsLine) statsLine += "  •  ";
    statsLine += `Overall Score: ${overallPercentage}%`;
  }
  if (statsLine) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor("#0D47A1");
    doc.text(statsLine, margin, y);
    y += 8;
  }

  y += 6;

  // ── Subject-wise results with bars ──
  for (const subject of progressData) {
    // Check page break
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor("#0D47A1");
    doc.text(subject.subject_name || "Subject", margin, y);
    y += 6;

    // Table
    const body = (subject.exams || []).map(e => [
      e.exam_name,
      e.exam_date || "",
      `${e.marks_obtained || 0} / ${e.total_marks || "?"}`,
      e.total_marks ? `${((e.marks_obtained / e.total_marks) * 100).toFixed(1)}%` : "-",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Exam", "Date", "Marks", "Percentage"]],
      body,
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: "#0D47A1", textColor: "#FFFFFF", fontStyle: "bold" },
      alternateRowStyles: { fillColor: "#F8F9FA" },
      margin: { left: margin },
      columnStyles: {
        3: { halign: "right" }
      }
    });
    y = doc.lastAutoTable.finalY + 6;

    // Draw small horizontal bars for each exam percentage
    if (subject.exams?.length) {
      const barX = margin;
      const barMaxWidth = 60;
      const barHeight = 5;
      const barGap = 8;
      let barY = y;
      subject.exams.forEach(e => {
        if (!e.total_marks) return;
        const pct = (e.marks_obtained / e.total_marks) * 100;
        const width = (pct / 100) * barMaxWidth;
        doc.setFillColor(pct >= 60 ? "#16a34a" : pct >= 40 ? "#f59e0b" : "#dc2626");
        doc.rect(barX, barY, width, barHeight, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor("#333");
        doc.text(`${pct.toFixed(0)}%`, barX + width + 2, barY + 4);
        barY += barGap;
      });
      y = barY + 4;
    }
  }

  // ── Footer ──
  const addFooter = (pageNum) => {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor("#999");
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} | ${academyName}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    doc.text(`Page ${pageNum}`, pageWidth - 20, pageHeight - 10, { align: "right" });
  };
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i);
  }

  doc.save(`Progress_${student.admission_no || student.id}.pdf`);
}