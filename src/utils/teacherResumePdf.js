import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../api/supabase";

// ─── Helpers ────────────────────────────────────────────────────────────────
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
  // 1. Fetch teacher with medium and course info
  const { data: teacher } = await supabase
    .from("teachers")
    .select("*, mediums(name), courses(course_name)")
    .eq("id", teacherId)
    .single();
  if (!teacher) throw new Error("Teacher not found");

  const mediumName = teacher.mediums?.name || "";
  const courseName = teacher.courses?.course_name || "";

  // 2. Fetch organisation
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

  // 3. Load logo
  const logoBase64 = await loadImageAsBase64(logoUrl).catch(() => null);

  // 4. Fetch assigned batches (active)
  const { data: batchAssignments } = await supabase
    .from("batch_teachers")
    .select(`
      batch_id,
      day,
      subject_id,
      subjects(subject_name),
      batches(batch_name, start_time, end_time, days, courses(course_name))
    `)
    .eq("teacher_id", teacherId);

  const batches = batchAssignments || [];

  // Group batches (unique) with their days and subjects
  const batchMap = new Map();
  batches.forEach((b) => {
    const bid = b.batch_id;
    if (!batchMap.has(bid)) {
      batchMap.set(bid, {
        batch_name: b.batches?.batch_name || "",
        course_name: b.batches?.courses?.course_name || "",
        schedule: `${b.batches?.start_time || "?"} - ${b.batches?.end_time || "?"} (${b.batches?.days || ""})`,
        days: [],
        subjects: [],
      });
    }
    const entry = batchMap.get(bid);
    if (b.day && !entry.days.includes(b.day)) entry.days.push(b.day);
    const subj = b.subjects?.subject_name;
    if (subj && !entry.subjects.includes(subj)) entry.subjects.push(subj);
  });
  const batchList = Array.from(batchMap.values());

  // ─── PDF Creation ──────────────────────────────────────────────────────
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // ── Header with blue bar and name ──────────────────────────────────────
  doc.setFillColor("#0D47A1");
  doc.rect(0, 0, pageWidth, 45, "F");

  // Logo inside header (left)
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, 8, 28, 28);
  }

  // Name and designation
  const nameY = 18;
  doc.setFont("times", "bold");
  doc.setFontSize(26);
  doc.setTextColor("#FFFFFF");
  doc.text(`${teacher.first_name} ${teacher.last_name}`, margin + 35, nameY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Teacher", margin + 35, nameY + 8);

  // Contact info (top right)
  const contactX = pageWidth - margin;
  doc.setFontSize(9);
  doc.setTextColor("#FFFFFF");
  doc.text(`📞 ${teacher.mobile}`, contactX, 20, { align: "right" });
  doc.text(`✉️ ${teacher.email || "-"}`, contactX, 27, { align: "right" });
  doc.text(`${address ? "📍 " + address : ""}`, contactX, 34, { align: "right" });

  let y = 52;

  // ── Personal Details (left column) ──────────────────────────────────────
  const leftColX = margin;
  const rightColX = pageWidth / 2 + 10;
  const leftWidth = pageWidth / 2 - margin - 10;

  // Left column card
  doc.setFillColor("#F0F4FF");
  doc.rect(leftColX, y, leftWidth, 85, "F");

  let ly = y + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor("#0D47A1");
  doc.text("PERSONAL DETAILS", leftColX + 4, ly);
  ly += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#333");
  const personalFields = [
    ["Employee Code", teacher.employee_code || "-"],
    ["Mobile", teacher.mobile],
    ["Email", teacher.email || "-"],
    ["Qualification", teacher.qualification || "-"],
    ["Joining Date", teacher.joining_date || "-"],
    ["Status", teacher.status?.toUpperCase()],
    ["Medium", mediumName || "-"],
    ["Course", courseName || "-"],
  ];
  personalFields.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, leftColX + 6, ly);
    doc.setFont("helvetica", "normal");
    doc.text(value, leftColX + 40, ly);
    ly += 7;
  });

  // ── Professional Summary (right column) ─────────────────────────────────
  let ry = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor("#0D47A1");
  doc.text("PROFESSIONAL SUMMARY", rightColX, ry);
  ry += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#333");
  const summary = `Dedicated and passionate educator with experience at ${academyName}. ${teacher.qualification ? "Holding " + teacher.qualification + ", " : ""}${mediumName ? "proficient in " + mediumName + " medium, " : ""}skilled in classroom management and student engagement. Currently teaching ${batchList.length > 0 ? batchList.map(b => b.batch_name).join(", ") : "no batches"}.`;
  const summaryLines = doc.splitTextToSize(summary, 80);
  doc.text(summaryLines, rightColX, ry);

  ry += summaryLines.length * 5 + 12;

  // ── Batches / Teaching Experience (right column) ─────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor("#0D47A1");
  doc.text("TEACHING EXPERIENCE", rightColX, ry);
  ry += 7;

  if (batchList.length > 0) {
    batchList.forEach((b) => {
      // Check vertical space
      if (ry > pageHeight - 30) {
        doc.addPage();
        ry = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor("#0D47A1");
      doc.text(`${b.batch_name} (${b.course_name})`, rightColX, ry);
      ry += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor("#555");
      doc.text(`Schedule: ${b.schedule}`, rightColX + 4, ry);
      ry += 5;
      if (b.subjects.length) {
        doc.text(`Subjects: ${b.subjects.join(", ")}`, rightColX + 4, ry);
        ry += 5;
      }
      ry += 3;
    });
  } else {
    doc.text("No active batches assigned.", rightColX, ry);
    ry += 6;
  }

  // ── Salary Info (bottom left) ────────────────────────────────────────────
  let bottomY = Math.max(ly + 6, ry + 10);
  bottomY = y + 95; // ensure below both columns

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor("#0D47A1");
  doc.text("COMPENSATION", leftColX, bottomY);
  bottomY += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#333");
  doc.text(`Monthly Salary: ₹${teacher.salary ? Number(teacher.salary).toLocaleString() : "-"}`, leftColX + 4, bottomY);

  // ── Footer ───────────────────────────────────────────────────────────────
  const footerY = pageHeight - 12;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor("#999");
  doc.text(
    `Generated by ${academyName} on ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  doc.save(`Resume_${teacher.employee_code || teacherId}.pdf`);
}