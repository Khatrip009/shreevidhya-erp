import { jsPDF, GState } from "jspdf";
import autoTable from "jspdf-autotable";
import { getOrganization } from "../services/organizationService";
import { supabase } from "../api/supabase";

// Currency formatter
const formatCurrency = (amount) => `Rs.${amount.toLocaleString("en-IN")}`;

// Convert number to Indian words (up to 10 crores and beyond)
function numberToWords(num) {
  if (num === 0) return "Zero";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];
  const getWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + getWords(n % 100) : "");
    if (n < 100000) return getWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + getWords(n % 1000) : "");
    if (n < 10000000) return getWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + getWords(n % 100000) : "");
    return getWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + getWords(n % 10000000) : "");
  };
  const integerPart = Math.abs(Math.round(num));
  const paise = Math.round((Math.abs(num) - integerPart) * 100);
  let word = getWords(integerPart);
  if (paise > 0) word += " and " + getWords(paise) + " Paise";
  if (num < 0) word = "Minus " + word;
  return word + " Only";
}

// Fetch detailed income rows
async function fetchDetailedIncomes(startDate, endDate) {
  const { data, error } = await supabase
    .from("income")
    .select("income_date, category, description, payment_mode, amount")
    .gte("income_date", startDate)
    .lte("income_date", endDate)
    .order("income_date");
  if (error) throw error;
  return data || [];
}

// Fetch detailed expense rows
async function fetchDetailedExpenses(startDate, endDate) {
  const { data, error } = await supabase
    .from("expenses")
    .select("expense_date, category, description, bill_number, payment_mode, amount")
    .gte("expense_date", startDate)
    .lte("expense_date", endDate)
    .order("expense_date");
  if (error) throw error;
  return data || [];
}

// Draw horizontal bar chart for category‑amount pairs
function drawCategoryBarChart(doc, startY, items, title, color) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxBarWidth = 120;
  const lineHeight = 10;
  const barX = margin + 70;
  const maxAmount = Math.max(...items.map((it) => it.amount), 1);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor("#0D47A1");
  doc.text(title, margin, startY);
  startY += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  items.forEach((item) => {
    if (startY > doc.internal.pageSize.getHeight() - 25) {
      doc.addPage();
      startY = 20;
    }
    const barWidth = (item.amount / maxAmount) * maxBarWidth;
    doc.setTextColor("#1F2937");
    doc.text(item.category, margin, startY + 4);
    doc.setFillColor(color);
    doc.rect(barX, startY, barWidth, 7, "F");
    doc.text(formatCurrency(item.amount), barX + barWidth + 5, startY + 4);
    startY += lineHeight;
  });
  return startY;
}

// Main export function
export async function generateProfitLossPdf(summary, startDate, endDate, periodLabel) {
  const org = await getOrganization();
  const incomes = await fetchDetailedIncomes(startDate, endDate);
  const expenses = await fetchDetailedExpenses(startDate, endDate);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Watermark
  if (org?.logo_dark_url) {
    try {
      const imgData = await fetch(org.logo_dark_url)
        .then((r) => r.blob())
        .then((blob) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }));
      doc.setGState(new GState({ opacity: 0.05 }));
      doc.addImage(imgData, "PNG", (pageWidth - 90) / 2, (pageHeight - 90) / 2, 90, 90);
      doc.setGState(new GState({ opacity: 1 }));
    } catch (e) {}
  }

  // Header with logo
  if (org?.logo_dark_url) {
    try {
      const logoImg = await fetch(org.logo_dark_url)
        .then((r) => r.blob())
        .then((blob) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }));
      doc.addImage(logoImg, "PNG", 14, 8, 30, 30);
    } catch (e) {}
  }

  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor("#0D47A1");
  doc.text(org?.name || "ShreeVidhya Academy", 50, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#4B5563");
  doc.text(org?.address || "", 50, 30);
  if (org?.phone) doc.text(`Phone: ${org.phone}`, 50, 37);
  if (org?.email) doc.text(`Email: ${org.email}`, 50, 44);

  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor("#0D47A1");
  doc.text("Profit & Loss Statement", pageWidth / 2, 55, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor("#4B5563");
  doc.text(`Period: ${periodLabel}`, pageWidth / 2, 65, { align: "center" });

  // Summary cards
  const cardY = 78;
  const cardW = 85;
  const gap = 10;
  const startX = 14;
  doc.setFillColor("#F0F7FF");
  doc.rect(startX, cardY, cardW, 22, "F");
  doc.rect(startX + cardW + gap, cardY, cardW, 22, "F");
  doc.rect(startX + 2 * (cardW + gap), cardY, cardW, 22, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#4B5563");
  doc.text("Total Income", startX + 3, cardY + 8);
  doc.text("Total Expenses", startX + cardW + gap + 3, cardY + 8);
  doc.text("Net Profit / Loss", startX + 2 * (cardW + gap) + 3, cardY + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor("#0D47A1");
  doc.text(formatCurrency(summary.totalIncome), startX + 3, cardY + 19);
  doc.text(formatCurrency(summary.totalExpense), startX + cardW + gap + 3, cardY + 19);
  const netText = summary.profit >= 0
    ? formatCurrency(summary.profit)
    : `- ${formatCurrency(Math.abs(summary.profit))}`;
  doc.text(netText, startX + 2 * (cardW + gap) + 3, cardY + 19);

  // Net Profit / Loss in Words
  const netWords = numberToWords(Math.abs(summary.profit));
  const wordLabel = summary.profit >= 0
    ? `Net Profit in words: ${netWords}`
    : `Net Loss in words: ${netWords}`;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.setTextColor("#4B5563");
  doc.text(wordLabel, pageWidth - 14, cardY + 12, { align: "right" });

  // ---------- SIDE‑BY‑SIDE TABLES ----------
  const tableStartY = cardY + 34;
  const leftMargin = 14;
  const rightMargin = 14;
  const columnWidth = (pageWidth - leftMargin - rightMargin - 12) / 2; // 12mm gap

  // Left section: Expenses
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor("#0D47A1");
  doc.text("Detailed Expenses", leftMargin, tableStartY);
  doc.setDrawColor(200);
  doc.line(leftMargin, tableStartY + 2, leftMargin + columnWidth, tableStartY + 2);

  autoTable(doc, {
    startY: tableStartY + 5,
    margin: { left: leftMargin, right: pageWidth - leftMargin - columnWidth },
    head: [["Date", "Category", "Bill No", "Mode", "Amount"]],
    body: expenses.map((row) => [
      row.expense_date,
      row.category,
      row.bill_number || "",
      row.payment_mode || "",
      formatCurrency(row.amount),
    ]),
    theme: "grid",
    headStyles: { fillColor: "#dc2626", textColor: "#FFFFFF", fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: "#1F2937" },
    alternateRowStyles: { fillColor: "#FEF2F2" },
  });

  // Right section: Incomes (at the same Y position)
  const rightStartX = leftMargin + columnWidth + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor("#0D47A1");
  doc.text("Detailed Incomes", rightStartX, tableStartY);
  doc.line(rightStartX, tableStartY + 2, rightStartX + columnWidth, tableStartY + 2);

  autoTable(doc, {
    startY: tableStartY + 5,
    margin: { left: rightStartX, right: rightMargin },
    head: [["Date", "Category", "Mode", "Amount"]],
    body: incomes.map((row) => [
      row.income_date,
      row.category,
      row.payment_mode || "",
      formatCurrency(row.amount),
    ]),
    theme: "grid",
    headStyles: { fillColor: "#16a34a", textColor: "#FFFFFF", fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: "#1F2937" },
    alternateRowStyles: { fillColor: "#F0FDF4" },
  });

  // Determine the bottom of the tables
  const finalTableY = Math.max(
    doc.lastAutoTable.finalY,
    doc.previousAutoTable?.finalY || tableStartY
  ) + 10;

  // Totals line
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor("#0D47A1");
  doc.text("Total Expenses:", leftMargin, finalTableY);
  doc.text(formatCurrency(summary.totalExpense), leftMargin + 40, finalTableY);
  doc.text("Total Income:", rightStartX, finalTableY);
  doc.text(formatCurrency(summary.totalIncome), rightStartX + 35, finalTableY);

  doc.setFontSize(13);
  doc.text(`Net Profit / Loss: ${netText}`, pageWidth / 2, finalTableY + 10, { align: "center" });

  // ---------- PAGE 2: CATEGORY‑WISE BAR CHARTS ----------
  doc.addPage();
  const chartPageY = 25;

  const incomeCategoryTotals = {};
  incomes.forEach((row) => {
    const cat = row.category || "Uncategorized";
    incomeCategoryTotals[cat] = (incomeCategoryTotals[cat] || 0) + Number(row.amount);
  });
  const expenseCategoryTotals = {};
  expenses.forEach((row) => {
    const cat = row.category || "Uncategorized";
    expenseCategoryTotals[cat] = (expenseCategoryTotals[cat] || 0) + Number(row.amount);
  });

  const incomeCategories = Object.entries(incomeCategoryTotals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const expenseCategories = Object.entries(expenseCategoryTotals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor("#0D47A1");
  doc.text("Category‑wise Analysis", pageWidth / 2, chartPageY, { align: "center" });

  let chartY = drawCategoryBarChart(doc, chartPageY + 15, incomeCategories, "Income by Category", "#16a34a");
  chartY = drawCategoryBarChart(doc, chartY + 12, expenseCategories, "Expenses by Category", "#dc2626");

  // Audit notes
  const auditY = chartY + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor("#0D47A1");
  doc.text("Audit Notes & Accounting Policies", pageWidth / 2, auditY, { align: "center" });

  const notes = [
    "1. All amounts are in Indian Rupees (INR) and have been rounded to the nearest whole number.",
    "2. This statement is prepared on a cash basis; income and expenses are recorded when received or paid.",
    "3. All entries are supported by valid invoices, receipts, and payment vouchers.",
    "4. Figures are subject to verification by the management and may be adjusted upon final audit.",
    "5. This report does not include any contingent liabilities or provisions.",
    "6. The institute follows the generally accepted accounting principles applicable to educational institutions.",
    "7. Any discrepancies must be reported to the administration within 7 days of receipt of this report.",
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#4B5563");
  notes.forEach((note, idx) => {
    doc.text(note, 20, auditY + 12 + idx * 7);
  });

  // Footer on both pages
  const addFooter = (pageNum) => {
    const footerY = pageHeight - 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor("#9CA3AF");
    doc.text(
      `Generated on ${new Date().toLocaleString("en-IN")} | ${org?.name || "ShreeVidhya Academy"}`,
      pageWidth / 2,
      footerY,
      { align: "center" }
    );
    doc.text(`Page ${pageNum}`, pageWidth / 2, footerY + 5, { align: "center" });
  };

  doc.setPage(1);
  addFooter(1);
  doc.setPage(2);
  addFooter(2);

  doc.save(`Profit_Loss_${periodLabel.replace(/\s+/g, "_")}.pdf`);
}