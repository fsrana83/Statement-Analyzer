import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, SlidersHorizontal, Table, Download, RefreshCw, Lock, ArrowLeft, Heart, Trash2, FileText } from "lucide-react";
import { Transaction, TransactionSplit, StatementSummary, DEFAULT_CATEGORIES } from "./types";
import StatementUploader from "./components/StatementUploader";
import TransactionList from "./components/TransactionList";
import CategoryDashboard from "./components/CategoryDashboard";
import SplitModal from "./components/SplitModal";
import AiAdvisor from "./components/AiAdvisor";
import BudgetsCategories from "./components/BudgetsCategories";
import ReconciliationTab from "./components/ReconciliationTab";

// Automatically delete unused demo categories
const deleteUnusedDemoCategories = (currentTransactions: Transaction[], currentCats: string[]) => {
  const used = new Set<string>();
  currentTransactions.forEach(tx => {
    if (tx.isSplit && tx.splits) {
      tx.splits.forEach(s => {
        if (s.category) used.add(s.category);
      });
    } else if (tx.category) {
      used.add(tx.category);
    }
  });

  const systemRequired = ["Others", "Salary & Income"];
  const updatedCats = currentCats.filter(cat => {
    if (used.has(cat) || systemRequired.includes(cat)) {
      return true;
    }
    const isDefault = DEFAULT_CATEGORIES.includes(cat as any);
    return !isDefault; // Delete if it's a default/demo category that is NOT used
  });

  return updatedCats;
};

import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";

export default function App() {
  // Centralized full-stack states
  const [fileUploaded, setFileUploaded] = useState(false);
  const [fileType, setFileType] = useState<"mt940" | "csv" | "excel" | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [softDeletedCategories, setSoftDeletedCategories] = useState<string[]>([]);
  const [auditLog, setAuditLog] = useState<{ timestamp: string, action: string, details: string }[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"dashboard" | "transactions" | "budgets" | "reconciliation" | "ai-advisor">("dashboard");
  const [splitTransaction, setSplitTransaction] = useState<Transaction | null>(null);

  // Restore state from LocalStorage on mount
  useEffect(() => {
    try {
      const savedFileName = localStorage.getItem("bs_file_name");
      const savedFileType = localStorage.getItem("bs_file_type");
      const savedTransactions = localStorage.getItem("bs_transactions");
      const savedSummary = localStorage.getItem("bs_summary");
      const savedBudgets = localStorage.getItem("bs_budgets");
      const savedCategories = localStorage.getItem("bs_categories");
      const savedSoftDeleted = localStorage.getItem("bs_soft_deleted_categories");
      const savedAuditLog = localStorage.getItem("bs_audit_log");

      if (savedSoftDeleted) {
        setSoftDeletedCategories(JSON.parse(savedSoftDeleted));
      }
      if (savedAuditLog) {
        setAuditLog(JSON.parse(savedAuditLog));
      }

      let loadedCats = [...DEFAULT_CATEGORIES];
      if (savedCategories) {
        loadedCats = JSON.parse(savedCategories);
      }

      if (savedFileName && savedFileType && savedTransactions && savedSummary) {
        const restoredTransactions = JSON.parse(savedTransactions);
        setFileName(savedFileName);
        setFileType(savedFileType as any);
        setTransactions(restoredTransactions);
        setSummary(JSON.parse(savedSummary));
        setFileUploaded(true);
        if (savedBudgets) {
          setCategoryBudgets(JSON.parse(savedBudgets));
        }

        // Clean up unused demo categories on load
        const cleanedCats = deleteUnusedDemoCategories(restoredTransactions, loadedCats);
        if (!cleanedCats.includes("UCLP Premium")) cleanedCats.push("UCLP Premium");
        setCategories(cleanedCats);
        localStorage.setItem("bs_categories", JSON.stringify(cleanedCats));
      } else {
        if (!loadedCats.includes("UCLP Premium")) loadedCats.push("UCLP Premium");
        setCategories(loadedCats);
      }
    } catch (err) {
      console.error("Failed to restore cached statement state:", err);
      setCategories([...DEFAULT_CATEGORIES, "UCLP Premium"]);
    }
  }, []);

  // Save changes to LocalStorage when states change
  const saveStateToLocalStorage = (
    name: string,
    type: string,
    txs: Transaction[],
    sum: StatementSummary,
    budgets: Record<string, number>,
    cats?: string[],
    softDeleted?: string[],
    log?: { timestamp: string, action: string, details: string }[]
  ) => {
    try {
      localStorage.setItem("bs_file_name", name);
      localStorage.setItem("bs_file_type", type);
      localStorage.setItem("bs_transactions", JSON.stringify(txs));
      localStorage.setItem("bs_summary", JSON.stringify(sum));
      localStorage.setItem("bs_budgets", JSON.stringify(budgets));
      localStorage.setItem("bs_categories", JSON.stringify(cats || categories));
      localStorage.setItem("bs_soft_deleted_categories", JSON.stringify(softDeleted || softDeletedCategories));
      localStorage.setItem("bs_audit_log", JSON.stringify(log || auditLog));
    } catch (err) {
      console.error("Failed to persist state to local cache:", err);
    }
  };

  const handleUploadSuccess = async (
    type: "mt940" | "csv" | "excel",
    content: string | any[],
    name: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileType: type,
          fileContent: content,
          originalFileName: name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "An unexpected error occurred during statement analysis.");
      }

      const data = await response.json();
      
      // Prepare list of parsed transactions and ensure original categories are backed up
      let parsedTransactions = data.transactions.map((tx: any) => {
        let finalCat = tx.category;
        if (tx.description && tx.description.toLowerCase().includes('disbursement credit')) {
           finalCat = 'UCLP Premium';
        }
        return {
          ...tx,
          category: finalCat,
          originalCategory: finalCat,
          isSplit: false,
          splits: []
        };
      });

      // Identify recurring transactions based on frequency/category
      const payeeMap: Record<string, { count: number; amounts: number[] }> = {};
      parsedTransactions.forEach((tx: any) => {
        const key = tx.cleanDescription || tx.description;
        if (!key) return;
        const normalizedKey = key.toLowerCase().trim();
        if (!payeeMap[normalizedKey]) {
          payeeMap[normalizedKey] = { count: 0, amounts: [] };
        }
        payeeMap[normalizedKey].count += 1;
        payeeMap[normalizedKey].amounts.push(tx.amount);
      });

      parsedTransactions = parsedTransactions.map((tx: any) => {
        const key = tx.cleanDescription || tx.description;
        const normalizedKey = key ? key.toLowerCase().trim() : "";
        const stats = payeeMap[normalizedKey];
        
        let isRecurring = tx.isRecurring || false;
        
        // Flag if occurs multiple times with same amount
        if (!isRecurring && stats && stats.count > 1) {
          const sameAmountCount = stats.amounts.filter(a => a === tx.amount).length;
          if (sameAmountCount > 1) {
            isRecurring = true;
          }
        }
        
        // Flag if category suggests recurring
        if (!isRecurring && (tx.category === "Subscriptions & Bills" || tx.category === "Housing & Rent")) {
          isRecurring = true;
        }

        return { ...tx, isRecurring };
      });

      // Automatically delete unused demo categories on upload
      const initialCats = categories.length > 0 ? categories : [...DEFAULT_CATEGORIES];
      if (!initialCats.includes("UCLP Premium")) initialCats.push("UCLP Premium");
      const cleanedCats = deleteUnusedDemoCategories(parsedTransactions, initialCats);

      // Setup default budgets for categories
      const initialBudgets: Record<string, number> = {};
      cleanedCats.forEach(cat => {
        if (cat === "Groceries") initialBudgets[cat] = 400;
        else if (cat === "Housing & Rent") initialBudgets[cat] = 1000;
        else if (cat === "Utilities") initialBudgets[cat] = 200;
        else if (cat === "Dining & Cafes") initialBudgets[cat] = 200;
        else if (cat === "Shopping & Retail") initialBudgets[cat] = 250;
        else if (cat === "Transport & Fuel") initialBudgets[cat] = 150;
        else if (cat === "Subscriptions & Bills") initialBudgets[cat] = 80;
        else initialBudgets[cat] = 150;
      });

      // Assemble overall statement summary data
      const constructedSummary: StatementSummary = {
        totalIncome: 0,
        totalExpenses: 0,
        netSavings: 0,
        savingsRate: 0,
        categoryBreakdown: [],
        dailyFlow: [],
        insights: data.insights || []
      };

      setTransactions(parsedTransactions);
      setSummary(constructedSummary);
      setFileType(type);
      setFileName(name);
      setCategoryBudgets(initialBudgets);
      setCategories(cleanedCats);
      setFileUploaded(true);
      setActiveView("dashboard");

      // Cache locally
      saveStateToLocalStorage(
        name,
        type,
        parsedTransactions,
        constructedSummary,
        initialBudgets,
        cleanedCats
      );

    } catch (err: any) {
      console.error("Statement analysis failed:", err);
      setError(err.message || "Unable to reach the statement analyzer. Please verify your internet connection or check API keys.");
    } finally {
      setIsLoading(false);
    }
  };

  // Split transaction save handler
  const handleSaveSplits = (transactionId: string, splits: TransactionSplit[]) => {
    const updatedTransactions = transactions.map(tx => {
      if (tx.id === transactionId) {
        return {
          ...tx,
          isSplit: true,
          splits: splits,
          category: "Multi-Category" // Mark with sentinel
        };
      }
      return tx;
    });

    setTransactions(updatedTransactions);
    
    if (fileName && fileType && summary) {
      saveStateToLocalStorage(fileName, fileType, updatedTransactions, summary, categoryBudgets);
    }
  };

  // Restore split transaction back to original state
  const handleUnsplit = (transactionId: string) => {
    const updatedTransactions = transactions.map(tx => {
      if (tx.id === transactionId) {
        return {
          ...tx,
          isSplit: false,
          splits: [],
          category: tx.originalCategory || "Others"
        };
      }
      return tx;
    });

    setTransactions(updatedTransactions);

    if (fileName && fileType && summary) {
      saveStateToLocalStorage(fileName, fileType, updatedTransactions, summary, categoryBudgets);
    }
  };

  // Custom Category quick override handler
  const handleCategoryChange = (transactionId: string, newCategory: string) => {
    const updatedTransactions = transactions.map(tx => {
      if (tx.id === transactionId) {
        return {
          ...tx,
          category: newCategory
        };
      }
      return tx;
    });

    setTransactions(updatedTransactions);

    if (fileName && fileType && summary) {
      saveStateToLocalStorage(fileName, fileType, updatedTransactions, summary, categoryBudgets);
    }
  };

  // Budget change handler
  const handleBudgetChange = (category: string, amount: number) => {
    const updatedBudgets = {
      ...categoryBudgets,
      [category]: amount
    };
    setCategoryBudgets(updatedBudgets);

    if (fileName && fileType && summary) {
      saveStateToLocalStorage(fileName, fileType, transactions, summary, updatedBudgets);
    }
  };

  // Add custom category handler
  const handleAddCategory = (newCat: string, initialBudget = 150) => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      alert("A category with this name already exists.");
      return;
    }

    const updatedCats = [...categories, trimmed];
    const updatedBudgets = { ...categoryBudgets, [trimmed]: initialBudget };

    setCategories(updatedCats);
    setCategoryBudgets(updatedBudgets);
    localStorage.setItem("bs_categories", JSON.stringify(updatedCats));
    localStorage.setItem("bs_budgets", JSON.stringify(updatedBudgets));

    if (fileName && fileType && summary) {
      saveStateToLocalStorage(fileName, fileType, transactions, summary, updatedBudgets, updatedCats);
    }
  };

  // Delete custom category handler with soft and hard deletion support
  const handleDeleteCategory = (catToDelete: string) => {
    const isUsed = transactions.some(tx => {
      if (tx.isSplit && tx.splits) {
        return tx.splits.some(s => s.category === catToDelete);
      }
      return tx.category === catToDelete;
    });

    if (isUsed) {
      // Soft deletion
      if (!window.confirm(`"${catToDelete}" is currently used in transactions. It will be soft-deleted (archived). Historical transactions will keep this category, but it will no longer be available for new transactions.`)) {
        return;
      }

      const updatedSoftDeleted = [...softDeletedCategories, catToDelete];
      setSoftDeletedCategories(updatedSoftDeleted);
      localStorage.setItem("bs_soft_deleted_categories", JSON.stringify(updatedSoftDeleted));

      const updatedCats = categories.filter(c => c !== catToDelete);
      setCategories(updatedCats);
      localStorage.setItem("bs_categories", JSON.stringify(updatedCats));

      if (fileName && fileType && summary) {
        saveStateToLocalStorage(fileName, fileType, transactions, summary, categoryBudgets, updatedCats, updatedSoftDeleted);
      }
    } else {
      // Hard deletion
      if (!window.confirm(`Are you sure you want to permanently delete "${catToDelete}"? Since it is not used in any transactions, it will be fully removed.`)) {
        return;
      }

      const updatedCats = categories.filter(c => c !== catToDelete);
      setCategories(updatedCats);
      localStorage.setItem("bs_categories", JSON.stringify(updatedCats));

      const updatedBudgets = { ...categoryBudgets };
      delete updatedBudgets[catToDelete];
      setCategoryBudgets(updatedBudgets);
      localStorage.setItem("bs_budgets", JSON.stringify(updatedBudgets));

      if (fileName && fileType && summary) {
        saveStateToLocalStorage(fileName, fileType, transactions, summary, updatedBudgets, updatedCats);
      }
    }
  };

  // Rename category handler - enabled even if category is used, keeping audit log
  const handleRenameCategory = (oldName: string, newName: string) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew || trimmedNew.toLowerCase() === oldName.toLowerCase()) return;

    if (categories.some(c => c.toLowerCase() === trimmedNew.toLowerCase())) {
      alert("A category with this name already exists.");
      return;
    }

    const updatedCats = categories.map(c => c === oldName ? trimmedNew : c);
    setCategories(updatedCats);

    const updatedBudgets = { ...categoryBudgets };
    if (updatedBudgets[oldName] !== undefined) {
      updatedBudgets[trimmedNew] = updatedBudgets[oldName];
      delete updatedBudgets[oldName];
    }
    setCategoryBudgets(updatedBudgets);

    // Update transactions and split records
    const updatedTransactions = transactions.map(tx => {
      let changed = false;
      let newCategory = tx.category;
      let newSplits = tx.splits;

      if (tx.category === oldName) {
        newCategory = trimmedNew;
        changed = true;
      }

      if (tx.splits && tx.splits.length > 0) {
        const nextSplits = tx.splits.map(s => {
          if (s.category === oldName) {
            changed = true;
            return { ...s, category: trimmedNew };
          }
          return s;
        });
        if (changed) {
            newSplits = nextSplits;
        }
      }

      if (changed) {
        return {
          ...tx,
          category: newCategory,
          splits: newSplits
        };
      }
      return tx;
    });

    const newLog = {
      timestamp: new Date().toISOString(),
      action: "RENAME_CATEGORY",
      details: `Renamed category from "${oldName}" to "${trimmedNew}"`
    };
    const updatedLog = [...auditLog, newLog];

    setTransactions(updatedTransactions);
    setAuditLog(updatedLog);

    if (fileName && fileType && summary) {
      saveStateToLocalStorage(fileName, fileType, updatedTransactions, summary, updatedBudgets, updatedCats, softDeletedCategories, updatedLog);
    } else {
      localStorage.setItem("bs_categories", JSON.stringify(updatedCats));
      localStorage.setItem("bs_budgets", JSON.stringify(updatedBudgets));
      localStorage.setItem("bs_audit_log", JSON.stringify(updatedLog));
    }
  };

  // Reset/Clear active statement
  const handleReset = () => {
    if (window.confirm("Are you sure you want to upload a new statement? Your current splits, budgets, and edits will be removed.")) {
      localStorage.removeItem("bs_file_name");
      localStorage.removeItem("bs_file_type");
      localStorage.removeItem("bs_transactions");
      localStorage.removeItem("bs_summary");
      localStorage.removeItem("bs_budgets");

      setFileUploaded(false);
      setFileType(null);
      setFileName(null);
      setTransactions([]);
      setSummary(null);
      setCategoryBudgets({});
      setError(null);
      setActiveView("dashboard");
    }
  };

  const handleExportPDF = async () => {
    const mainElement = document.getElementById("app-main-content");
    if (!mainElement) return;
    
    try {
      const dataUrl = await toPng(mainElement, { cacheBust: true, pixelRatio: 2 });
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      // Calculate height based on A4 width and element ratio
      const rect = mainElement.getBoundingClientRect();
      const pdfHeight = (rect.height * pdfWidth) / rect.width;
      
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`LedgerFlow_Report_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("PDF Export failed:", error);
      alert("Failed to export PDF.");
    }
  };

  // Custom client-side CSV statement exporter
  const handleExportCSV = () => {
    if (transactions.length === 0) return;

    // Headers
    const headers = [
      "Date",
      "Payee / Vendor",
      "Original Bank Description",
      "Amount",
      "Debit/Credit",
      "Category",
      "Is Split",
      "Split Item Memo",
      "Split Item Category",
      "Split Item Amount"
    ];

    const rows = [];

    transactions.forEach(tx => {
      const typeLabel = tx.amount < 0 ? "Debit" : "Credit";
      if (tx.isSplit && tx.splits && tx.splits.length > 0) {
        // Expand each split item as a row
        tx.splits.forEach(s => {
          rows.push([
            tx.date,
            tx.cleanDescription || tx.description,
            tx.description,
            tx.amount.toFixed(2),
            typeLabel,
            tx.category,
            "TRUE",
            s.description,
            s.category,
            s.amount.toFixed(2)
          ]);
        });
      } else {
        rows.push([
          tx.date,
          tx.cleanDescription || tx.description,
          tx.description,
          tx.amount.toFixed(2),
          typeLabel,
          tx.category,
          "FALSE",
          "",
          "",
          ""
        ]);
      }
    });

    // Generate CSV contents
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analyzed_statement_${fileName?.replace(/\.[^/.]+$/, "") || "export"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col justify-between" id="app-root-container">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded flex items-center justify-center font-bold text-lg text-white shadow-sm shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 select-none">
                  LedgerFlow
                  <span className="text-xs font-normal text-slate-400">
                    v2.4
                  </span>
                </h1>
                <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase hidden sm:block">Professional Bank Statement Analyzer</p>
              </div>
            </div>
          </div>

          {fileUploaded && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
              {/* Loaded file details */}
              <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md text-xs text-slate-600 flex items-center gap-2 max-w-full sm:max-w-xs w-full sm:w-auto">
                <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0 animate-pulse"></span>
                <span className="truncate font-medium text-slate-700 block">{fileName}</span>
              </div>

              {/* Export Buttons */}
              <button
                onClick={handleExportPDF}
                className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md font-medium text-xs border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Export View to PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md font-medium text-xs border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Export Analyzed Statement to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              {/* Clear All Data Button */}
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to remove all uploaded ledgers and statements? This will reset the application.")) {
                    localStorage.removeItem("bs_file_name");
                    localStorage.removeItem("bs_file_type");
                    localStorage.removeItem("bs_transactions");
                    localStorage.removeItem("bs_summary");
                    localStorage.removeItem("bs_budgets");
                    localStorage.removeItem("rec_accounts");
                    localStorage.removeItem("rec_ledger_map");
                    localStorage.removeItem("rec_matches_map");
                    localStorage.removeItem("rec_flagged_map");

                    setFileUploaded(false);
                    setFileType(null);
                    setFileName(null);
                    setTransactions([]);
                    setSummary(null);
                    setCategoryBudgets({});
                    setError(null);
                    setActiveView("dashboard");
                  }
                }}
                className="flex-1 sm:flex-none px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-md font-medium text-xs border border-rose-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Remove uploaded ledgers and statements"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Data</span>
              </button>
            </div>
          )}
        </div>

        {fileUploaded && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3">
            {/* Navigation Options - Scrollable on mobile */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 select-none text-xs font-semibold text-slate-600 overflow-x-auto hide-scrollbar scroll-smooth w-full snap-x">
              <button
                onClick={() => setActiveView("dashboard")}
                className={`whitespace-nowrap shrink-0 snap-start px-4 py-2 rounded-md transition ${
                  activeView === "dashboard" ? "bg-blue-600 text-white shadow-sm" : "hover:text-slate-950"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveView("transactions")}
                className={`whitespace-nowrap shrink-0 snap-start px-4 py-2 rounded-md transition ${
                  activeView === "transactions" ? "bg-blue-600 text-white shadow-sm" : "hover:text-slate-950"
                }`}
              >
                Ledger
              </button>
              <button
                onClick={() => setActiveView("budgets")}
                className={`whitespace-nowrap shrink-0 snap-start px-4 py-2 rounded-md transition ${
                  activeView === "budgets" ? "bg-blue-600 text-white shadow-sm" : "hover:text-slate-950"
                }`}
              >
                Budgets & Categories
              </button>
              <button
                onClick={() => setActiveView("reconciliation")}
                className={`whitespace-nowrap shrink-0 snap-start px-4 py-2 rounded-md transition ${
                  activeView === "reconciliation" ? "bg-blue-600 text-white shadow-sm" : "hover:text-slate-950"
                }`}
              >
                Reconciliation
              </button>
              <button
                onClick={() => setActiveView("ai-advisor")}
                className={`whitespace-nowrap shrink-0 snap-start px-4 py-2 rounded-md transition ${
                  activeView === "ai-advisor" ? "bg-blue-600 text-white shadow-sm" : "hover:text-slate-950"
                }`}
              >
                AI Advisor
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Stage */}
      <main id="app-main-content" className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {!fileUploaded ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <StatementUploader
                onUploadSuccess={handleUploadSuccess}
                isLoading={isLoading}
                error={error}
              />
            </motion.div>
          ) : (
            <motion.div
              key={activeView}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {activeView === "dashboard" && summary && (
                <CategoryDashboard
                  summary={summary}
                  transactions={transactions}
                  categories={categories}
                  softDeletedCategories={softDeletedCategories}
                />
              )}

              {activeView === "transactions" && (
                <TransactionList
                  transactions={transactions}
                  categories={categories}
                  onSplitClick={(tx) => setSplitTransaction(tx)}
                  onUnsplitClick={handleUnsplit}
                  onCategoryChange={handleCategoryChange}
                  softDeletedCategories={softDeletedCategories}
                />
              )}

              {activeView === "budgets" && (
                <BudgetsCategories
                  transactions={transactions}
                  categoryBudgets={categoryBudgets}
                  onBudgetChange={handleBudgetChange}
                  categories={categories}
                  onAddCategory={handleAddCategory}
                  onRenameCategory={handleRenameCategory}
                  onDeleteCategory={handleDeleteCategory}
                  softDeletedCategories={softDeletedCategories}
                  auditLog={auditLog}
                />
              )}

              {activeView === "reconciliation" && (
                <ReconciliationTab
                  bankTransactions={transactions}
                  categories={categories}
                />
              )}

              {activeView === "ai-advisor" && summary && (
                <AiAdvisor summary={summary} transactions={transactions} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Modals overlay */}
      {splitTransaction && (
        <SplitModal
          transaction={splitTransaction}
          categories={categories}
          onSave={handleSaveSplits}
          onClose={() => setSplitTransaction(null)}
          softDeletedCategories={softDeletedCategories}
        />
      )}

      {/* Simple Footer */}
      <footer className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span> Connection: SECURE</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Storage: LOCAL CACHE</span>
        </div>
        <div className="flex items-center gap-4">
          <p className="flex items-center gap-1 font-semibold text-slate-500">
            Powered by Gemini AI <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
          </p>
        </div>
      </footer>
    </div>
  );
}
