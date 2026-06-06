import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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

export async function generateAdmissionPdf(studentId) {
  // 0. Fetch organization details
  const { data: org } = await supabase
    .from("organization")
    .select("logo_dark_url, company_name, address, phone, email")
    .eq("id", 1)
    .single();

  const logoUrl = org?.logo_dark_url || "/ShreeVidhyaDark.png";
  const academyName = org?.company_name?.toUpperCase() || "SHREEVIDHYA ACADEMY";
  const address = org?.address || "";
  const phone = org?.phone || "";
  const email = org?.email || "";

  // 1. Fetch all student data
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .single();
  if (!student) throw new Error("Student not found");

  // 2. Parents with full details
  const { data: parentLinks } = await supabase
    .from("student_parents")
    .select("parent_id, relation, parents(*)")
    .eq("student_id", studentId);
  const parents = parentLinks?.map((l) => l.parents) || [];

  // 3. Enrolled batches with course info
  const { data: batches } = await supabase
    .from("student_batches")
    .select(`batch_id, batches(course_id, courses(course_name), batch_name)`)
    .eq("student_id", studentId)
    .eq("status", "active");

  // 4. Fee summary
  const { data: fees } = await supabase
    .from("student_fees")
    .select("final_fee, status, fee_structures(fee_amount)")
    .eq("student_id", studentId);
  let totalFee = 0;
  let paidAmount = 0;
  if (fees) {
    for (const f of fees) {
      totalFee += Number(f.final_fee);
      const { data: payments } = await supabase
        .from("fee_payments")
        .select("amount")
        .eq("student_fee_id", f.id);
      paidAmount += payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    }
  }

  // 5. Load logo and student photo as base64
  let logoBase64 = null;
  try {
    logoBase64 = await loadImageAsBase64(logoUrl);
  } catch (err) {
    console.warn("Logo could not be loaded for PDF", err);
  }

  let photoBase64 = null;
  if (student.photo_url) {
    try {
      photoBase64 = await loadImageAsBase64(student.photo_url);
    } catch (err) {
      console.warn("Student photo could not be loaded for PDF", err);
    }
  }

  // 6. Build PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // ---------- WATERMARK (faint logo centered) ----------
  if (logoBase64) {
    // Save current graphics state, set transparency
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.04 })); // very faint
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    const imgWidth = 100;
    const imgHeight = 100;
    doc.addImage(logoBase64, "PNG", centerX - imgWidth/2, centerY - imgHeight/2, imgWidth, imgHeight);
    doc.restoreGraphicsState();
  }

  let y = 25;

  // ---------- PAGE 1: Header, Student Info, Parent Info ----------

  // ---- Organization Header ----
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, y, 35, 35);
  }
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor("#0D47A1");
  doc.text(academyName, margin + 40, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#616161");
  let lineY = y + 18;
  if (address) {
    doc.text(address, margin + 40, lineY);
    lineY += 5;
  }
  if (phone) {
    doc.text(`Phone: ${phone}`, margin + 40, lineY);
    lineY += 5;
  }
  if (email) {
    doc.text(`Email: ${email}`, margin + 40, lineY);
  }
  y += 45;

  // Decorative line
  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ---- Admission Form Title ----
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor("#0D47A1");
  doc.text("ADMISSION FORM", pageWidth / 2, y, { align: "center" });
  y += 12;

  // ---- Student Photo (top-right) ----
  if (photoBase64) {
    doc.addImage(photoBase64, "PNG", pageWidth - margin - 30, y, 30, 30);
    // draw a border around the photo
    doc.setDrawColor("#0D47A1");
    doc.setLineWidth(0.5);
    doc.rect(pageWidth - margin - 30, y, 30, 30);
  }

  // ---- Student Information ----
  y += 5;
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor("#0D47A1");
  doc.text("STUDENT INFORMATION", margin, y);
  y += 8;

  // Helper to draw a labeled field
  function drawField(label, value, x, y, width, height = 7) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor("#666");
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#000");
    doc.setFontSize(11);
    doc.text(value || "-", x, y + height);
  }

  const col1X = margin;
  const col2X = pageWidth / 2 + 10;
  const rowH = 14;

  let currentY = y;
  drawField("ADMISSION NO", student.admission_no?.toUpperCase(), col1X, currentY, 60);
  drawField("NAME", `${student.first_name?.toUpperCase()} ${student.last_name?.toUpperCase()}`, col2X, currentY, 80);
  currentY += rowH;

  drawField("GENDER", student.gender?.toUpperCase(), col1X, currentY, 60);
  drawField("DATE OF BIRTH", student.dob, col2X, currentY, 60);
  currentY += rowH;

  drawField("MOBILE", student.mobile, col1X, currentY, 60);
  drawField("WHATSAPP", student.whatsapp || "-", col2X, currentY, 60);
  currentY += rowH;

  drawField("EMAIL", student.email || "-", col1X, currentY, 120);
  currentY += rowH;

  drawField("ADDRESS", `${student.address?.toUpperCase()}, ${student.city?.toUpperCase()}, ${student.state?.toUpperCase()} ${student.pincode}`, col1X, currentY, 160);
  currentY += rowH + 4;

  drawField("SCHOOL", student.school_name?.toUpperCase(), col1X, currentY, 80);
  drawField("BOARD", student.board?.toUpperCase(), col2X, currentY, 60);
  currentY += rowH;

  drawField("STANDARD", student.standard?.toUpperCase(), col1X, currentY, 60);
  drawField("JOINING DATE", student.joining_date, col2X, currentY, 60);
  currentY += rowH;

  drawField("STATUS", student.status?.toUpperCase(), col1X, currentY, 60);
  currentY += rowH + 6;

  y = currentY;

  // ---- Parent / Guardian Details ----
  if (parents.length > 0) {
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor("#0D47A1");
    doc.text("PARENT / GUARDIAN DETAILS", margin, y);
    y += 8;

    // Loop through parents (usually one, but can be two)
    for (let i = 0; i < parents.length; i++) {
      const p = parents[i];
      const fatherName = p.father_name?.toUpperCase() || "-";
      const motherName = p.mother_name?.toUpperCase() || "-";
      const mobile = p.mobile || "-";
      const whatsapp = p.whatsapp || "-";
      const parentEmail = p.email || "-";
      const occupation = p.occupation?.toUpperCase() || "-";
      const parentAddress = p.address?.toUpperCase() || "-";

      // Use a two‑column layout for each parent
      let py = y;
      drawField("FATHER NAME", fatherName, col1X, py, 80);
      drawField("MOTHER NAME", motherName, col2X, py, 80);
      py += rowH;

      drawField("MOBILE", mobile, col1X, py, 60);
      drawField("WHATSAPP", whatsapp, col2X, py, 60);
      py += rowH;

      drawField("EMAIL", parentEmail, col1X, py, 80);
      drawField("OCCUPATION", occupation, col2X, py, 80);
      py += rowH;

      drawField("ADDRESS", parentAddress, col1X, py, 160);
      py += rowH + 4;

      y = py + 4;
    }
  }

  // ---------- PAGE 2: Batches, Fees, Rules, Signatures ----------
  doc.addPage();
  y = 25;

  // ---- Enrolled Batches ----
  if (batches?.length) {
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor("#0D47A1");
    doc.text("ENROLLED BATCHES", margin, y);
    y += 8;

    const batchBody = batches.map((b) => [
      b.batches?.batch_name?.toUpperCase() || "-",
      b.batches?.courses?.course_name?.toUpperCase() || "-",
    ]);
    autoTable(doc, {
      startY: y,
      head: [["BATCH NAME", "COURSE"]],
      body: batchBody,
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [13, 71, 161], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 80 } },
      margin: { left: margin },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ---- Fee Summary ----
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor("#0D47A1");
  doc.text("FEE SUMMARY", margin, y);
  y += 8;
  const pending = totalFee - paidAmount;
  autoTable(doc, {
    startY: y,
    head: [["TOTAL FEE", "PAID", "PENDING", "STATUS"]],
    body: [[
      `Rs. ${totalFee.toLocaleString()}`,
      `Rs. ${paidAmount.toLocaleString()}`,
      `Rs. ${pending.toLocaleString()}`,
      pending <= 0 ? "PAID" : "PENDING",
    ]],
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [13, 71, 161], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 40 }, 2: { cellWidth: 40 }, 3: { cellWidth: 30 } },
    margin: { left: margin },
  });
  y = doc.lastAutoTable.finalY + 12;

  // ---- Rules & Regulations ----
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor("#0D47A1");
  doc.text("RULES & REGULATIONS", margin, y);
  y += 8;

  const rules = [
    "1. Attendance of at least 75% is mandatory to appear in exams.",
    "2. Fees must be paid on or before the 10th of every month.",
    "3. Mobile phones are strictly prohibited inside classrooms.",
    "4. Students must wear the prescribed uniform and carry ID card.",
    "5. Disciplinary action will be taken for any misconduct.",
    "6. Parents must attend parent-teacher meetings regularly.",
    "7. Any damage to institute property will be charged accordingly.",
    "8. The institute reserves the right to amend these rules at any time."
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#333");
  doc.text(rules.join("\n"), margin, y, { maxWidth: pageWidth - 2 * margin });
  y += rules.length * 6 + 6;

  // ---- Signature Section ----
  y += 8;
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor("#0D47A1");
  doc.text("SIGNATURES", margin, y);
  y += 15;

  // Authorized Signatory
  doc.setDrawColor("#0D47A1");
  doc.line(margin, y, margin + 60, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#333");
  doc.text("AUTHORIZED SIGNATORY", margin + 30, y + 5, { align: "center" });

  // Parent's Signature
  doc.line(pageWidth - margin - 60, y, pageWidth - margin, y);
  doc.text("PARENT / GUARDIAN", pageWidth - margin - 30, y + 5, { align: "center" });

  // ---- Footer ----
  y += 22;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor("#999");
  doc.text(
    `Computer-generated admission form – ${academyName}`,
    pageWidth / 2,
    290,
    { align: "center" }
  );

  // Save
  doc.save(`Admission_${student.admission_no || studentId}.pdf`);
}