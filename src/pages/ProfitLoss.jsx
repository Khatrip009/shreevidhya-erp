import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "../layouts/AdminLayout";
import { getProfitLossSummary } from "../services/financeService";
import {
  IndianRupee, TrendingUp, TrendingDown, Calendar, Download,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { generateProfitLossPdf } from "../utils/profitLossPdf";

export default function ProfitLoss() {
  const today = new Date();
  const [viewMode, setViewMode] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);

  const startDate =
    viewMode === "monthly"
      ? `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
      : `${selectedYear}-01-01`;
  const endDate =
    viewMode === "monthly"
      ? new Date(selectedYear, selectedMonth, 0).toISOString().split("T")[0]
      : `${selectedYear}-12-31`;

  const periodLabel =
    viewMode === "monthly"
      ? `${new Date(selectedYear, selectedMonth - 1).toLocaleString("default", { month: "long" })} ${selectedYear}`
      : `Year ${selectedYear}`;

  const { data, isLoading, error } = useQuery({
    queryKey: ["profit-loss", startDate, endDate],
    queryFn: () => getProfitLossSummary(startDate, endDate),
  });

  const chartData = data
    ? [{ name: viewMode === "monthly" ? "This Month" : "This Year", Income: data.totalIncome, Expenses: data.totalExpense }]
    : [];

  async function handleExportPdf() {
    if (!data) return;
    await generateProfitLossPdf(data, startDate, endDate, periodLabel);
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-righteous text-primary-dark">Profit & Loss</h1>
          <p className="text-sm text-secondary-dark font-montserrat mt-1">
            {viewMode === "monthly" ? "Monthly" : "Yearly"} income vs expenses
          </p>
        </div>

        <div className="flex gap-2">
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className="border border-secondary-light rounded p-2 text-sm focus:ring-1 focus:ring-primary">
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          {viewMode === "monthly" && (
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="border border-secondary-light rounded p-2 text-sm focus:ring-1 focus:ring-primary">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>
              ))}
            </select>
          )}
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="border border-secondary-light rounded p-2 text-sm focus:ring-1 focus:ring-primary">
            {Array.from({ length: 5 }, (_, i) => {
              const year = today.getFullYear() - 2 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
          <button onClick={handleExportPdf} className="border border-secondary-light px-4 py-2.5 rounded-lg text-secondary-dark hover:bg-secondary-bg font-montserrat text-sm flex items-center gap-2">
            <Download size={18} /> Export PDF
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-secondary">Loading…</div>
      ) : error ? (
        <div className="p-8 text-center text-red-600">{error.message}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary">Total Income</p>
                  <h3 className="text-2xl font-bold mt-1 text-green-600">₹{data.totalIncome.toLocaleString("en-IN")}</h3>
                </div>
                <TrendingUp size={28} className="text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary">Total Expenses</p>
                  <h3 className="text-2xl font-bold mt-1 text-red-600">₹{data.totalExpense.toLocaleString("en-IN")}</h3>
                </div>
                <TrendingDown size={28} className="text-red-500" />
              </div>
            </div>
            <div className={`bg-white rounded-xl p-5 shadow-sm border border-secondary-light`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary">Net Profit / Loss</p>
                  <h3 className={`text-2xl font-bold mt-1 ${data.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ₹{data.profit.toLocaleString("en-IN")}
                  </h3>
                </div>
                <IndianRupee size={28} className={data.profit >= 0 ? "text-green-500" : "text-red-500"} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light mb-8">
            <h2 className="text-lg font-righteous text-primary-dark mb-4 flex items-center gap-2">
              <Calendar size={18} /> Graphical Report
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value.toLocaleString("en-IN")}`} />
                <Legend />
                <Bar dataKey="Income" fill="#16a34a" name="Income" />
                <Bar dataKey="Expenses" fill="#dc2626" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </AdminLayout>
  );
}