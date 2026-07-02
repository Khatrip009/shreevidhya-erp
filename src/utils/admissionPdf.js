import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../api/supabase";

// ---------------------------------------------------------------------------
// Helper: load an image from a URL and return a base64 data URL
// ---------------------------------------------------------------------------
async function loadImageAsBase64(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load image: ${url}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---------------------------------------------------------------------------
// Main PDF generation function
// ---------------------------------------------------------------------------
export async function generateAdmissionPdf(studentId) {
  // ---------- 1. Organisation details ----------
  const { data: org } = await supabase
    .from("organization")
    .select("logo_dark_url, company_name, address, phone, email, website")
    .eq("id", 1)
    .single();

  const logoUrl = org?.logo_dark_url || "/ShreeVidhyaDark.png";
  const academyName = org?.company_name?.toUpperCase() || "SHREEVIDHYA ACADEMY";
  const address = org?.address || "";
  const phone = org?.phone || "";
  const email = org?.email || "";
  const website = org?.website || "";

  // ---------- 2. Student data (with medium) ----------
  const { data: student } = await supabase
    .from("students")
    .select("*, mediums(name)")
    .eq("id", studentId)
    .single();
  if (!student) throw new Error("Student not found");

  const mediumName = student.mediums?.name || "";

  // ---------- 3. Parents ----------
  const { data: parentLinks } = await supabase
    .from("student_parents")
    .select("parent_id, relation, parents(*)")
    .eq("student_id", studentId);
  const parents = parentLinks?.map((l) => l.parents) || [];

  // ---------- 4. Enrolled batches ----------
  const { data: batches } = await supabase
    .from("student_batches")
    .select(`batch_id, enrollment_date, batches(course_id, courses(course_name), batch_name)`)
    .eq("student_id", studentId)
    .eq("status", "active");

  // ---------- 5. Fee summary (FIXED: added `id`) ----------
  const { data: fees } = await supabase
    .from("student_fees")
    .select("id, final_fee, status, fee_structures(fee_amount)")   // <-- id added
    .eq("student_id", studentId);

  let totalFee = 0;
  let paidAmount = 0;
  if (fees) {
    for (const f of fees) {
      totalFee += Number(f.final_fee);
      const { data: payments } = await supabase
        .from("fee_payments")
        .select("amount")
        .eq("student_fee_id", f.id);   // now f.id is defined
      paidAmount += payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    }
  }
  const pendingAmount = totalFee - paidAmount;

  // ---------- 6. Load images ----------
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

  // ---------- 7. Build PDF ----------
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 15;

  // ---------- WATERMARK (faint logo) ----------
  if (logoBase64) {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.04 }));
    const cx = pageWidth / 2;
    const cy = pageHeight / 2;
    doc.addImage(logoBase64, "PNG", cx - 55, cy - 55, 110, 110);
    doc.restoreGraphicsState();
  }

  // ---------- HEADER (light blue background) ----------
  doc.setFillColor("#E3F2FD");
  doc.rect(0, 0, pageWidth, 38, "F");

  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, 5, 28, 28);
  }

  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor("#0D47A1");
  doc.text(academyName, margin + 33, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let headerY = 22;
  if (address) {
    doc.text(address, margin + 33, headerY);
    headerY += 3.5;
  }
  if (phone) {
    doc.text(`Ph: ${phone}`, margin + 33, headerY);
    headerY += 3.5;
  }
  if (email || website) {
    doc.text(`${email ? email + (website ? " | " : "") : ""}${website}`, margin + 33, headerY);
  }

  y = 45;

  // ---------- FORM TITLE ----------
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor("#0D47A1");
  doc.text("ADMISSION FORM", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ---------- STUDENT PHOTO (top right) ----------
  if (photoBase64) {
    doc.addImage(photoBase64, "PNG", pageWidth - margin - 28, y, 28, 28);
    doc.setDrawColor("#0D47A1");
    doc.setLineWidth(0.5);
    doc.rect(pageWidth - margin - 28, y, 28, 28);
  }

  // ---------- STUDENT INFORMATION (table layout) ----------
  const infoRows = [
    ["Admission No", student.admission_no?.toUpperCase() || "-"],
    ["Name", `${student.first_name?.toUpperCase()} ${student.last_name?.toUpperCase()}`],
    ["Gender", student.gender?.toUpperCase() || "-"],
    ["Date of Birth", student.dob || "-"],
    ["Mobile", student.mobile],
    ["WhatsApp", student.whatsapp || "-"],
    ["Email", student.email || "-"],
    ["Address", `${student.address?.toUpperCase() || ""}, ${student.city?.toUpperCase() || ""}, ${student.state?.toUpperCase() || ""} ${student.pincode || ""}`],
    ["School", student.school_name?.toUpperCase() || "-"],
    ["Board", student.board?.toUpperCase() || "-"],
    ["Standard", student.standard?.toUpperCase() || "-"],
    ["Joining Date", student.joining_date || "-"],
    ["Status", student.status?.toUpperCase() || "-"],
  ];

  if (mediumName) {
    infoRows.push(["Medium", mediumName.toUpperCase()]);
  }

  const tableMarginLeft = margin;
  const tableMarginRight = photoBase64 ? pageWidth - margin - 32 : margin;

  autoTable(doc, {
    startY: y,
    body: infoRows.map(([label, value]) => [
      { content: label, styles: { fontStyle: "bold", fillColor: "#E3F2FD", textColor: "#0D47A1" } },
      value,
    ]),
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: "auto" },
    },
    margin: { left: tableMarginLeft, right: tableMarginRight },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ---------- PARENT / GUARDIAN DETAILS ----------
  if (parents.length > 0) {
    for (let i = 0; i < parents.length; i++) {
      const p = parents[i];
      const parentRows = [
        ["Father Name", p.father_name?.toUpperCase() || "-"],
        ["Mother Name", p.mother_name?.toUpperCase() || "-"],
        ["Mobile", p.mobile || "-"],
        ["WhatsApp", p.whatsapp || "-"],
        ["Email", p.email || "-"],
        ["Occupation", p.occupation?.toUpperCase() || "-"],
        ["Address", p.address?.toUpperCase() || "-"],
      ];

      autoTable(doc, {
        startY: y,
        body: parentRows.map(([label, value]) => [
          { content: label, styles: { fontStyle: "bold", fillColor: "#E3F2FD", textColor: "#0D47A1" } },
          value,
        ]),
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: "auto" },
        },
        margin: { left: margin, right: margin },
        showHead: false,
      });
      doc.setFont("times", "bold");
      doc.setFontSize(13);
      doc.setTextColor("#0D47A1");
      doc.text("PARENT / GUARDIAN DETAILS", margin, y - 6);
      y = doc.lastAutoTable.finalY + 10;
    }
  }

  // ---------- NEW PAGE for batches, fees, rules ----------
  doc.addPage();
  y = 20;

  // ---------- ENROLLED BATCHES ----------
  if (batches?.length) {
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor("#0D47A1");
    doc.text("ENROLLED BATCHES", margin, y);
    y += 7;

    const batchBody = batches.map((b) => [
      b.batches?.batch_name?.toUpperCase() || "-",
      b.batches?.courses?.course_name?.toUpperCase() || "-",
      b.enrollment_date || "-",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["BATCH NAME", "COURSE", "ENROLLMENT DATE"]],
      body: batchBody,
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: "#0D47A1", textColor: "#FFFFFF", fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 50 }, 2: { cellWidth: 35 } },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ---------- FEE SUMMARY ----------
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor("#0D47A1");
  doc.text("FEE SUMMARY", margin, y);
  y += 7;

  autoTable(doc, {
    startY: y,
    head: [["TOTAL FEE", "PAID", "PENDING", "STATUS"]],
    body: [[
      `Rs. ${totalFee.toLocaleString()}`,
      `Rs. ${paidAmount.toLocaleString()}`,
      `Rs. ${pendingAmount.toLocaleString()}`,
      pendingAmount <= 0 ? "PAID" : "PENDING",
    ]],
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: "#0D47A1", textColor: "#FFFFFF", fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 40 }, 2: { cellWidth: 40 }, 3: { cellWidth: 30 } },
    margin: { left: margin },
  });
  y = doc.lastAutoTable.finalY + 12;

  // ---------- RULES & REGULATIONS ----------
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor("#0D47A1");
  doc.text("RULES & REGULATIONS", margin, y);
  y += 7;

  const rules = [
    "1. Minimum 75% attendance is mandatory to appear in exams.",
    "2. Fees must be paid on or before the 10th of every month.",
    "3. Mobile phones are strictly prohibited inside classrooms.",
    "4. Students must wear the prescribed uniform and carry ID card.",
    "5. Disciplinary action will be taken for any misconduct.",
    "6. Parents must attend parent-teacher meetings regularly.",
    "7. Any damage to institute property will be charged accordingly.",
    "8. The institute reserves the right to amend these rules at any time.",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#333");
  rules.forEach((rule, idx) => {
    doc.text(rule, margin, y + idx * 5.5);
  });
  y += rules.length * 5.5 + 10;

  // ---------- SIGNATURE SECTION ----------
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor("#0D47A1");
  doc.text("SIGNATURES", margin, y);
  y += 12;

  doc.setDrawColor("#0D47A1");
  doc.line(margin, y, margin + 60, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#333");
  doc.text("AUTHORISED SIGNATORY", margin + 30, y + 5, { align: "center" });

  doc.line(pageWidth - margin - 60, y, pageWidth - margin, y);
  doc.text("PARENT / GUARDIAN", pageWidth - margin - 30, y + 5, { align: "center" });

  // ---------- FOOTER ----------
  const footerY = pageHeight - 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor("#999");
  doc.text(`This is a computer-generated document issued by ${academyName}.`, pageWidth / 2, footerY, { align: "center" });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, footerY, { align: "right" });
  }

  doc.save(`Admission_${student.admission_no || studentId}.pdf`);
}