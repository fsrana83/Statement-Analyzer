import React, { useState } from "react";
import { SlidersHorizontal, Info, Edit3, Check, X, Plus, Trash2, Lock, AlertTriangle } from "lucide-react";
import { Transaction } from "../types";

interface BudgetsCategoriesProps {
  transactions: Transaction[];
  categoryBudgets: Record<string, number>;
  onBudgetChange: (category: string, amount: number) => void;
  categories: string[];
  onAddCategory: (category: string, initialBudget?: number) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (category: string) => void;
  softDeletedCategories?: string[];
  auditLog?: { timestamp: string, action: string, details: string }[];
}

export default function BudgetsCategories({
  transactions,
  categoryBudgets,
  onBudgetChange,
  categories,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  softDeletedCategories = [],
  auditLog = []
}: BudgetsCategoriesProps) {
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    onAddCategory(trimmed);
    setNewCatName("");
  };

  const handleSaveRename = (oldName: string) => {
    const trimmed = editVal.trim();
    if (!trimmed) return;
    onRenameCategory(oldName, trimmed);
    setEditingCat(null);
  };

  // Compute spent for each category and track which ones are used in any transaction/split
  const usedCategories = new Set<string>();
  const categoryMonthMap: Record<string, Record<string, number>> = {};
  const allMonths = new Set<string>();

  categories.forEach((cat) => {
    categoryMonthMap[cat] = {};
  });

  transactions.forEach((t) => {
    const month = t.date.substring(0, 7); // YYYY-MM
    allMonths.add(month);

    if (t.isSplit && t.splits) {
      t.splits.forEach((s) => {
        let cat = s.category || "Others";
        usedCategories.add(cat);
        if (!categoryMonthMap[cat]) categoryMonthMap[cat] = {};
        if (!categoryMonthMap[cat][month]) categoryMonthMap[cat][month] = 0;
        
        const amt = s.amount;
        if (amt < 0) {
          categoryMonthMap[cat][month] += Math.abs(amt);
        }
      });
    } else {
      let cat = t.category || "Others";
      usedCategories.add(cat);
      if (!categoryMonthMap[cat]) categoryMonthMap[cat] = {};
      if (!categoryMonthMap[cat][month]) categoryMonthMap[cat][month] = 0;
      
      if (t.amount < 0) {
        categoryMonthMap[cat][month] += Math.abs(t.amount);
      }
    }
  });

  const sortedMonths = Array.from(allMonths).sort();

  const SimpleProgressBar = ({ month, spent, budgetLimit }: { month: string, spent: number, budgetLimit: number }) => {
    const percentage = Math.min(100, budgetLimit > 0 ? parseFloat(((spent / budgetLimit) * 100).toFixed(0)) : 0);
    
    let progressColor = "bg-blue-500";
    if (percentage > 90) {
      progressColor = "bg-rose-500 animate-pulse";
    } else if (percentage > 70) {
      progressColor = "bg-amber-500";
    }
  
    // Format month (e.g. "2023-10" to "Oct 2023")
    const dateObj = new Date(month + "-01");
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  
    return (
      <div className="mb-2.5 last:mb-0">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="font-semibold text-slate-600">{monthName}</span>
          <span className="font-mono text-[10px]">
             <span className="font-bold text-slate-800">ر.ع. {spent.toFixed(3)}</span>
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start" id="budgets-categories-sheet">
      {/* Category Budgets & Sliders (2/3 width) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
          <div>
            <h4 className="text-md font-bold text-slate-900 flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              Category Budgets and Outlays
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Establish spending constraints and analyze real outlays compared to budget ceilings.
            </p>
          </div>
          <div className="text-xs bg-blue-50 text-blue-800 p-2 border border-blue-100 rounded-lg flex items-start gap-1.5 max-w-sm">
            <Info className="w-3.5 h-3.5 shrink-0 text-blue-600 mt-0.5" />
            <span>Use the sliders to adjust your budget allocations on-the-fly to test custom thresholds.</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {categories
            .filter((cat) => cat !== "Salary & Income")
            .map((cat) => {
              const budgetLimit = categoryBudgets[cat] || 200;
              
              let totalSpent = 0;
              sortedMonths.forEach(m => totalSpent += (categoryMonthMap[cat]?.[m] || 0));
              
              const isOverrun = sortedMonths.some(m => (categoryMonthMap[cat]?.[m] || 0) > budgetLimit);

              // Compare current month spending to 3-month moving average of preceding months
              const currentMonth = sortedMonths[sortedMonths.length - 1];
              const currentMonthIndex = sortedMonths.indexOf(currentMonth);
              const precedingMonths = sortedMonths.slice(Math.max(0, currentMonthIndex - 3), currentMonthIndex);
              
              const currentSpent = currentMonth ? (categoryMonthMap[cat]?.[currentMonth] || 0) : 0;
              let avgSpent = 0;
              if (precedingMonths.length > 0) {
                const sumPreceding = precedingMonths.reduce((sum, m) => sum + (categoryMonthMap[cat]?.[m] || 0), 0);
                avgSpent = sumPreceding / precedingMonths.length;
              }

              const hasSpike = avgSpent > 0 && currentSpent > avgSpent * 1.20;

              return (
                <div
                  key={cat}
                  className="p-4 border border-slate-150 rounded-xl hover:shadow-xs transition bg-slate-50/50"
                  id={`budget-card-${cat.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                >
                  <div className="flex items-center justify-between text-sm mb-3">
                    <div className="flex items-center gap-1.5 min-w-0 mr-1">
                      <span className="font-bold text-slate-800 truncate" title={cat}>
                        {cat}
                      </span>
                      {hasSpike && (
                        <span 
                          className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wider shrink-0 flex items-center gap-0.5"
                          title={`Current month spending (ر.ع. ${currentSpent.toFixed(3)}) exceeds preceding 3-month average (ر.ع. ${avgSpent.toFixed(3)}) by ${((currentSpent - avgSpent) / avgSpent * 100).toFixed(0)}%`}
                        >
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                          Spike
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold shrink-0">
                       Budget: ر.ع. {budgetLimit}
                    </span>
                  </div>

                  {/* Monthly Progress Bars */}
                  <div className="mb-4">
                    {sortedMonths.length === 0 && (
                      <div className="text-xs text-slate-400 italic">No spending data.</div>
                    )}
                    {sortedMonths.map(month => (
                       <SimpleProgressBar key={month} month={month} spent={categoryMonthMap[cat]?.[month] || 0} budgetLimit={budgetLimit} />
                    ))}
                  </div>

                  {/* Preceding Average Info */}
                  {precedingMonths.length > 0 && (
                    <div className="text-[10px] text-slate-500 flex justify-between border-t border-slate-100 pt-2 mb-2">
                      <span>3-Month Preceding Avg:</span>
                      <span className="font-mono font-semibold">ر.ع. {avgSpent.toFixed(3)}</span>
                    </div>
                  )}

                  {/* Slider Control */}
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="10"
                      max="1000000"
                      step="10"
                      value={budgetLimit}
                      onChange={(e) => onBudgetChange(cat, parseInt(e.target.value) || 0)}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-2 py-1 shrink-0">
                      <span className="text-xs text-slate-400 mr-1">ر.ع.</span>
                      <input
                        type="number"
                        min="0"
                        max="1000000"
                        value={budgetLimit || ""}
                        onChange={(e) => onBudgetChange(cat, parseInt(e.target.value) || 0)}
                        className="w-16 text-xs font-semibold font-mono text-slate-800 bg-transparent border-none focus:outline-none text-right"
                      />
                    </div>
                  </div>

                  {/* Alerts */}
                  <div className="mt-2 space-y-1">
                    {isOverrun && (
                      <div className="text-[10px] text-rose-600 font-bold flex items-center gap-1.5">
                        ⚠️ OVER BUDGET IN ONE OR MORE MONTHS!
                      </div>
                    )}
                    {hasSpike && (
                      <div 
                        className="text-[10px] text-rose-600 font-bold flex items-center gap-1.5"
                        title={`Current month spending (ر.ع. ${currentSpent.toFixed(3)}) exceeds 3-month average (ر.ع. ${avgSpent.toFixed(3)}) by ${((currentSpent - avgSpent) / avgSpent * 100).toFixed(0)}%`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-pulse" />
                        SPIKE ALERT: Exceeds preceding avg by {((currentSpent - avgSpent) / avgSpent * 100).toFixed(0)}%!
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Dynamic Category Manager (1/3 width) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" id="category-manager-card">
        <h4 className="text-md font-bold text-slate-900 flex items-center gap-1.5 mb-1">
          Category Manager
        </h4>
        <p className="text-xs text-slate-500 mb-5">
          Create custom categories, rename unused ones, or delete categories. If a category is used in your ledger, deleting it soft-deletes (archives) it to preserve history, and renaming is disabled.
        </p>

        {/* Add Category Form */}
        <form onSubmit={handleCreateCategory} className="space-y-3 mb-6" id="add-category-form">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              New Category Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Gifts, Travel"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm shrink-0 transition flex items-center gap-1 cursor-pointer"
                id="btn-add-category"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </form>

        {/* Categories List */}
        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
          Current Categories
        </label>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1" id="categories-list-container">
          {categories.map((cat) => {
            const isEditing = editingCat === cat;
            const isUsed = usedCategories.has(cat);

            return (
              <div
                key={cat}
                className="flex items-center justify-between p-2.5 border border-slate-150 rounded-lg bg-slate-50 text-xs"
                id={`category-item-${cat.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      type="text"
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-md p-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(cat);
                        if (e.key === "Escape") setEditingCat(null);
                      }}
                    />
                    <button
                      onClick={() => handleSaveRename(cat)}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                      title="Save Rename"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingCat(null)}
                      className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-slate-700 truncate pr-2 block" title={cat}>
                        {cat}
                      </span>
                      {isUsed && (
                        <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5 mt-0.5">
                          <Lock className="w-2.5 h-2.5 shrink-0" /> Used in ledger
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <>
                        <button
                          onClick={() => {
                            setEditingCat(cat);
                            setEditVal(cat);
                          }}
                          className="p-1 text-slate-400 hover:bg-white rounded hover:text-slate-800 transition cursor-pointer"
                          title="Rename Category"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteCategory(cat)}
                          className="p-1 text-slate-450 hover:bg-rose-50 rounded hover:text-rose-600 transition cursor-pointer"
                          title={isUsed ? "Soft-delete (archive) category" : "Permanently delete category"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Soft Deleted / Archived Categories Section */}
        {softDeletedCategories && softDeletedCategories.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <label className="text-[10px] uppercase font-bold text-rose-500 block mb-2">
              Archived Categories (Soft-Deleted)
            </label>
            <p className="text-[11px] text-slate-450 mb-3 leading-relaxed">
              These categories are used in historical transactions but cannot be selected for new assignments.
            </p>
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1" id="archived-categories-list">
              {softDeletedCategories.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center justify-between p-2.5 border border-dashed border-slate-200 rounded-lg bg-slate-50 text-xs text-slate-500 font-medium"
                  id={`archived-category-item-${cat.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                >
                  <span className="truncate mr-2" title={cat}>
                    {cat}
                  </span>
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider select-none shrink-0">
                    Archived
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Log Section */}
        {auditLog && auditLog.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2">
              Recent Category Changes
            </label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 text-xs text-slate-500">
              {auditLog.slice().reverse().map((log, i) => (
                <div key={i} className="flex justify-between p-2 bg-slate-50 rounded border border-slate-100">
                  <span>{log.details}</span>
                  <span className="text-[10px] shrink-0 text-slate-400">
                    {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
