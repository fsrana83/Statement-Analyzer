import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, MessageSquare, ShieldAlert, CheckCircle, Info, HelpCircle } from "lucide-react";
import { StatementSummary, Transaction } from "../types";

interface AiAdvisorProps {
  summary: StatementSummary;
  transactions: Transaction[];
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export default function AiAdvisor({ summary, transactions }: AiAdvisorProps) {
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isTyping]);

  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || chatInput;
    if (!messageToSend.trim() || isTyping) return;

    if (!customMessage) {
      setChatInput("");
    }

    setChatHistory(prev => [...prev, { role: "user", text: messageToSend }]);
    setIsTyping(true);
    setChatError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          transactions: transactions,
          chatHistory: chatHistory
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "Failed to get chatbot response.");
      }

      const data = await response.json();
      setChatHistory(prev => [...prev, { role: "model", text: data.reply }]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setChatError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />;
      case "warning":
        return <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />;
      case "opportunity":
        return <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />;
    }
  };

  const getInsightStyle = (type: string) => {
    switch (type) {
      case "success":
        return "bg-emerald-50 border-emerald-200 text-emerald-950";
      case "warning":
        return "bg-rose-50 border-rose-200 text-rose-950";
      case "opportunity":
        return "bg-amber-50 border-amber-200 text-amber-950";
      default:
        return "bg-blue-50 border-blue-200 text-blue-950";
    }
  };

  const starterPrompts = [
    "What is my largest expense?",
    "How much did I spend on Dining?",
    "List all recurring subscription costs",
    "Analyze my spending & give 3 tips"
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8" id="ai-advisor-section">
      {/* Visual Insights Column */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            AI Co-Pilot Statements Insights
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic observations drawn automatically from your uploaded transactions.
          </p>
        </div>

        <div className="space-y-4">
          {summary.insights.length === 0 ? (
            <div className="p-6 text-center border border-slate-200 rounded-xl text-slate-400 text-xs">
              No insights were generated. Ensure there are enough transactions.
            </div>
          ) : (
            summary.insights.map((insight, idx) => (
              <div
                key={idx}
                className={`p-4 border rounded-xl flex items-start gap-3 shadow-2xs ${getInsightStyle(insight.type)}`}
              >
                {getInsightIcon(insight.type)}
                <div>
                  <h5 className="font-bold text-sm tracking-tight">{insight.title}</h5>
                  <p className="text-xs leading-relaxed mt-1 opacity-90">{insight.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Interactive Chatbot Column */}
      <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[520px] overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-xs">
              AI
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Conversational Finance Co-Pilot</h4>
              <p className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span> Active Ledger Context loaded
              </p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 space-y-4">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto select-none">
              <MessageSquare className="w-10 h-10 text-slate-300 mb-3" />
              <h5 className="font-bold text-slate-800 text-sm">Ask your Financial Statement AI</h5>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Inquire about totals, specific category sums, largest vendors, or general savings ideas.
              </p>

              {/* Starter Prompts */}
              <div className="grid grid-cols-1 gap-2 mt-6 w-full">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="text-left px-3 py-2 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatHistory.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-3xs ${
                    message.role === "user"
                      ? "bg-slate-900 text-white rounded-br-none"
                      : "bg-white border border-slate-150 text-slate-800 rounded-bl-none"
                  }`}
                >
                  {/* Handle linebreaks cleanly */}
                  {message.text.split("\n").map((line, lIdx) => (
                    <p key={lIdx} className={line === "" ? "h-2" : "mb-1 last:mb-0"}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-150 rounded-2xl rounded-bl-none px-4 py-3 text-sm text-slate-500 shadow-3xs flex items-center gap-1.5 select-none">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
                <span>Advisor is reviewing spending...</span>
              </div>
            </div>
          )}

          {chatError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
              {chatError}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask, 'how much did I spend in Rewe supermarket?'"
              disabled={isTyping}
              className="flex-1 bg-slate-50 hover:bg-slate-50/50 focus:bg-white text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isTyping}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-35 shrink-0 flex items-center justify-center shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
