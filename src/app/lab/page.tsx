"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { 
  CleaningAssignment, 
  CleaningState, 
  LabOrder, 
  AllowedUser 
} from "@/types";
import { 
  FlaskConical, 
  RefreshCw,
  Sparkles,
  Plus,
  GripVertical,
  X,
  ShoppingCart,
  Truck
} from "lucide-react";

// Color mapping for member badges
const getColorForUser = (userName: string) => {
  const name = (userName || "UNKNOWN").toUpperCase();
  const colors = [
    {
      bg: "bg-blue-50/80 dark:bg-blue-950/20",
      border: "border-blue-200/50 dark:border-blue-900/30",
      text: "text-blue-700 dark:text-blue-300",
      hoverBg: "hover:bg-blue-100/50 dark:hover:bg-blue-900/10",
      badge: "bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-300",
      dot: "bg-blue-500",
    },
    {
      bg: "bg-emerald-50/80 dark:bg-emerald-950/20",
      border: "border-emerald-200/50 dark:border-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-300",
      hoverBg: "hover:bg-emerald-100/50 dark:hover:bg-emerald-900/10",
      badge: "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
    },
    {
      bg: "bg-violet-50/80 dark:bg-violet-950/20",
      border: "border-violet-200/50 dark:border-violet-900/30",
      text: "text-violet-700 dark:text-violet-300",
      hoverBg: "hover:bg-violet-100/50 dark:hover:bg-violet-900/10",
      badge: "bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/30 text-violet-700 dark:text-violet-300",
      dot: "bg-violet-500",
    },
    {
      bg: "bg-amber-50/80 dark:bg-amber-950/20",
      border: "border-amber-200/50 dark:border-amber-900/30",
      text: "text-amber-700 dark:text-amber-300",
      hoverBg: "hover:bg-amber-100/50 dark:hover:bg-amber-900/10",
      badge: "bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
    },
    {
      bg: "bg-rose-50/80 dark:bg-rose-950/20",
      border: "border-rose-200/50 dark:border-rose-900/30",
      text: "text-rose-700 dark:text-rose-300",
      hoverBg: "hover:bg-rose-100/50 dark:hover:bg-rose-900/10",
      badge: "bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300",
      dot: "bg-rose-500",
    },
    {
      bg: "bg-cyan-50/80 dark:bg-cyan-950/20",
      border: "border-cyan-200/50 dark:border-cyan-900/30",
      text: "text-cyan-700 dark:text-cyan-300",
      hoverBg: "hover:bg-cyan-100/50 dark:hover:bg-cyan-900/10",
      badge: "bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900/30 text-cyan-700 dark:text-cyan-300",
      dot: "bg-cyan-500",
    },
    {
      bg: "bg-fuchsia-50/80 dark:bg-fuchsia-950/20",
      border: "border-fuchsia-200/50 dark:border-fuchsia-900/30",
      text: "text-fuchsia-700 dark:text-fuchsia-300",
      hoverBg: "hover:bg-fuchsia-100/50 dark:hover:bg-fuchsia-900/10",
      badge: "bg-fuchsia-50 dark:bg-fuchsia-950/40 border border-fuchsia-100 dark:border-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300",
      dot: "bg-fuchsia-500",
    }
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export default function LabPage() {
  const { user } = useAuth();
  const [mountTime] = useState(() => Date.now());
  const [members, setMembers] = useState<string[]>([]);
  const [cleaningState, setCleaningState] = useState<CleaningState | null>(null);
  const [draggedRowIdx, setDraggedRowIdx] = useState<number | null>(null);
  const [showAddSelect, setShowAddSelect] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Orders states
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [orderDbId, setOrderDbId] = useState<string | null>(null);
  const [showAddOrderInput, setShowAddOrderInput] = useState(false);
  const [newItemName, setNewItemName] = useState("");

  // Database record references
  const [cleanDbId, setCleanDbId] = useState<string | null>(null);

  // Fetch initial lab workspace data (Members, Cleaning duties, Orders)
  useEffect(() => {
    let ignore = false;

    const loadInitialData = async () => {
      try {
        const { data: memberData, error: memberError } = await supabase
          .from("allowed_users")
          .select("username")
          .order("created_at", { ascending: true });
        if (memberError) throw memberError;
        if (memberData && !ignore) {
          setMembers((memberData as AllowedUser[]).map((d) => d.username.toUpperCase()));
        }

        const { data: cleanData, error: cleanError } = await supabase
          .from("notices")
          .select("*")
          .eq("title", "__LAB_CLEANING__")
          .limit(1);
        if (cleanError) throw cleanError;
        if (!ignore && cleanData && cleanData.length > 0) {
          setCleanDbId(cleanData[0].id);
          const parsed = JSON.parse(cleanData[0].content);
          if (parsed.assignments) {
            const rawAssignments = parsed.assignments as Array<{ member: string; cleaning: boolean | string; waste: boolean | string }>;
            const sanitized: CleaningAssignment[] = rawAssignments.map((item) => ({
              member: item.member,
              cleaning: typeof item.cleaning === "boolean" ? item.cleaning : (item.cleaning !== "면제" && !!item.cleaning),
              waste: typeof item.waste === "boolean" ? item.waste : (item.waste !== "면제" && !!item.waste)
            }));
            setCleaningState({
              baseWeek: parsed.baseWeek || 0,
              assignments: sanitized
            });
          }
        }

        const { data: orderData, error: orderError } = await supabase
          .from("notices")
          .select("*")
          .eq("title", "__LAB_ORDERS__")
          .limit(1);
        if (orderError) throw orderError;
        if (!ignore) {
          if (orderData && orderData.length > 0) {
            setOrderDbId(orderData[0].id);
            setOrders(JSON.parse(orderData[0].content) as LabOrder[]);
          } else {
            setOrders([]);
          }
        }
      } catch (err) {
        console.error("Error loading lab data:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  // Reference Monday: Monday, Jan 5, 2026
  const getWeekOffset = () => {
    const referenceDate = new Date("2026-01-05");
    const currentDate = new Date();
    const diff = currentDate.getTime() - referenceDate.getTime();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.floor(diff / oneWeek);
  };

  // Weekly Cleaning & Waste Duty Handlers
  const saveCleaningState = async (newState: CleaningState) => {
    try {
      if (cleanDbId) {
        await supabase
          .from("notices")
          .update({ content: JSON.stringify(newState) })
          .eq("id", cleanDbId);
      } else {
        const { data } = await supabase
          .from("notices")
          .insert([{
            title: "__LAB_CLEANING__",
            content: JSON.stringify(newState),
            created_by: "SYSTEM"
          }])
          .select();
        if (data && data.length > 0) setCleanDbId(data[0].id);
      }
    } catch (err) {
      console.error("Error saving cleaning duties:", err);
    }
  };

  const handleToggleDuty = async (indexInBase: number, type: "cleaning" | "waste") => {
    const currentAssignments = cleaningState?.assignments || members.map((member, i) => {
      const N = members.length;
      const cleaning = i < Math.min(3, N);
      const s = Math.max(1, Math.floor(N / 2));
      const wasteIdx = (i - s + N) % N;
      const waste = wasteIdx < Math.min(2, N);
      return { member, cleaning, waste };
    });

    const updated = currentAssignments.map((item, i) => {
      if (i === indexInBase) {
        return {
          ...item,
          [type]: !item[type]
        };
      }
      return item;
    });

    const newState: CleaningState = {
      baseWeek: cleaningState?.baseWeek || 0,
      assignments: updated
    };

    setCleaningState(newState);
    await saveCleaningState(newState);
  };

  const handleAddUser = async (newMember: string) => {
    if (!newMember) return;
    const currentAssignments = cleaningState?.assignments || members.map((member, i) => {
      const N = members.length;
      const cleaning = i < Math.min(3, N);
      const s = Math.max(1, Math.floor(N / 2));
      const wasteIdx = (i - s + N) % N;
      const waste = wasteIdx < Math.min(2, N);
      return { member, cleaning, waste };
    });

    if (currentAssignments.some(item => item.member === newMember)) return;

    const updated = [
      ...currentAssignments,
      { member: newMember, cleaning: false, waste: false }
    ];

    const newState: CleaningState = {
      baseWeek: cleaningState?.baseWeek || 0,
      assignments: updated
    };

    setCleaningState(newState);
    await saveCleaningState(newState);
    setShowAddSelect(false);
  };

  const handleRemoveUser = async (indexInBase: number) => {
    const currentAssignments = cleaningState?.assignments || members.map((member, i) => {
      const N = members.length;
      const cleaning = i < Math.min(3, N);
      const s = Math.max(1, Math.floor(N / 2));
      const wasteIdx = (i - s + N) % N;
      const waste = wasteIdx < Math.min(2, N);
      return { member, cleaning, waste };
    });

    const updated = currentAssignments.filter((_, i) => i !== indexInBase);

    const newState: CleaningState = {
      baseWeek: cleaningState?.baseWeek || 0,
      assignments: updated
    };

    setCleaningState(newState);
    await saveCleaningState(newState);
  };

  const handleRowDrop = async (sourceIdx: number, targetIdx: number) => {
    if (sourceIdx === targetIdx) return;
    
    const currentWeekOffset = getWeekOffset();
    const baseWeek = cleaningState?.baseWeek || 0;
    const shift = (currentWeekOffset - baseWeek);
    const N = members.length;
    
    const baseAssignments = cleaningState?.assignments || members.map((member, i) => {
      const cleaning = i < Math.min(3, N);
      const s = Math.max(1, Math.floor(N / 2));
      const wasteIdx = (i - s + N) % N;
      const waste = wasteIdx < Math.min(2, N);
      return { member, cleaning, waste };
    });

    const getRotatedIndex = (idx: number) => {
      if (N === 0) return 0;
      let r = (idx - shift) % N;
      if (r < 0) r += N;
      return r;
    };

    const sourceBaseIdx = getRotatedIndex(sourceIdx);
    const targetBaseIdx = getRotatedIndex(targetIdx);

    const updated = [...baseAssignments];
    const [moved] = updated.splice(sourceBaseIdx, 1);
    updated.splice(targetBaseIdx, 0, moved);

    const newState: CleaningState = {
      baseWeek: cleaningState?.baseWeek || 0,
      assignments: updated
    };

    setCleaningState(newState);
    await saveCleaningState(newState);
  };

  // Lab Orders Handlers
  const saveOrdersState = async (updatedOrders: LabOrder[]) => {
    try {
      if (orderDbId) {
        await supabase
          .from("notices")
          .update({ content: JSON.stringify(updatedOrders) })
          .eq("id", orderDbId);
      } else {
        const { data } = await supabase
          .from("notices")
          .insert([{
            title: "__LAB_ORDERS__",
            content: JSON.stringify(updatedOrders),
            created_by: "SYSTEM"
          }])
          .select();
        if (data && data.length > 0) setOrderDbId(data[0].id);
      }
    } catch (err) {
      console.error("Error saving lab orders:", err);
    }
  };

  const handleAddOrder = async (itemName: string) => {
    if (!itemName.trim() || !user) return;
    const currentUserInitials = user.email?.split("@")[0].toUpperCase() || "UNKNOWN";
    const newOrder: LabOrder = {
      id: crypto.randomUUID(),
      itemName: itemName.trim(),
      requestedBy: currentUserInitials,
      status: "REQUESTED",
      createdAt: new Date().toISOString()
    };
    const updated = [newOrder, ...orders];
    setOrders(updated);
    setNewItemName("");
    setShowAddOrderInput(false);
    await saveOrdersState(updated);
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: "ORDERED" | "RECEIVED") => {
    if (!user) return;
    const currentUserInitials = user.email?.split("@")[0].toUpperCase() || "UNKNOWN";
    const nowStr = new Date().toISOString();

    const updated = orders.map(order => {
      if (order.id !== orderId) return order;
      if (nextStatus === "ORDERED") {
        return {
          ...order,
          status: "ORDERED" as const,
          orderedAt: nowStr,
          orderedBy: currentUserInitials
        };
      }
      if (nextStatus === "RECEIVED") {
        return {
          ...order,
          status: "RECEIVED" as const,
          receivedAt: nowStr,
          receivedBy: currentUserInitials
        };
      }
      return order;
    });

    setOrders(updated);
    await saveOrdersState(updated);
  };

  const handleDeleteOrder = async (orderId: string) => {
    const updated = orders.filter(order => order.id !== orderId);
    setOrders(updated);
    await saveOrdersState(updated);
  };

  // Compute calculated weekly cleaning duty assignments
  const currentWeekOffset = getWeekOffset();
  const baseWeek = cleaningState?.baseWeek || 0;
  const shift = (currentWeekOffset - baseWeek);
  const N = members.length;
  
  const baseAssignments = cleaningState?.assignments || members.map((member, i) => {
    const cleaning = i < Math.min(3, N);
    const s = Math.max(1, Math.floor(N / 2));
    const wasteIdx = (i - s + N) % N;
    const waste = wasteIdx < Math.min(2, N);
    return { member, cleaning, waste };
  });

  const assignments = members.map((_, i) => {
    const item = baseAssignments[i] || { member: members[i] || "UNKNOWN", cleaning: false, waste: false };
    if (N === 0) return { member: item.member, cleaning: false, waste: false };
    
    let rotatedIdx = (i - shift) % N;
    if (rotatedIdx < 0) rotatedIdx += N;
    
    const sourceItem = baseAssignments[rotatedIdx] || { member: "UNKNOWN", cleaning: false, waste: false };
    return {
      member: item.member,
      cleaning: sourceItem.cleaning,
      waste: sourceItem.waste
    };
  });

  const visibleOrders = useMemo(() => {
    const threeDaysAgo = mountTime - 3 * 24 * 60 * 60 * 1000;
    return orders.filter((order) => {
      if (order.status !== "RECEIVED") return true;
      if (!order.receivedAt) return true;
      return new Date(order.receivedAt).getTime() >= threeDaysAgo;
    });
  }, [orders, mountTime]);

  // Get weekly date range string: (MM.DD ~ MM.DD)
  const getWeeklyDateRangeString = () => {
    const today = new Date();
    const day = today.getDay();
    const daysToMonday = day === 0 ? 6 : day - 1;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    
    const format = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`;
    return `(${format(monday)} ~ ${format(sunday)})`;
  };

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8 flex flex-col min-h-0 bg-surface dark:bg-slate-900">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 sm:gap-4 shrink-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-headline text-primary dark:text-blue-400 tracking-tighter flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-primary dark:text-blue-400" />
            <span>Atelier Lab Workspace</span>
          </h2>
          <p className="text-xs sm:text-sm text-on-surface-variant dark:text-gray-400 font-semibold mt-1">
            연구 물품 주문 현황과 주간 청소 당번을 실시간으로 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLoading(true);
              window.location.reload();
            }}
            className="p-2.5 sm:p-3 bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-gray-400 rounded-2xl hover:text-primary dark:hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <RefreshCw className="w-8 h-8 text-primary dark:text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8 min-h-0">

          {/* Left Column: Item Orders Status */}
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-7 shadow-md border border-black/[0.02] dark:border-white/[0.02] flex flex-col min-h-[420px] overflow-hidden">
            
            <div className="flex justify-between items-center pb-3 border-b border-black/[0.03] dark:border-white/[0.03] shrink-0">
              <h3 className="text-base sm:text-lg font-black text-primary dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-500" />
                <span>연구실 물품 주문 현황 ({visibleOrders.length}건)</span>
              </h3>
              
              <button
                onClick={() => setShowAddOrderInput(!showAddOrderInput)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
                title="물품 추가"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">물품 요청</span>
              </button>
            </div>

            {/* Inline Addition Input Form */}
            {showAddOrderInput && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddOrder(newItemName);
                }}
                className="flex gap-2 p-2.5 mt-3 bg-slate-50 dark:bg-slate-900/70 rounded-2xl border border-black/[0.03] dark:border-white/[0.03] shrink-0 animate-fade-in shadow-inner"
              >
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="주문할 물품명을 입력하세요..."
                  className="flex-1 bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-blue-500/20"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm transition-all active:scale-95"
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddOrderInput(false);
                    setNewItemName("");
                  }}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-foreground dark:text-gray-200 rounded-xl text-xs font-black cursor-pointer transition-all"
                >
                  취소
                </button>
              </form>
            )}

            {/* Orders List Container */}
            <div className="flex-1 overflow-y-auto my-3 space-y-2.5 pr-1 custom-scrollbar min-h-[200px]">
              {visibleOrders.length === 0 ? (
                <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center p-6 text-on-surface-variant/40 dark:text-gray-500 space-y-2">
                  <ShoppingCart className="w-10 h-10 opacity-20" />
                  <span className="text-xs font-bold">현재 등록된 물품 주문 요청이 없습니다.</span>
                </div>
              ) : (
                visibleOrders.map((order) => {
                  const color = getColorForUser(order.requestedBy);
                  const hasRequested = order.status === "REQUESTED";
                  const hasOrdered = order.status === "ORDERED";
                  const hasReceived = order.status === "RECEIVED";

                  return (
                    <div 
                      key={order.id} 
                      className={`group flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all ${
                        hasReceived 
                          ? "bg-slate-50/60 dark:bg-slate-900/30 border-black/[0.02] dark:border-white/[0.02] opacity-70" 
                          : hasOrdered 
                          ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-100/60 dark:border-blue-900/30 shadow-sm" 
                          : "bg-surface-container-low dark:bg-slate-900/60 border-black/[0.03] dark:border-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-headline font-black text-[9px] border shadow-inner ${color.badge} shrink-0`}>
                          {order.requestedBy}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs sm:text-sm font-bold text-foreground dark:text-gray-200 truncate ${
                            hasReceived ? "line-through text-on-surface-variant/40" : ""
                          }`}>
                            {order.itemName}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-on-surface-variant/60 dark:text-gray-400 font-medium flex items-center gap-1.5 mt-0.5 select-none">
                            <span>요청: {order.requestedBy}</span>
                            {order.orderedBy && (
                              <>
                                <span>•</span>
                                <span className="text-amber-600 dark:text-amber-400 font-bold">주문: {order.orderedBy}</span>
                              </>
                            )}
                            {order.receivedBy && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600 dark:text-blue-400 font-bold">수령: {order.receivedBy}</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Step 1: Cart (Order) Button */}
                        <button
                          type="button"
                          onClick={() => handleUpdateOrderStatus(order.id, "ORDERED")}
                          disabled={!hasRequested}
                          className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 border text-xs font-bold ${
                            hasRequested
                              ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-900/30 cursor-pointer shadow-sm active:scale-95"
                              : "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/20 opacity-50 cursor-not-allowed"
                          }`}
                          title={hasRequested ? "물품 주문 완료 처리" : "주문 완료"}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{hasRequested ? "주문하기" : "주문완료"}</span>
                        </button>

                        {/* Step 2: Truck (Receive) Button */}
                        <button
                          type="button"
                          onClick={() => handleUpdateOrderStatus(order.id, "RECEIVED")}
                          disabled={!hasOrdered}
                          className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 border text-xs font-bold ${
                            hasOrdered
                              ? "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-900/30 cursor-pointer animate-pulse shadow-sm active:scale-95"
                              : hasReceived
                              ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed"
                              : "bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-700 opacity-20 cursor-not-allowed"
                          }`}
                          title={hasOrdered ? "수령 완료 처리" : hasReceived ? "수령 완료됨" : "수령 준비 대기"}
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{hasReceived ? "수령됨" : "수령확인"}</span>
                        </button>

                        {/* Delete (X) Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(order.id)}
                          className="text-on-surface-variant/40 dark:text-gray-500 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all shrink-0 cursor-pointer"
                          title="삭제"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Caption */}
            <div className="text-[10px] text-on-surface-variant/50 dark:text-gray-500 font-bold flex items-center justify-between shrink-0 pt-2.5 border-t border-black/[0.03] dark:border-white/[0.03] select-none">
              <span>※ 수령 완료 물품은 3일 후 자동 정리됩니다.</span>
            </div>

          </div>

          {/* Right Column: Cleaning & Waste Duties Table */}
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-7 shadow-md border border-black/[0.02] dark:border-white/[0.02] flex flex-col min-h-[420px] overflow-hidden">
            
            <div className="flex justify-between items-center pb-3 border-b border-black/[0.03] dark:border-white/[0.03] shrink-0">
              <h3 className="text-base sm:text-lg font-black text-primary dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>주간 청소 당번 {getWeeklyDateRangeString()}</span>
              </h3>
              
              <div className="flex items-center gap-2 relative">
                {showAddSelect && (
                  <select
                    className="bg-white dark:bg-slate-700 border border-black/15 dark:border-white/15 rounded-xl px-2.5 py-1.5 text-xs outline-none font-bold text-foreground w-[130px] cursor-pointer absolute right-9 top-0 z-20 animate-fade-in shadow-xl"
                    defaultValue=""
                    onChange={(e) => handleAddUser(e.target.value)}
                    onBlur={() => setTimeout(() => setShowAddSelect(false), 200)}
                  >
                    <option value="" disabled>멤버 선택...</option>
                    {members
                      .filter(m => !baseAssignments.some(ba => ba.member === m))
                      .map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))
                    }
                  </select>
                )}
                <button
                  onClick={() => setShowAddSelect(!showAddSelect)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
                  title="멤버 추가"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">당번 추가</span>
                </button>
              </div>
            </div>

            {/* Weekly Duties 3-Column Table with Drag Sorting */}
            <div className="my-3 border border-black/[0.03] dark:border-white/[0.03] rounded-2xl overflow-hidden flex-1 flex flex-col">
              <table className="w-full text-center border-collapse text-xs font-semibold table-fixed">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700 text-on-surface-variant dark:text-gray-300 border-b border-black/[0.02] dark:border-white/[0.02] z-10 select-none">
                  <tr>
                    <th className="py-3 font-black w-[40%] bg-slate-50 dark:bg-slate-700">사용자</th>
                    <th className="py-3 font-black w-[30%] bg-slate-50 dark:bg-slate-700">청소</th>
                    <th className="py-3 font-black w-[30%] bg-slate-50 dark:bg-slate-700">폐기물</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                  {assignments.map((row, idx) => {
                    let rotatedIdx = (idx - shift) % N;
                    if (rotatedIdx < 0) rotatedIdx += N;
                    
                    return (
                      <tr 
                        key={row.member} 
                        draggable={true}
                        onDragStart={(e) => {
                          setDraggedRowIdx(idx);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedRowIdx !== null && draggedRowIdx !== idx) {
                            handleRowDrop(draggedRowIdx, idx);
                          }
                        }}
                        onDragEnd={() => {
                          setDraggedRowIdx(null);
                        }}
                        className={`group hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all select-none ${
                          draggedRowIdx === idx ? "opacity-30 bg-slate-100 dark:bg-slate-900" : ""
                        }`}
                      >
                        <td className="py-2.5 border-r border-black/[0.02] dark:border-white/[0.02]">
                          <div className="flex items-center justify-between gap-1.5 px-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {/* Desktop: Drag Grip */}
                              <GripVertical className="hidden md:block w-4 h-4 text-on-surface-variant/30 shrink-0 cursor-grab active:cursor-grabbing" />
                              
                              {/* Mobile: Move Buttons */}
                              <div className="flex md:hidden items-center gap-1 shrink-0 select-none">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleRowDrop(idx, idx - 1)}
                                  className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-black bg-slate-100 dark:bg-slate-700 active:scale-90 ${
                                    idx === 0 ? "opacity-20 cursor-not-allowed" : "text-primary dark:text-blue-400 cursor-pointer"
                                  }`}
                                  title="위로 이동"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === assignments.length - 1}
                                  onClick={() => handleRowDrop(idx, idx + 1)}
                                  className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-black bg-slate-100 dark:bg-slate-700 active:scale-90 ${
                                    idx === assignments.length - 1 ? "opacity-20 cursor-not-allowed" : "text-primary dark:text-blue-400 cursor-pointer"
                                  }`}
                                  title="아래로 이동"
                                >
                                  ▼
                                </button>
                              </div>

                              <span className="text-xs sm:text-sm text-foreground dark:text-white font-bold truncate">
                                {row.member}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(rotatedIdx)}
                              className="text-on-surface-variant/40 dark:text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 shrink-0 cursor-pointer"
                              title="제거"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td 
                          className={`py-2.5 border-r border-black/[0.02] dark:border-white/[0.02] px-1 cursor-pointer select-none transition-all ${
                            row.cleaning 
                              ? "bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 text-white font-black" 
                              : "hover:bg-slate-50 dark:hover:bg-slate-700/20 text-transparent"
                          }`}
                          onClick={() => handleToggleDuty(rotatedIdx, "cleaning")}
                        >
                          <span className="text-xs select-none">✓</span>
                        </td>
                        <td 
                          className={`py-2.5 px-1 cursor-pointer select-none transition-all ${
                            row.waste 
                              ? "bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 text-white font-black" 
                              : "hover:bg-slate-50 dark:hover:bg-slate-700/20 text-transparent"
                          }`}
                          onClick={() => handleToggleDuty(rotatedIdx, "waste")}
                        >
                          <span className="text-xs select-none">✓</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Caption */}
            <div className="text-[10px] text-on-surface-variant/50 dark:text-gray-500 font-bold flex items-center justify-between shrink-0 pt-2.5 border-t border-black/[0.03] dark:border-white/[0.03] select-none">
              <span>※ 드래그하여 순번을 정하고, 칸을 눌러 이번 주 당번을 지정합니다.</span>
              <span>+{shift}주차</span>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
