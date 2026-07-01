import React, { useState } from "react";
import { Search, Filter, SlidersHorizontal, ArrowUpRight, ArrowDownLeft, Split, RefreshCw, ChevronDown, ChevronUp, Check, Repeat } from "lucide-react";
import { Transaction, TransactionSplit } from "../types";

interface TransactionListProps {
  transactions: Transaction[];
  categories: string[];
  onSplitClick: (transaction: Transaction) => void;
  onUnsplitClick: (transactionId: string) => void;
  onCategoryChange: (transactionId: string, newCategory: string) => void;
  softDeletedCategories?: string[];
}

export default function TransactionList({
  transactions,
  categories,
  onSplitClick,
  onUnsplitClick,
  onCategoryChange,
  softDeletedCategories = []
}: TransactionListProps) {
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

  // Filter & Sort Logic
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

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="transaction-list-section">
      {/* Title & Stats summary line */}
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Transaction Ledger</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {filteredTransactions.length} of {transactions.length} records parsed from statement
          </p>
        </div>

        {/* Action tags */}
        <div className="flex flex-wrap gap-2">
          {searchTerm || payeeSearchTerm || selectedCategory !== "All" || selectedType !== "All" || startDate || endDate ? (
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Clear Filters
            </button>
          ) : null}
        </div>
      </div>

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

                return (
                  <React.Fragment key={tx.id}>
                    {/* Main Row */}
                    <tr className={`hover:bg-slate-50/70 transition-colors ${tx.isSplit ? "bg-blue-50/20 border-l-4 border-l-blue-600" : ""}`}>
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
                          {tx.isRecurring && (
                            <div className="w-5 h-5 rounded bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 ml-1" title="Recurring Transaction">
                              <Repeat className="w-3.5 h-3.5" />
                            </div>
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
    </div>
  );
}
