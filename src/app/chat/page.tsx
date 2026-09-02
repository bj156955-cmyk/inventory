"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ChatMessage } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { 
  Send, 
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
    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex flex-col h-[100dvh] min-h-0">
      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-zinc-50/50 dark:bg-zinc-950/50">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 p-6">
            <AlertCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
            <p className="text-xs sm:text-sm font-semibold text-zinc-500 dark:text-zinc-400">
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
                  <span className={`text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest px-1 block mb-0.5 ${isMe ? "text-right" : "text-left"}`}>
                    {msg.user_name}
                  </span>
                  
                  {/* Bubble content */}
                  <div className={`p-3.5 sm:p-4 rounded-[1.3rem] sm:rounded-[1.5rem] shadow-sm text-xs sm:text-sm font-medium leading-relaxed text-left w-fit ${
                    isMe 
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 rounded-tr-none ml-auto" 
                      : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-tl-none"
                  }`}>
                    {msg.message}
                  </div>
                  
                  {/* Time indicator */}
                  <div className={`text-[9px] font-bold text-zinc-400 dark:text-zinc-500 tracking-wider flex items-center gap-1 ${
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
      <footer className="p-3 sm:p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0 shadow-sm">
        <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지를 입력하세요 (Shift + Enter 줄바꿈)..."
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 text-zinc-900 dark:text-white transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">전송</span>
          </button>
        </form>
      </footer>
    </div>
  );
}
