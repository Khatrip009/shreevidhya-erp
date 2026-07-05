// src/pages/GSTReport.jsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Download } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import { supabase } from "../api/supabase";
import { getOrganization } from "../services/organizationService";

// Build GSTR-1 JSON (as per GST portal offline utility schema)
function buildGSTR1JSON(data, org, startDate, endDate) {
  const { outputByRate, inputByRate, outputTotal, inputTotal } = data;
  const gstin = org?.gstin || "UNREGISTERED";
  const fp = `${startDate.substring(0, 4)}${startDate.substring(5, 7)}`; // MMYYYY

  // B2CS (consumer supplies) – one entry per rate
  const b2cs = Object.entries(outputByRate).map(([rateName, taxAmount]) => {
    const ratePercent = parseFloat(rateName.match(/[\d.]+/)?.[0] || "0");
    const taxableValue = ratePercent > 0 ? taxAmount / (ratePercent / 100) : 0;
    return {
      sply_ty: "INTER",   // or INTRA as per your business; you can add a toggle
      rt: ratePercent,
      txval: Math.round(taxableValue * 100) / 100,
      iamt: 0,
      camt: Math.round(taxAmount / 2 * 100) / 100,
      samt: Math.round(taxAmount / 2 * 100) / 100,
    };
  });

  // Nil rated supplies (if any) – placeholder, can be derived from fee structures with 0% tax
  const nilSupplies = {
    sply_ty: "INTER",
    txval: 0,   // actual nil‑rated supplies value can be computed from your data
  };

  // Overall supplies summary
  const supplies = {
    txval: b2cs.reduce((s, b) => s + b.txval, 0),
    iamt: 0,
    camt: b2cs.reduce((s, b) => s + b.camt, 0),
    samt: b2cs.reduce((s, b) => s + b.samt, 0),
  };

  return {
    gstin,
    fp,
    b2cs,
    nil: nilSupplies,
    supplies,
  };
}

export default function GSTReport() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const { data: org } = useQuery({ queryKey: ["organization"], queryFn: getOrganization });

  const { data: outputTax = [] } = useQuery({
    queryKey: ["gst-output", startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("tax_collections")
        .select("amount, tax_rates(name, rate)")
        .eq("category", "fee_payment")
        .gte("collection_date", startDate)
        .lte("collection_date", endDate);
      return data || [];
    },
  });

  // Aggregate output tax by rate
  const outputByRate = useMemo(() => {
    const acc = {};
    outputTax.forEach((row) => {
      const rateName = row.tax_rates?.name || "Unknown";
      acc[rateName] = (acc[rateName] || 0) + parseFloat(row.amount);
    });
    return acc;
  }, [outputTax]);

  const outputTotal = useMemo(
    () => Object.values(outputByRate).reduce((s, v) => s + v, 0),
    [outputByRate]
  );

  const handleDownloadJSON = () => {
    if (!org) return;
    const jsonData = buildGSTR1JSON({ outputByRate }, org, startDate, endDate);
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR1_${startDate}_${endDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // For simplicity, compute taxable value for preview
  const previewData = useMemo(() => {
    return Object.entries(outputByRate).map(([rateName, taxAmount]) => {
      const ratePercent = parseFloat(rateName.match(/[\d.]+/)?.[0] || "0");
      const taxableValue = ratePercent > 0 ? taxAmount / (ratePercent / 100) : 0;
      return { rateName, ratePercent, taxableValue, taxAmount };
    });
  }, [outputByRate]);

  const handlePrint = () => {
    const printContent = document.getElementById("gst-preview")?.outerHTML;
    if (!printContent) return;
    const logoUrl = org?.logo_dark_url || "/ShreeVidhyaDark.png";
    const orgName = org?.company_name || "ShreeVidhya Academy";
    const printWindow = window.open("", "_blank", "width=1000,height=750");
    printWindow.document.write(`
      <html><head><title>GST Report</title>
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: Montserrat, sans-serif; color: #222; font-size: 11px; }
        .header { display: flex; align-items: center; border-bottom: 2px solid #0D47A1; padding-bottom: 8px; margin-bottom: 15px; }
        .header img { height: 40px; margin-right: 15px; }
        .org-name { font-size: 16px; font-weight: 700; color: #0D47A1; }
        .org-details { font-size: 8px; color: #555; }
        h1 { text-align: center; color: #0D47A1; margin: 10px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; border: 1px solid #bbb; font-size: 10px; }
        th, td { padding: 4px 6px; border: 1px solid #bbb; }
        th { background-color: #E3F2FD; }
        .text-right { text-align: right; }
        .footer { margin-top: 20px; font-size: 8px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
      </style></head>
      <body>
        <div class="header"><img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'"/><div><div class="org-name">${orgName}</div><div class="org-details">${org?.address||""}</div><div class="org-details">Ph: ${org?.phone||""} | Email: ${org?.email||""}</div></div></div>
        <h1>GST Report – GSTR‑1 Preview</h1>
        <p class="text-xs text-center">Period: ${startDate} – ${endDate}</p>
        ${printContent}
        <div class="footer">Computer‑generated report – ${orgName}</div>
        <script>window.print();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-righteous text-primary-dark">GST Report (GSTR‑1)</h1>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="bg-primary text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <Printer size={16} /> Print
          </button>
          <button onClick={handleDownloadJSON} className="border border-primary text-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <Download size={16} /> Download JSON
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div>
          <label className="text-sm font-medium mr-2">From:</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded p-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium mr-2">To:</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded p-2 text-sm" />
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6" id="gst-preview">
        <h2 className="text-lg font-semibold p-4 border-b">B2CS Supplies (by rate)</h2>
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left text-sm">Rate</th>
              <th className="p-3 text-right text-sm">Taxable Value</th>
              <th className="p-3 text-right text-sm">CGST</th>
              <th className="p-3 text-right text-sm">SGST</th>
              <th className="p-3 text-right text-sm">Total Tax</th>
            </tr>
          </thead>
          <tbody>
            {previewData.map((item) => (
              <tr key={item.rateName} className="border-t">
                <td className="p-3">{item.rateName} ({item.ratePercent}%)</td>
                <td className="p-3 text-right">₹ {item.taxableValue.toLocaleString("en-IN")}</td>
                <td className="p-3 text-right">₹ {(item.taxAmount / 2).toLocaleString("en-IN")}</td>
                <td className="p-3 text-right">₹ {(item.taxAmount / 2).toLocaleString("en-IN")}</td>
                <td className="p-3 text-right font-medium">₹ {item.taxAmount.toLocaleString("en-IN")}</td>
              </tr>
            ))}
            {previewData.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-secondary">No data for selected period.</td></tr>
            )}
          </tbody>
        </table>
        <div className="p-4 border-t text-right font-bold">
          Total Tax: ₹ {outputTotal.toLocaleString("en-IN")}
        </div>
      </div>

      {/* JSON Preview */}
      <div className="bg-gray-50 rounded-xl p-4 border">
        <h2 className="text-lg font-semibold text-primary-dark mb-3">JSON Preview (GSTR‑1)</h2>
        <pre className="text-xs bg-white p-3 rounded border max-h-60 overflow-auto">
          {org
            ? JSON.stringify(buildGSTR1JSON({ outputByRate }, org, startDate, endDate), null, 2)
            : "Loading organization details..."}
        </pre>
      </div>
    </AdminLayout>
  );
}