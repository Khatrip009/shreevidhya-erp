// src/context/ScopeContext.jsx
import { createContext, useContext, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOrg } from "./OrganizationContext";

const ScopeContext = createContext();

export function ScopeProvider({ children }) {
  const queryClient = useQueryClient();
  const {
    branch,
    setBranch,
    branches,
    financialYears,
    selectedFinancialYear,
    switchFinancialYear,
  } = useOrg();

  // Invalidate all queries when branch or financial year changes
  useEffect(() => {
    if (branch?.id && selectedFinancialYear?.id) {
      queryClient.invalidateQueries();
    }
  }, [branch?.id, selectedFinancialYear?.id]);

  // ── Memoize the context value to avoid unnecessary re-renders ──
  const value = useMemo(
    () => ({
      branch,
      setBranch,
      branches,
      financialYears,
      selectedFinancialYear,
      switchFinancialYear,
    }),
    [
      branch,
      setBranch,
      branches,
      financialYears,
      selectedFinancialYear,
      switchFinancialYear,
    ]
  );

  return (
    <ScopeContext.Provider value={value}>
      {children}
    </ScopeContext.Provider>
  );
}

export const useScope = () => useContext(ScopeContext);