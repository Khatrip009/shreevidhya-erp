import { jsPDF } from "jspdf";
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
  // 1. Teacher base record
  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("*")
    .eq("id", teacherId)
    .single();
  if (teacherError) throw teacherError;
  if (!teacher) throw new Error("Teacher not found");

  // 2. Mediums (via junction)
  const { data: mediumLinks } = await supabase
    .from("teacher_mediums")
    .select("mediums(name)")
    .eq("teacher_id", teacherId);
  const mediums = mediumLinks?.map(l => l.mediums?.name).filter(Boolean) || [];

  // 3. Courses (via junction)
  const { data: courseLinks } = await supabase
    .from("teacher_courses")
    .select("courses(course_name)")
    .eq("teacher_id", teacherId);
  const courses = courseLinks?.map(l => l.courses?.course_name).filter(Boolean) || [];

  // 4. Subjects (via junction)
  const { data: subjectLinks } = await supabase
    .from("teacher_subjects")
    .select("subjects(subject_name)")
    .eq("teacher_id", teacherId);
  const subjects = subjectLinks?.map(l => l.subjects?.subject_name).filter(Boolean) || [];

  // 5. Organisation
  const { data: org } = await supabase
    .from("organization")
    .select("logo_dark_url, company_name, address, phone, email")
    .eq("id", 1)
    .single();

  const logoUrl = org?.logo_dark_url || "/ShreeVidhyaDark.png";
  const academyName = org?.company_name || "ShreeVidhya Academy";
  const orgAddress = org?.address || "";
  const orgPhone = org?.phone || "";
  const orgEmail = org?.email || "";

  const logoBase64 = await loadImageAsBase64(logoUrl).catch(() => null);

  // 6. Batches (active assignments)
  const { data: batchAssignments } = await supabase
    .from("batch_teachers")
    .select(`
      batch_id,
      subjects(subject_name),
      batches(batch_name, start_time, end_time, days, courses(course_name))
    `)
    .eq("teacher_id", teacherId);

  // Group by batch
  const batchMap = new Map();
  (batchAssignments || []).forEach(b => {
    const bid = b.batch_id;
    if (!batchMap.has(bid)) {
      batchMap.set(bid, {
        name: b.batches?.batch_name || "Unnamed Batch",
        course: b.batches?.courses?.course_name || "",
        schedule: `${b.batches?.start_time || "?"} – ${b.batches?.end_time || "?"}  |  ${b.batches?.days || ""}`,
        subjects: [],
      });
    }
    const entry = batchMap.get(bid);
    if (b.subjects?.subject_name) entry.subjects.push(b.subjects.subject_name);
  });
  const batchList = Array.from(batchMap.values());

  // ─── PDF Setup ────────────────────────────────────────────────────────────
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();   // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

  // Margins
  const leftColWidth = 52;    // sidebar width
  const marginLeft = 6;
  const marginRight = 6;
  const mainLeft = leftColWidth + 4; // where main content starts
  const mainWidth = pageWidth - mainLeft - marginRight;

  // Helper to add text in main area with consistent font
  const mainText = (text, x, y, size = 9, color = "#333", font = "helvetica", style = "normal") => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.text(text, x, y);
  };

  // ── LEFT SIDEBAR BACKGROUND ────────────────────────────────────────────────
  doc.setFillColor("#0D47A1");
  doc.rect(0, 0, leftColWidth, pageHeight, "F");

  let yLeft = 20;

  // Logo / Academy Name in sidebar (top)
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", marginLeft, yLeft, 24, 24);
    yLeft += 30;
  }

  // Teacher Name
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor("#FFFFFF");
  const fullName = `${teacher.first_name} ${teacher.last_name}`;
  const nameLines = doc.splitTextToSize(fullName, leftColWidth - 8);
  doc.text(nameLines, marginLeft + 2, yLeft);
  yLeft += nameLines.length * 7 + 4;

  // Title
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#B3D4FF");
  doc.text("TEACHER", marginLeft + 2, yLeft);
  yLeft += 10;

  // Small line
  doc.setDrawColor("#FFFFFF");
  doc.setLineWidth(0.3);
  doc.line(marginLeft + 2, yLeft, leftColWidth - 4, yLeft);
  yLeft += 6;

  // Contact details
  const addLeftItem = (icon, text, yStart) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#E3F2FD");
    const lines = doc.splitTextToSize(text, leftColWidth - 12);
    doc.text(lines, marginLeft + 6, yStart);
    return yStart + lines.length * 4 + 3;
  };

  yLeft = addLeftItem("📞", teacher.mobile || "—", yLeft);
  if (teacher.email) yLeft = addLeftItem("✉️", teacher.email, yLeft);
  yLeft = addLeftItem("📍", orgAddress || "—", yLeft);
  yLeft += 4;

  // Mediums section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor("#FFFFFF");
  doc.text("MEDIUMS", marginLeft + 2, yLeft);
  yLeft += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor("#E3F2FD");
  if (mediums.length) {
    mediums.forEach(m => {
      doc.text(`• ${m}`, marginLeft + 6, yLeft);
      yLeft += 4.5;
    });
  } else {
    doc.text("—", marginLeft + 6, yLeft);
    yLeft += 5;
  }
  yLeft += 4;

  // Courses section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor("#FFFFFF");
  doc.text("COURSES", marginLeft + 2, yLeft);
  yLeft += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor("#E3F2FD");
  if (courses.length) {
    courses.forEach(c => {
      doc.text(`• ${c}`, marginLeft + 6, yLeft);
      yLeft += 4.5;
    });
  } else {
    doc.text("—", marginLeft + 6, yLeft);
    yLeft += 5;
  }
  yLeft += 4;

  // Subjects section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor("#FFFFFF");
  doc.text("SUBJECTS", marginLeft + 2, yLeft);
  yLeft += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor("#E3F2FD");
  if (subjects.length) {
    subjects.forEach(s => {
      doc.text(`• ${s}`, marginLeft + 6, yLeft);
      yLeft += 4.5;
    });
  } else {
    doc.text("—", marginLeft + 6, yLeft);
    yLeft += 5;
  }

  // ── MAIN CONTENT (Right side) ──────────────────────────────────────────────
  let yMain = 28;

  // Professional Summary
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor("#0D47A1");
  doc.text("PROFESSIONAL SUMMARY", mainLeft, yMain);
  yMain += 8;

  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.5);
  doc.line(mainLeft, yMain, mainLeft + mainWidth - 2, yMain);
  yMain += 6;

  const summaryText = `Dedicated educator with ${batchList.length ? "experience teaching " + batchList.map(b => b.name).join(", ") : "a passion for teaching"} at ${academyName}. ${teacher.qualification ? "Holds " + teacher.qualification + ". " : ""}Skilled in classroom management, student engagement, and curriculum delivery.`;
  const summaryLines = doc.splitTextToSize(summaryText, mainWidth - 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#333");
  doc.text(summaryLines, mainLeft, yMain);
  yMain += summaryLines.length * 5 + 8;

  // Teaching Experience
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor("#0D47A1");
  doc.text("TEACHING EXPERIENCE", mainLeft, yMain);
  yMain += 8;

  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.5);
  doc.line(mainLeft, yMain, mainLeft + mainWidth - 2, yMain);
  yMain += 6;

  if (batchList.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor("#333");
    doc.text("No active batches assigned.", mainLeft, yMain);
    yMain += 8;
  } else {
    batchList.forEach(batch => {
      // Batch name as heading
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor("#0D47A1");
      doc.text(`${batch.name}  (${batch.course})`, mainLeft, yMain);
      yMain += 6;

      // Schedule
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor("#666");
      doc.text(`Schedule: ${batch.schedule}`, mainLeft + 6, yMain);
      yMain += 5;

      // Subjects
      if (batch.subjects.length) {
        doc.text(`Subjects: ${batch.subjects.join(", ")}`, mainLeft + 6, yMain);
        yMain += 5;
      }
      yMain += 3;
    });
  }

  // Additional details (Qualification, Joining Date, Salary)
  yMain += 6;
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor("#0D47A1");
  doc.text("ADDITIONAL DETAILS", mainLeft, yMain);
  yMain += 8;

  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.5);
  doc.line(mainLeft, yMain, mainLeft + mainWidth - 2, yMain);
  yMain += 6;

  const details = [
    ["Employee Code", teacher.employee_code || "—"],
    ["Qualification", teacher.qualification || "—"],
    ["Joining Date", teacher.joining_date || "—"],
    ["Monthly Salary", teacher.salary ? `₹ ${Number(teacher.salary).toLocaleString("en-IN")}` : "—"],
    ["Status", teacher.status ? teacher.status.charAt(0).toUpperCase() + teacher.status.slice(1) : "—"],
  ];

  details.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor("#333");
    doc.text(`${label}:`, mainLeft, yMain);
    doc.setFont("helvetica", "normal");
    doc.text(value, mainLeft + 38, yMain);
    yMain += 6;
  });

  // Footer (discreet)
  const footerY = pageHeight - 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor("#999");
  doc.text(
    `${academyName} – ${orgAddress}  |  Generated on ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  doc.save(`Resume_${teacher.employee_code || teacherId}.pdf`);
}