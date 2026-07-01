import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { TrendingUp, ArrowUpRight, ArrowDownLeft, Repeat, AlertTriangle, TrendingUp as TrendingUpIcon } from "lucide-react";
import { Transaction, StatementSummary } from "../types";

interface CategoryDashboardProps {
  summary: StatementSummary;
  transactions: Transaction[];
  categories: string[];
  softDeletedCategories?: string[];
}

// Aesthetic professional colors for categories pie chart
const COLORS = [
  "#2563eb", // Groceries (Blue)
  "#475569", // Dining & Cafes (Slate)
  "#0d9488", // Housing & Rent (Teal)
  "#ea580c", // Utilities (Orange)
  "#4f46e5", // Shopping & Retail (Indigo)
  "#0891b2", // Transport & Fuel (Cyan)
  "#db2777", // Salary & Income (Pink)
  "#7c3aed", // Health & Medical (Violet)
  "#e11d48", // Entertainment & Leisure (Rose)
  "#1e3a8a", // Subscriptions & Bills (Deep Blue)
  "#334155", // Transfer & Savings (Dark Slate)
  "#14b8a6", // Education (Teal Light)
  "#64748b"  // Others (Slate)
];

export default function CategoryDashboard({
  summary,
  transactions,
  categories,
  softDeletedCategories = []
}: CategoryDashboardProps) {
  // Re-calculate category totals to ensure split transactions are included properly
  const totalExpenses = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => {
      if (t.isSplit && t.splits) {
        return sum + t.splits.reduce((sSum, s) => sSum + Math.abs(s.amount), 0);
      }
      return sum + Math.abs(t.amount);
    }, 0);

  const totalIncome = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => {
      if (t.isSplit && t.splits) {
        return sum + t.splits.reduce((sSum, s) => sSum + s.amount, 0);
      }
      return sum + t.amount;
    }, 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? parseFloat(((netSavings / totalIncome) * 100).toFixed(1)) : 0;

  // Compute actual dynamic breakdown by category (accounting for splits!)
  const allCategories = [...categories, ...softDeletedCategories];
  const categoryMap: Record<string, { spent: number; count: number }> = {};
  allCategories.forEach(cat => {
    categoryMap[cat] = { spent: 0, count: 0 };
  });

  transactions.forEach(t => {
    if (t.isSplit && t.splits) {
      t.splits.forEach(s => {
        let cat = s.category || "Others";
        if (!categoryMap[cat]) cat = "Others";
        const amt = s.amount;
        if (amt < 0) {
          categoryMap[cat].spent += Math.abs(amt);
          categoryMap[cat].count += 1;
        }
      });
    } else {
      let cat = t.category || "Others";
      if (!categoryMap[cat]) cat = "Others";
      if (t.amount < 0) {
        categoryMap[cat].spent += Math.abs(t.amount);
        categoryMap[cat].count += 1;
      }
    }
  });

  const categoryBreakdownData = Object.keys(categoryMap)
    .map(cat => ({
      category: cat,
      amount: categoryMap[cat].spent,
      count: categoryMap[cat].count
    }))
    .filter(item => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Group daily flow (Accounting for Splits)
  const dailyFlowMap: Record<string, { income: number; expenses: number }> = {};
  
  // Compute Recurring Subscriptions Impact
  const recurringTransactions = transactions.filter(t => t.isRecurring && t.amount < 0);
  const totalRecurringExpenses = recurringTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const recurringMap: Record<string, number> = {};
  const recurringGroups: Record<string, Transaction[]> = {};
  
  recurringTransactions.forEach(t => {
    const key = t.cleanDescription || t.description || t.category || "Unknown";
    if (!recurringMap[key]) recurringMap[key] = 0;
    if (!recurringGroups[key]) recurringGroups[key] = [];
    
    recurringMap[key] += Math.abs(t.amount);
    recurringGroups[key].push(t);
  });
  
  const recurringBreakdown = Object.keys(recurringMap)
    .map(key => ({ name: key, amount: recurringMap[key] }))
    .sort((a, b) => b.amount - a.amount);
    
  const recurringAlerts: { title: string, message: string, type: 'overlap' | 'increase' }[] = [];
  
  Object.keys(recurringGroups).forEach(key => {
    const txs = recurringGroups[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (txs.length > 1) {
      for (let i = 1; i < txs.length; i++) {
        const prev = txs[i - 1];
        const curr = txs[i];
        const prevAmt = Math.abs(prev.amount);
        const currAmt = Math.abs(curr.amount);
        
        // Check for price increase (more than 5% to avoid small rounding differences)
        if (currAmt > prevAmt * 1.05) {
          recurringAlerts.push({
            title: `Price Increase: ${key}`,
            message: `Amount increased from ر.ع. ${prevAmt.toFixed(3)} to ر.ع. ${currAmt.toFixed(3)} on ${curr.date}`,
            type: 'increase'
          });
        }
        
        // Check for overlapping dates (less than 20 days apart)
        const daysDiff = (new Date(curr.date).getTime() - new Date(prev.date).getTime()) / (1000 * 3600 * 24);
        if (daysDiff > 0 && daysDiff < 20) {
          recurringAlerts.push({
            title: `Possible Overlap: ${key}`,
            message: `Two charges occurred within ${Math.round(daysDiff)} days (${prev.date} and ${curr.date})`,
            type: 'overlap'
          });
        }
      }
    }
  });

  transactions.forEach(t => {
    const d = t.date;
    if (!dailyFlowMap[d]) {
      dailyFlowMap[d] = { income: 0, expenses: 0 };
    }

    if (t.isSplit && t.splits) {
      t.splits.forEach(s => {
        if (s.amount < 0) {
          dailyFlowMap[d].expenses += Math.abs(s.amount);
        } else {
          dailyFlowMap[d].income += s.amount;
        }
      });
    } else {
      if (t.amount < 0) {
        dailyFlowMap[d].expenses += Math.abs(t.amount);
      } else {
        dailyFlowMap[d].income += t.amount;
      }
    }
  });

  let cumulativeNet = 0;
  const chartDailyFlowData = Object.keys(dailyFlowMap)
    .sort()
    .map(date => {
      const net = dailyFlowMap[date].income - dailyFlowMap[date].expenses;
      cumulativeNet += net;
      return {
        date: date.substring(5), // MM-DD for cleaner chart labels
        Income: parseFloat(dailyFlowMap[date].income.toFixed(3)),
        Expenses: parseFloat(dailyFlowMap[date].expenses.toFixed(3)),
        "Net Flow": parseFloat(net.toFixed(3)),
        "Cumulative Net": parseFloat(cumulativeNet.toFixed(3))
      };
    });

  return (
    <div className="space-y-8" id="financial-dashboard-container">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Income */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs hover:shadow-sm transition flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Income</span>
            <span className="text-xl font-black text-slate-950 mt-1.5 block font-mono">
              +ر.ع. {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs hover:shadow-sm transition flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Expenses</span>
            <span className="text-xl font-black text-slate-950 mt-1.5 block font-mono">
              -ر.ع. {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        {/* Net Savings */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs hover:shadow-sm transition flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Net Savings</span>
            <span className={`text-xl font-black mt-1.5 block font-mono ${netSavings >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
              {netSavings >= 0 ? "+" : "-"}ر.ع. {Math.abs(netSavings).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${netSavings >= 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}>
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Savings Rate */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs hover:shadow-sm transition flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Savings Rate</span>
            <span className={`text-2xl font-black mt-1.5 block font-mono ${savingsRate >= 20 ? "text-emerald-700" : savingsRate > 0 ? "text-amber-700" : "text-rose-600"}`}>
              {savingsRate}%
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 border border-slate-250 flex items-center justify-center font-bold text-sm">
            %
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily Cash Flow Area Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <h4 className="text-md font-bold text-slate-900 mb-1">Cash Flow Trend</h4>
          <p className="text-xs text-slate-500 mb-6">Daily aggregated income versus expenses</p>

          <div className="h-72 w-full">
            {chartDailyFlowData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No cash flow data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDailyFlowData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip formatter={(value) => `ر.ع. ${parseFloat(String(value)).toFixed(3)}`} />
                  <Legend iconType="circle" />
                  <Area type="monotone" dataKey="Income" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpenses)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Expenses Share */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-md font-bold text-slate-900 mb-1">Expense Breakdown</h4>
            <p className="text-xs text-slate-500 mb-6">Percentage allocation of total expenditure</p>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            {categoryBreakdownData.length === 0 ? (
              <div className="text-slate-400 text-sm">No expenses to display.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdownData}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {categoryBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[categories.indexOf(entry.category) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `ر.ع. ${parseFloat(String(value)).toFixed(3)}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top legend rows */}
          <div className="mt-4 space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {categoryBreakdownData.slice(0, 4).map((entry) => {
              const percent = totalExpenses > 0 ? ((entry.amount / totalExpenses) * 100).toFixed(1) : "0";
              const catColor = COLORS[categories.indexOf(entry.category) % COLORS.length];
              return (
                <div key={entry.category} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 truncate text-slate-700">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColor }}></div>
                    <span className="truncate font-semibold">{entry.category}</span>
                  </div>
                  <span className="font-mono text-slate-500 font-semibold">ر.ع. {entry.amount.toFixed(3)} ({percent}%)</span>
                </div>
              );
            })}
            {categoryBreakdownData.length > 4 && (
              <p className="text-[10px] text-slate-400 text-center font-medium italic pt-1">
                + {categoryBreakdownData.length - 4} other categories
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Net Cash Flow Trend Line Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h4 className="text-md font-bold text-slate-900 mb-1">Net Cash Flow Trend</h4>
        <p className="text-xs text-slate-500 mb-6">Daily net cash flow and cumulative balance over the period</p>

        <div className="h-72 w-full">
          {chartDailyFlowData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">No cash flow data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartDailyFlowData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip formatter={(value) => `ر.ع. ${parseFloat(String(value)).toFixed(3)}`} />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="Net Flow" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Cumulative Net" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Subscription & Recurring Overview */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-md font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Repeat className="w-5 h-5 text-amber-500" />
              Subscription & Recurring Overview
            </h4>
            <p className="text-xs text-slate-500">
              Impact of recurring subscriptions and bills on your budget
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Recurring</span>
            <span className="text-lg font-black text-rose-600 mt-1 block font-mono">
              -ر.ع. {totalRecurringExpenses.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
            </span>
          </div>
        </div>

        {recurringBreakdown.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
            No recurring transactions identified in this period.
          </div>
        ) : (
          <div className="space-y-6">
            {recurringAlerts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h5 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  Subscription Alerts ({recurringAlerts.length})
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recurringAlerts.map((alert, index) => (
                    <div key={index} className="bg-white border border-amber-100 p-3 rounded-lg flex items-start gap-3">
                      <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${alert.type === 'increase' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                        {alert.type === 'increase' ? <TrendingUpIcon className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">{alert.title}</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">{alert.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recurringBreakdown.map((item, index) => {
                const percent = totalExpenses > 0 ? ((item.amount / totalExpenses) * 100).toFixed(1) : "0";
                const percentOfRecurring = totalRecurringExpenses > 0 ? ((item.amount / totalRecurringExpenses) * 100).toFixed(1) : "0";
                
                return (
                  <div key={index} className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between">
                    <div className="overflow-hidden">
                      <span className="text-sm font-semibold text-slate-800 truncate block w-full">{item.name}</span>
                      <span className="text-[10px] text-slate-500 mt-1 block">{percentOfRecurring}% of recurring</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-mono font-bold text-slate-700 block">ر.ع. {item.amount.toFixed(3)}</span>
                      <span className="text-[10px] text-slate-400 mt-1 block">{percent}% of budget</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
