import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../api/supabase";
import AdminLayout from "../layouts/AdminLayout";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import Papa from "papaparse";

export default function TaxReport() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Fetch tax_collections with tax rate name and rate
  const { data: taxRecords = [], isLoading } = useQuery({
    queryKey: ["tax-report", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_collections")
        .select(`
          collection_date,
          amount,
          category,
          tax_rate_id,
          tax_rates (name, rate)
        `)
        .gte("collection_date", startDate)
        .lte("collection_date", endDate)
        .order("collection_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Group by tax rate name
  const summary = taxRecords.reduce((acc, row) => {
    const rateName = row.tax_rates?.name || "Unknown";
    const rate = row.tax_rates?.rate || 0;
    if (!acc[rateName]) {
      acc[rateName] = { rate, count: 0, totalTax: 0 };
    }
    acc[rateName].count += 1;
    acc[rateName].totalTax += Number(row.amount || 0);
    return acc;
  }, {});

  const summaryArray = Object.entries(summary).map(([name, val]) => ({
    name,
    ...val,
  }));

  const totalTax = summaryArray.reduce((s, r) => s + r.totalTax, 0);

  const handleExport = () => {
    if (taxRecords.length === 0) {
      toast.error("No data to export");
      return;
    }
    const csv = Papa.unparse(
      taxRecords.map((r) => ({
        date: r.collection_date,
        category: r.category,
        tax_rate: r.tax_rates?.name || "Unknown",
        rate: r.tax_rates?.rate || 0,
        tax_amount: r.amount,
      }))
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tax_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-righteous text-primary-dark">Tax Report</h1>
        <p className="text-sm text-secondary-dark font-montserrat mt-1">
          Tax collected (from fee payments & income)
        </p>
      </div>

      {/* Date filters */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="text-xs font-montserrat text-secondary-dark">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded p-2 text-sm mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-montserrat text-secondary-dark">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded p-2 text-sm mt-1"
          />
        </div>
        <button
          onClick={handleExport}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
        >
          <Download size={16} /> Export
        </button>
      </div>

      {/* Total Tax */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-righteous text-primary-dark mb-4">Total Tax Collected</h2>
        {isLoading ? (
          <p className="text-secondary">Loading…</p>
        ) : (
          <p className="text-3xl font-bold text-primary-dark">
            ₹{totalTax.toLocaleString("en-IN")}
          </p>
        )}
        <p className="text-xs text-secondary-light mt-1">
          {startDate} – {endDate}
        </p>
      </div>

      {/* Summary table by tax rate */}
      {isLoading ? (
        <div className="text-center p-6 text-secondary">Loading…</div>
      ) : summaryArray.length === 0 ? (
        <div className="text-center p-6 text-secondary">
          No tax records found for the selected period.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-left text-sm font-montserrat">Tax Rate</th>
                  <th className="p-3 text-left text-sm font-montserrat">Rate %</th>
                  <th className="p-3 text-left text-sm font-montserrat">Transactions</th>
                  <th className="p-3 text-left text-sm font-montserrat">Tax Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {summaryArray.map((row) => (
                  <tr key={row.name} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-sm font-medium">{row.name}</td>
                    <td className="p-3 text-sm">{row.rate}%</td>
                    <td className="p-3 text-sm">{row.count}</td>
                    <td className="p-3 text-sm">₹{row.totalTax.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}