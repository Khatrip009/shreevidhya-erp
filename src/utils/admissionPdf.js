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
  // 0. Fetch organization details (dark logo + company name)
  const { data: org } = await supabase
    .from("organization")
    .select("logo_dark_url, company_name")
    .eq("id", 1)
    .single();

  const logoUrl = org?.logo_dark_url || "/ShreeVidhyaDark.png";
  const academyName = org?.company_name || "ShreeVidhya Academy";

  // 1. Fetch all student data
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .single();
  if (!student) throw new Error("Student not found");

  const { data: parentLinks } = await supabase
    .from("student_parents")
    .select("parent_id, relation, parents(*)")
    .eq("student_id", studentId);
  const parents = parentLinks?.map((l) => l.parents) || [];

  const { data: batches } = await supabase
    .from("student_batches")
    .select(`batch_id, batches(course_id, courses(course_name), batch_name)`)
    .eq("student_id", studentId)
    .eq("status", "active");

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

  // 2. Load logo and student photo as base64
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

  // 3. Build PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  // --- Header with Logo and Academy Name ---
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, y, 30, 30);
    doc.setFontSize(22);
    doc.setTextColor("#0D47A1");
    doc.text(academyName, margin + 35, y + 10);
    doc.setFontSize(12);
    doc.setTextColor("#616161");
    doc.text("Admission Form", margin + 35, y + 18);
  } else {
    doc.setFontSize(22);
    doc.setTextColor("#0D47A1");
    doc.text(academyName, margin, y + 8);
    doc.setFontSize(12);
    doc.setTextColor("#616161");
    doc.text("Admission Form", margin, y + 16);
  }
  y += 35;

  // Decorative line
  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // --- Student Photo (top-right) ---
  if (photoBase64) {
    doc.addImage(photoBase64, "PNG", pageWidth - margin - 30, 20, 30, 30);
  }

  // --- Student Information Section ---
  doc.setFontSize(14);
  doc.setTextColor("#0D47A1");
  doc.text("Student Information", margin, y);
  y += 8;

  const studentBody = [
    ["Admission No", student.admission_no || "-"],
    ["Name", `${student.first_name} ${student.last_name}`],
    ["Gender", student.gender || "-"],
    ["Date of Birth", student.dob || "-"],
    ["Mobile", student.mobile],
    ["Email", student.email || "-"],
    ["Address", `${student.address || ""}, ${student.city || ""}, ${student.state || ""} ${student.pincode || ""}`],
    ["School", student.school_name || "-"],
    ["Board", student.board || "-"],
    ["Standard", student.standard || "-"],
    ["Joining Date", student.joining_date || "-"],
    ["Status", student.status],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Field", "Details"]],
    body: studentBody,
    theme: "grid",
    styles: { fontSize: 10 },
    headStyles: { fillColor: [13, 71, 161], textColor: 255 },
    columnStyles: { 0: { cellWidth: 50 } },
    margin: { left: margin },
  });
  y = doc.lastAutoTable.finalY + 10;

  // --- Parents Section ---
  if (parents.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor("#0D47A1");
    doc.text("Parent / Guardian Details", margin, y);
    y += 8;
    const parentBody = parents.map((p) => [
      `${p.father_name || "-"} / ${p.mother_name || "-"}`,
      p.mobile,
      p.email || "-",
      p.occupation || "-",
    ]);
    autoTable(doc, {
      startY: y,
      head: [["Name", "Mobile", "Email", "Occupation"]],
      body: parentBody,
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [13, 71, 161], textColor: 255 },
      margin: { left: margin },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // --- Batches Section ---
  if (batches?.length) {
    doc.setFontSize(14);
    doc.setTextColor("#0D47A1");
    doc.text("Enrolled Batches", margin, y);
    y += 8;
    const batchBody = batches.map((b) => [
      b.batches?.batch_name,
      b.batches?.courses?.course_name || "-",
    ]);
    autoTable(doc, {
      startY: y,
      head: [["Batch Name", "Course"]],
      body: batchBody,
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [13, 71, 161], textColor: 255 },
      margin: { left: margin },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // --- Fee Summary Section ---
  doc.setFontSize(14);
  doc.setTextColor("#0D47A1");
  doc.text("Fee Summary", margin, y);
  y += 8;
  const pending = totalFee - paidAmount;
  autoTable(doc, {
    startY: y,
    head: [["Total Fee", "Paid", "Pending", "Status"]],
    body: [[
      `Rs. ${totalFee.toLocaleString()}`,
      `Rs. ${paidAmount.toLocaleString()}`,
      `Rs. ${pending.toLocaleString()}`,
      pending <= 0 ? "Paid" : "Pending",
    ]],
    theme: "grid",
    styles: { fontSize: 10 },
    headStyles: { fillColor: [13, 71, 161], textColor: 255 },
    margin: { left: margin },
  });

  // --- Footer ---
  doc.setFontSize(8);
  doc.setTextColor("#9A9C9B");
  doc.text(`Computer-generated admission form – ${academyName}`, pageWidth / 2, 290, { align: "center" });

  // Save the PDF
  doc.save(`Admission_${student.admission_no || studentId}.pdf`);
}