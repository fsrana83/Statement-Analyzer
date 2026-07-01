import React, { useState, useEffect } from "react";
import { 
  ArrowLeftRight, CheckCircle, AlertTriangle, Trash2, Plus, Download, Check, 
  FileText, Sliders, RefreshCw, Search, FileSpreadsheet, Flag, X, ArrowUpRight, ArrowDownLeft 
} from "lucide-react";
import { Transaction, LedgerTransaction, TransactionMatch, FlaggedTransaction, BankAccount } from "../types";

interface ReconciliationTabProps {
  bankTransactions: Transaction[];
  categories: string[];
}

export default function ReconciliationTab({ bankTransactions }: ReconciliationTabProps) {
  // Accounts state
  const [accounts, setAccounts] = useState<BankAccount[]>([
    { id: "acc-1", name: "Bank Muscat - Current (OMR)", bankOpeningBalance: 1200.000, ledgerOpeningBalance: 1200.000 },
    { id: "acc-2", name: "National Bank of Oman - Savings (OMR)", bankOpeningBalance: 5000.000, ledgerOpeningBalance: 5000.000 }
  ]);
  const [activeAccountId, setActiveAccountId] = useState<string>("acc-1");
  const [newAccountName, setNewAccountName] = useState<string>("");

  // Ledger transactions state, matches state, flagged state - keyed by accountId to support multiple bank accounts!
  const [ledgerTransactionsMap, setLedgerTransactionsMap] = useState<Record<string, LedgerTransaction[]>>({});
  const [matchesMap, setMatchesMap] = useState<Record<string, TransactionMatch[]>>({});
  const [flaggedMap, setFlaggedMap] = useState<Record<string, FlaggedTransaction[]>>({});

  // Selection for manual matching
  const [selectedBankTxId, setSelectedBankTxId] = useState<string | null>(null);
  const [selectedLedgerTxId, setSelectedLedgerTxId] = useState<string | null>(null);

  // Search/Filters
  const [bankSearch, setBankSearch] = useState("");
  const [ledgerSearch, setLedgerSearch] = useState("");

  // Flag reason modal/input state
  const [flaggingTxId, setFlaggingTxId] = useState<string | null>(null);
  const [flaggingSource, setFlaggingSource] = useState<"bank" | "ledger" | null>(null);
  const [flagReason, setFlagReason] = useState("");

  // Active sub-view tab inside reconciliation
  const [activeReportTab, setActiveReportTab] = useState<"matching" | "rec-report" | "wrong-report" | "matches-history">("matching");

  // Load state from local storage on mount
  useEffect(() => {
    try {
      const savedAccounts = localStorage.getItem("rec_accounts");
      const savedLedgerMap = localStorage.getItem("rec_ledger_map");
      const savedMatchesMap = localStorage.getItem("rec_matches_map");
      const savedFlaggedMap = localStorage.getItem("rec_flagged_map");

      if (savedAccounts) setAccounts(JSON.parse(savedAccounts));
      if (savedLedgerMap) setLedgerTransactionsMap(JSON.parse(savedLedgerMap));
      if (savedMatchesMap) setMatchesMap(JSON.parse(savedMatchesMap));
      if (savedFlaggedMap) setFlaggedMap(JSON.parse(savedFlaggedMap));
    } catch (err) {
      console.error("Failed to restore reconciliation state from local cache:", err);
    }
  }, []);

  // Helper to save state
  const persistState = (
    newAccs: BankAccount[],
    newLedgerMap: Record<string, LedgerTransaction[]>,
    newMatchesMap: Record<string, TransactionMatch[]>,
    newFlaggedMap: Record<string, FlaggedTransaction[]>
  ) => {
    try {
      localStorage.setItem("rec_accounts", JSON.stringify(newAccs));
      localStorage.setItem("rec_ledger_map", JSON.stringify(newLedgerMap));
      localStorage.setItem("rec_matches_map", JSON.stringify(newMatchesMap));
      localStorage.setItem("rec_flagged_map", JSON.stringify(newFlaggedMap));
    } catch (err) {
      console.error("Failed to save reconciliation state:", err);
    }
  };

  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];

  const currentLedgerTransactions = ledgerTransactionsMap[activeAccountId] || [];
  const currentMatches = matchesMap[activeAccountId] || [];
  const currentFlagged = flaggedMap[activeAccountId] || [];

  // Update specific lists
  const updateLedgerList = (newList: LedgerTransaction[]) => {
    const updatedMap = { ...ledgerTransactionsMap, [activeAccountId]: newList };
    setLedgerTransactionsMap(updatedMap);
    persistState(accounts, updatedMap, matchesMap, flaggedMap);
  };

  const updateMatchesList = (newList: TransactionMatch[]) => {
    const updatedMap = { ...matchesMap, [activeAccountId]: newList };
    setMatchesMap(updatedMap);
    persistState(accounts, ledgerTransactionsMap, updatedMap, flaggedMap);
  };

  const updateFlaggedList = (newList: FlaggedTransaction[]) => {
    const updatedMap = { ...flaggedMap, [activeAccountId]: newList };
    setFlaggedMap(updatedMap);
    persistState(accounts, ledgerTransactionsMap, matchesMap, updatedMap);
  };

  // Add bank account
  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newAccountName.trim();
    if (!name) return;
    const newAcc: BankAccount = {
      id: `acc-${Date.now()}`,
      name,
      bankOpeningBalance: 0,
      ledgerOpeningBalance: 0
    };
    const updated = [...accounts, newAcc];
    setAccounts(updated);
    setNewAccountName("");
    setActiveAccountId(newAcc.id);
    persistState(updated, ledgerTransactionsMap, matchesMap, flaggedMap);
  };

  // Update opening balances
  const handleUpdateOpeningBalance = (type: "bank" | "ledger", value: number) => {
    const updated = accounts.map(acc => {
      if (acc.id === activeAccountId) {
        return {
          ...acc,
          [type === "bank" ? "bankOpeningBalance" : "ledgerOpeningBalance"]: value
        };
      }
      return acc;
    });
    setAccounts(updated);
    persistState(updated, ledgerTransactionsMap, matchesMap, flaggedMap);
  };

  // Load realistic Matched Demo Ledger
  const handleLoadDemoLedger = () => {
    // We create ledger transactions that align with bankTransactions but with some descriptive variations
    const demoLedger: LedgerTransaction[] = bankTransactions.map((bt, index) => {
      // Create some description variation
      let desc = bt.cleanDescription || bt.description;
      if (desc.includes("REWE")) desc = "REWE Grocery Store - Berlin";
      else if (desc.includes("NETFLIX")) desc = "Netflix Subscription (Standard Plan)";
      else if (desc.includes("STARBUCKS")) desc = "Starbucks Corp Coffee Checkout";
      else if (desc.includes("RENT")) desc = "Rent Payment apartment 4B";
      else if (desc.includes("EXXON")) desc = "Exxon Mobil fuel reload";
      else if (desc.includes("SALARY") || desc.includes("PAYROLL")) desc = "Salary income credit receipt";
      else if (desc.includes("ZARA")) desc = "Zara online shopping checkout";
      else if (desc.includes("PIZZA")) desc = "La Piazza Pizza restaurant bill";
      else if (desc.includes("INSURANCE") || desc.includes("ALLIANZ")) desc = "Allianz monthly health insurance payment";

      return {
        id: `ledger-${bt.id}`,
        date: bt.date,
        description: desc,
        amount: bt.amount,
        reference: bt.reference || `REF-${Math.floor(100000 + Math.random() * 900000)}`
      };
    });

    // Add 2 extra ledger transactions that are NOT in the bank statement yet (unmatched outstanding deposits/payments)
    demoLedger.push({
      id: "ledger-extra-1",
      date: "2026-06-28",
      description: "Company Internet Bill - Ooredoo Oman",
      amount: -25.000,
      reference: "REF-OOR-99"
    });
    demoLedger.push({
      id: "ledger-extra-2",
      date: "2026-06-29",
      description: "Office Supplies - LuLu Hypermarket OMR",
      amount: -15.500,
      reference: "REF-LULU-12"
    });

    // Add 1 mismatch ledger transaction to test manual/wrong tracking
    // For example, an entry with slightly different amount
    demoLedger.push({
      id: "ledger-mismatch-3",
      date: "2026-06-15",
      description: "Postage Services - Oman Post",
      amount: -8.000, // No matching entry in bank statement
      reference: "REF-OPST-44"
    });

    updateLedgerList(demoLedger);
    updateMatchesList([]); // Reset matches
    updateFlaggedList([]); // Reset flagged
  };

  // Upload/parse Ledger CSV
  const handleLedgerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;

        try {
          const lines = text.split("\n");
          const parsed: LedgerTransaction[] = [];
          
          // Simple CSV parser
          // Assuming structure: Date,Description,Amount,Reference
          let isHeader = true;
          lines.forEach((line, i) => {
            const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
            if (cols.length < 3) return;
            if (isHeader) {
              isHeader = false;
              // Check if actual data or header
              if (isNaN(parseFloat(cols[2])) && i === 0) return;
            }

            const date = cols[0] || "2026-06-01";
            const description = cols[1] || "Ledger transaction";
            const amount = parseFloat(cols[2]) || 0;
            const reference = cols[3] || "";

            if (amount !== 0) {
              parsed.push({
                id: `ledger-csv-${i}-${Date.now()}`,
                date,
                description,
                amount,
                reference
              });
            }
          });

          if (parsed.length > 0) {
            updateLedgerList(parsed);
            alert(`Successfully loaded ${parsed.length} ledger transactions.`);
          } else {
            alert("No valid ledger entries found in the CSV. Format must be: Date,Description,Amount,[Reference]");
          }
        } catch (err) {
          alert("Error parsing CSV ledger file. Ensure it is comma-separated with Date, Description, and Amount columns.");
        }
      };
      reader.readAsText(file);
    }
  };

  // Auto-Match Logic
  const handleAutoMatch = () => {
    const newMatches: TransactionMatch[] = [...currentMatches];
    const matchedBankIds = new Set(newMatches.map(m => m.bankTransactionId));
    const matchedLedgerIds = new Set(newMatches.map(m => m.ledgerTransactionId));

    bankTransactions.forEach(bankTx => {
      if (matchedBankIds.has(bankTx.id)) return;

      // Find an unmatched ledger transaction that matches:
      // 1. Same exact amount (within epsilon)
      // 2. Date difference is within 3 days
      const ledgerMatch = currentLedgerTransactions.find(ledgerTx => {
        if (matchedLedgerIds.has(ledgerTx.id)) return false;
        
        const amountDiff = Math.abs(bankTx.amount - ledgerTx.amount);
        if (amountDiff > 0.001) return false;

        const dateB = new Date(bankTx.date);
        const dateL = new Date(ledgerTx.date);
        const dayDiff = Math.abs((dateB.getTime() - dateL.getTime()) / (1000 * 3600 * 24));
        
        return dayDiff <= 3;
      });

      if (ledgerMatch) {
        newMatches.push({
          bankTransactionId: bankTx.id,
          ledgerTransactionId: ledgerMatch.id,
          matchedAt: new Date().toISOString().substring(0, 10),
          matchType: "auto"
        });
        matchedBankIds.add(bankTx.id);
        matchedLedgerIds.add(ledgerMatch.id);
      }
    });

    updateMatchesList(newMatches);
    setSelectedBankTxId(null);
    setSelectedLedgerTxId(null);
    alert(`Auto-reconciliation complete. Found and matched ${newMatches.length - currentMatches.length} pairs of transactions.`);
  };

  // Manual Match Logic
  const handleManualMatch = () => {
    if (!selectedBankTxId || !selectedLedgerTxId) return;

    // Check if either is already matched
    const isBankMatched = currentMatches.some(m => m.bankTransactionId === selectedBankTxId);
    const isLedgerMatched = currentMatches.some(m => m.ledgerTransactionId === selectedLedgerTxId);

    if (isBankMatched || isLedgerMatched) {
      alert("One or both of the selected transactions are already matched.");
      return;
    }

    const newMatch: TransactionMatch = {
      bankTransactionId: selectedBankTxId,
      ledgerTransactionId: selectedLedgerTxId,
      matchedAt: new Date().toISOString().substring(0, 10),
      matchType: "manual"
    };

    updateMatchesList([...currentMatches, newMatch]);
    setSelectedBankTxId(null);
    setSelectedLedgerTxId(null);
  };

  // Unmatch handler
  const handleUnmatch = (match: TransactionMatch) => {
    const updated = currentMatches.filter(
      m => m.bankTransactionId !== match.bankTransactionId || m.ledgerTransactionId !== match.ledgerTransactionId
    );
    updateMatchesList(updated);
  };

  // Reset matches
  const handleResetMatches = () => {
    if (window.confirm("Are you sure you want to clear all matched records?")) {
      updateMatchesList([]);
    }
  };

  // Flag/Wrong Toggle Modal opener
  const openFlagModal = (id: string, source: "bank" | "ledger") => {
    setFlaggingTxId(id);
    setFlaggingSource(source);
    
    // Check if already flagged to fill the reason or let them edit
    const existing = currentFlagged.find(f => f.id === id && f.source === source);
    setFlagReason(existing ? existing.reason : "");
  };

  // Save flagged state
  const handleSaveFlag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flaggingTxId || !flaggingSource) return;

    const trimmedReason = flagReason.trim();
    if (!trimmedReason) {
      // Remove flag
      const updated = currentFlagged.filter(f => !(f.id === flaggingTxId && f.source === flaggingSource));
      updateFlaggedList(updated);
    } else {
      // Add or update flag
      const existingIdx = currentFlagged.findIndex(f => f.id === flaggingTxId && f.source === flaggingSource);
      const newFlag: FlaggedTransaction = {
        id: flaggingTxId,
        source: flaggingSource,
        reason: trimmedReason,
        flaggedAt: new Date().toISOString().substring(0, 10)
      };

      let updated = [...currentFlagged];
      if (existingIdx >= 0) {
        updated[existingIdx] = newFlag;
      } else {
        updated.push(newFlag);
      }
      updateFlaggedList(updated);
    }

    setFlaggingTxId(null);
    setFlaggingSource(null);
    setFlagReason("");
  };

  // Check if a transaction is flagged
  const getFlagReason = (id: string, source: "bank" | "ledger") => {
    const found = currentFlagged.find(f => f.id === id && f.source === source);
    return found ? found.reason : null;
  };

  // Compute matched IDs sets
  const matchedBankIdsSet = new Set(currentMatches.map(m => m.bankTransactionId));
  const matchedLedgerIdsSet = new Set(currentMatches.map(m => m.ledgerTransactionId));

  // Filter bank transactions
  const filteredBankTxs = bankTransactions.filter(bt => {
    const isMatched = matchedBankIdsSet.has(bt.id);
    if (isMatched) return false; // Show only unmatched on matching panel
    
    if (bankSearch) {
      const query = bankSearch.toLowerCase();
      const desc = (bt.cleanDescription || bt.description || "").toLowerCase();
      const ref = (bt.reference || "").toLowerCase();
      return desc.includes(query) || ref.includes(query) || bt.amount.toString().includes(query);
    }
    return true;
  });

  // Filter ledger transactions
  const filteredLedgerTxs = currentLedgerTransactions.filter(lt => {
    const isMatched = matchedLedgerIdsSet.has(lt.id);
    if (isMatched) return false; // Show only unmatched

    if (ledgerSearch) {
      const query = ledgerSearch.toLowerCase();
      const desc = (lt.description || "").toLowerCase();
      const ref = (lt.reference || "").toLowerCase();
      return desc.includes(query) || ref.includes(query) || lt.amount.toString().includes(query);
    }
    return true;
  });

  // RECONCILIATION SUMMARY VALUES
  const totalBankSum = bankTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalLedgerSum = currentLedgerTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  const bankEndingBalance = activeAccount.bankOpeningBalance + totalBankSum;
  const ledgerEndingBalance = activeAccount.ledgerOpeningBalance + totalLedgerSum;

  // Unmatched items calculation
  const unmatchedBankItems = bankTransactions.filter(bt => !matchedBankIdsSet.has(bt.id));
  const unmatchedLedgerItems = currentLedgerTransactions.filter(lt => !matchedLedgerIdsSet.has(lt.id));

  // Outstanding amounts
  const unmatchedBankSum = unmatchedBankItems.reduce((sum, item) => sum + item.amount, 0);
  const unmatchedLedgerSum = unmatchedLedgerItems.reduce((sum, item) => sum + item.amount, 0);

  // Adjusted balances
  const adjustedBankBalance = bankEndingBalance - unmatchedBankSum; // Remove unmatched bank statement charges to reconcile
  const adjustedBookBalance = ledgerEndingBalance - unmatchedLedgerSum; // Outstanding transactions adjusted

  // The difference
  const reconciliationDifference = Math.abs(bankEndingBalance - unmatchedLedgerSum + unmatchedBankSum - ledgerEndingBalance); 
  const isFullyReconciled = reconciliationDifference < 0.001 && currentLedgerTransactions.length > 0;

  // EXPORT REPORTS
  const exportReport = (format: "csv" | "excel" | "print", reportType: "reconciliation" | "flagged") => {
    if (reportType === "reconciliation") {
      const title = `Bank Reconciliation Statement - ${activeAccount.name}`;
      const headers = ["Financial Item", "Debit (OMR)", "Credit (OMR)", "Balance (OMR)"];
      
      const rows = [
        ["Balance per Bank Statement (Ending)", "", "", bankEndingBalance.toFixed(3)],
        ["Less: Outstanding checks / payments in Ledger (not cleared in bank)", "", "", `(${unmatchedLedgerItems.filter(i => i.amount < 0).reduce((sum, i) => sum + Math.abs(i.amount), 0).toFixed(3)})`],
        ["Plus: Deposits in transit in Ledger (not deposited in bank)", "", "", unmatchedLedgerItems.filter(i => i.amount > 0).reduce((sum, i) => sum + i.amount, 0).toFixed(3)],
        ["Adjusted Bank Balance", "", "", (bankEndingBalance - unmatchedLedgerSum).toFixed(3)],
        ["", "", "", ""],
        ["Balance per Company Book Ledger (Ending)", "", "", ledgerEndingBalance.toFixed(3)],
        ["Less: Unrecorded Bank charges/debits (not in ledger)", "", "", `(${unmatchedBankItems.filter(i => i.amount < 0).reduce((sum, i) => sum + Math.abs(i.amount), 0).toFixed(3)})`],
        ["Plus: Unrecorded Bank credits/deposits (not in ledger)", "", "", unmatchedBankItems.filter(i => i.amount > 0).reduce((sum, i) => sum + i.amount, 0).toFixed(3)],
        ["Adjusted Book Ledger Balance", "", "", (ledgerEndingBalance - unmatchedBankSum).toFixed(3)],
        ["", "", "", ""],
        ["Reconciliation Difference", "", "", reconciliationDifference.toFixed(3)],
        ["Status", "", "", isFullyReconciled ? "FULLY RECONCILED" : "UNRECONCILED DISCREPANCY"]
      ];

      triggerDownload(format, title, headers, rows, "reconciliation_report");
    } else {
      // Flagged wrong transactions report
      const title = `Wrong & Discrepancy Transactions Audit Report - ${activeAccount.name}`;
      const headers = ["Source", "Date", "Description", "Amount (OMR)", "Audit Flags & Discrepancy Reason"];
      
      const rows: any[] = [];
      currentFlagged.forEach(f => {
        if (f.source === "bank") {
          const bt = bankTransactions.find(t => t.id === f.id);
          if (bt) {
            rows.push([
              "Bank Statement",
              bt.date,
              bt.cleanDescription || bt.description,
              bt.amount.toFixed(3),
              f.reason
            ]);
          }
        } else {
          const lt = currentLedgerTransactions.find(t => t.id === f.id);
          if (lt) {
            rows.push([
              "Company Ledger",
              lt.date,
              lt.description,
              lt.amount.toFixed(3),
              f.reason
            ]);
          }
        }
      });

      if (rows.length === 0) {
        rows.push(["No discrepancy records marked", "", "", "", ""]);
      }

      triggerDownload(format, title, headers, rows, "discrepancy_audit_report");
    }
  };

  const triggerDownload = (format: "csv" | "excel" | "print", title: string, headers: string[], rows: any[][], fileName: string) => {
    if (format === "print") {
      // Elegant printable preview window
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Pop-up blocked. Please allow pop-ups to print/PDF the report.");
        return;
      }

      const rowsHtml = rows.map(r => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          ${r.map(cell => `<td style="padding: 10px; font-size: 13px; color: #334155;">${cell}</td>`).join("")}
        </tr>
      `).join("");

      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1e293b; background: white; }
              .header { border-b: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
              .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
              .subtitle { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 5px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 40px; }
              th { background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left; padding: 12px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; }
              .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #94a3b8; text-align: center; }
              .badge { display: inline-block; padding: 4px 8px; font-size: 10px; font-weight: 700; border-radius: 4px; text-transform: uppercase; }
              .badge-reconciled { background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
              .badge-unreconciled { background-color: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="no-print" style="margin-bottom: 20px; background: #f1f5f9; padding: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 12px; color: #475569; font-weight: 600;">Print layout ready. Use your browser print dialogue (Ctrl+P) to Save as PDF.</span>
              <button onclick="window.print()" style="padding: 6px 12px; background: #2563eb; color: white; border: none; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer;">Print / Save PDF</button>
            </div>
            <div class="header">
              <h1 class="title">${title}</h1>
              <div class="subtitle">Generated on ${new Date().toLocaleString()} | Currency: Omani Rial (OMR)</div>
            </div>
            <table>
              <thead>
                <tr>
                  ${headers.map(h => `<th>${h}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            <div style="margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; font-weight: 600;">
              <div style="text-align: center; width: 200px; border-top: 1px solid #94a3b8; padding-top: 8px;">Accountant Signature</div>
              <div style="text-align: center; width: 200px; border-top: 1px solid #94a3b8; padding-top: 8px;">Internal Auditor Signature</div>
            </div>
            <div class="footer" style="margin-top: 100px;">
              LedgerFlow Automated Audit and Reconciliation Utility. Secure Client Cryptographic Reports.
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else if (format === "csv") {
      const csvRows = [
        [title],
        [`Generated on: ${new Date().toLocaleString()}`],
        [],
        headers,
        ...rows
      ];
      const csvContent = "data:text/csv;charset=utf-8," 
        + csvRows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Excel-friendly TSV/HTML format (Saves as .xls with simple styled schema)
      const excelHeader = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${fileName}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
      <body>`;
      const excelFooter = "</body></html>";
      
      let tableHtml = `<h2 style="font-family: Arial; color: #1e293b;">${title}</h2>`;
      tableHtml += `<p style="font-family: Arial; font-size: 11px; color: #64748b;">Generated on: ${new Date().toLocaleString()}</p>`;
      tableHtml += `<table border="1" style="border-collapse: collapse; font-family: Arial; font-size: 12px;">`;
      tableHtml += `<tr style="background-color: #f1f5f9; font-weight: bold;">`;
      headers.forEach(h => {
        tableHtml += `<th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">${h}</th>`;
      });
      tableHtml += `</tr>`;
      
      rows.forEach(r => {
        tableHtml += `<tr>`;
        r.forEach(cell => {
          tableHtml += `<td style="padding: 6px; border: 1px solid #cbd5e1;">${cell}</td>`;
        });
        tableHtml += `</tr>`;
      });
      tableHtml += `</table>`;

      const excelBlob = new Blob([excelHeader + tableHtml + excelFooter], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(excelBlob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${fileName}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6" id="reconciliation-panel-root">
      
      {/* Dynamic Selector Panel for Bank Accounts & Opening Balances */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-600 animate-pulse" />
              Multi-Account Bank Reconciliation
            </h3>
            <p className="text-xs text-slate-500">
              Manage outstanding checks, match ledger transactions on-the-fly, and download auditable reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Account Selector */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Select Active Account</label>
              <select
                value={activeAccountId}
                onChange={(e) => setActiveAccountId(e.target.value)}
                className="text-xs font-semibold border border-slate-250 bg-slate-50 rounded-lg p-2.5 outline-none hover:bg-white focus:ring-1 focus:ring-blue-500 cursor-pointer min-w-[200px]"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            {/* Quick Balance inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Bank Opening (ر.ع.)</label>
                <input
                  type="number"
                  step="0.001"
                  value={activeAccount.bankOpeningBalance}
                  onChange={(e) => handleUpdateOpeningBalance("bank", parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Ledger Opening (ر.ع.)</label>
                <input
                  type="number"
                  step="0.001"
                  value={activeAccount.ledgerOpeningBalance}
                  onChange={(e) => handleUpdateOpeningBalance("ledger", parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Add Account Trigger Form inline */}
        <div className="border-t border-slate-100 mt-5 pt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <form onSubmit={handleAddAccount} className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="e.g. Bank Muscat Savings Account"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              className="text-xs border border-slate-250 rounded-lg p-2 outline-none focus:ring-1 focus:ring-blue-500 min-w-[240px]"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs flex items-center gap-1 transition shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Account</span>
            </button>
          </form>

          {currentLedgerTransactions.length === 0 ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-amber-600 font-medium">No ledger records imported yet.</span>
              <button
                onClick={handleLoadDemoLedger}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Load Demo Ledger</span>
              </button>
              <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Upload Ledger CSV</span>
                <input type="file" accept=".csv" onChange={handleLedgerFileUpload} className="hidden" />
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">{currentLedgerTransactions.length} Ledger rows loaded.</span>
              <button
                onClick={() => updateLedgerList([])}
                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                title="Clear Ledger"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Cards for Reconciliation Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Bank Ending Balance</span>
            <span className="text-md font-black text-slate-900 block mt-1 font-mono">
              ر.ع. {bankEndingBalance.toFixed(3)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Book Ledger Balance</span>
            <span className="text-md font-black text-slate-900 block mt-1 font-mono">
              ر.ع. {ledgerEndingBalance.toFixed(3)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Discrepancy / Difference</span>
            <span className={`text-md font-black block mt-1 font-mono ${reconciliationDifference < 0.001 ? "text-emerald-700" : "text-rose-600"}`}>
              ر.ع. {reconciliationDifference.toFixed(3)}
            </span>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${reconciliationDifference < 0.001 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            {reconciliationDifference < 0.001 ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Reconciliation Status</span>
            <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full inline-block mt-1.5 ${isFullyReconciled ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
              {isFullyReconciled ? "✓ RECONCILED" : "⚠ OUT OF BALANCE"}
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs flex items-center justify-center font-black">
            {currentMatches.length} / {bankTransactions.length}
          </div>
        </div>
      </div>

      {/* Main Reconciliation Navigation Tabs */}
      <div className="flex border-b border-slate-250 gap-6 select-none bg-white p-3 rounded-xl border border-slate-200">
        <button
          onClick={() => setActiveReportTab("matching")}
          className={`pb-2 text-xs font-bold uppercase tracking-wider transition border-b-2 px-1 ${
            activeReportTab === "matching" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-400 hover:text-slate-800"
          }`}
        >
          1. Interactive Matching Panel
        </button>
        <button
          onClick={() => setActiveReportTab("rec-report")}
          className={`pb-2 text-xs font-bold uppercase tracking-wider transition border-b-2 px-1 ${
            activeReportTab === "rec-report" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-400 hover:text-slate-800"
          }`}
        >
          2. Reconciliation Report
        </button>
        <button
          onClick={() => setActiveReportTab("wrong-report")}
          className={`pb-2 text-xs font-bold uppercase tracking-wider transition border-b-2 px-1 ${
            activeReportTab === "wrong-report" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-400 hover:text-slate-800"
          }`}
        >
          3. Flagged & Discrepancies
        </button>
        <button
          onClick={() => setActiveReportTab("matches-history")}
          className={`pb-2 text-xs font-bold uppercase tracking-wider transition border-b-2 px-1 ${
            activeReportTab === "matches-history" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-400 hover:text-slate-800"
          }`}
        >
          4. Matches Audit Logs ({currentMatches.length})
        </button>
      </div>

      {/* ACTIVE SHEET/TAB RENDERING */}
      {activeReportTab === "matching" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="matching-panels-grid">
          
          {/* LEFT COLUMN: BANK STATEMENT UNMATCHED */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Unmatched Bank Statement ({filteredBankTxs.length})</h4>
                <p className="text-[11px] text-slate-500">Select a transaction to manually reconcile below</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAutoMatch}
                  disabled={currentLedgerTransactions.length === 0}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed font-semibold rounded-lg text-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Auto-Match</span>
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search bank transactions..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg pl-8 pr-4 py-2 w-full outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
              />
            </div>

            <div className="overflow-y-auto max-h-[380px] space-y-1.5 pr-1">
              {filteredBankTxs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs italic">
                  No unmatched bank records found.
                </div>
              ) : (
                filteredBankTxs.map(tx => {
                  const isSelected = selectedBankTxId === tx.id;
                  const isFlagged = getFlagReason(tx.id, "bank");

                  return (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedBankTxId(isSelected ? null : tx.id)}
                      className={`p-3 border rounded-xl flex items-center justify-between text-xs cursor-pointer transition ${
                        isSelected 
                          ? "border-blue-500 bg-blue-50/50" 
                          : "border-slate-150 hover:bg-slate-50 bg-white"
                      }`}
                    >
                      <div className="space-y-1 truncate mr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-500 font-mono">{tx.date}</span>
                          {isFlagged && (
                            <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-100 flex items-center gap-0.5" title={isFlagged}>
                              <Flag className="w-2.5 h-2.5 fill-rose-600" />
                              <span>Discrepancy</span>
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-800 truncate" title={tx.description}>
                          {tx.cleanDescription || tx.description}
                        </p>
                        {tx.reference && (
                          <p className="text-[10px] text-slate-400 font-mono">Ref: {tx.reference}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-mono font-bold text-sm ${tx.amount < 0 ? "text-slate-900" : "text-emerald-700"}`}>
                          {tx.amount < 0 ? "-" : "+"}ر.ع. {Math.abs(tx.amount).toFixed(3)}
                        </span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openFlagModal(tx.id, "bank");
                          }}
                          className={`p-1.5 rounded transition ${isFlagged ? "text-rose-600 hover:bg-rose-50" : "text-slate-400 hover:bg-slate-100"}`}
                          title="Flag Discrepancy"
                        >
                          <Flag className={`w-3.5 h-3.5 ${isFlagged ? "fill-rose-500" : ""}`} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: COMPANY LEDGER UNMATCHED */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Unmatched Company Ledger ({filteredLedgerTxs.length})</h4>
                <p className="text-[11px] text-slate-500">Select a transaction to pair with the bank statement</p>
              </div>
              <button
                onClick={handleManualMatch}
                disabled={!selectedBankTxId || !selectedLedgerTxId}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-150 disabled:text-slate-400 disabled:cursor-not-allowed font-bold rounded-lg text-xs transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Match Selected</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ledger transactions..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg pl-8 pr-4 py-2 w-full outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
              />
            </div>

            <div className="overflow-y-auto max-h-[380px] space-y-1.5 pr-1">
              {currentLedgerTransactions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs italic">
                  No company ledger rows loaded. Please load the demo ledger or upload a CSV file above.
                </div>
              ) : filteredLedgerTxs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs italic">
                  All ledger entries matched!
                </div>
              ) : (
                filteredLedgerTxs.map(tx => {
                  const isSelected = selectedLedgerTxId === tx.id;
                  const isFlagged = getFlagReason(tx.id, "ledger");

                  return (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedLedgerTxId(isSelected ? null : tx.id)}
                      className={`p-3 border rounded-xl flex items-center justify-between text-xs cursor-pointer transition ${
                        isSelected 
                          ? "border-blue-500 bg-blue-50/50" 
                          : "border-slate-150 hover:bg-slate-50 bg-white"
                      }`}
                    >
                      <div className="space-y-1 truncate mr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-500 font-mono">{tx.date}</span>
                          {isFlagged && (
                            <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-100 flex items-center gap-0.5" title={isFlagged}>
                              <Flag className="w-2.5 h-2.5 fill-rose-600" />
                              <span>Discrepancy</span>
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-800 truncate" title={tx.description}>
                          {tx.description}
                        </p>
                        {tx.reference && (
                          <p className="text-[10px] text-slate-400 font-mono">Ref: {tx.reference}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-mono font-bold text-sm ${tx.amount < 0 ? "text-slate-900" : "text-emerald-700"}`}>
                          {tx.amount < 0 ? "-" : "+"}ر.ع. {Math.abs(tx.amount).toFixed(3)}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openFlagModal(tx.id, "ledger");
                          }}
                          className={`p-1.5 rounded transition ${isFlagged ? "text-rose-600 hover:bg-rose-50" : "text-slate-400 hover:bg-slate-100"}`}
                          title="Flag Discrepancy"
                        >
                          <Flag className={`w-3.5 h-3.5 ${isFlagged ? "fill-rose-500" : ""}`} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECONCILIATION REPORT VIEW */}
      {activeReportTab === "rec-report" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6" id="reconciliation-report-view">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-5">
            <div>
              <h4 className="text-md font-bold text-slate-900">Bank Statement Reconciliation Report</h4>
              <p className="text-xs text-slate-500 mt-1">
                Formal accounting summary reconciling bank statement balance with internal general books.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 select-none">
              <button
                onClick={() => exportReport("csv", "reconciliation")}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => exportReport("excel", "reconciliation")}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
              <button
                onClick={() => exportReport("print", "reconciliation")}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>

          <div className="max-w-3xl mx-auto border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-slate-50/30">
            <div className="bg-slate-900 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="text-md font-black tracking-tight uppercase">Bank Reconciliation Report</h5>
                  <p className="text-xs text-slate-400 mt-1">{activeAccount.name}</p>
                </div>
                <div className={`text-xs font-extrabold uppercase px-2.5 py-1 rounded ${isFullyReconciled ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"}`}>
                  {isFullyReconciled ? "✓ Reconciled" : "⚠ Out of Balance"}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-4">Accounting Audit Cycle: {new Date().toLocaleString().substring(0, 10)}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Part A: Bank Balance Reconciliation */}
              <div>
                <h6 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-3">
                  Part 1: Bank Balance Adjustments
                </h6>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span>Ending Balance per Bank Statement</span>
                    <span className="font-mono">ر.ع. {bankEndingBalance.toFixed(3)}</span>
                  </div>
                  
                  <div className="flex justify-between text-slate-600 pl-4">
                    <span>Less: Outstanding Checks & payments in Ledger (Not yet cleared by Bank)</span>
                    <span className="font-mono text-rose-600">
                      -ر.ع. {unmatchedLedgerItems.filter(i => i.amount < 0).reduce((sum, i) => sum + Math.abs(i.amount), 0).toFixed(3)}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600 pl-4">
                    <span>Plus: Deposits in Transit in Ledger (Not yet deposited in Bank)</span>
                    <span className="font-mono text-emerald-600">
                      +ر.ع. {unmatchedLedgerItems.filter(i => i.amount > 0).reduce((sum, i) => sum + i.amount, 0).toFixed(3)}
                    </span>
                  </div>

                  <div className="flex justify-between font-bold text-sm border-t border-slate-200 pt-2 text-slate-900">
                    <span>Adjusted Bank Balance (A)</span>
                    <span className="font-mono">ر.ع. {(bankEndingBalance - unmatchedLedgerSum).toFixed(3)}</span>
                  </div>
                </div>
              </div>

              {/* Part B: Ledger Book Reconciliation */}
              <div>
                <h6 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-3">
                  Part 2: Company Ledger Book Adjustments
                </h6>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span>Ending Balance per Book General Ledger</span>
                    <span className="font-mono">ر.ع. {ledgerEndingBalance.toFixed(3)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600 pl-4">
                    <span>Less: Unrecorded Bank charges, fees, or direct debits</span>
                    <span className="font-mono text-rose-600">
                      -ر.ع. {unmatchedBankItems.filter(i => i.amount < 0).reduce((sum, i) => sum + Math.abs(i.amount), 0).toFixed(3)}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600 pl-4">
                    <span>Plus: Unrecorded Bank credits, interest, or direct deposits</span>
                    <span className="font-mono text-emerald-600">
                      +ر.ع. {unmatchedBankItems.filter(i => i.amount > 0).reduce((sum, i) => sum + i.amount, 0).toFixed(3)}
                    </span>
                  </div>

                  <div className="flex justify-between font-bold text-sm border-t border-slate-200 pt-2 text-slate-900">
                    <span>Adjusted Book Balance (B)</span>
                    <span className="font-mono">ر.ع. {(ledgerEndingBalance - unmatchedBankSum).toFixed(3)}</span>
                  </div>
                </div>
              </div>

              {/* Mismatch & Difference Summary */}
              <div className="border-t-2 border-dashed border-slate-300 pt-4 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-700 block text-sm">Audit Discrepancy Balance (A - B)</span>
                  <span className="text-[10px] text-slate-400">Difference should equal zero to achieve standard reconciliation lock.</span>
                </div>
                <span className={`text-md font-black font-mono ${reconciliationDifference < 0.001 ? "text-emerald-700" : "text-rose-600"}`}>
                  ر.ع. {reconciliationDifference.toFixed(3)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WRONG & FLAGGED DISCREPANCIES VIEW */}
      {activeReportTab === "wrong-report" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6" id="discrepancy-report-view">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-5">
            <div>
              <h4 className="text-md font-bold text-slate-900">Marked Wrong Transactions & Discrepancies</h4>
              <p className="text-xs text-slate-500 mt-1">
                Auditor-flagged statement discrepancies and bookkeeping errors with custom annotations.
              </p>
            </div>
            {currentFlagged.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => exportReport("csv", "flagged")}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => exportReport("excel", "flagged")}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={() => exportReport("print", "flagged")}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase font-extrabold tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="p-3">Origin / Source</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Details / Memo</th>
                  <th className="p-3 text-right">Amount (ر.ع.)</th>
                  <th className="p-3">Audit Discrepancy Note</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {currentFlagged.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                      No transactions flagged as discrepancy or incorrect. Use the red flag button next to transactions on the Matching Panel to flag issues.
                    </td>
                  </tr>
                ) : (
                  currentFlagged.map(f => {
                    const isBank = f.source === "bank";
                    const tx = isBank 
                      ? bankTransactions.find(t => t.id === f.id)
                      : currentLedgerTransactions.find(t => t.id === f.id);

                    if (!tx) return null;

                    return (
                      <tr key={`${f.source}-${f.id}`} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${isBank ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-purple-50 text-purple-700 border border-purple-100"}`}>
                            {isBank ? "BANK STATEMENT" : "COMPANY LEDGER"}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{tx.date}</td>
                        <td className="p-3 font-bold text-slate-800 truncate max-w-[200px]">
                          {"description" in tx ? tx.description : (tx as any).cleanDescription || (tx as any).description}
                        </td>
                        <td className={`p-3 font-mono font-bold text-right ${tx.amount < 0 ? "text-slate-950" : "text-emerald-700"}`}>
                          {tx.amount < 0 ? "-" : "+"}ر.ع. {Math.abs(tx.amount).toFixed(3)}
                        </td>
                        <td className="p-3 font-medium text-rose-700 bg-rose-50/20 max-w-xs truncate" title={f.reason}>
                          ⚠️ {f.reason}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              const updated = currentFlagged.filter(x => !(x.id === f.id && x.source === f.source));
                              updateFlaggedList(updated);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Remove Flag"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MATCHED HISTORIC AUDIT LOGS */}
      {activeReportTab === "matches-history" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4" id="matched-logs-view">
          <div className="flex items-center justify-between border-b border-slate-150 pb-4">
            <div>
              <h4 className="text-md font-bold text-slate-900">Reconciliation Audit Log</h4>
              <p className="text-xs text-slate-500 mt-1">
                Matched general ledger accounts paired with bank statement records.
              </p>
            </div>
            {currentMatches.length > 0 && (
              <button
                onClick={handleResetMatches}
                className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Matches</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase font-extrabold tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="p-3">Bank Transaction Details</th>
                  <th className="p-3 text-center">Connection</th>
                  <th className="p-3">Ledger Transaction Details</th>
                  <th className="p-3 text-right">Amount (ر.ع.)</th>
                  <th className="p-3">Match Type</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {currentMatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                      No transactions have been matched yet. Open the Interactive Matching Panel to start reconciling.
                    </td>
                  </tr>
                ) : (
                  currentMatches.map((m, idx) => {
                    const bankTx = bankTransactions.find(t => t.id === m.bankTransactionId);
                    const ledgerTx = currentLedgerTransactions.find(t => t.id === m.ledgerTransactionId);

                    if (!bankTx || !ledgerTx) return null;

                    return (
                      <tr key={`${m.bankTransactionId}-${m.ledgerTransactionId}`} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-500 font-mono block text-[10px]">{bankTx.date}</span>
                            <span className="font-bold text-slate-800 block truncate max-w-[200px]" title={bankTx.description}>
                              {bankTx.cleanDescription || bankTx.description}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-500 font-mono block text-[10px]">{ledgerTx.date}</span>
                            <span className="font-bold text-slate-800 block truncate max-w-[200px]" title={ledgerTx.description}>
                              {ledgerTx.description}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-right text-slate-900">
                          ر.ع. {Math.abs(bankTx.amount).toFixed(3)}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${m.matchType === "auto" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                            {m.matchType === "auto" ? "AUTO MATCH" : "MANUAL MATCH"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleUnmatch(m)}
                            className="text-xs text-rose-600 hover:bg-rose-50 hover:underline px-2 py-1 rounded cursor-pointer"
                          >
                            Unmatch
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* POPUP/MODAL FOR DISCREPANCY EXPLANATION NOTE */}
      {flaggingTxId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveFlag} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div>
              <h5 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Flag className="w-4 h-4 text-rose-500 fill-rose-500" />
                Audit Discrepancy Flag
              </h5>
              <p className="text-xs text-slate-500 mt-1">
                Flag this transaction as incorrect or mismatch. Enter a note describing the booking discrepancy.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Discrepancy / Error Reason</label>
              <textarea
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="e.g. Bank amount is incorrect, Duplicate posting, Unauthorized transaction..."
                className="w-full text-xs border border-slate-250 rounded-lg p-3 outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white h-24 resize-none"
                autoFocus
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setFlaggingTxId(null);
                  setFlaggingSource(null);
                  setFlagReason("");
                }}
                className="px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
              >
                Save Flag
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
