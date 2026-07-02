// src/utils/receiptPdf.js
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../api/supabase";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

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

function createRupeeSymbolImage() {
  const canvas = document.createElement('canvas');
  canvas.width = 30;
  canvas.height = 30;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 24px serif';
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('₹', 15, 15);
  return canvas.toDataURL('image/png');
}

let rupeeImage = null;
function getRupeeImage() {
  if (!rupeeImage) rupeeImage = createRupeeSymbolImage();
  return rupeeImage;
}

/**
 * Draw a currency amount at (x, y) with the ₹ symbol.
 */
function drawCurrency(doc, amount, x, y, fontSize = 10, align = 'left', color = '#333') {
  const img = getRupeeImage();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(color);

  const amountText = amount.toLocaleString('en-IN');
  if (align === 'left') {
    doc.addImage(img, 'PNG', x, y - fontSize * 0.35, 4, 4);
    doc.text(amountText, x + 5, y);
  } else {
    const textWidth = doc.getTextWidth(amountText);
    doc.addImage(img, 'PNG', x - textWidth - 5, y - fontSize * 0.35, 4, 4);
    doc.text(amountText, x - textWidth, y);
  }
}

/**
 * Convert a number to Indian English words.
 */
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

/* ------------------------------------------------------------------ */
/*  Main PDF Generator                                                */
/* ------------------------------------------------------------------ */
export async function generateReceiptPdf(receipt) {
  // ---------- 1. Organisation ----------
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

  // ---------- 2. Student details ----------
  const studentId = receipt.students?.id;
  let mediumName = "", batchName = "", courseName = "";

  if (studentId) {
    const { data: s } = await supabase
      .from("students")
      .select("*, mediums(name)")
      .eq("id", studentId)
      .single();
    if (s) mediumName = s.mediums?.name || "";

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

  // ---------- 3. Fee data, tax, installments ----------
  const payment = receipt.fee_payments;
  let installments = [], totalFee = 0, paidSoFar = 0;
  let taxRateName = "", taxRateValue = 0, taxInclusive = true;
  let baseAmount = 0, taxAmount = 0, totalDisplay = 0;

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

  if (taxRateValue > 0) {
    const rate = taxRateValue / 100;
    if (taxInclusive) {
      baseAmount = amount / (1 + rate);
      taxAmount = amount - baseAmount;
      totalDisplay = amount;
    } else {
      baseAmount = amount;
      taxAmount = amount * rate;
      totalDisplay = amount + taxAmount;
    }
    baseAmount = Math.round(baseAmount * 100) / 100;
    taxAmount = Math.round(taxAmount * 100) / 100;
    totalDisplay = Math.round(totalDisplay * 100) / 100;
  } else {
    baseAmount = amount;
    taxAmount = 0;
    totalDisplay = amount;
  }

  // ─── PDF Setup ────────────────────────────────────────────────
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 20;

  // ========== HEADER ==========
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, y, 30, 30);
    doc.setFontSize(24);
    doc.setTextColor("#0D47A1");
    doc.text(academyName, margin + 35, y + 12);
    doc.setFontSize(9);
    doc.setTextColor("#616161");
    let lineY = y + 18;
    if (address) { doc.text(address, margin + 35, lineY); lineY += 5; }
    if (phone)   { doc.text(`Phone: ${phone}`, margin + 35, lineY); lineY += 5; }
    if (email)   { doc.text(`Email: ${email}`, margin + 35, lineY); }
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

  // ========== TWO‑COLUMN INFO (Student left, Receipt No/Date right) ==========
  const leftColX = margin;
  const rightColX = pageWidth - margin - 60;
  const studentName = `${receipt.students?.first_name || ""} ${receipt.students?.last_name || ""}`.trim();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor("#0D47A1");
  doc.text("Student Details", leftColX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#333");
  doc.text(`Student: ${studentName}`, leftColX, y + 6);
  doc.text(`Admission No: ${receipt.students?.admission_no || "-"}`, leftColX, y + 11);
  if (courseName) doc.text(`Course: ${courseName}`, leftColX, y + 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor("#0D47A1");
  doc.text("Receipt Details", rightColX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#333");
  doc.text(`Receipt No: ${receipt.receipt_no}`, rightColX, y + 6);
  doc.text(`Date: ${receipt.receipt_date}`, rightColX, y + 11);

  const studentBlockLines = courseName ? 3 : 2;
  y += 10 + studentBlockLines * 6;

  // ========== ITEM TABLE ==========
  const itemBody = [];
  // Main fee payment row
  itemBody.push({ sr: "1", desc: "Fee Payment", amount: amount });
  // Tax rows if applicable
  if (taxRateValue > 0) {
    itemBody.push({ sr: "", desc: `Base Amount (${taxRateName} ${taxRateValue}%)`, amount: baseAmount });
    itemBody.push({ sr: "", desc: "Tax Amount", amount: taxAmount });
  }

  // Plain strings for autoTable (we'll replace amount cells with rupee symbol via didDrawCell)
  const tableRows = itemBody.map(item => [item.sr, item.desc, item.amount.toLocaleString('en-IN')]);

  autoTable(doc, {
    startY: y,
    head: [["Sr. No.", "Description", "Amount"]],
    body: tableRows,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: "#0D47A1", textColor: "#FFFFFF" },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 40, halign: 'right' }
    },
    margin: { left: margin, right: margin },
    didDrawCell: (data) => {
      // Only for the Amount column (index 2)
      if (data.column.index === 2 && data.cell.raw) {
        const raw = data.cell.raw;
        // raw might be a string like "4,200" – we need the numeric value
        const num = parseFloat(raw.replace(/,/g, ''));
        if (!isNaN(num)) {
          const cell = data.cell;
          const x = cell.x + 2; // small offset inside cell
          const y = cell.y + cell.height / 2 + 1.5; // vertically centered
          // Clear the text (will be overwritten by our image+text)
          // We could set the cell text to empty string, but easier to just draw over
          doc.setFillColor(255, 255, 255);
          doc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
          drawCurrency(doc, num, x, y, 9, 'left', '#333');
        }
      }
    }
  });
  y = doc.lastAutoTable.finalY + 8;

  // ========== TOTALS & PAYMENT INFO (stacked vertically) ==========
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, pageWidth - 2 * margin, 30, 'F');

  // Total Amount Paid (left)
  const totalX = margin + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor("#0D47A1");
  doc.text("Total Amount Paid:", totalX, y + 10);
  drawCurrency(doc, totalDisplay, totalX + 60, y + 10, 13, 'left', '#0D47A1');

  // Amount in words (below total)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor("#555");
  doc.text(`In Words: ${amountWords}`, totalX, y + 19);

  // Payment details (right side, but below total row to avoid overlap)
  // We'll stack them in a small column on the right within the same rectangle
  const detailsX = pageWidth - margin - 75;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#333");
  let detailY = y + 8;
  doc.text(`Payment Mode: ${payment?.payment_mode || "N/A"}`, detailsX, detailY);
  detailY += 5;
  doc.text(`Transaction No: ${payment?.transaction_no || "-"}`, detailsX, detailY);
  if (payment?.remarks) {
    detailY += 5;
    doc.text(`Remarks: ${payment.remarks}`, detailsX, detailY);
  }

  y += 35;

  // ========== SIGNATURES & NOTES ==========
  y += 5;
  doc.setFontSize(10);
  doc.setTextColor("#333");
  doc.text("Authorized Signatory", margin, y);
  doc.line(margin, y + 6, margin + 40, y + 6);
  doc.text("Parent / Guardian", pageWidth - margin - 40, y);
  doc.line(pageWidth - margin - 40, y + 6, pageWidth - margin, y + 6);
  y += 15;

  doc.setFontSize(8);
  doc.setTextColor("#777");
  doc.text("* This is a computer-generated receipt.", margin, y);
  y += 5;
  doc.text("* Payment subject to realisation.", margin, y);

  // Footer
  const footerY = pageHeight - 12;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor("#999");
  doc.text(`${academyName} – ${address}`, pageWidth / 2, footerY, { align: "center" });

  // ========== PAGE 2 – INSTALLMENTS & FEE SUMMARY (if any) ==========
  if (installments.length > 0) {
    doc.addPage();
    y = 25;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor("#0D47A1");
    doc.text("Installment Details", margin, y);
    y += 8;

    const installmentBody = installments.map((inst, i) => [
      i + 1,
      inst.due_date || "-",
      Number(inst.amount).toLocaleString('en-IN'),
      inst.status || "pending",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Sr.", "Due Date", "Amount", "Status"]],
      body: installmentBody,
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: "#0D47A1", textColor: "#FFFFFF" },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 35 },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 30 },
      },
      margin: { left: margin, right: margin },
      didDrawCell: (data) => {
        // Amount column (index 2)
        if (data.column.index === 2 && data.cell.raw) {
          const raw = data.cell.raw;
          const num = parseFloat(raw.replace(/,/g, ''));
          if (!isNaN(num)) {
            const cell = data.cell;
            drawCurrency(doc, num, cell.x + 2, cell.y + cell.height / 2 + 1.5, 9, 'left', '#333');
          }
        }
      }
    });
    y = doc.lastAutoTable.finalY + 12;

    // Fee Summary
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Fee Summary", margin, y);
    y += 8;

    const summaryBody = [
      ["Total Fee", totalFee.toLocaleString('en-IN')],
      ["Paid Till Date", paidSoFar.toLocaleString('en-IN')],
      ["Balance", balance.toLocaleString('en-IN')],
    ];

    autoTable(doc, {
      startY: y,
      head: [["Description", "Amount"]],
      body: summaryBody,
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: "#0D47A1", textColor: "#FFFFFF" },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 50, halign: 'right' }
      },
      margin: { left: margin, right: margin },
      didDrawCell: (data) => {
        if (data.column.index === 1 && data.cell.raw) {
          const raw = data.cell.raw;
          const num = parseFloat(raw.replace(/,/g, ''));
          if (!isNaN(num)) {
            const cell = data.cell;
            drawCurrency(doc, num, cell.x + 2, cell.y + cell.height / 2 + 1.5, 10, 'left', '#333');
          }
        }
      }
    });
  }

  doc.save(`Receipt_${receipt.receipt_no}.pdf`);
}