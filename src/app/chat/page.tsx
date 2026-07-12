"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ChatMessage } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { 
  Send, 
  MessageSquare, 
  User, 
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
    setLoading(true);
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
    fetchMessages();

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
    <div className="flex-1 bg-surface dark:bg-slate-900 flex flex-col h-[100vh] min-h-0">
      
      {/* Header */}
      <header className="px-6 py-4 border-b border-black/[0.03] dark:border-white/[0.03] bg-white dark:bg-slate-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/5 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-primary dark:text-blue-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-primary dark:text-white tracking-tight">Atelier Live Chat</h2>
            <p className="text-[10px] text-on-surface-variant/50 dark:text-gray-400 font-bold uppercase tracking-wider">팀원 실시간 소통 채널</p>
          </div>
        </div>
        <button
          onClick={fetchMessages}
          className="p-2 hover:bg-surface-container-low dark:hover:bg-slate-700 rounded-xl text-on-surface-variant/40 hover:text-primary dark:hover:text-white transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-surface-container-low/20">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-primary dark:text-blue-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
            <AlertCircle className="w-10 h-10 text-on-surface-variant/20" />
            <p className="text-xs font-semibold text-on-surface-variant/40 dark:text-gray-500">
              아직 나눈 대화가 없습니다. 첫 메시지를 보내보세요!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === user?.id;
            return (
              <div 
                key={msg.id} 
                className={`max-w-[70%] ${isMe ? "ml-auto text-right" : "mr-auto"}`}
              >
                <div className="space-y-1">
                  {/* Sender Name */}
                  <span className={`text-[10px] font-black text-on-surface-variant/50 dark:text-gray-400 uppercase tracking-widest px-1 block mb-1 ${isMe ? "text-right" : "text-left"}`}>
                    {msg.user_name}
                  </span>
                  
                  {/* Bubble content */}
                  <div className={`p-4 rounded-[1.5rem] shadow-sm text-xs font-semibold leading-relaxed text-left w-fit ${
                    isMe 
                      ? "bg-primary text-white dark:bg-blue-600 rounded-tr-none ml-auto" 
                      : "bg-white dark:bg-slate-800 text-foreground dark:text-gray-200 border border-black/[0.01] dark:border-white/[0.01] rounded-tl-none"
                  }`}>
                    {msg.message}
                  </div>
                  
                  {/* Time indicator */}
                  <div className={`text-[8px] font-black text-on-surface-variant/30 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1 ${
                    isMe ? "justify-end" : "justify-start"
                  }`}>
                    <Clock className="w-2 h-2" />
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
      <footer className="p-4 bg-white dark:bg-slate-800 border-t border-black/[0.03] dark:border-white/[0.03] shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지를 입력해 주세요..."
            className="flex-1 px-5 py-4 bg-surface-container-low dark:bg-slate-900 border border-black/[0.02] dark:border-white/[0.02] rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-blue-500/10 text-foreground transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-5 bg-primary dark:bg-blue-600 hover:bg-primary-container dark:hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-xl active:scale-[0.97] transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>

    </div>
  );
}
