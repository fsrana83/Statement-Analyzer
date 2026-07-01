import { useState, useEffect } from "react";
import { X, Plus, Trash2, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { Transaction, TransactionSplit } from "../types";

interface SplitModalProps {
  transaction: Transaction;
  categories: string[];
  onSave: (transactionId: string, splits: TransactionSplit[]) => void;
  onClose: () => void;
  softDeletedCategories?: string[];
}

export default function SplitModal({ transaction, categories, onSave, onClose, softDeletedCategories = [] }: SplitModalProps) {
  const originalAbsAmount = Math.abs(transaction.amount);
  const sign = transaction.amount < 0 ? -1 : 1;

  // Initialize splits. If the transaction was already split, load those splits.
  // Otherwise, create two initial splits splitting it 50/50.
  const [splits, setSplits] = useState<TransactionSplit[]>(() => {
    if (transaction.isSplit && transaction.splits && transaction.splits.length > 0) {
      return transaction.splits.map(s => ({ ...s, amount: Math.abs(s.amount) }));
    } else {
      const half = parseFloat((originalAbsAmount / 2).toFixed(2));
      const secondHalf = parseFloat((originalAbsAmount - half).toFixed(2));
      return [
        {
          id: "split_1",
          category: transaction.category,
          amount: half,
          description: `${transaction.cleanDescription || transaction.description} (Part 1)`
        },
        {
          id: "split_2",
          category: "Others",
          amount: secondHalf,
          description: `${transaction.cleanDescription || transaction.description} (Part 2)`
        }
      ];
    }
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalSplitAmount = splits.reduce((sum, item) => sum + (item.amount || 0), 0);
  const remainingAmount = parseFloat((originalAbsAmount - totalSplitAmount).toFixed(2));
  const isValid = Math.abs(remainingAmount) === 0 && splits.every(s => s.amount > 0 && s.category);

  const handleAddSplit = () => {
    const nextAmount = remainingAmount > 0 ? remainingAmount : 0;
    setSplits([
      ...splits,
      {
        id: `split_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category: "Others",
        amount: nextAmount,
        description: `${transaction.cleanDescription || transaction.description} (Part ${splits.length + 1})`
      }
    ]);
  };

  const handleRemoveSplit = (id: string) => {
    if (splits.length <= 1) {
      setErrorMessage("You must have at least one split item.");
      return;
    }
    setSplits(splits.filter(s => s.id !== id));
  };

  const handleUpdateSplit = (id: string, updates: Partial<TransactionSplit>) => {
    setSplits(
      splits.map((s) => {
        if (s.id === id) {
          const updated = { ...s, ...updates };
          if (updates.amount !== undefined) {
            // Guard against negative numbers in the UI
            updated.amount = Math.max(0, updates.amount);
          }
          return updated;
        }
        return s;
      })
    );
  };

  // Quick distribute remaining amount to the selected split
  const handleApplyRemaining = (id: string) => {
    const targetSplit = splits.find(s => s.id === id);
    if (targetSplit) {
      const currentAmountWithoutTarget = splits
        .filter(s => s.id !== id)
        .reduce((sum, item) => sum + item.amount, 0);
      const exactRemaining = parseFloat((originalAbsAmount - currentAmountWithoutTarget).toFixed(2));
      handleUpdateSplit(id, { amount: Math.max(0, exactRemaining) });
    }
  };

  const handleSave = () => {
    if (!isValid) return;

    // Convert splits back to correct sign before saving
    const finalSplits = splits.map(s => ({
      ...s,
      amount: s.amount * sign
    }));

    onSave(transaction.id, finalSplits);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-150 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Split Transaction</h3>
            <p className="text-xs text-slate-500 mt-0.5">Divide transaction into multiple categories</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Original details */}
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase">Date</span>
            <span className="text-sm font-semibold text-slate-700">{transaction.date}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase">Original Payee</span>
            <span className="text-sm font-semibold text-slate-700 truncate block">
              {transaction.cleanDescription || transaction.description}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase">Total Amount</span>
            <span className={`text-sm font-extrabold ${transaction.amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {transaction.amount < 0 ? "-" : "+"}ر.ع. {originalAbsAmount.toFixed(3)}
            </span>
          </div>
        </div>

        {/* Splits Editor */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-800">Split Breakdown</span>
            <button
              onClick={handleAddSplit}
              className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Category Split
            </button>
          </div>

          <div className="space-y-3">
            {splits.map((split, idx) => (
              <div
                key={split.id}
                className="p-4 border border-slate-200 rounded-xl bg-white shadow-xs hover:border-slate-300 transition flex flex-col md:flex-row gap-3 items-start md:items-center"
              >
                {/* Index badge */}
                <div className="bg-slate-100 text-slate-600 text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>

                {/* Category Dropdown */}
                <div className="w-full md:w-1/3 shrink-0">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Category</label>
                  <select
                    value={split.category}
                    onChange={(e) => handleUpdateSplit(split.id, { category: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-md p-2 bg-slate-50 hover:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    {softDeletedCategories && softDeletedCategories.includes(split.category) && (
                      <option value={split.category} disabled>{split.category} (Archived)</option>
                    )}
                  </select>
                </div>

                {/* Split Amount */}
                <div className="w-full md:w-1/4 shrink-0">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Amount (ر.ع.)</label>
                    {remainingAmount !== 0 && (
                      <button
                        onClick={() => handleApplyRemaining(split.id)}
                        className="text-[9px] text-blue-600 font-bold hover:underline"
                        title="Distribute remaining balance here"
                      >
                        Fill Remaining
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.000"
                    value={split.amount || ""}
                    onChange={(e) => handleUpdateSplit(split.id, { amount: parseFloat(e.target.value) || 0 })}
                    className="w-full text-sm border border-slate-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                {/* Note / Split Memo */}
                <div className="w-full flex-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Split Description / Memo</label>
                  <input
                    type="text"
                    value={split.description}
                    onChange={(e) => handleUpdateSplit(split.id, { description: e.target.value })}
                    placeholder="e.g., Organic Vegetables"
                    className="w-full text-sm border border-slate-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Remove split item */}
                <button
                  onClick={() => handleRemoveSplit(split.id)}
                  disabled={splits.length <= 1}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition mt-4 md:mt-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info & Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-4">
            {/* Split reconciliation values */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Total Allocated:</span>
                <span className="font-bold text-slate-800 font-mono">ر.ع. {totalSplitAmount.toFixed(3)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Remaining Balance:</span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded-md border ${
                    remainingAmount === 0
                      ? "bg-blue-50 text-blue-800 border-blue-100"
                      : "bg-amber-50 text-amber-800 border-amber-100"
                  }`}
                >
                  {remainingAmount > 0 ? `+ر.ع. ${remainingAmount.toFixed(3)}` : remainingAmount < 0 ? `-ر.ع. ${Math.abs(remainingAmount).toFixed(3)}` : "ر.ع. 0.000"}
                </span>
              </div>
            </div>

            {/* Validation indicators */}
            <div className="flex items-center text-xs">
              {remainingAmount === 0 ? (
                <span className="text-blue-600 font-bold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-blue-600" /> Ready to save
                </span>
              ) : (
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Split sum must equal original total
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 font-semibold transition text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition text-sm disabled:opacity-40 disabled:hover:bg-blue-600"
            >
              Save Split Categories
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
