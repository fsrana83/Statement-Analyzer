import React, { useState, useRef } from "react";
import { UploadCloud, FileText, FileSpreadsheet, Sparkles, Lock, ArrowRight, ShieldAlert } from "lucide-react";
import { parseFileContent, DEMO_STATEMENTS } from "../utils/statementParser";

interface StatementUploaderProps {
  onUploadSuccess: (fileType: "mt940" | "csv" | "excel", fileContent: string | any[], fileName: string) => void;
  isLoading: boolean;
  error: string | null;
}

export default function StatementUploader({ onUploadSuccess, isLoading, error }: StatementUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processSelectedFile(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processSelectedFile(file);
    }
  };

  const processSelectedFile = async (file: File) => {
    try {
      const parsed = await parseFileContent(file);
      onUploadSuccess(parsed.type, parsed.content, file.name);
    } catch (err: any) {
      console.error(err);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const loadDemo = (type: "mt940" | "csv" | "excel") => {
    const demo = DEMO_STATEMENTS[type];
    onUploadSuccess(demo.type, demo.content, demo.name);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4" id="statement-uploader-container">
      <div className="text-center mb-10">
        <span className="px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full inline-block mb-3 border border-blue-100">
          SECURE BANK STATEMENT RECONCILIATION
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-3 font-sans">
          Bank Statement Analyzer & Splitting Tool
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl mx-auto">
          Upload SWIFT MT940, CSV, or Excel exports to normalize payee details, auto-categorize line items, and audit receipt splits.
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer ${
          isDragActive
            ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
            : "border-slate-200 hover:border-slate-300 bg-white shadow-xs"
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        id="upload-drag-zone"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          className="hidden"
          accept=".txt,.sta,.940,.csv,.xlsx,.xls"
        />

        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-xs border border-blue-100">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Drag & drop your bank statement here
          </h3>
          <p className="text-xs text-slate-500 mb-6 max-w-md">
            Supports MT940, CSV, or Microsoft Excel spreadsheets.
          </p>

          <button
            type="button"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md shadow-sm transition flex items-center gap-2"
          >
            Select File from Device <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="mt-8 p-6 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-4 shadow-xs">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent"></div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              Gemini AI is parsing & categorizing your statement...
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Normalizing amounts, identifying payees, and detecting trends. This takes a few seconds.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-8 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-3 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Analysis Failed</p>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Demo Section */}
      <div className="mt-12 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
          Don't have a file ready? Try one of our demo bank statements:
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); loadDemo("mt940"); }}
            className="bg-[#F8FAFC] p-4 border border-slate-200 rounded-xl text-left hover:border-blue-500 hover:bg-white hover:shadow-sm transition-all flex items-start gap-3 group"
          >
            <div className="bg-blue-50 p-2 text-blue-700 rounded-lg group-hover:bg-blue-100 transition">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">SWIFT FORMAT</p>
              <p className="font-semibold text-xs text-slate-800">Standard MT940 STA</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Common in European bank exports (ING, ABN Amro).</p>
            </div>
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); loadDemo("csv"); }}
            className="bg-[#F8FAFC] p-4 border border-slate-200 rounded-xl text-left hover:border-blue-500 hover:bg-white hover:shadow-sm transition-all flex items-start gap-3 group"
          >
            <div className="bg-blue-50 p-2 text-blue-700 rounded-lg group-hover:bg-blue-100 transition">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">SPREADSHEET TEXT</p>
              <p className="font-semibold text-xs text-slate-800">Generic CSV Export</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Comma-separated tabular rows of June bank ledger.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); loadDemo("excel"); }}
            className="bg-[#F8FAFC] p-4 border border-slate-200 rounded-xl text-left hover:border-blue-500 hover:bg-white hover:shadow-sm transition-all flex items-start gap-3 group"
          >
            <div className="bg-blue-50 p-2 text-blue-700 rounded-lg group-hover:bg-blue-100 transition">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">MICROSOFT EXCEL</p>
              <p className="font-semibold text-xs text-slate-800">XLSX Bank Export</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Excel sheets with direct numeric transactions.</p>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-12 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
        <Lock className="w-3.5 h-3.5" />
        Statements are processed via a secure Gemini endpoint. No personal bank keys or credentials are ever stored.
      </div>
    </div>
  );
}
