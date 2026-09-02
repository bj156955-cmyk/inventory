"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Product, Activity, Notice, CalendarEvent } from "@/types";
import { 
  Package, 
  TrendingDown, 
  AlertCircle, 
  DollarSign, 
  Clock, 
  Megaphone, 
  Calendar,
  MessageSquare,
  ArrowRight,
  RefreshCw
} from "lucide-react";

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // 1. Fetch products
      const { data: prodData } = await supabase.from("products").select("*");
      setProducts(prodData || []);

      // 2. Fetch recent activities (limit 5)
      const { data: actData } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      setActivities(actData || []);

      // 3. Fetch recent notices (limit 2)
      const { data: noticeData } = await supabase
        .from("notices")
        .select("*")
        .order("created_at", { ascending: false });
      
      const filteredNotices = (noticeData || [])
        .filter(
          (n) => 
            n.title !== "__TEAM_MEMBERS__" && 
            n.title !== "__LAB_RESERVATIONS__" && 
            n.title !== "__LAB_CLEANING__"
        )
        .slice(0, 2);
      
      setNotices(filteredNotices);

      // 4. Fetch today's events
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: eventData } = await supabase
        .from("calendar_events")
        .select("*")
        .gte("start_time", today.toISOString())
        .lt("start_time", tomorrow.toISOString());
      setEvents(eventData || []);

    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadDashboard = async () => {
      try {
        // 1. Fetch products
        const { data: prodData } = await supabase.from("products").select("*");
        if (!ignore) setProducts(prodData || []);

        // 2. Fetch recent activities (limit 5)
        const { data: actData } = await supabase
          .from("activities")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);
        if (!ignore) setActivities(actData || []);

        // 3. Fetch recent notices (limit 2)
        const { data: noticeData } = await supabase
          .from("notices")
          .select("*")
          .order("created_at", { ascending: false });
        
        const filteredNotices = (noticeData || [])
          .filter(
            (n) => 
              n.title !== "__TEAM_MEMBERS__" && 
              n.title !== "__LAB_RESERVATIONS__" && 
              n.title !== "__LAB_CLEANING__"
          )
          .slice(0, 2);
        
        if (!ignore) setNotices(filteredNotices);

        // 4. Fetch today's events
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data: eventData } = await supabase
          .from("calendar_events")
          .select("*")
          .gte("start_time", today.toISOString())
          .lt("start_time", tomorrow.toISOString());
        if (!ignore) setEvents(eventData || []);

      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadDashboard();

    // Setup basic dashboard channels
    const prodChan = supabase.channel("dashboard-products")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => fetchData())
      .subscribe();
      
    const actChan = supabase.channel("dashboard-activities")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activities" }, () => fetchData())
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(prodChan);
      supabase.removeChannel(actChan);
    };
  }, []);

  // Stats calculation
  const totalItems = products.length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.target * 0.3).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const totalValue = products.reduce((acc, p) => acc + p.stock * p.price, 0);

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8 bg-surface dark:bg-slate-900 flex flex-col min-h-0">
      
      {/* Header */}
      <div className="flex justify-between items-start sm:items-end gap-3 shrink-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-headline text-primary dark:text-blue-400 tracking-tighter">
            Main Atelier Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-on-surface-variant dark:text-gray-400 font-semibold mt-1">
            실시간 재고 변동 및 팀 협업 현황을 한눈에 모니터링합니다.
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          className="p-2.5 sm:p-3 bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-gray-400 rounded-2xl hover:text-primary dark:hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
          title="대시보드 새로고침"
        >
          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <RefreshCw className="w-8 h-8 text-primary dark:text-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 shrink-0">
            <Link href="/inventory" className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-[1.8rem] sm:rounded-[2rem] shadow-sm hover:shadow-md border border-black/[0.02] dark:border-white/[0.02] transition-all hover:-translate-y-0.5">
              <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-on-surface-variant/50 dark:text-gray-400 mb-2 sm:mb-3 flex justify-between items-center">
                <span>Total Items</span>
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary/40" />
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-primary dark:text-white">{totalItems}</h3>
            </Link>

            <Link href="/inventory" className="bg-red-50/50 dark:bg-red-950/20 p-4 sm:p-6 rounded-[1.8rem] sm:rounded-[2rem] shadow-sm hover:shadow-md border border-red-100/50 dark:border-red-900/20 transition-all hover:-translate-y-0.5">
              <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-red-600/70 dark:text-red-400 mb-2 sm:mb-3 flex justify-between items-center">
                <span>Low Stock</span>
                <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500/50" />
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-red-600 dark:text-red-400">{lowStock}</h3>
            </Link>

            <Link href="/inventory" className="bg-surface-container-low dark:bg-slate-800/60 p-4 sm:p-6 rounded-[1.8rem] sm:rounded-[2rem] shadow-sm hover:shadow-md border border-black/[0.02] dark:border-white/[0.02] transition-all hover:-translate-y-0.5">
              <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-on-surface-variant/50 dark:text-gray-400 mb-2 sm:mb-3 flex justify-between items-center">
                <span>Out of Stock</span>
                <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-on-surface-variant/30" />
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-on-surface-variant dark:text-gray-300">{outOfStock}</h3>
            </Link>

            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-[1.8rem] sm:rounded-[2rem] shadow-sm border border-black/[0.02] dark:border-white/[0.02]">
              <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-on-surface-variant/50 dark:text-gray-400 mb-2 sm:mb-3 flex justify-between items-center">
                <span>Total Value</span>
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary/40" />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-black text-primary dark:text-white truncate">₩{totalValue.toLocaleString()}</h3>
            </div>
          </div>

          {/* Fluid Layout Grid */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-8 min-h-0 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
            
            {/* Left Content Area: Activity Timeline */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-black/[0.02] dark:border-white/[0.02] flex flex-col min-h-[300px]">
              <div className="flex justify-between items-center mb-4 sm:mb-6 shrink-0">
                <h4 className="text-base sm:text-lg font-black font-headline text-primary dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary/60 dark:text-blue-400" />
                  <span>최근 변동 내역</span>
                </h4>
                <Link href="/inventory" className="text-xs font-black text-primary/70 dark:text-blue-400 flex items-center gap-1 hover:underline">
                  <span>재고관리</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 custom-scrollbar pr-1">
                {activities.length === 0 ? (
                  <div className="h-full min-h-[140px] flex items-center justify-center text-xs font-bold text-on-surface-variant/40 dark:text-gray-500">
                    아직 기록된 활동 로그가 없습니다.
                  </div>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="flex gap-3 sm:gap-4 items-start">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                        act.type === "RECEIVE" 
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" 
                          : act.type === "ORDER" 
                          ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400" 
                          : "bg-primary/5 dark:bg-blue-500/10 text-primary dark:text-blue-400"
                      }`}>
                        {act.type.slice(0, 3)}
                      </div>
                      <div className="space-y-0.5 sm:space-y-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-primary dark:text-white leading-relaxed">
                          {act.message}
                        </p>
                        <p className="text-[9px] sm:text-[10px] font-black uppercase text-on-surface-variant/40 dark:text-gray-500 tracking-wider">
                          {act.user_email} • {new Date(act.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Content Area: Notices & Schedule */}
            <div className="space-y-4 sm:space-y-6 flex flex-col">
              
              {/* Today's Schedule Card */}
              <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-[1.8rem] sm:rounded-[2rem] shadow-sm border border-black/[0.02] dark:border-white/[0.02] flex flex-col min-h-[180px]">
                <div className="flex justify-between items-center mb-3 sm:mb-4 shrink-0">
                  <h4 className="text-xs sm:text-sm font-black font-headline text-primary dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary/60 dark:text-blue-400" />
                    <span>오늘의 일정 (Today&apos;s Schedule)</span>
                  </h4>
                  <Link href="/calendar" className="text-[10px] font-black uppercase text-primary/60 dark:text-blue-400 hover:underline">
                    View
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar">
                  {events.length === 0 ? (
                    <div className="h-full min-h-[80px] flex items-center justify-center text-[10px] font-bold text-on-surface-variant/40 dark:text-gray-500">
                      오늘 예정된 일정이 없습니다.
                    </div>
                  ) : (
                    events.map((e) => (
                      <div key={e.id} className="p-3 bg-surface-container-low dark:bg-slate-700/50 rounded-xl space-y-1 border border-black/[0.01] dark:border-white/[0.01]">
                        <p className="text-xs font-bold text-primary dark:text-white truncate">{e.title}</p>
                        <p className="text-[9px] text-on-surface-variant/60 dark:text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>
                            {new Date(e.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ~ {new Date(e.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Notices Card */}
              <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-[1.8rem] sm:rounded-[2rem] shadow-sm border border-black/[0.02] dark:border-white/[0.02] flex flex-col min-h-[180px]">
                <div className="flex justify-between items-center mb-3 sm:mb-4 shrink-0">
                  <h4 className="text-xs sm:text-sm font-black font-headline text-primary dark:text-white flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-primary/60 dark:text-blue-400" />
                    <span>최신 공지사항</span>
                  </h4>
                  <Link href="/notices" className="text-[10px] font-black uppercase text-primary/60 dark:text-blue-400 hover:underline">
                    View All
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar">
                  {notices.length === 0 ? (
                    <div className="h-full min-h-[80px] flex items-center justify-center text-[10px] font-bold text-on-surface-variant/40 dark:text-gray-500">
                      최신 공지사항이 없습니다.
                    </div>
                  ) : (
                    notices.map((n) => (
                      <Link href="/notices" key={n.id} className="block p-3 hover:bg-surface-container-low dark:hover:bg-slate-700/50 rounded-xl space-y-1 transition-all border border-transparent hover:border-black/[0.02]">
                        <p className="text-xs font-bold text-primary dark:text-white truncate">{n.title}</p>
                        <p className="text-[10px] text-on-surface-variant/70 dark:text-gray-300 line-clamp-2 leading-relaxed">
                          {n.content}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Quick Chat Shortcut Overlay */}
          <div className="shrink-0 bg-primary/5 dark:bg-blue-500/10 border border-primary/10 dark:border-blue-500/20 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4.5 h-4.5 text-primary dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black text-primary dark:text-white">실시간 채팅방이 열려있습니다</p>
                <p className="text-[10px] font-semibold text-on-surface-variant/60 dark:text-gray-400">팀원들과 실시간 대화를 나누고 빠르게 논의해 보세요.</p>
              </div>
            </div>
            <Link href="/chat" className="self-end sm:self-auto px-4 py-2.5 bg-primary dark:bg-blue-600 hover:bg-primary-container text-white rounded-xl font-bold text-xs shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0">
              채팅방 입장
            </Link>
          </div>
        </>
      )}

    </div>
  );
}
