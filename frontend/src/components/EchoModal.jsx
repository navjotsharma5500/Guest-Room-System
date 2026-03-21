import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit, X, Send, Sparkles
} from "lucide-react";
import EchoOrb from "./EchoOrb";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL;

// ════════════════════════════════════════════════════════════════════════════
// ECHO AI SCOPE
// ════════════════════════════════════════════════════════════════════════════
const ECHO_SCOPE = {
  admin: "All modules: Guest Room, Venue Booking, Night Pass, Analytics, Settings",
  adosa: "Venue Booking, Night Pass", assistant: "Guest Room, Venue Booking, Night Pass",
  manager: "Guest Room management", caretaker: "Guest Room and Night Pass",
  warden: "Guest Room management", gen_sec: "Night Pass management",
  president: "Night Pass and Society Budgets", guard: "Night Pass (scan only)",
  public: "General inquiries, navigation help, and public information",
};

const EchoModal = ({ open, onClose, role = "public", userName = "Guest" }) => {
  const scope = ECHO_SCOPE[role] || "General portal navigation";
  const [msgs, setMsgs] = useState([{
    from: "ai",
    text: `Hi **${userName || "there"}**! I'm Echo, your AI assistant for the Thapar Operations Portal.\n\nI can help you with: *${scope}*.\n\nHow can I help?`,
  }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { if (!open) setInput(""); }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const newMsgs = [...msgs, { from: "user", text }];
    setMsgs(newMsgs);
    setInput("");
    setBusy(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API}/api/ai/chat`, {
        method: "POST", credentials: "include",
        headers: headers,
        body: JSON.stringify({ messages: newMsgs.map(m => ({ role: m.from === "user" ? "user" : "assistant", content: m.text })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Server error");
      setMsgs(prev => [...prev, { from: "ai", text: data.reply || "Sorry, I couldn't process that." }]);
    } catch (err) {
      setMsgs(prev => [...prev, { from: "ai", text: `Connection error: ${err.message}. Make sure the backend /api/ai/chat route is registered.` }]);
    } finally { setBusy(false); }
  };

  const renderText = (text) =>
    text.split("\n").map((line, i) => {
      const html = line
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em class='text-slate-600'>$1</em>");
      return <p key={i} className="mb-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
    });

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-end justify-end p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative w-full sm:w-[390px] h-[85vh] sm:h-[560px] flex flex-col overflow-hidden bg-white/90 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl border border-white/60 shadow-2xl"
        style={{ boxShadow: "0 25px 50px rgba(0,0,0,0.2)" }}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-rose-500 px-5 py-4 flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay" />
          <div className="relative flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <EchoOrb mode="header" isThinking={busy} />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-lg leading-tight">Echo</p>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-50 text-[10px] rounded-full border border-emerald-500/30 backdrop-blur-md">Online</span>
                </div>
                <p className="text-xs text-red-100/80 font-medium">Thapar Operations Assistant</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition"><X className="w-5 h-5 text-white" /></button>
          </div>
        </div>

        <div className="px-4 py-2.5 bg-red-50/50 border-b border-red-100 flex-shrink-0 backdrop-blur-sm">
          <p className="text-[10px] text-red-700 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Scope: {scope}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/50 relative z-0">
          {msgs.map((msg, i) => {
            const isSuccess = msg.text.toLowerCase().includes("success") || msg.text.toLowerCase().includes("confirmed") || msg.text.toLowerCase().includes("booked");
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} gap-3 group`}>
                
                {msg.from === "ai" && (
                  <div className="flex flex-col justify-end">
                    <EchoOrb mode="inline" className={isSuccess ? "success" : ""} />
                  </div>
                )}

                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[13px] shadow-sm leading-relaxed relative ${
                  msg.from === "user" 
                    ? "bg-red-500 text-white rounded-br-sm" 
                    : "bg-white text-slate-700 rounded-bl-sm border border-slate-100"
                }`}>
                  {renderText(msg.text)}
                  
                  {/* Timestamp/Status */}
                  <div className={`text-[9px] mt-1 text-right opacity-60 ${msg.from === "user" ? "text-red-100" : "text-slate-400"}`}>
                    {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>

                {msg.from === "user" && (
                  <div className="flex flex-col justify-end">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 border-2 border-white shadow-sm">
                      {userName?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {busy && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 items-end">
               <EchoOrb mode="inline" isThinking={true} />
               <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                  <div className="flex gap-1.5 items-center h-4">
                    <motion.div animate={{ scale: [1, 1.2, 1], backgroundColor: ["#f87171", "#ef4444", "#f87171"] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <motion.div animate={{ scale: [1, 1.2, 1], backgroundColor: ["#f87171", "#ef4444", "#f87171"] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <motion.div animate={{ scale: [1, 1.2, 1], backgroundColor: ["#f87171", "#ef4444", "#f87171"] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  </div>
               </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>
        
        {/* Peeking Robot Layer - Positioned absolutely in the modal */}
        <AnimatePresence>
           {msgs.some(m => m.text.toLowerCase().includes("success") || m.text.toLowerCase().includes("confirmed")) && (
             <div className="absolute bottom-20 right-0 pointer-events-none z-0">
                <EchoOrb mode="peek" />
             </div>
           )}
        </AnimatePresence>

        <div className="px-4 pb-5 pt-3 border-t border-slate-200 flex-shrink-0 bg-white/80 backdrop-blur-md relative z-10">
          <div className="flex gap-2 items-center">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Type a message..."
              className="flex-1 bg-slate-100 border-0 rounded-full px-5 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-red-100 focus:bg-white transition-all shadow-inner" />
            <motion.button onClick={send} disabled={busy || !input.trim()}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="w-11 h-11 rounded-full bg-gradient-to-r from-red-500 to-rose-600 flex items-center justify-center disabled:opacity-50 shadow-lg shadow-red-200 text-white">
              <Send className="w-5 h-5 ml-0.5" />
            </motion.button>
          </div>
          <div className="flex justify-center mt-2">
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              Powered by <span className="font-bold text-slate-500">Echo AI</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EchoModal;
