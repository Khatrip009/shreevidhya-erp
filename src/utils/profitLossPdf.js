import { jsPDF, GState } from "jspdf";
import autoTable from "jspdf-autotable";
import { getOrganization } from "../services/organizationService";
import { supabase } from "../api/supabase";

// ─── HELPERS ────────────────────────────────────────────────────────────────

const formatCurrency = (amount) => `Rs.${amount.toLocaleString("en-IN")}`;

// Number to Indian words
function numberToWords(num) {
  if (num === 0) return "Zero";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
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

// Fetch detailed rows
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

// Group data by month
function groupByMonth(data, dateField, amountField) {
  const months = {};
  data.forEach(row => {
    const date = new Date(row[dateField]);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    if (!months[key]) months[key] = 0;
    months[key] += Number(row[amountField]);
  });
  return Object.entries(months).sort().map(([label, total]) => ({ label, total }));
}

// Draw a simple pie chart (sectors)
function drawPieChart(doc, cx, cy, radius, data, colors) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return;
  let angleStart = 0;
  data.forEach((item, i) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    if (sliceAngle <= 0) return;
    doc.setFillColor(colors[i % colors.length]);
    // draw an approximate sector using many lines (polygon)
    const steps = Math.max(Math.floor(sliceAngle * 20), 2); // smoothness
    const points = [{ x: cx, y: cy }];
    for (let s = 0; s <= steps; s++) {
      const a = angleStart + (s / steps) * sliceAngle;
      points.push({ x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) });
    }
    doc.saveGraphicsState();
    doc.setDrawColor(255, 255, 255);
    // draw filled polygon
    doc.moveTo(points[0].x, points[0].y);
    for (let p = 1; p < points.length; p++) {
      doc.lineTo(points[p].x, points[p].y);
    }
    doc.lineTo(points[0].x, points[0].y);
    doc.fill();
    doc.restoreGraphicsState();
    angleStart += sliceAngle;
  });
  // center white circle for donut effect (optional)
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, radius * 0.55, "F");
}

// Draw a bar chart (horizontal)
function drawHorizontalBars(doc, startY, items, title, color, maxBarWidth = 110) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const leftText = margin + 65; // space for category labels
  const barX = leftText + 5;
  const lineHeight = 10;
  const maxAmount = Math.max(...items.map(it => it.value), 1);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor("#0D47A1");
  doc.text(title, margin, startY);
  startY += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  items.forEach((item) => {
    if (startY > doc.internal.pageSize.getHeight() - 25) {
      doc.addPage();
      startY = 20;
    }
    const barWidth = (item.value / maxAmount) * maxBarWidth;
    doc.setTextColor("#1F2937");
    doc.text(item.label, margin, startY + 4);
    doc.setFillColor(color);
    doc.rect(barX, startY, barWidth, 7, "F");
    doc.text(formatCurrency(item.value), barX + barWidth + 5, startY + 4);
    startY += lineHeight;
  });
  return startY;
}

// Draw a monthly trend column chart
function drawMonthlyChart(doc, startY, incomes, expenses) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const chartWidth = pageWidth - 2 * margin;
  const chartHeight = 70;
  const x = margin;
  const y = startY;
  const colWidth = chartWidth / Math.max(incomes.length, expenses.length, 1) - 5;
  if (colWidth < 12) return; // too many months

  const allMonths = [...new Set([...incomes.map(i => i.label), ...expenses.map(e => e.label)])].sort();
  const maxVal = Math.max(
    ...allMonths.map(m => {
      const inc = incomes.find(i => i.label === m)?.total || 0;
      const exp = expenses.find(e => e.label === m)?.total || 0;
      return Math.max(inc, exp);
    }),
    1
  );

  // axis
  doc.setDrawColor(200);
  doc.line(x, y + chartHeight, x + chartWidth, y + chartHeight); // x-axis
  doc.line(x, y, x, y + chartHeight); // y-axis

  let colX = x + 5;
  allMonths.forEach(month => {
    const inc = incomes.find(i => i.label === month)?.total || 0;
    const exp = expenses.find(e => e.label === month)?.total || 0;
    const incHeight = (inc / maxVal) * chartHeight;
    const expHeight = (exp / maxVal) * chartHeight;

    // Income bar
    doc.setFillColor("#16a34a");
    doc.rect(colX, y + chartHeight - incHeight, colWidth / 2 - 2, incHeight, "F");
    // Expense bar
    doc.setFillColor("#dc2626");
    doc.rect(colX + colWidth / 2, y + chartHeight - expHeight, colWidth / 2 - 2, expHeight, "F");
    // month label
    doc.setFontSize(6);
    doc.setTextColor("#666");
    doc.text(month.substring(5), colX + colWidth / 2, y + chartHeight + 10, { align: "center" }); // MM only
    colX += colWidth + 5;
  });

  // legend
  doc.setFillColor("#16a34a");
  doc.rect(x + 10, y - 10, 8, 6, "F");
  doc.setFontSize(8);
  doc.setTextColor("#333");
  doc.text("Income", x + 20, y - 5);
  doc.setFillColor("#dc2626");
  doc.rect(x + 50, y - 10, 8, 6, "F");
  doc.text("Expense", x + 60, y - 5);

  return y + chartHeight + 20;
}

// ─── MAIN FUNCTION ───────────────────────────────────────────────────────────

export async function generateProfitLossPdf(summary, startDate, endDate, periodLabel) {
  const org = await getOrganization();
  const incomes = await fetchDetailedIncomes(startDate, endDate);
  const expenses = await fetchDetailedExpenses(startDate, endDate);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ── Watermark ──
  if (org?.logo_dark_url) {
    try {
      const imgData = await fetch(org.logo_dark_url)
        .then(r => r.blob())
        .then(blob => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }));
      doc.setGState(new GState({ opacity: 0.04 }));
      doc.addImage(imgData, "PNG", (pageWidth - 120) / 2, (pageHeight - 120) / 2, 120, 120);
      doc.setGState(new GState({ opacity: 1 }));
    } catch (e) {}
  }

  // ── Header ──
  if (org?.logo_dark_url) {
    try {
      const logoImg = await fetch(org.logo_dark_url)
        .then(r => r.blob())
        .then(blob => new Promise((resolve, reject) => {
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
  doc.setFontSize(9);
  doc.setTextColor("#4B5563");
  doc.text(org?.address || "", 50, 30);
  if (org?.phone) doc.text(`Phone: ${org.phone}`, 50, 37);
  if (org?.email) doc.text(`Email: ${org.email}`, 50, 44);

  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(26);
  doc.setTextColor("#0D47A1");
  doc.text("Profit & Loss Statement", pageWidth / 2, 55, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor("#4B5563");
  doc.text(`Period: ${periodLabel}`, pageWidth / 2, 63, { align: "center" });

  // ── KPI Cards ──
  const cardY = 75;
  const cardW = 72;
  const gap = 12;
  const startX = 14;
  const kpiColor = "#0D47A1";
  const kpiBg = "#F0F7FF";

  // Total Income
  doc.setFillColor(kpiBg);
  doc.rect(startX, cardY, cardW, 22, "F");
  doc.setFontSize(9);
  doc.setTextColor("#4B5563");
  doc.text("Total Income", startX + 3, cardY + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(kpiColor);
  doc.text(formatCurrency(summary.totalIncome), startX + 3, cardY + 18);

  // Total Expenses
  doc.rect(startX + cardW + gap, cardY, cardW, 22, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#4B5563");
  doc.text("Total Expenses", startX + cardW + gap + 3, cardY + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(kpiColor);
  doc.text(formatCurrency(summary.totalExpense), startX + cardW + gap + 3, cardY + 18);

  // Net Profit/Loss
  const netText = summary.profit >= 0
    ? formatCurrency(summary.profit)
    : `- ${formatCurrency(Math.abs(summary.profit))}`;
  doc.rect(startX + 2 * (cardW + gap), cardY, cardW, 22, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#4B5563");
  doc.text("Net Profit / Loss", startX + 2 * (cardW + gap) + 3, cardY + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(summary.profit >= 0 ? "#16a34a" : "#dc2626");
  doc.text(netText, startX + 2 * (cardW + gap) + 3, cardY + 18);

  // Profit Margin %
  const marginPercent = summary.totalIncome > 0
    ? ((summary.profit / summary.totalIncome) * 100).toFixed(1)
    : "0.0";
  doc.rect(startX + 3 * (cardW + gap), cardY, cardW, 22, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#4B5563");
  doc.text("Profit Margin", startX + 3 * (cardW + gap) + 3, cardY + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(kpiColor);
  doc.text(`${marginPercent}%`, startX + 3 * (cardW + gap) + 3, cardY + 18);

  // Net in Words
  const netWords = numberToWords(Math.abs(summary.profit));
  const wordLabel = summary.profit >= 0
    ? `Net Profit in words: ${netWords}`
    : `Net Loss in words: ${netWords}`;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor("#4B5563");
  doc.text(wordLabel, pageWidth - 14, cardY + 12, { align: "right" });

  // ── Detailed Tables (side by side) ──
  const tableStartY = cardY + 35;
  const columnWidth = (pageWidth - 14 - 14 - 12) / 2;

  // Expenses table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor("#0D47A1");
  doc.text("Expenses Breakdown", 14, tableStartY);
  autoTable(doc, {
    startY: tableStartY + 5,
    margin: { left: 14, right: pageWidth - 14 - columnWidth },
    head: [["Date", "Category", "Bill No", "Mode", "Amount"]],
    body: expenses.map(row => [
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

  // Income table
  const rightStartX = 14 + columnWidth + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor("#0D47A1");
  doc.text("Income Breakdown", rightStartX, tableStartY);
  autoTable(doc, {
    startY: tableStartY + 5,
    margin: { left: rightStartX, right: 14 },
    head: [["Date", "Category", "Mode", "Amount"]],
    body: incomes.map(row => [
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

  const finalTableY = Math.max(
    doc.lastAutoTable.finalY,
    doc.previousAutoTable?.finalY || tableStartY
  ) + 8;

  // Totals under tables
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor("#0D47A1");
  doc.text("Total Expenses:", 14, finalTableY);
  doc.text(formatCurrency(summary.totalExpense), 45, finalTableY);
  doc.text("Total Income:", rightStartX, finalTableY);
  doc.text(formatCurrency(summary.totalIncome), rightStartX + 30, finalTableY);

  // ── PAGE 2: Charts & Analysis ──
  doc.addPage();

  // Monthly trend chart
  const monthlyIncomes = groupByMonth(incomes, 'income_date', 'amount');
  const monthlyExpenses = groupByMonth(expenses, 'expense_date', 'amount');
  let chartY = 25;
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor("#0D47A1");
  doc.text("Monthly Income vs Expenses", pageWidth / 2, chartY, { align: "center" });
  chartY = drawMonthlyChart(doc, chartY + 10, monthlyIncomes, monthlyExpenses);

  // Category distribution pie charts
  const incomeCategoryTotals = {};
  incomes.forEach(r => {
    const cat = r.category || "Uncategorized";
    incomeCategoryTotals[cat] = (incomeCategoryTotals[cat] || 0) + Number(r.amount);
  });
  const expenseCategoryTotals = {};
  expenses.forEach(r => {
    const cat = r.category || "Uncategorized";
    expenseCategoryTotals[cat] = (expenseCategoryTotals[cat] || 0) + Number(r.amount);
  });

  const incData = Object.entries(incomeCategoryTotals).map(([label, value]) => ({ label, value }));
  const expData = Object.entries(expenseCategoryTotals).map(([label, value]) => ({ label, value }));

  const pieColors = ["#0D47A1", "#1565C0", "#1976D2", "#1E88E5", "#42A5F5", "#64B5F6", "#90CAF9", "#BBDEFB"];
  const pieY = chartY + 15;
  if (incData.length > 0 || expData.length > 0) {
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.setTextColor("#0D47A1");
    doc.text("Category Distribution", pageWidth / 2, pieY, { align: "center" });
    const pieCY = pieY + 20;
    // Draw income pie (left side)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor("#16a34a");
    doc.text("Income Categories", 40, pieCY - 8);
    drawPieChart(doc, 60, pieCY + 15, 25, incData, pieColors);
    // Legend for income pie (right of the pie)
    let legendX = 95;
    let legendY = pieCY;
    incData.forEach((item, i) => {
      if (legendY > pageHeight - 25) return;
      doc.setFillColor(pieColors[i % pieColors.length]);
      doc.rect(legendX, legendY, 6, 6, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor("#333");
      doc.text(`${item.label} (${formatCurrency(item.value)})`, legendX + 8, legendY + 5);
      legendY += 8;
    });

    // Draw expense pie (right side)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor("#dc2626");
    doc.text("Expense Categories", pageWidth - 40 - 50, pieCY - 8);
    drawPieChart(doc, pageWidth - 60, pieCY + 15, 25, expData, pieColors);
    legendX = pageWidth - 50;
    legendY = pieCY;
    expData.forEach((item, i) => {
      if (legendY > pageHeight - 25) return;
      doc.setFillColor(pieColors[i % pieColors.length]);
      doc.rect(legendX, legendY, 6, 6, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor("#333");
      doc.text(`${item.label} (${formatCurrency(item.value)})`, legendX + 8, legendY + 5);
      legendY += 8;
    });

    // Move Y for next section
    doc.setPage(2);
  }

  // Audit notes
  const auditY = pageHeight - 70;
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

  // ── Footer on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#9CA3AF");
    doc.text(
      `Generated on ${new Date().toLocaleString("en-IN")} | ${org?.name || "ShreeVidhya Academy"}`,
      pageWidth / 2,
      footerY,
      { align: "center" }
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, footerY, { align: "right" });
  }

  doc.save(`Profit_Loss_${periodLabel.replace(/\s+/g, "_")}.pdf`);
}