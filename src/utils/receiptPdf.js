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

function numberToWords(num) {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }

  return num === 0 ? "Zero" : convert(num);
}

// ─── Main generator ─────────────────────────────────────────────────────────
export async function generateReceiptPdf(receipt) {
  // 1. Fetch organization
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

  const logoBase64 = await loadImageAsBase64(logoUrl).catch(() => null);

  // 2. Fetch student data with medium, batch, course
  const studentId = receipt.students?.id;
  let mediumName = "", batchName = "", courseName = "";

  if (studentId) {
    const { data: s } = await supabase
      .from("students")
      .select("*, mediums(name)")
      .eq("id", studentId)
      .single();
    if (s) {
      mediumName = s.mediums?.name || "";
    }
    const { data: sb } = await supabase
      .from("student_batches")
      .select("batch_id, batches(batch_name, courses(course_name))")
      .eq("student_id", studentId)
      .eq("status", "active")
      .maybeSingle();
    if (sb) {
      batchName = sb.batches?.batch_name || "";
      courseName = sb.batches?.courses?.course_name || "";
    }
  }

  // 3. Fetch fee details, installments, and tax info
  const payment = receipt.fee_payments;
  let installments = [], totalFee = 0, paidSoFar = 0;
  let taxRateName = "", taxRateValue = 0, taxInclusive = true;
  let baseAmount = 0, taxAmount = 0;

  if (payment?.student_fee_id) {
    const { data: studentFee } = await supabase
      .from("student_fees")
      .select(`
        *,
        fee_structures!inner (
          fee_amount,
          tax_rate_id,
          tax_inclusive,
          tax_rates!fee_structures_tax_rate_id_fkey (name, rate)
        ),
        fee_installments(*)
      `)
      .eq("id", payment.student_fee_id)
      .single();

    if (studentFee) {
      totalFee = Number(studentFee.final_fee);
      installments = studentFee.fee_installments || [];
      const feeStructure = studentFee.fee_structures;
      if (feeStructure) {
        taxInclusive = feeStructure.tax_inclusive !== undefined ? feeStructure.tax_inclusive : true;
        const taxRate = feeStructure.tax_rates;
        if (taxRate) {
          taxRateName = taxRate.name || "";
          taxRateValue = Number(taxRate.rate) || 0;
        }
      }

      // Calculate paid so far
      const { data: allPayments } = await supabase
        .from("fee_payments")
        .select("amount")
        .eq("student_fee_id", payment.student_fee_id);
      paidSoFar = allPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    }
  }

  const amount = Number(receipt.amount);
  const amountWords = numberToWords(amount) + " Only";
  const balance = totalFee - paidSoFar;

  // Calculate tax breakdown for this payment if tax rate is available
  if (taxRateValue > 0) {
    const rate = taxRateValue / 100;
    if (taxInclusive) {
      // Amount includes tax
      baseAmount = amount / (1 + rate);
      taxAmount = amount - baseAmount;
    } else {
      // Tax added on top
      baseAmount = amount;
      taxAmount = amount * rate;
    }
    // Round to 2 decimal places
    baseAmount = Math.round(baseAmount * 100) / 100;
    taxAmount = Math.round(taxAmount * 100) / 100;
  } else {
    baseAmount = amount;
    taxAmount = 0;
  }

  // ─── Build PDF ──────────────────────────────────────────────────────────
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 20;

  // Header
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, y, 30, 30);
    doc.setFontSize(24);
    doc.setTextColor("#0D47A1");
    doc.text(academyName, margin + 35, y + 12);
    doc.setFontSize(9);
    doc.setTextColor("#616161");
    let lineY = y + 18;
    if (address) {
      doc.text(address, margin + 35, lineY);
      lineY += 5;
    }
    if (phone) {
      doc.text(`Phone: ${phone}`, margin + 35, lineY);
      lineY += 5;
    }
    if (email) {
      doc.text(`Email: ${email}`, margin + 35, lineY);
    }
  } else {
    doc.setFontSize(24);
    doc.setTextColor("#0D47A1");
    doc.text(academyName, margin, y + 8);
    doc.setFontSize(9);
    doc.setTextColor("#616161");
    let lineY = y + 14;
    if (address) doc.text(address, margin, lineY);
    lineY += 5;
    if (phone) doc.text(`Phone: ${phone}`, margin, lineY);
    lineY += 5;
    if (email) doc.text(`Email: ${email}`, margin, lineY);
  }
  y += 38;

  // Title
  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor("#0D47A1");
  doc.text("FEE RECEIPT", pageWidth / 2, y, { align: "center" });
  y += 12;

  // Student info box
  const studentName = `${receipt.students?.first_name || ""} ${receipt.students?.last_name || ""}`.trim();
  const infoLines = [
    `Student: ${studentName}`,
    `Admission No: ${receipt.students?.admission_no || "-"}`,
    mediumName ? `Medium: ${mediumName}` : null,
    batchName ? `Batch: ${batchName}` : null,
    courseName ? `Course: ${courseName}` : null,
  ].filter(Boolean);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#333");
  doc.text(infoLines, margin, y);
  y += infoLines.length * 5 + 4;

  // Receipt details table (includes tax breakdown)
  const receiptBody = [
    ["Receipt No", receipt.receipt_no],
    ["Date", receipt.receipt_date],
    ["Amount Paid", `₹${amount.toLocaleString("en-IN")}`],
    ["Amount in Words", amountWords],
  ];

  // Add tax details if applicable
  if (taxRateValue > 0) {
    receiptBody.push(["Tax Rate", `${taxRateName} (${taxRateValue}%)`]);
    receiptBody.push(["Base Amount", `₹${baseAmount.toLocaleString("en-IN")}`]);
    receiptBody.push(["Tax Amount", `₹${taxAmount.toLocaleString("en-IN")}`]);
    receiptBody.push(["Total (incl. tax)", `₹${amount.toLocaleString("en-IN")}`]);
  }

  receiptBody.push(["Payment Mode", payment?.payment_mode || "N/A"]);
  if (payment?.transaction_no) receiptBody.push(["Transaction No", payment.transaction_no]);
  if (payment?.cheque_no) receiptBody.push(["Cheque No", payment.cheque_no]);
  if (payment?.remarks) receiptBody.push(["Remarks", payment.remarks]);

  autoTable(doc, {
    startY: y,
    head: [["Field", "Details"]],
    body: receiptBody,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: "#0D47A1", textColor: "#FFFFFF" },
    columnStyles: { 0: { cellWidth: 50 } },
    margin: { left: margin, right: margin },
  });
  y = doc.lastAutoTable.finalY + 10;

  // Installment breakdown (if any)
  if (installments.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor("#0D47A1");
    doc.text("Installment Details", margin, y);
    y += 6;

    const installmentBody = installments.map((inst) => [
      inst.due_date || "-",
      `₹${Number(inst.amount).toLocaleString("en-IN")}`,
      inst.status || "pending",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Due Date", "Amount", "Status"]],
      body: installmentBody,
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: "#0D47A1", textColor: "#FFFFFF" },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 8;

    // Fee summary
    autoTable(doc, {
      startY: y,
      head: [["Total Fee", "Paid Till Date", "Balance"]],
      body: [[
        `₹${totalFee.toLocaleString("en-IN")}`,
        `₹${paidSoFar.toLocaleString("en-IN")}`,
        `₹${balance.toLocaleString("en-IN")}`,
      ]],
      theme: "grid",
      styles: { fontSize: 10, fontStyle: "bold" },
      headStyles: { fillColor: "#0D47A1", textColor: "#FFFFFF" },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 12;
  }

  // Signature
  doc.setFontSize(10);
  doc.setTextColor("#333");
  doc.text("Authorized Signatory", margin, y);
  doc.line(margin, y + 6, margin + 40, y + 6);
  doc.text("Parent / Guardian", pageWidth - margin - 40, y);
  doc.line(pageWidth - margin - 40, y + 6, pageWidth - margin, y + 6);
  y += 15;

  // Notes
  doc.setFontSize(8);
  doc.setTextColor("#777");
  doc.text("* This is a computer-generated receipt and does not require a physical signature.", margin, y);
  y += 5;
  doc.text("* Payment subject to realisation.", margin, y);
  y += 5;
  doc.text("* Please retain this receipt for future reference.", margin, y);

  // Footer
  const footerY = pageHeight - 12;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor("#999");
  doc.text(
    `${academyName} – ${address}`,
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  doc.save(`Receipt_${receipt.receipt_no}.pdf`);
}