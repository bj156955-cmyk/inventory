"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Notice } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { 
  Plus, 
  X, 
  Trash2, 
  Edit, 
  RefreshCw, 
  FileText, 
  User, 
  Calendar,
  AlertCircle
} from "lucide-react";

export default function NoticesPage() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [viewingNotice, setViewingNotice] = useState<Notice | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");

  const fetchNotices = async () => {
    try {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const filtered = (data || []).filter(
        (n) => 
          n.title !== "__TEAM_MEMBERS__" && 
          n.title !== "__LAB_RESERVATIONS__" && 
          n.title !== "__LAB_CLEANING__"
      );
      setNotices(filtered);
    } catch (err) {
      console.error("Error fetching notices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadNotices = async () => {
      try {
        const { data, error } = await supabase
          .from("notices")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        const filtered = (data || []).filter(
          (n) => 
            n.title !== "__TEAM_MEMBERS__" && 
            n.title !== "__LAB_RESERVATIONS__" && 
            n.title !== "__LAB_CLEANING__"
        );
        if (!ignore) setNotices(filtered);
      } catch (err) {
        console.error("Error fetching notices:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadNotices();

    // Setup Realtime Sync for notices
    const channel = supabase
      .channel("notices-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notices" },
        () => {
          fetchNotices();
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const openFormModal = (notice: Notice | null = null) => {
    setViewingNotice(null); // Close view details mode
    if (notice) {
      setEditingNotice(notice);
      setFormTitle(notice.title);
      setFormContent(notice.content);
    } else {
      setEditingNotice(null);
      setFormTitle("");
      setFormContent("");
    }
    setModalOpen(true);
  };

  const openViewModal = (notice: Notice) => {
    setViewingNotice(notice);
    setModalOpen(true);
  };

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      title: formTitle,
      content: formContent,
      created_by: user.email?.split("@")[0].toUpperCase() || "UNKNOWN",
      created_at: new Date().toISOString()
    };

    try {
      if (editingNotice) {
        // Update
        const { error } = await supabase
          .from("notices")
          .update(payload)
          .eq("id", editingNotice.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from("notices")
          .insert([payload]);
        if (error) throw error;
      }
      setModalOpen(false);
      fetchNotices();
    } catch (err) {
      console.error("Error saving notice:", err);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm("이 공지사항을 정말 삭제하시겠습니까?")) return;
    try {
      const { error } = await supabase
        .from("notices")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setModalOpen(false);
      fetchNotices();
    } catch (err) {
      console.error("Error deleting notice:", err);
    }
  };

  return (
    <div className="flex-1 p-3 sm:p-6 md:p-8 space-y-3 sm:space-y-4 bg-zinc-50 dark:bg-zinc-950 flex flex-col min-h-0">
      
      {/* Slim Actions Bar */}
      <div className="flex justify-end items-center gap-2 shrink-0 bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => openFormModal(null)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>공지 작성</span>
        </button>
        <button
          onClick={() => {
            setLoading(true);
            fetchNotices();
          }}
          className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-xl transition-all cursor-pointer active:scale-95 shrink-0"
          title="새로고침"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Notices Board */}
      <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin" />
          </div>
        ) : notices.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center space-y-3 bg-white dark:bg-zinc-900 rounded-[2rem] sm:rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800">
            <AlertCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              등록된 공지사항이 없습니다.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {notices.map((notice) => (
              <div
                key={notice.id}
                onClick={() => openViewModal(notice)}
                className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-[1.8rem] sm:rounded-[2rem] shadow-sm hover:shadow-md border border-zinc-200 dark:border-zinc-800 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[160px] h-auto gap-4"
              >
                <div>
                  <div className="flex justify-between items-start gap-3">
                    <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white line-clamp-1">
                      {notice.title}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 mt-2.5 line-clamp-3 sm:line-clamp-4 leading-relaxed font-normal">
                    {notice.content}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {notice.created_by}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(notice.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openFormModal(notice)}
                      className="p-1 hover:text-zinc-900 dark:hover:text-white rounded"
                      title="수정"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNotice(notice.id)}
                      className="p-1 hover:text-zinc-900 dark:hover:text-white rounded"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Write/Edit / Detail View Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-[540px] rounded-[2.5rem] shadow-2xl p-8 md:p-10 space-y-6 border border-zinc-200 dark:border-zinc-800">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
                {viewingNotice 
                  ? "공지사항 상세" 
                  : editingNotice 
                  ? "공지사항 수정" 
                  : "새 공지사항 작성"}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {viewingNotice ? (
              // 1. Detail View Mode
              <div className="space-y-6">
                <div className="space-y-1">
                  <h4 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">
                    {viewingNotice.title}
                  </h4>
                  <div className="flex items-center gap-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest pt-2">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {viewingNotice.created_by}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(viewingNotice.created_at).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="p-5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl max-h-[300px] overflow-y-auto custom-scrollbar">
                  <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed font-semibold">
                    {viewingNotice.content}
                  </p>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => openFormModal(viewingNotice)}
                    className="flex-1 py-4 border border-zinc-200 dark:border-zinc-700 rounded-2xl font-black text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    수정하기
                  </button>
                  <button
                    onClick={() => handleDeleteNotice(viewingNotice.id)}
                    className="py-4 px-6 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white rounded-2xl font-black text-sm hover:shadow transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ) : (
              // 2. Write / Edit Form Mode
              <form onSubmit={handleSaveNotice} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">Title</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="공지 제목을 입력해 주세요."
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 text-sm font-semibold text-zinc-900 dark:text-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>공지 내용</span>
                  </label>
                  <textarea
                    required
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="상세 공지 내용을 작성해 주세요."
                    className="w-full h-48 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 text-sm font-semibold resize-none text-zinc-900 dark:text-white"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-4 border border-zinc-200 dark:border-zinc-700 rounded-2xl font-black text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white rounded-2xl font-black text-sm shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    게시하기
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
