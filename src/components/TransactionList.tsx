import React, { useState } from "react";
import {
  Search,
  Filter,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
  Split,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
  Repeat,
  Calendar,
  Clock,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  X,
  Sparkles
} from "lucide-react";
import { Transaction, TransactionSplit } from "../types";

interface TransactionListProps {
  transactions: Transaction[];
  categories: string[];
  onSplitClick: (transaction: Transaction) => void;
  onUnsplitClick: (transactionId: string) => void;
  onCategoryChange: (transactionId: string, newCategory: string) => void;
  softDeletedCategories?: string[];
  onRecurringChange?: (
    transactionId: string,
    isRecurring: boolean,
    frequency?: string,
    isConfirmed?: boolean
  ) => void;
}

export default function TransactionList({
  transactions,
  categories,
  onSplitClick,
  onUnsplitClick,
  onCategoryChange,
  softDeletedCategories = [],
  onRecurringChange
}: TransactionListProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<"all" | "recurring">("all");

  // Ledger Tab States
  const [searchTerm, setSearchTerm] = useState("");
  const [payeeSearchTerm, setPayeeSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedSplits, setExpandedSplits] = useState<Record<string, boolean>>({});

  // Recurring Tab States
  const [recSearch, setRecSearch] = useState("");
  const [recStatusFilter, setRecStatusFilter] = useState<"all" | "confirmed" | "pending">("all");
  const [recFreqFilter, setRecFreqFilter] = useState<string>("All");
  const [recCategoryFilter, setRecCategoryFilter] = useState<string>("All");

  const toggleExpandSplits = (txId: string) => {
    setExpandedSplits(prev => ({ ...prev, [txId]: !prev[txId] }));
  };

  const handleSort = (field: "date" | "amount") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  // Monthly equivalent calculation helper
  const getMonthlyEquivalent = (amount: number, frequency: string = "Monthly"): number => {
    const absAmount = Math.abs(amount);
    switch (frequency) {
      case "Weekly":
        return (absAmount * 52) / 12;
      case "Bi-weekly":
        return (absAmount * 26) / 12;
      case "Monthly":
        return absAmount;
      case "Quarterly":
        return absAmount / 3;
      case "Annually":
        return absAmount / 12;
      default:
        return absAmount;
    }
  };

  // Filter & Sort Logic for Main Ledger
  const filteredTransactions = transactions.filter(tx => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (tx.cleanDescription || tx.description || "").toLowerCase().includes(searchLower) ||
      (tx.description || "").toLowerCase().includes(searchLower) ||
      (tx.counterparty || "").toLowerCase().includes(searchLower) ||
      (tx.reference || "").toLowerCase().includes(searchLower) ||
      (tx.category || "").toLowerCase().includes(searchLower) ||
      tx.amount.toString().includes(searchLower) ||
      Math.abs(tx.amount).toString().includes(searchLower) ||
      tx.date.toLowerCase().includes(searchLower);

    const payeeLower = payeeSearchTerm.toLowerCase();
    const matchesPayeeSearch =
      !payeeSearchTerm ||
      (tx.cleanDescription || tx.description || "").toLowerCase().includes(payeeLower) ||
      (tx.description || "").toLowerCase().includes(payeeLower) ||
      (tx.counterparty || "").toLowerCase().includes(payeeLower);

    const matchesCategory =
      selectedCategory === "All" ||
      tx.category === selectedCategory ||
      (tx.isSplit && tx.splits?.some(s => s.category === selectedCategory));

    const matchesType =
      selectedType === "All" ||
      (selectedType === "income" && tx.amount > 0) ||
      (selectedType === "expense" && tx.amount < 0);
      
    const matchesStartDate = !startDate || tx.date >= startDate;
    const matchesEndDate = !endDate || tx.date <= endDate;

    return matchesSearch && matchesPayeeSearch && matchesCategory && matchesType && matchesStartDate && matchesEndDate;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let valA = sortField === "date" ? a.date : a.amount;
    let valB = sortField === "date" ? b.date : b.amount;

    if (sortField === "date") {
      const dateA = new Date(valA as string).getTime();
      const dateB = new Date(valB as string).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    } else {
      return sortOrder === "desc" ? (valB as number) - (valA as number) : (valA as number) - (valB as number);
    }
  });

  // Pagination
  const totalItems = sortedTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedTransactions.slice(indexOfFirstItem, indexOfLastItem);

  const resetFilters = () => {
    setSearchTerm("");
    setPayeeSearchTerm("");
    setSelectedCategory("All");
    setSelectedType("All");
    setStartDate("");
    setEndDate("");
    setSortField("date");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  // --- RECURRING TRANSACTIONS DETECTION & FILTERING ---
  // A transaction is recurring if the AI flagged it, or if it has been confirmed, or if it matches recurring patterns
  const isAutoDetectedRecurring = (tx: Transaction): boolean => {
    if (tx.isRecurring) return true;
    
    const desc = (tx.description || "").toLowerCase();
    const cleanDesc = (tx.cleanDescription || "").toLowerCase();
    const counterparty = (tx.counterparty || "").toLowerCase();
    
    const recurringKeywords = [
      "netflix", "spotify", "rent", "allianz", "insurance", "premium", "subs", "subscription",
      "monthly", "membership", "broadband", "utilities", "telecom", "telecommunication",
      "bill", "water bill", "electricity", "disbursement credit"
    ];
    
    return recurringKeywords.some(keyword => 
      desc.includes(keyword) || 
      cleanDesc.includes(keyword) || 
      counterparty.includes(keyword)
    );
  };

  // Group transactions by "payee" or description to find duplicates that happen regularly
  const recurringItems = transactions.filter(tx => tx.isRecurringConfirmed || isAutoDetectedRecurring(tx));

  const filteredRecurringItems = recurringItems.filter(tx => {
    // Search
    const searchLower = recSearch.toLowerCase();
    const matchesSearch = 
      (tx.cleanDescription || tx.description || "").toLowerCase().includes(searchLower) ||
      (tx.description || "").toLowerCase().includes(searchLower) ||
      (tx.counterparty || "").toLowerCase().includes(searchLower);

    // Status Filter
    let matchesStatus = true;
    if (recStatusFilter === "confirmed") {
      matchesStatus = !!tx.isRecurringConfirmed;
    } else if (recStatusFilter === "pending") {
      matchesStatus = !tx.isRecurringConfirmed;
    }

    // Frequency Filter
    const frequency = tx.recurringFrequency || "Monthly";
    const matchesFreq = recFreqFilter === "All" || frequency === recFreqFilter;

    // Category Filter
    const matchesCategory = recCategoryFilter === "All" || tx.category === recCategoryFilter;

    return matchesSearch && matchesStatus && matchesFreq && matchesCategory;
  });

  // Calculate recurring metrics
  const recurringOutflows = recurringItems.filter(tx => tx.amount < 0);
  const recurringInflows = recurringItems.filter(tx => tx.amount > 0);

  const totalMonthlyOutflow = recurringOutflows.reduce((sum, tx) => {
    return sum + getMonthlyEquivalent(tx.amount, tx.recurringFrequency || "Monthly");
  }, 0);

  const totalMonthlyInflow = recurringInflows.reduce((sum, tx) => {
    return sum + getMonthlyEquivalent(tx.amount, tx.recurringFrequency || "Monthly");
  }, 0);

  const confirmedCount = recurringItems.filter(tx => tx.isRecurringConfirmed).length;
  const pendingCount = recurringItems.length - confirmedCount;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="transaction-list-section">
      {/* Title & Stats summary line */}
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Transaction Ledger</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeTab === "all" ? (
              `Showing ${filteredTransactions.length} of ${transactions.length} records parsed from statement`
            ) : (
              `Showing ${filteredRecurringItems.length} of ${recurringItems.length} recurring outlays/inflows identified`
            )}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-start md:self-center">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Ledger View
          </button>
          <button
            onClick={() => setActiveTab("recurring")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all relative ${
              activeTab === "recurring"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            Recurring Outlays
            {recurringItems.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 text-[9px] rounded-full font-bold ${
                activeTab === "recurring" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600"
              }`}>
                {recurringItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* RENDER ACCORDING TO ACTIVE TAB */}
      {activeTab === "all" ? (
        <>
          {/* Filtering Toolbar */}
          <div className="p-6 border-b border-slate-200 flex flex-col gap-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search Payee / Description */}
              <div className="relative col-span-1 md:col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Search Payee / Description</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search description or payee name in real-time..."
                    value={payeeSearchTerm}
                    onChange={(e) => { setPayeeSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-9 pr-4 py-1.5 w-full text-sm border border-slate-200 rounded-md bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              {/* Filter by Category */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Filter Category</label>
                <div className="relative">
                  <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                    className="pl-9 pr-4 py-1.5 w-full text-sm border border-slate-200 rounded-md bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition appearance-none cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    {softDeletedCategories && softDeletedCategories.length > 0 && (
                      <optgroup label="Archived Categories">
                        {softDeletedCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              {/* Filter by Credit/Debit */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Transaction Type</label>
                <div className="relative">
                  <SlidersHorizontal className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <select
                    value={selectedType}
                    onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
                    className="pl-9 pr-4 py-1.5 w-full text-sm border border-slate-200 rounded-md bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition appearance-none cursor-pointer"
                  >
                    <option value="All">All Types</option>
                    <option value="expense">Expenses Only (Debit)</option>
                    <option value="income">Income Only (Credit)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
              {/* General Search (All fields) */}
              <div className="relative col-span-1 md:col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Advanced General Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search references, amounts, codes..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-9 pr-4 py-1.5 w-full text-sm border border-slate-200 rounded-md bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Start Date</label>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-1.5 w-full text-sm border border-slate-200 rounded-md bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">End Date</label>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-1.5 w-full text-sm border border-slate-200 rounded-md bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-sans text-xs uppercase tracking-wider text-slate-500 font-bold select-none">
                  <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort("date")}>
                    <div className="flex items-center gap-1">
                      Date {sortField === "date" ? (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />) : null}
                    </div>
                  </th>
                  <th className="px-6 py-3">Payee / Original Bank Details</th>
                  <th className="px-6 py-3">Category Assignment</th>
                  <th className="px-6 py-3 cursor-pointer hover:bg-slate-100 text-right" onClick={() => handleSort("amount")}>
                    <div className="flex items-center justify-end gap-1">
                      Amount {sortField === "amount" ? (sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />) : null}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-sm text-slate-500">
                      No transactions match the selected filters.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((tx) => {
                    const isExpanded = expandedSplits[tx.id] || false;
                    const signStr = tx.amount < 0 ? "-" : "+";
                    const amountColor = tx.amount < 0 ? "text-slate-900" : "text-emerald-700 font-semibold";
                    
                    const isRecurring = tx.isRecurringConfirmed || isAutoDetectedRecurring(tx);
                    const isConfirmed = !!tx.isRecurringConfirmed;

                    return (
                      <React.Fragment key={tx.id}>
                        {/* Main Row */}
                        <tr className={`hover:bg-slate-50/70 transition-colors ${
                          tx.isSplit 
                            ? "bg-blue-50/20 border-l-4 border-l-blue-600" 
                            : isRecurring
                              ? isConfirmed 
                                ? "bg-emerald-50/20 border-l-4 border-l-emerald-500" 
                                : "bg-amber-50/20 border-l-4 border-l-amber-500"
                              : ""
                        }`}>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-500 font-mono whitespace-nowrap">
                            {tx.date}
                          </td>

                          <td className="px-6 py-4 max-w-sm">
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              {tx.amount > 0 ? (
                                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                </div>
                              )}
                              <span className="truncate block">{tx.cleanDescription || tx.description}</span>
                              
                              {/* Highlight recurring inline */}
                              {isRecurring && (
                                <button
                                  onClick={() => setActiveTab("recurring")}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-md select-none shrink-0 border transition ${
                                    isConfirmed 
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                                      : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                  }`}
                                  title={`Recurring ${tx.recurringFrequency || "Monthly"} - Click to edit frequency`}
                                >
                                  <Repeat className="w-2.5 h-2.5 animate-pulse" />
                                  {tx.recurringFrequency || "Monthly"}
                                  {!isConfirmed && " (Review)"}
                                </button>
                              )}
                            </div>
                            {/* Original Raw Text toggle-hint */}
                            <span className="text-[11px] text-slate-400 truncate block mt-0.5 font-mono" title={tx.description}>
                              {tx.description}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            {tx.isSplit ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded flex items-center gap-1 select-none uppercase tracking-wider">
                                  <Split className="w-3 h-3" /> SPLIT
                                </span>
                                <button
                                  onClick={() => toggleExpandSplits(tx.id)}
                                  className="p-1 hover:bg-slate-100 text-slate-500 rounded-md transition"
                                  title="Toggle breakdown visibility"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>
                            ) : (
                              <select
                                value={tx.category}
                                onChange={(e) => onCategoryChange(tx.id, e.target.value)}
                                className="text-xs border border-slate-200 rounded-md p-1.5 bg-slate-50 hover:bg-white focus:ring-1 focus:ring-blue-500 font-medium text-slate-700 max-w-[160px] cursor-pointer"
                              >
                                {categories.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                                {softDeletedCategories && softDeletedCategories.includes(tx.category) && (
                                  <option value={tx.category} disabled>{tx.category} (Archived)</option>
                                )}
                              </select>
                            )}
                          </td>

                          <td className="px-6 py-4 text-right font-mono font-bold text-sm whitespace-nowrap">
                            <span className={amountColor}>
                              {signStr}ر.ع. {Math.abs(tx.amount).toFixed(3)}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {tx.isSplit ? (
                                <>
                                  <button
                                    onClick={() => onSplitClick(tx)}
                                    className="px-2.5 py-1 text-xs border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold rounded-md transition"
                                    title="Edit existing splits"
                                  >
                                    Edit Splits
                                  </button>
                                  <button
                                    onClick={() => onUnsplitClick(tx.id)}
                                    className="px-2 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 font-semibold rounded-md transition"
                                    title="Merge splits back to single category"
                                  >
                                    Restore
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => onSplitClick(tx)}
                                  className="px-3 py-1 text-xs border border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold rounded-md flex items-center gap-1 transition-all"
                                  title="Split this payment"
                                >
                                  <Split className="w-3.5 h-3.5" /> Split
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Split Details Sub-Rows */}
                        {tx.isSplit && isExpanded && tx.splits?.map((split, idx) => (
                          <tr key={split.id} className="bg-blue-50/10 border-l-4 border-l-blue-400">
                            <td className="px-6 py-2.5 text-xs text-slate-400 font-mono text-right font-semibold">
                              ↳ Split {idx + 1}
                            </td>
                            <td className="px-6 py-2.5 pl-10">
                              <span className="text-xs font-medium text-slate-700 block italic">
                                {split.description || `Split Part ${idx + 1}`}
                              </span>
                            </td>
                            <td className="px-6 py-2.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                {split.category}
                              </span>
                            </td>
                            <td className="px-6 py-2.5 text-right font-mono text-xs font-semibold text-slate-500 whitespace-nowrap">
                              {tx.amount < 0 ? "-" : "+"}ر.ع. {Math.abs(split.amount).toFixed(3)}
                            </td>
                            <td className="px-6 py-2.5"></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600 select-none">
              <div>
                Showing <span className="font-semibold text-slate-800">{indexOfFirstItem + 1}</span> to{" "}
                <span className="font-semibold text-slate-800">{Math.min(indexOfLastItem, totalItems)}</span> of{" "}
                <span className="font-semibold text-slate-800">{totalItems}</span> items
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold disabled:opacity-30 disabled:hover:bg-white transition"
                >
                  Previous
                </button>

                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition ${
                      currentPage === i + 1
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold disabled:opacity-30 disabled:hover:bg-white transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        // --- RECURRING TRANSACTIONS VIEW TAB ---
        <div className="p-6 bg-white flex flex-col gap-6 animate-fadeIn">
          {/* Analytics Subbar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Outflows Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl border border-slate-850 shadow-sm text-white">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Projected Monthly Outflow</span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono">ر.ع. {totalMonthlyOutflow.toFixed(3)}</span>
                <span className="text-xs text-slate-400">/ mo</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                Equivalent of all identified recurring expenses
              </p>
            </div>

            {/* Inflows Card */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs text-slate-950">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Projected Monthly Inflow</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-emerald-700">ر.ع. {totalMonthlyInflow.toFixed(3)}</span>
                <span className="text-xs text-slate-500">/ mo</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                Calculated salary or wages recurrence
              </p>
            </div>

            {/* Summary Count Card */}
            <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 shadow-xs text-slate-950">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-amber-800 tracking-wider">Audit & Verify Status</span>
                <Repeat className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-900">{confirmedCount}</span>
                <span className="text-sm font-semibold text-amber-700">Confirmed</span>
                <span className="text-xs text-slate-400 font-bold mx-1">/</span>
                <span className="text-2xl font-black text-amber-600">{pendingCount}</span>
                <span className="text-sm font-semibold text-amber-600">Pending</span>
              </div>
              <p className="text-[10px] text-amber-800 mt-1.5">
                Ensure correctness to improve budget forecasting and analysis
              </p>
            </div>
          </div>

          {/* Recurring Filtering Toolbar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search recurring payees..."
                value={recSearch}
                onChange={(e) => setRecSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 w-full text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              {/* Status Selector */}
              <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 self-stretch items-center">
                <button
                  onClick={() => setRecStatusFilter("all")}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md ${
                    recStatusFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setRecStatusFilter("confirmed")}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md ${
                    recStatusFilter === "confirmed" ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-emerald-700"
                  }`}
                >
                  Confirmed
                </button>
                <button
                  onClick={() => setRecStatusFilter("pending")}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md ${
                    recStatusFilter === "pending" ? "bg-amber-600 text-white" : "text-slate-600 hover:text-amber-700"
                  }`}
                >
                  Pending
                </button>
              </div>

              {/* Frequency Selector Filter */}
              <select
                value={recFreqFilter}
                onChange={(e) => setRecFreqFilter(e.target.value)}
                className="text-[11px] border border-slate-200 bg-white rounded-lg px-2.5 py-1 font-bold text-slate-600 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="All">All Frequencies</option>
                <option value="Weekly">Weekly</option>
                <option value="Bi-weekly">Bi-weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annually">Annually</option>
              </select>

              {/* Category Selector Filter */}
              <select
                value={recCategoryFilter}
                onChange={(e) => setRecCategoryFilter(e.target.value)}
                className="text-[11px] border border-slate-200 bg-white rounded-lg px-2.5 py-1 font-bold text-slate-600 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="All">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Recurring List Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-bold select-none">
                  <th className="px-6 py-3">Verification Status</th>
                  <th className="px-6 py-3">Recurring Payee Details</th>
                  <th className="px-6 py-3 text-center">Assigned Frequency</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3 text-right">Raw Amount</th>
                  <th className="px-6 py-3 text-right">Monthly Cost (Equivalent)</th>
                  <th className="px-6 py-3 text-center">Resolve Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {filteredRecurringItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-sm text-slate-400 bg-slate-50/20">
                      <Repeat className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-pulse" />
                      No recurring transactions found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecurringItems.map(tx => {
                    const frequency = tx.recurringFrequency || "Monthly";
                    const isConfirmed = !!tx.isRecurringConfirmed;
                    const amountColor = tx.amount < 0 ? "text-slate-900" : "text-emerald-700 font-semibold";
                    const signStr = tx.amount < 0 ? "-" : "+";

                    return (
                      <tr 
                        key={tx.id} 
                        className={`hover:bg-slate-50/50 transition-colors ${
                          isConfirmed ? "bg-emerald-50/5" : "bg-amber-50/5"
                        }`}
                      >
                        {/* Column 1: Verification Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isConfirmed ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <Check className="w-3.5 h-3.5 shrink-0" /> Confirmed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 animate-bounce" /> Pending Audit
                            </span>
                          )}
                        </td>

                        {/* Column 2: Payee Details */}
                        <td className="px-6 py-4 max-w-xs">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span className="truncate block">{tx.cleanDescription || tx.description}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate font-mono mt-0.5">
                            {tx.description}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono mt-0.5">
                            Last occurrence: {tx.date}
                          </span>
                        </td>

                        {/* Column 3: Frequency selector dropdown */}
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <select
                            value={frequency}
                            onChange={(e) => {
                              if (onRecurringChange) {
                                onRecurringChange(tx.id, true, e.target.value, tx.isRecurringConfirmed);
                              }
                            }}
                            className="text-xs border border-slate-200 rounded-md p-1 bg-white hover:bg-slate-50 focus:ring-1 focus:ring-blue-500 font-bold text-slate-700 cursor-pointer"
                          >
                            <option value="Weekly">Weekly</option>
                            <option value="Bi-weekly">Bi-weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Annually">Annually</option>
                          </select>
                        </td>

                        {/* Column 4: Category */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={tx.category}
                            onChange={(e) => onCategoryChange(tx.id, e.target.value)}
                            className="text-xs border border-slate-200 rounded-md p-1.5 bg-slate-50 hover:bg-white focus:ring-1 focus:ring-blue-500 font-medium text-slate-700 cursor-pointer"
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>

                        {/* Column 5: Raw Amount */}
                        <td className="px-6 py-4 text-right font-mono font-bold text-xs whitespace-nowrap">
                          <span className={amountColor}>
                            {signStr}ر.ع. {Math.abs(tx.amount).toFixed(3)}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-normal lowercase font-sans">
                            per occurrence
                          </span>
                        </td>

                        {/* Column 6: Monthly cost equivalent */}
                        <td className="px-6 py-4 text-right font-mono font-black text-xs whitespace-nowrap">
                          <span className={amountColor}>
                            {signStr}ر.ع. {getMonthlyEquivalent(tx.amount, frequency).toFixed(3)}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-normal lowercase font-sans">
                            monthly estimate
                          </span>
                        </td>

                        {/* Column 7: Confirm/Exclude Actions */}
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            {!isConfirmed ? (
                              <>
                                <button
                                  onClick={() => {
                                    if (onRecurringChange) {
                                      onRecurringChange(tx.id, true, frequency, true);
                                    }
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md transition"
                                  title="Confirm this is recurring"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => {
                                    if (onRecurringChange) {
                                      onRecurringChange(tx.id, false, undefined, false);
                                    }
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md transition"
                                  title="Exclude: not a recurring transaction"
                                >
                                  Not Recurring
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    if (onRecurringChange) {
                                      onRecurringChange(tx.id, true, frequency, false);
                                    }
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md transition"
                                  title="Deconfirm to pending review status"
                                >
                                  Undo Confirm
                                </button>
                                <button
                                  onClick={() => {
                                    if (onRecurringChange) {
                                      onRecurringChange(tx.id, false, undefined, false);
                                    }
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md transition"
                                  title="Remove from recurring list"
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Quick Informational Tip */}
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-blue-900 uppercase">Automatic Recurring Detection System</h4>
              <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                The application analyzes transaction patterns (matching names, duplicate amounts, dates, and bank references) alongside an intelligent keywords matching dictionary (such as subscriptions, monthly rent, energy billers, and salary credits).
                Confirming a recurring outlay standardizes its period equivalent and locks it into your budgets and monthly projections automatically.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
