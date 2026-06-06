import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Printer, Download } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import { supabase } from "../api/supabase";
import { generateReceiptPdf } from "../utils/receiptPdf";

export default function Receipts() {
  const [search, setSearch] = useState("");

  // Fetch receipts with React Query
  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["receipts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts")
        .select(
          `*,
          students ( first_name, last_name, admission_no ),
          fee_payments ( payment_mode, transaction_no, student_fee_id )`
        )
        .order("receipt_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filtered = receipts.filter((r) => {
    const term = search.toLowerCase();
    return (
      r.receipt_no.toLowerCase().includes(term) ||
      r.students?.first_name?.toLowerCase().includes(term) ||
      r.students?.last_name?.toLowerCase().includes(term) ||
      r.students?.admission_no?.toLowerCase().includes(term)
    );
  });

  async function handleDownloadPdf(receipt) {
    try {
      await generateReceiptPdf(receipt);
    } catch (err) {
      console.error("PDF generation failed", err);
      // fallback to print
      const printWindow = window.open("", "_blank");
      printWindow.document.write(
        `<html><head><title>Receipt</title></head><body>` +
        `<h2>ShreeVidhya Academy</h2>` +
        `<p>Receipt No: ${receipt.receipt_no}</p>` +
        `<p>Date: ${receipt.receipt_date}</p>` +
        `<p>Student: ${receipt.students?.first_name} ${receipt.students?.last_name} (${receipt.students?.admission_no})</p>` +
        `<p>Amount: ₹${Number(receipt.amount).toLocaleString()}</p>` +
        `<p>Payment Mode: ${receipt.fee_payments?.payment_mode || "N/A"}</p>` +
        `</body></html>`
      );
      printWindow.document.close();
      printWindow.print();
    }
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-righteous text-primary-dark">Receipts</h1>
        <p className="text-sm text-secondary-dark font-montserrat mt-1">
          View and download fee receipts
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
        />
        <input
          type="text"
          placeholder="Search by receipt no, student name, or admission no..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-secondary-light rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
        />
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-100 border-b border-secondary-light">
              <tr>
                <th className="p-3 text-left text-sm font-montserrat text-secondary-dark">
                  Receipt No
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Date
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Student
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Amount
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Mode
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-secondary">
                    Loading receipts…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-secondary">
                    <div className="flex flex-col items-center gap-2">
                      <Printer size={32} className="text-secondary-light" />
                      <span>No receipts found</span>
                      <span className="text-xs text-secondary-light">
                        {search ? "Try adjusting your search" : ""}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((receipt) => (
                  <tr
                    key={receipt.id}
                    className="border-b border-secondary-light hover:bg-primary-bg transition"
                  >
                    <td className="p-3 text-sm font-medium">
                      {receipt.receipt_no}
                    </td>
                    <td className="text-sm">{receipt.receipt_date}</td>
                    <td className="text-sm">
                      {receipt.students?.first_name} {receipt.students?.last_name}{" "}
                      <span className="text-xs text-secondary-light">
                        ({receipt.students?.admission_no})
                      </span>
                    </td>
                    <td className="text-sm font-semibold">
                      ₹{Number(receipt.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="text-sm">
                      {receipt.fee_payments?.payment_mode || "-"}
                    </td>
                    <td className="text-sm">
                      <button
                        onClick={() => handleDownloadPdf(receipt)}
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <Download size={16} /> PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}