import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../api/supabase";

// Load image as base64
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

export async function generateReceiptPdf(receipt) {
  // 1. Fetch organization details
  const { data: org } = await supabase
    .from("organization")
    .select("logo_dark_url, company_name")
    .eq("id", 1)
    .single();

  const logoUrl = org?.logo_dark_url || "/ShreeVidhyaDark.png";
  const academyName = org?.company_name || "ShreeVidhya Academy";

  // 2. Load logo
  const logoBase64 = await loadImageAsBase64(logoUrl).catch(() => null);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  // Header with logo and academy name
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, y, 30, 30);
    doc.setFontSize(22);
    doc.setTextColor("#0D47A1");
    doc.text(academyName, margin + 35, y + 10);
    doc.setFontSize(12);
    doc.setTextColor("#616161");
    doc.text("Fee Receipt", margin + 35, y + 18);
  } else {
    doc.setFontSize(22);
    doc.setTextColor("#0D47A1");
    doc.text(academyName, margin, y + 8);
    doc.setFontSize(12);
    doc.setTextColor("#616161");
    doc.text("Fee Receipt", margin, y + 16);
  }
  y += 40;

  // Decorative line
  doc.setDrawColor("#0D47A1");
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Receipt details table
  const body = [
    ["Receipt No", receipt.receipt_no],
    ["Date", receipt.receipt_date],
    ["Student", `${receipt.students?.first_name} ${receipt.students?.last_name} (${receipt.students?.admission_no})`],
    ["Amount Paid", `₹${Number(receipt.amount).toLocaleString("en-IN")}`],
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

  // Footer
  doc.setFontSize(8);
  doc.setTextColor("#9A9C9B");
  doc.text(
    `Computer-generated receipt – ${academyName}`,
    pageWidth / 2,
    290,
    { align: "center" }
  );

  doc.save(`Receipt_${receipt.receipt_no}.pdf`);
}