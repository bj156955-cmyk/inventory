"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ChatMessage } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { 
  Send, 
  MessageSquare, 
  Clock, 
  RefreshCw, 
  AlertCircle 
} from "lucide-react";

// Same color mapping function to maintain UI consistency

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch initial messages (Limit to past 30 days to optimize DB space)
  const fetchMessages = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error("Error fetching chat messages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadMessages = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (!ignore) setMessages(data || []);
      } catch (err) {
        console.error("Error fetching chat messages:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadMessages();

    // 2. Setup Realtime channel
    const channel = supabase
      .channel("chat-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            // Prevent double-rendering if we inserted locally
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!loading) {
      scrollToBottom();
    }
  }, [messages, loading]);

  // 4. Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const shortEmail = user.email?.split("@")[0].toUpperCase() || "USER";

    const payload = {
      message: newMessage.trim(),
      user_id: user.id,
      user_name: shortEmail,
      created_at: new Date().toISOString()
    };

    // Optimistic UI update (optional, but let's trust Supabase realtime which is fast)
    setNewMessage("");

    try {
      const { error } = await supabase.from("chat_messages").insert([payload]);
      if (error) throw error;
    } catch (err) {
      console.error("Error sending chat message:", err);
    }
  };

  return (
    <div className="flex-1 bg-surface dark:bg-slate-900 flex flex-col h-[100dvh] min-h-0">
      
      {/* Header */}
      <header className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-slate-800 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/5 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-primary dark:text-blue-400 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-primary dark:text-white tracking-tight">Atelier Live Chat</h2>
            <p className="text-[9px] sm:text-[10px] text-on-surface-variant/60 dark:text-gray-400 font-bold uppercase tracking-wider">팀원 실시간 소통 채널</p>
          </div>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchMessages();
          }}
          className="p-2 sm:p-2.5 hover:bg-surface-container-low dark:hover:bg-slate-700 rounded-xl text-on-surface-variant/50 hover:text-primary dark:hover:text-white transition-all cursor-pointer active:scale-95"
          title="새로고침"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-surface-container-low/20">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-primary dark:text-blue-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 p-6">
            <AlertCircle className="w-10 h-10 text-on-surface-variant/30" />
            <p className="text-xs sm:text-sm font-semibold text-on-surface-variant/60 dark:text-gray-400">
              아직 나눈 대화가 없습니다. 첫 메시지를 보내보세요!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === user?.id;
            return (
              <div 
                key={msg.id} 
                className={`max-w-[85%] sm:max-w-[70%] ${isMe ? "ml-auto text-right" : "mr-auto"}`}
              >
                <div className="space-y-1">
                  {/* Sender Name */}
                  <span className={`text-[10px] font-black text-on-surface-variant/60 dark:text-gray-400 uppercase tracking-widest px-1 block mb-0.5 ${isMe ? "text-right" : "text-left"}`}>
                    {msg.user_name}
                  </span>
                  
                  {/* Bubble content */}
                  <div className={`p-3.5 sm:p-4 rounded-[1.3rem] sm:rounded-[1.5rem] shadow-sm text-xs sm:text-sm font-medium leading-relaxed text-left w-fit ${
                    isMe 
                      ? "bg-primary text-white dark:bg-blue-600 rounded-tr-none ml-auto" 
                      : "bg-white dark:bg-slate-800 text-foreground dark:text-gray-200 border border-black/[0.02] dark:border-white/[0.02] rounded-tl-none"
                  }`}>
                    {msg.message}
                  </div>
                  
                  {/* Time indicator */}
                  <div className={`text-[9px] font-bold text-on-surface-variant/40 dark:text-gray-500 tracking-wider flex items-center gap-1 ${
                    isMe ? "justify-end" : "justify-start"
                  }`}>
                    <Clock className="w-2.5 h-2.5" />
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <footer className="p-3 sm:p-4 bg-white dark:bg-slate-800 border-t border-black/[0.04] dark:border-white/[0.04] shrink-0 shadow-lg">
        <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지를 입력하세요 (Shift + Enter 줄바꿈)..."
            className="flex-1 bg-surface-container-low dark:bg-slate-900 border border-black/[0.05] dark:border-white/[0.05] rounded-2xl px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-blue-500/20 text-foreground transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-primary dark:bg-blue-600 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md hover:shadow-lg disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">전송</span>
          </button>
        </form>
      </footer>
    </div>
  );
}
