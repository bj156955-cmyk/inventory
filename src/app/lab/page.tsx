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
  RefreshCw,
  Sparkles,
  Plus,
  GripVertical,
  X,
  ShoppingCart,
  Truck,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Check,
  UserPlus
} from "lucide-react";

// Color mapping for member badges (Dark Pastel Accents)
const getColorForUser = (userName?: string) => {
  const name = (userName || "UNKNOWN").toUpperCase();
  const colors = [
    {
      badge: "bg-blue-500/15 border border-blue-500/30 text-blue-400",
      dot: "bg-blue-400",
    },
    {
      badge: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400",
      dot: "bg-emerald-400",
    },
    {
      badge: "bg-purple-500/15 border border-purple-500/30 text-purple-400",
      dot: "bg-purple-400",
    },
    {
      badge: "bg-amber-500/15 border border-amber-500/30 text-amber-400",
      dot: "bg-amber-400",
    },
    {
      badge: "bg-rose-500/15 border border-rose-500/30 text-rose-400",
      dot: "bg-rose-400",
    },
    {
      badge: "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400",
      dot: "bg-cyan-400",
    },
    {
      badge: "bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-400",
      dot: "bg-fuchsia-400",
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
  const [loading, setLoading] = useState(true);
  const [activeMobileTab, setActiveMobileTab] = useState<"orders" | "cleaning">("orders");
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
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
    setShowAddModal(false);
  };

  const handleRemoveUser = async (indexInBase: number, memberName?: string) => {
    if (memberName && !window.confirm(`${memberName} 님을 주간 청소 당번에서 제외하시겠습니까?`)) {
      return;
    }
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
    
    const baseAssignments = cleaningState?.assignments || members.map((member, i) => {
      const N = members.length;
      const cleaning = i < Math.min(3, N);
      const s = Math.max(1, Math.floor(N / 2));
      const wasteIdx = (i - s + N) % N;
      const waste = wasteIdx < Math.min(2, N);
      return { member, cleaning, waste };
    });

    const N = baseAssignments.length;
    if (N === 0) return;

    const getRotatedIndex = (idx: number) => {
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

  const handleMoveRow = async (sourceIdx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? sourceIdx - 1 : sourceIdx + 1;
    if (targetIdx < 0) return;
    await handleRowDrop(sourceIdx, targetIdx);
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
  
  const baseAssignments = cleaningState?.assignments || members.map((member, i) => {
    const N = members.length;
    const cleaning = i < Math.min(3, N);
    const s = Math.max(1, Math.floor(N / 2));
    const wasteIdx = (i - s + N) % N;
    const waste = wasteIdx < Math.min(2, N);
    return { member, cleaning, waste };
  });

  const N = baseAssignments.length;

  const assignments = baseAssignments.map((item, i) => {
    if (N === 0) return { member: item.member, cleaning: false, waste: false };
    
    let rotatedIdx = (i - shift) % N;
    if (rotatedIdx < 0) rotatedIdx += N;
    
    const sourceItem = baseAssignments[rotatedIdx] || { member: item.member, cleaning: false, waste: false };
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
    <div className="h-[calc(100dvh-50px-5rem)] md:h-[100dvh] p-2.5 sm:p-5 md:p-8 flex flex-col min-h-0 bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-2 sm:space-y-4 min-h-0 overflow-hidden">
          {/* Mobile Segment Tab Bar (App-style) */}
          <div className="lg:hidden flex bg-zinc-100 dark:bg-zinc-800/90 p-1 rounded-xl gap-1 shrink-0 select-none shadow-xs">
            <button
              type="button"
              onClick={() => setActiveMobileTab("orders")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                activeMobileTab === "orders"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-black scale-[1.01]"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>물품 주문 ({visibleOrders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab("cleaning")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                activeMobileTab === "cleaning"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-black scale-[1.01]"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>청소 당번</span>
            </button>
          </div>

          {/* Main 2-Column Content (1-Column on Mobile depending on activeMobileTab) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 min-h-0 overflow-hidden">

            {/* Left Column: Item Orders Status */}
            <div className={`bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-[2.5rem] p-3.5 sm:p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 flex-col flex-1 min-h-0 overflow-hidden ${
              activeMobileTab === "orders" ? "flex" : "hidden lg:flex"
            }`}>
              
              <div className="flex justify-between items-center pb-2 sm:pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                  <span>연구실 물품 주문 현황 ({visibleOrders.length}건)</span>
                </h3>
              
              <button
                onClick={() => setShowAddOrderInput(!showAddOrderInput)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-sm shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
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
                className="flex gap-2 p-2.5 mt-2 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 shrink-0 animate-fade-in shadow-inner"
              >
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="주문할 물품명을 입력하세요..."
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm transition-all active:scale-95"
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddOrderInput(false);
                    setNewItemName("");
                  }}
                  className="px-3 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-black cursor-pointer transition-all"
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
                          ? "bg-zinc-100/50 dark:bg-zinc-800/30 border-zinc-200/50 dark:border-zinc-800/50 opacity-60" 
                          : hasOrdered 
                          ? "bg-sky-500/5 border-sky-500/30 shadow-sm" 
                          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-headline font-black text-[9px] border shadow-inner ${color.badge} shrink-0`}>
                          {order.requestedBy}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate ${
                            hasReceived ? "line-through text-zinc-400 dark:text-zinc-500" : ""
                          }`}>
                            {order.itemName}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5 mt-0.5 select-none">
                            <span>요청: {order.requestedBy}</span>
                            {order.orderedBy && (
                              <>
                                <span>•</span>
                                <span className="text-sky-400 font-bold">주문: {order.orderedBy}</span>
                              </>
                            )}
                            {order.receivedBy && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-400 font-bold">수령: {order.receivedBy}</span>
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
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 cursor-pointer shadow-sm active:scale-95"
                              : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700 opacity-60 cursor-not-allowed"
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
                              ? "bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30 cursor-pointer shadow-sm active:scale-95"
                              : hasReceived
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 opacity-80 cursor-not-allowed"
                              : "bg-zinc-100 text-zinc-300 dark:bg-zinc-800 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800 opacity-30 cursor-not-allowed"
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
                          className="text-zinc-400 hover:text-rose-400 dark:text-zinc-500 dark:hover:text-rose-400 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shrink-0 cursor-pointer"
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
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold flex items-center justify-between shrink-0 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 select-none">
              <span>※ 수령 완료 물품은 3일 후 자동 정리됩니다.</span>
            </div>

          </div>

          {/* Right Column: Cleaning & Waste Duties Table */}
          <div className={`bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-[2.5rem] p-3.5 sm:p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 flex-col flex-1 min-h-0 overflow-hidden ${
            activeMobileTab === "cleaning" ? "flex" : "hidden lg:flex"
          }`}>
            
            <div className="flex justify-between items-center pb-2 sm:pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white flex items-center gap-1.5 sm:gap-2 truncate">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                <span className="truncate">주간 청소 당번 {getWeeklyDateRangeString()}</span>
              </h3>
              
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Add Member Button */}
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-sm shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
                  title="당번 추가"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">당번 추가</span>
                </button>

                {/* Edit Mode Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-xs ${
                    isEditMode
                      ? "bg-amber-500 hover:bg-amber-600 text-white font-black shadow-amber-500/20 shadow-sm"
                      : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                  }`}
                  title={isEditMode ? "편집 완료" : "순서 및 인원 편집"}
                >
                  {isEditMode ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>완료</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                      <span>순서 편집</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Slim Tip Banner in Edit Mode */}
            {isEditMode && (
              <div className="mt-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-400 shrink-0 select-none">
                <span>▲ / ▼ 로 순번 이동, ✕ 로 당번 제외</span>
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className="text-[10px] underline font-black cursor-pointer ml-2 shrink-0"
                >
                  편집 완료
                </button>
              </div>
            )}

            {/* Weekly Duties 3-Column Table with Drag & Arrow Sorting */}
            <div className="my-1.5 sm:my-2 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl overflow-y-auto custom-scrollbar flex-1 min-h-0">
              <table className="w-full text-center border-collapse text-xs font-semibold table-fixed">
                <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 z-10 select-none">
                  <tr>
                    <th className="py-2 font-black w-[44%] bg-zinc-50 dark:bg-zinc-800">사용자</th>
                    <th className="py-2 font-black w-[28%] bg-zinc-50 dark:bg-zinc-800">청소</th>
                    <th className="py-2 font-black w-[28%] bg-zinc-50 dark:bg-zinc-800">폐기물</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {assignments.map((row, idx) => {
                    let rotatedIdx = (idx - shift) % N;
                    if (rotatedIdx < 0) rotatedIdx += N;
                    
                    return (
                      <tr 
                        key={row.member} 
                        draggable={!isEditMode}
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
                        className={`group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all select-none ${
                          draggedRowIdx === idx ? "opacity-30 bg-zinc-100 dark:bg-zinc-900" : ""
                        }`}
                      >
                        <td className="py-1.5 sm:py-2 border-r border-zinc-200 dark:border-zinc-800">
                          <div className="flex items-center justify-between gap-1 px-2 sm:px-3">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {/* Desktop: Drag Grip */}
                              {!isEditMode && (
                                <GripVertical className="hidden md:block w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0 cursor-grab active:cursor-grabbing" />
                              )}
                              
                              <span className="text-xs sm:text-sm text-zinc-900 dark:text-white font-bold truncate">
                                {row.member}
                              </span>
                            </div>

                            {/* Actions: Edit Mode (Up/Down/Exclude) vs Normal */}
                            {isEditMode ? (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveRow(idx, "up")}
                                  className="w-5 h-5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center disabled:opacity-20 cursor-pointer active:scale-90 transition-all"
                                  title="위로 이동"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === assignments.length - 1}
                                  onClick={() => handleMoveRow(idx, "down")}
                                  className="w-5 h-5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center disabled:opacity-20 cursor-pointer active:scale-90 transition-all"
                                  title="아래로 이동"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveUser(rotatedIdx, row.member)}
                                  className="w-5 h-5 rounded-md bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-500 flex items-center justify-center cursor-pointer active:scale-90 transition-all ml-0.5"
                                  title="당번에서 제외"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRemoveUser(rotatedIdx, row.member)}
                                className="text-zinc-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-all p-1 shrink-0 cursor-pointer"
                                title="제거"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td 
                          className={`py-1.5 sm:py-2 border-r border-zinc-200 dark:border-zinc-800 px-1 cursor-pointer select-none transition-all ${
                            row.cleaning 
                              ? "bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 font-black" 
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-800/30 text-transparent"
                          }`}
                          onClick={() => handleToggleDuty(rotatedIdx, "cleaning")}
                        >
                          <span className="text-xs select-none">✓</span>
                        </td>
                        <td 
                          className={`py-1.5 sm:py-2 px-1 cursor-pointer select-none transition-all ${
                            row.waste 
                              ? "bg-blue-500/20 text-blue-500 dark:text-blue-400 font-black" 
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-800/30 text-transparent"
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
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold flex items-center justify-between shrink-0 pt-1.5 border-t border-zinc-100 dark:border-zinc-800 select-none">
              <span>※ {isEditMode ? "편집 모드 활성화됨" : "칸을 눌러 당번을 지정하고, [순서 편집]으로 순번을 변경합니다."}</span>
              <span>+{shift}주차</span>
            </div>

          </div>

        </div>
        </div>
      )}

      {/* Member Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[300] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-[360px] rounded-3xl shadow-2xl p-5 space-y-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/30">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h4 className="font-black text-sm sm:text-base text-zinc-900 dark:text-white">
                  청소 당번 추가
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
              추가할 멤버를 선택하세요. 당번 목록 맨 끝에 추가됩니다.
            </p>

            {/* Member Chips List */}
            <div className="max-h-52 overflow-y-auto custom-scrollbar py-1">
              {members.filter(m => !baseAssignments.some(ba => ba.member === m)).length === 0 ? (
                <div className="py-6 text-center text-xs font-bold text-zinc-400 dark:text-zinc-500">
                  모든 팀원이 이미 당번에 포함되어 있습니다.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {members
                    .filter(m => !baseAssignments.some(ba => ba.member === m))
                    .map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleAddUser(m)}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{m}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
