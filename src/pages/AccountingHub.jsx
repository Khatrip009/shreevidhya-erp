// src/pages/AccountingHub.jsx
import { Link } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import {
  BookOpen, FileText, BarChart3, IndianRupee, ArrowLeftRight,
  PlusCircle, Receipt, ClipboardList, Wallet, Calendar,
  AlertCircle, CheckCircle, Monitor, Settings, Box,
} from "lucide-react";

const modules = [
  // Core Accounting
  { to: "/chart-of-accounts", icon: BookOpen, label: "Chart of Accounts", desc: "Manage account codes and types" },
  { to: "/vouchers", icon: FileText, label: "Vouchers", desc: "View all transaction vouchers" },
  { to: "/payment-voucher", icon: IndianRupee, label: "Payment Voucher", desc: "Record expenses and payments" },
  { to: "/receipt-voucher", icon: Receipt, label: "Receipt Voucher", desc: "Record incomes and receipts" },
  { to: "/contra-voucher", icon: ArrowLeftRight, label: "Contra Voucher", desc: "Bank ↔ Cash transfers" },
  { to: "/journal-entry", icon: PlusCircle, label: "Journal Entry", desc: "Manual double‑entry vouchers" },

  // Reports
  { to: "/ledger", icon: BookOpen, label: "Ledger", desc: "View account‑wise entries" },
  { to: "/trial-balance", icon: BarChart3, label: "Trial Balance", desc: "Summary of all accounts" },
  { to: "/balance-sheet", icon: BarChart3, label: "Balance Sheet", desc: "Assets, liabilities, and equity" },
  { to: "/profit-loss", icon: BarChart3, label: "Profit & Loss", desc: "Income and expense summary" },
  { to: "/cash-book", icon: Wallet, label: "Cash / Bank Book", desc: "Daily cash and bank transactions" },
  { to: "/day-book", icon: Calendar, label: "Day Book", desc: "Chronological transaction log" },
  { to: "/aged-receivables", icon: AlertCircle, label: "Aged Receivables", desc: "Outstanding student fees" },
  { to: "/bank-reconciliation", icon: CheckCircle, label: "Bank Reconciliation", desc: "Match bank statements" },
  { to: "/budgets", icon: BarChart3, label: "Budgets", desc: "Create and manage budgets" },
  { to: "/budget-vs-actual", icon: BarChart3, label: "Budget vs Actual", desc: "Compare actuals to budgets" },
  { to: "/fixed-assets", icon: Monitor, label: "Fixed Assets", desc: "Track depreciation and assets" },
  { to: "/bill-wise", icon: FileText, label: "Bill‑wise Payables", desc: "Track vendor bills" },

  // Tax
  { to: "/gst-report", icon: FileText, label: "GST Report", desc: "GST summary and returns" },
  { to: "/tax-settings", icon: Settings, label: "Tax Settings", desc: "Configure tax rates" },
  { to: "/tax-report", icon: FileText, label: "Tax Report", desc: "Tax liability report" },

  // Fee & Finance
  { to: "/fees/structures", icon: IndianRupee, label: "Fee Structures", desc: "Define fee plans" },
  { to: "/fees", icon: IndianRupee, label: "Student Fees", desc: "Manage student fee records" },
  { to: "/receipts", icon: FileText, label: "Receipts", desc: "View all payment receipts" },
  { to: "/income", icon: IndianRupee, label: "Income", desc: "Record other income" },
  { to: "/expenses", icon: IndianRupee, label: "Expenses", desc: "Record expenses" },
  { to: "/salary-payments", icon: Wallet, label: "Salary Payments", desc: "Process staff salaries" },

  // Inventory (if you want to keep it separate, you can, but it's already in the sidebar)
];

export default function AccountingHub() {
  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-righteous text-primary-dark">Accounting & Finance Hub</h1>
        <p className="text-sm text-secondary-dark mt-1">
          All accounting, finance, fee management, and tax tools in one place
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.to}
              to={mod.to}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:border-primary/30 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-primary-bg rounded-lg">
                  <Icon size={20} className="text-primary" />
                </div>
              </div>
              <h3 className="font-righteous text-primary-dark group-hover:text-accent transition-colors">
                {mod.label}
              </h3>
              <p className="text-sm text-secondary-dark mt-1">{mod.desc}</p>
            </Link>
          );
        })}
      </div>
    </AdminLayout>
  );
}