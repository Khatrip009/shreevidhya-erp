// src/pages/TaxReport.jsx
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../api/supabase";
import AdminLayout from "../layouts/AdminLayout";
import { Calendar, Download, TrendingUp, IndianRupee } from "lucide-react";
import toast from "react-hot-toast";

export default function TaxReport() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ["tax-report", startDate, endDate],
    queryFn: async () => {
      // Fetch income records with tax breakdown
      const { data: incomes, error } = await supabase
        .from("income")
        .select(`
          id,
          income_date,
          category,
          amount,
          base_amount,
          tax_amount,
          tax_rate_id,
          tax_rates!income_tax_rate_id_fkey (name, rate)
        `)
        .gte("income_date", startDate)
        .lte("income_date", endDate)
        .not("tax_amount", "is", null)
        .order("income_date", { ascending: true });

      if (error) throw error;

      // Aggregate by tax rate
      const byTaxRate = {};
      let totalBase = 0,
        totalTax = 0,
        totalAmount = 0;

      incomes?.forEach((row) => {
        const base = Number(row.base_amount || 0);
        const tax = Number(row.tax_amount || 0);
        const total = Number(row.amount || 0);

        totalBase += base;
        totalTax += tax;
        totalAmount += total;

        const rateId = row.tax_rate_id || "no-tax";
        if (!byTaxRate[rateId]) {
          byTaxRate[rateId] = {
            name: row.tax_rates?.name || "No Tax",
            rate: row.tax_rates?.rate || 0,
            base: 0,
            tax: 0,
            total: 0,
            count: 0,
          };
        }
        byTaxRate[rateId].base += base;
        byTaxRate[rateId].tax += tax;
        byTaxRate[rateId].total += total;
        byTaxRate[rateId].count += 1;
      });

      return {
        transactions: incomes || [],
        byTaxRate: Object.values(byTaxRate),
        totals: { totalBase, totalTax, totalAmount },
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  const handleExportCSV = () => {
    if (!reportData?.transactions.length) {
      toast.error("No data to export");
      return;
    }
    const csvRows = [
      ["Date", "Category", "Base Amount", "Tax Amount", "Total", "Tax Rate"],
    ];
    reportData.transactions.forEach((row) => {
      csvRows.push([
        row.income_date,
        row.category,
        Number(row.base_amount || 0).toFixed(2),
        Number(row.tax_amount || 0).toFixed(2),
        Number(row.amount || 0).toFixed(2),
        row.tax_rates?.name || "No Tax",
      ]);
    });
    const csvContent = csvRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax_report_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-righteous text-primary-dark">Tax Report</h1>
          <p className="text-sm text-secondary-dark font-montserrat mt-1">
            Tax collected breakdown by period
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={!reportData?.transactions.length}
          className="border border-secondary-light px-4 py-2.5 rounded-lg text-secondary-dark hover:bg-secondary-bg font-montserrat text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Download size={18} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm font-montserrat text-secondary-dark mb-1">
            <Calendar size={14} className="inline mr-1" />
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-secondary-light rounded px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-montserrat text-secondary-dark mb-1">
            <Calendar size={14} className="inline mr-1" />
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-secondary-light rounded px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => refetch()}
            className="bg-primary hover:bg-primary-light text-white px-4 py-2.5 rounded-lg transition font-montserrat text-sm"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-secondary">Loading...</div>
      ) : reportData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500">Total Base Amount</p>
              <p className="text-2xl font-bold text-gray-800">
                ₹ {reportData.totals.totalBase.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500">Total Tax Collected</p>
              <p className="text-2xl font-bold text-primary">
                ₹ {reportData.totals.totalTax.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500">Total Amount (incl. tax)</p>
              <p className="text-2xl font-bold text-gray-800">
                ₹ {reportData.totals.totalAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Breakdown by Tax Rate */}
          {reportData.byTaxRate.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
              <div className="p-4 border-b border-secondary-light">
                <h3 className="font-semibold">Tax Collected by Rate</h3>
              </div>
              <div className="overflow-x-auto p-4">
                <table className="w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2 text-left text-sm font-montserrat text-secondary-dark">Tax Rate</th>
                      <th className="p-2 text-left text-sm font-montserrat text-secondary-dark">Base Amount</th>
                      <th className="p-2 text-left text-sm font-montserrat text-secondary-dark">Tax Collected</th>
                      <th className="p-2 text-left text-sm font-montserrat text-secondary-dark">Total</th>
                      <th className="p-2 text-left text-sm font-montserrat text-secondary-dark">Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.byTaxRate.map((item, idx) => (
                      <tr key={idx} className="border-b border-secondary-light hover:bg-primary-bg">
                        <td className="p-2 text-sm font-medium">
                          {item.name} {item.rate > 0 && `(${item.rate}%)`}
                        </td>
                        <td className="p-2 text-sm">₹ {item.base.toFixed(2)}</td>
                        <td className="p-2 text-sm text-primary">₹ {item.tax.toFixed(2)}</td>
                        <td className="p-2 text-sm font-medium">₹ {item.total.toFixed(2)}</td>
                        <td className="p-2 text-sm">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Transactions Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-secondary-light">
              <h3 className="font-semibold">All Taxed Transactions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-100 border-b border-secondary-light">
                  <tr>
                    <th className="p-3 text-left text-sm font-montserrat text-secondary-dark">Date</th>
                    <th className="p-3 text-left text-sm font-montserrat text-secondary-dark">Category</th>
                    <th className="p-3 text-left text-sm font-montserrat text-secondary-dark">Base</th>
                    <th className="p-3 text-left text-sm font-montserrat text-secondary-dark">Tax</th>
                    <th className="p-3 text-left text-sm font-montserrat text-secondary-dark">Total</th>
                    <th className="p-3 text-left text-sm font-montserrat text-secondary-dark">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-secondary">
                        No taxed transactions found in this period.
                      </td>
                    </tr>
                  ) : (
                    reportData.transactions.map((row) => (
                      <tr key={row.id} className="border-b border-secondary-light hover:bg-primary-bg">
                        <td className="p-3 text-sm">{row.income_date}</td>
                        <td className="p-3 text-sm">{row.category}</td>
                        <td className="p-3 text-sm">
                          ₹ {Number(row.base_amount || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-sm text-primary">
                          ₹ {Number(row.tax_amount || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-sm font-medium">
                          ₹ {Number(row.amount || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-sm">
                          {row.tax_rates?.name || "No Tax"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-secondary">No data found.</div>
      )}
    </AdminLayout>
  );
}