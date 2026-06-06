import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../api/supabase";

// Helper: load image as base64
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

// Convert number to Indian English words
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

export async function generateReceiptPdf(receipt) {
  // 1. Fetch full organization details
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
  const logoBase64 = await loadImageAsBase64(logoUrl).catch(() => null);

  // 3. Create PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  // ---------- Header ----------
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, y, 30, 30);
    doc.setFontSize(24);
    doc.setTextColor("#0D47A1");
    doc.text(academyName, margin + 35, y + 12);
    doc.setFontSize(10);
    doc.setTextColor("#616161");
    // Contact details
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
    y += 6;
    // Fallback contact lines
    doc.setFontSize(10);
    doc.setTextColor("#616161");
    if (address) doc.text(address, margin, y + 14);
    if (phone) doc.text(`Phone: ${phone}`, margin, y + 19);
    if (email) doc.text(`Email: ${email}`, margin, y + 24);
  }
  y += 35;

  // Decorative line
  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // "Fee Receipt" title
  doc.setFontSize(14);
  doc.setTextColor("#0D47A1");
  doc.text("FEE RECEIPT", pageWidth / 2, y, { align: "center" });
  y += 10;

  // ---------- Receipt Details Table ----------
  const amount = Number(receipt.amount);
  const amountWords = numberToWords(amount) + " Only";

  const body = [
    ["Receipt No", receipt.receipt_no],
    ["Date", receipt.receipt_date],
    ["Student", `${receipt.students?.first_name} ${receipt.students?.last_name} (${receipt.students?.admission_no})`],
    ["Amount Paid", `₹${amount.toLocaleString("en-IN")}`],
    ["Amount in Words", amountWords],
    ["Payment Mode", receipt.fee_payments?.payment_mode || "N/A"],
    ...(receipt.fee_payments?.transaction_no
      ? [["Transaction No", receipt.fee_payments.transaction_no]]
      : []),
  ];

  autoTable(doc, {
    startY: y,
    head: [["Field", "Details"]],
    body,
    theme: "grid",
    styles: { fontSize: 10 },
    headStyles: { fillColor: [13, 71, 161], textColor: 255 },
    columnStyles: { 0: { cellWidth: 50 } },
    margin: { left: margin, right: margin },
  });
  y = doc.lastAutoTable.finalY + 12;

  // ---------- Signature Section ----------
  doc.setFontSize(10);
  doc.setTextColor("#333");
  doc.text("Authorized Signatory", margin, y);
  doc.line(margin, y + 6, margin + 40, y + 6);   // signature line
  doc.text("Parent / Guardian", pageWidth - margin - 40, y);
  doc.line(pageWidth - margin - 40, y + 6, pageWidth - margin, y + 6);
  y += 15;

  // ---------- Notes ----------
  doc.setFontSize(8);
  doc.setTextColor("#777");
  doc.text("* This is a computer-generated receipt and does not require a physical signature.", margin, y);
  y += 5;
  doc.text("* Payment subject to realization of cheque / UPI.", margin, y);
  y += 5;
  doc.text("* Please retain this receipt for future reference.", margin, y);

  // ---------- Footer ----------
  doc.setFontSize(8);
  doc.setTextColor("#9A9C9B");
  doc.text(
    `${academyName} – ${address}`,
    pageWidth / 2,
    290,
    { align: "center" }
  );

  // Save the PDF
  doc.save(`Receipt_${receipt.receipt_no}.pdf`);
}