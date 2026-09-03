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
  Truck
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
  const [dragSourceIdx, setDragSourceIdx] = useState<number | null>(null);
  const [dragTargetIdx, setDragTargetIdx] = useState<number | null>(null);
  const [dragDeltaY, setDragDeltaY] = useState<number>(0);
  const [isDropping, setIsDropping] = useState<boolean>(false);

  const dragSourceIdxRef = React.useRef<number | null>(null);
  const dragTargetIdxRef = React.useRef<number | null>(null);
  const touchStartYRef = React.useRef<number>(0);
  const touchStartXRef = React.useRef<number>(0);
  const touchTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = React.useRef<boolean>(false);
  const [rowHeight, setRowHeight] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [activeMobileTab, setActiveMobileTab] = useState<"orders" | "cleaning">("orders");
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Orders states
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [orderDbId, setOrderDbId] = useState<string | null>(null);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCode, setNewItemCode] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showAddOrderModal) {
          setShowAddOrderModal(false);
          setNewItemName("");
          setNewItemCode("");
          setNewItemQuantity("1");
        }
        if (showAddModal) {
          setShowAddModal(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddOrderModal, showAddModal]);

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

  // Reference Monday: Monday, Jan 5, 2026 00:00:00 (로컬 자정 기준)
  const getWeekOffset = () => {
    const referenceDate = new Date(2026, 0, 5, 0, 0, 0);
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
      const cleaning = i === 0;
      const waste = N > 1 ? i === 1 : false;
      return { member, cleaning, waste };
    });

    const isCurrentlyActive = !!currentAssignments[indexInBase]?.[type];

    // 1주일에 청소 1명, 폐기물 1명만 지정 (중복 선택 불가 단일 선택 라디오 로직)
    const updated = currentAssignments.map((item, i) => {
      if (i === indexInBase) {
        return {
          ...item,
          [type]: !isCurrentlyActive,
          // 동일 인원이 청소와 폐기물을 동시에 맡지 않도록 중복 방지
          ...((!isCurrentlyActive && type === "cleaning") ? { waste: false } : {}),
          ...((!isCurrentlyActive && type === "waste") ? { cleaning: false } : {})
        };
      }
      // 해당 역할(type)은 주당 1명만 가능하므로 다른 인원은 false 처리
      return {
        ...item,
        [type]: false
      };
    });

    const newState: CleaningState = {
      baseWeek: cleaningState?.baseWeek || 0,
      assignments: updated
    };

    setCleaningState(newState);
    await saveCleaningState(newState);
  };

  const handleToggleMember = async (memberName: string) => {
    const currentAssignments = cleaningState?.assignments || members.map((member, i) => {
      const N = members.length;
      const cleaning = i === 0;
      const waste = N > 1 ? i === 1 : false;
      return { member, cleaning, waste };
    });

    const isAlreadySelected = currentAssignments.some((item) => item.member === memberName);

    let updated: CleaningAssignment[];
    if (isAlreadySelected) {
      updated = currentAssignments.filter((item) => item.member !== memberName);
    } else {
      updated = [
        ...currentAssignments,
        { member: memberName, cleaning: false, waste: false }
      ];
    }

    const newState: CleaningState = {
      baseWeek: cleaningState?.baseWeek || 0,
      assignments: updated
    };

    setCleaningState(newState);
    await saveCleaningState(newState);
  };

  const handleRowDrop = async (sourceIdx: number, targetIdx: number) => {
    if (sourceIdx === targetIdx) return;
    
    const baseAssignments = cleaningState?.assignments || members.map((member, i) => {
      const N = members.length;
      const cleaning = i === 0;
      const waste = N > 1 ? i === 1 : false;
      return { member, cleaning, waste };
    });

    const N = baseAssignments.length;
    if (N === 0) return;
    if (sourceIdx < 0 || sourceIdx >= N || targetIdx < 0 || targetIdx >= N) return;

    const updated = [...baseAssignments];
    const [moved] = updated.splice(sourceIdx, 1);
    updated.splice(targetIdx, 0, moved);

    const newState: CleaningState = {
      baseWeek: cleaningState?.baseWeek || 0,
      assignments: updated
    };

    setCleaningState(newState);
    await saveCleaningState(newState);
  };

  const handleTouchStart = (idx: number, e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartYRef.current = touch.clientY;
    touchStartXRef.current = touch.clientX;

    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }

    const currentTarget = e.currentTarget as HTMLElement;
    const measuredHeight = currentTarget?.offsetHeight || rowHeight;
    if (currentTarget?.offsetHeight && currentTarget.offsetHeight !== rowHeight) {
      setRowHeight(currentTarget.offsetHeight);
    }

    touchTimerRef.current = setTimeout(() => {
      isDraggingRef.current = true;
      dragSourceIdxRef.current = idx;
      dragTargetIdxRef.current = idx;
      setDragSourceIdx(idx);
      setDragTargetIdx(idx);
      setDragDeltaY(0);

      if (typeof window !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate(40); } catch {}
      }

      const H = measuredHeight;
      const totalCount = baseAssignments.length;

      const onGlobalMove = (ev: TouchEvent) => {
        if (!isDraggingRef.current) return;
        if (ev.cancelable) ev.preventDefault();

        const currentY = ev.touches[0].clientY;
        const delta = currentY - touchStartYRef.current;
        setDragDeltaY(delta);

        const offsetSlots = Math.round(delta / H);
        const source = dragSourceIdxRef.current ?? idx;
        const newTarget = Math.max(0, Math.min(totalCount - 1, source + offsetSlots));

        if (newTarget !== dragTargetIdxRef.current) {
          dragTargetIdxRef.current = newTarget;
          setDragTargetIdx(newTarget);
          if (typeof window !== "undefined" && navigator.vibrate) {
            try { navigator.vibrate(15); } catch {}
          }
        }
      };

      const onGlobalEnd = () => {
        window.removeEventListener("touchmove", onGlobalMove);
        window.removeEventListener("touchend", onGlobalEnd);
        window.removeEventListener("touchcancel", onGlobalEnd);

        if (isDraggingRef.current) {
          const src = dragSourceIdxRef.current;
          const tgt = dragTargetIdxRef.current;
          if (src !== null && tgt !== null && src !== tgt) {
            const finalDeltaY = (tgt - src) * H;
            setIsDropping(true);
            setDragDeltaY(finalDeltaY);

            if (typeof window !== "undefined" && navigator.vibrate) {
              try { navigator.vibrate(25); } catch {}
            }

            setTimeout(() => {
              handleRowDrop(src, tgt);
              isDraggingRef.current = false;
              dragSourceIdxRef.current = null;
              dragTargetIdxRef.current = null;
              setIsDropping(false);
              setDragSourceIdx(null);
              setDragTargetIdx(null);
              setDragDeltaY(0);
            }, 240);
          } else {
            setIsDropping(true);
            setDragDeltaY(0);
            setTimeout(() => {
              isDraggingRef.current = false;
              dragSourceIdxRef.current = null;
              dragTargetIdxRef.current = null;
              setIsDropping(false);
              setDragSourceIdx(null);
              setDragTargetIdx(null);
              setDragDeltaY(0);
            }, 240);
          }
        }
      };

      window.addEventListener("touchmove", onGlobalMove, { passive: false });
      window.addEventListener("touchend", onGlobalEnd, { passive: false });
      window.addEventListener("touchcancel", onGlobalEnd, { passive: false });
    }, 180);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDraggingRef.current) {
      if (e.cancelable) e.preventDefault();
      return;
    }

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartXRef.current);
    const dy = Math.abs(touch.clientY - touchStartYRef.current);
    if (dx > 10 || dy > 10) {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current && touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
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

  const handleAddOrder = async (itemName: string, itemCode?: string, quantity?: string) => {
    if (!itemName.trim() || !user) return;
    const currentUserInitials = user.email?.split("@")[0].toUpperCase() || "UNKNOWN";
    const newOrder: LabOrder = {
      id: crypto.randomUUID(),
      itemName: itemName.trim(),
      itemCode: itemCode?.trim() || undefined,
      quantity: quantity?.trim() || "1",
      requestedBy: currentUserInitials,
      status: "REQUESTED",
      createdAt: new Date().toISOString()
    };
    const updated = [newOrder, ...orders];
    setOrders(updated);
    setNewItemName("");
    setNewItemCode("");
    setNewItemQuantity("1");
    setShowAddOrderModal(false);
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
    const cleaning = i === 0;
    const waste = N > 1 ? i === 1 : false;
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
    return `${format(monday)} ~ ${format(sunday)}`;
  };

  return (
    <div className="flex-1 p-3 sm:p-6 md:p-8 flex flex-col min-h-0 bg-zinc-50 dark:bg-zinc-950 overflow-y-auto custom-scrollbar">
      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="w-full flex-1 flex flex-col space-y-3 sm:space-y-4">
          {/* Mobile Segment Tab Bar (App-style) */}
          <div className="lg:hidden flex bg-zinc-100 dark:bg-zinc-800/90 p-1 rounded-xl gap-1 shrink-0 select-none shadow-xs">
            <button
              type="button"
              onClick={() => setActiveMobileTab("orders")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${
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
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                activeMobileTab === "cleaning"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-black scale-[1.01]"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>청소 당번</span>
            </button>
          </div>

          {/* Main 2-Column Content */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">

            {/* Left Column: Item Orders Status */}
            <div 
              key={`orders-card-${activeMobileTab}`}
              className={`bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 flex-col min-h-[420px] ${
                activeMobileTab === "orders" ? "flex" : "hidden lg:flex"
              }`}
            >
              
              <div className="flex justify-between items-center pb-2 sm:pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                  <span>{visibleOrders.length}건</span>
                </h3>
              
                <button
                  type="button"
                  onClick={() => setShowAddOrderModal(true)}
                  className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-sm shadow-blue-600/30 transition-all cursor-pointer active:scale-95 shrink-0"
                  title="물품 추가"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

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
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              <span className={`text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate ${
                                hasReceived ? "line-through text-zinc-400 dark:text-zinc-500" : ""
                              }`}>
                                {order.itemName}
                              </span>
                              {order.quantity && (
                                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 shrink-0 select-none">
                                  {order.quantity}{/^\d+$/.test(String(order.quantity).trim()) ? "개" : ""}
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5 mt-0.5 select-none flex-wrap">
                              {order.itemCode && (
                                <>
                                  <span className="font-mono text-[9px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300 font-bold border border-zinc-200/80 dark:border-zinc-700/80">
                                    {order.itemCode}
                                  </span>
                                  <span>•</span>
                                </>
                              )}
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
          <div 
            key={`cleaning-card-${activeMobileTab}-${assignments.length}`}
            className={`bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col ${
              activeMobileTab === "cleaning" ? "flex" : "hidden lg:flex"
            }`}
          >
            
            <div className="flex items-center pb-2.5 sm:pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                <span className="text-sm sm:text-base font-black text-zinc-900 dark:text-white tracking-tight">
                  {getWeeklyDateRangeString()}
                </span>
              </div>
            </div>

            {/* Weekly Duties 3-Column Table with Apple Real-Time Push Displacement Animation */}
            <div className="my-3 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xs bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md w-full">
              
              {/* Header */}
              <div className="grid grid-cols-[minmax(0,36%)_minmax(0,32%)_minmax(0,32%)] items-center py-2.5 px-3 bg-zinc-100/70 dark:bg-zinc-800/70 backdrop-blur-md text-zinc-500 dark:text-zinc-400 border-b border-zinc-200/80 dark:border-zinc-800/80 select-none text-xs font-black w-full">
                <div className="text-left pl-1 truncate">사용자</div>
                <div className="text-center flex items-center justify-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shrink-0" />
                  <span>청소</span>
                </div>
                <div className="text-center flex items-center justify-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-xs shrink-0" />
                  <span>폐기물</span>
                </div>
              </div>

              {/* Rows with Real-Time Push Animation */}
              <div className="relative divide-y divide-zinc-200/60 dark:divide-zinc-800/60 w-full">
                {assignments.map((row, idx) => {
                  let rotatedIdx = (idx - shift) % N;
                  if (rotatedIdx < 0) rotatedIdx += N;

                  const isDraggingRow = dragSourceIdx === idx;
                  const H = rowHeight || 50;
                  
                  // Calculate dynamic displacement offset (Apple-style push down/up)
                  let shiftY = 0;
                  if (dragSourceIdx !== null && dragTargetIdx !== null && !isDraggingRow) {
                    if (dragSourceIdx < dragTargetIdx) {
                      // Dragging downwards: items between source+1 and target shift UP
                      if (idx > dragSourceIdx && idx <= dragTargetIdx) {
                        shiftY = -H;
                      }
                    } else if (dragSourceIdx > dragTargetIdx) {
                      // Dragging upwards: items between target and source-1 shift DOWN
                      if (idx >= dragTargetIdx && idx < dragSourceIdx) {
                        shiftY = H;
                      }
                    }
                  }

                  return (
                    <div
                      key={row.member}
                      data-row-idx={idx}
                      draggable={true}
                      onDragStart={(e) => {
                        setDragSourceIdx(idx);
                        setDragTargetIdx(idx);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragTargetIdx !== idx) {
                          setDragTargetIdx(idx);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragSourceIdx !== null && dragTargetIdx !== null && dragSourceIdx !== dragTargetIdx) {
                          const src = dragSourceIdx;
                          const tgt = dragTargetIdx;
                          const finalDeltaY = (tgt - src) * H;
                          setIsDropping(true);
                          setDragDeltaY(finalDeltaY);
                          setTimeout(() => {
                            handleRowDrop(src, tgt);
                            setIsDropping(false);
                            setDragSourceIdx(null);
                            setDragTargetIdx(null);
                            setDragDeltaY(0);
                          }, 240);
                        } else {
                          setDragSourceIdx(null);
                          setDragTargetIdx(null);
                          setDragDeltaY(0);
                        }
                      }}
                      onDragEnd={() => {
                        if (!isDropping) {
                          setDragSourceIdx(null);
                          setDragTargetIdx(null);
                        }
                      }}
                      onTouchStart={(e) => handleTouchStart(idx, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      style={{
                        transform: isDraggingRow
                          ? `translateY(${dragDeltaY}px) scale(${isDropping ? 1.0 : 1.025})`
                          : shiftY !== 0
                          ? `translateY(${shiftY}px)`
                          : undefined,
                        zIndex: isDraggingRow ? 50 : 1,
                        transition: isDraggingRow
                          ? (isDropping ? "transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1), box-shadow 0.24s ease, background-color 0.24s ease" : "none")
                          : (dragSourceIdx !== null ? "transform 0.28s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.25s ease, background-color 0.2s ease" : undefined),
                      }}
                      className={`grid grid-cols-[minmax(0,36%)_minmax(0,32%)_minmax(0,32%)] items-center py-2 px-3 select-none w-full ${
                        isDraggingRow
                          ? "bg-white/95 dark:bg-zinc-800/95 backdrop-blur-2xl shadow-[0_14px_30px_rgba(0,0,0,0.12),0_0_0_1px_rgba(255,255,255,0.7)_inset] dark:shadow-[0_14px_30px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1)_inset] border border-blue-400/40 dark:border-blue-500/30 rounded-2xl cursor-grabbing ring-1 ring-black/5 dark:ring-white/5"
                          : "hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30"
                      }`}
                    >
                      {/* Column 1: Member Name */}
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          style={{ touchAction: "none" }}
                          className={`p-1.5 -m-1 cursor-grab active:cursor-grabbing rounded-lg transition-all ${
                            isDraggingRow
                              ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 scale-105"
                              : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60"
                          }`}
                          title="길게 눌러 이동"
                        >
                          <GripVertical className="w-3.5 h-3.5 shrink-0" />
                        </div>
                        <span className={`text-xs sm:text-sm font-extrabold tracking-tight truncate transition-colors ${
                          isDraggingRow ? "text-blue-600 dark:text-blue-300 font-black" : "text-zinc-800 dark:text-zinc-100"
                        }`}>
                          {row.member}
                        </span>
                      </div>

                      {/* Column 2: Cleaning (Pure Solid Color Block) */}
                      <div 
                        className="px-1 cursor-pointer flex items-center justify-center select-none"
                        onClick={() => handleToggleDuty(rotatedIdx, "cleaning")}
                      >
                        {row.cleaning ? (
                          <div 
                            className="w-full h-8 sm:h-9 rounded-xl bg-emerald-500 shadow-sm transition-transform active:scale-95"
                            title="청소 당번"
                          />
                        ) : (
                          <div 
                            className="w-full h-8 sm:h-9 rounded-xl bg-zinc-100/50 dark:bg-zinc-800/50 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-all border border-transparent hover:border-zinc-200/60 dark:hover:border-zinc-700/60"
                            title="청소 미지정"
                          />
                        )}
                      </div>

                      {/* Column 3: Waste (Pure Solid Color Block) */}
                      <div 
                        className="px-1 cursor-pointer flex items-center justify-center select-none"
                        onClick={() => handleToggleDuty(rotatedIdx, "waste")}
                      >
                        {row.waste ? (
                          <div 
                            className="w-full h-8 sm:h-9 rounded-xl bg-blue-500 shadow-sm transition-transform active:scale-95"
                            title="폐기물 당번"
                          />
                        ) : (
                          <div 
                            className="w-full h-8 sm:h-9 rounded-xl bg-zinc-100/50 dark:bg-zinc-800/50 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-all border border-transparent hover:border-zinc-200/60 dark:hover:border-zinc-700/60"
                            title="폐기물 미지정"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Bottom '+' Button Row */}
                <div
                  onClick={() => setShowAddModal(true)}
                  className="py-3 px-3 flex items-center justify-center gap-1.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-950/20 active:bg-blue-100/40 transition-all group select-none border-t border-dashed border-zinc-200/80 dark:border-zinc-800/80 w-full"
                >
                  <div className="w-5 h-5 rounded-lg bg-zinc-100/80 dark:bg-zinc-800/80 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all shadow-2xs border border-zinc-200/60 dark:border-zinc-700/60">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <span>당번 인원 추가 / 제외 설정</span>
                </div>
              </div>
            </div>

            {/* Caption */}
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold flex items-center shrink-0 pt-2 border-t border-zinc-100 dark:border-zinc-800 select-none">
              <span>※ 길게 눌러 순서를 이동하고, 표 하단 [+]에서 인원을 설정합니다.</span>
            </div>

          </div>

        </div>
        </div>
      )}

      {/* Member Management Grid Modal (3 Columns, No Initial Box, Spacious Ratio) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[300] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-[95%] sm:w-full max-w-[500px] rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 border border-zinc-200 dark:border-zinc-800">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base text-zinc-900 dark:text-white">
                    당번 인원 관리
                  </h4>
                  <p className="text-[10px] text-zinc-400">
                    클릭하여 당번 포함/제외를 설정합니다
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Member Grid List (3-Column Layout without initial box, spacious padding) */}
            <div className="max-h-72 overflow-y-auto custom-scrollbar py-1">
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {members.map((m) => {
                  const isSelected = baseAssignments.some((ba) => ba.member === m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleToggleMember(m)}
                      className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl border text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 select-none ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/30 font-black"
                          : "bg-zinc-50 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span className="truncate">{m}</span>
                      {isSelected && (
                        <span className="shrink-0 text-xs font-black">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400">
                현재 당번: <strong className="text-blue-600 dark:text-blue-400">{baseAssignments.length}</strong>명
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white rounded-xl font-black text-xs transition-all cursor-pointer shadow-xs active:scale-95"
              >
                완료
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Lab Order Request Modal */}
      {showAddOrderModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[300] flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddOrderModal(false);
              setNewItemName("");
              setNewItemCode("");
              setNewItemQuantity("1");
            }
          }}
        >
          <div className="bg-white dark:bg-zinc-900 w-[95%] sm:w-full max-w-[440px] rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 border border-zinc-200 dark:border-zinc-800">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/30">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base text-zinc-900 dark:text-white">
                    물품 주문 요청
                  </h4>
                  <p className="text-[10px] text-zinc-400">
                    연구실에서 필요한 물품 정보를 입력해주세요
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddOrderModal(false);
                  setNewItemName("");
                  setNewItemCode("");
                  setNewItemQuantity("1");
                }}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddOrder(newItemName, newItemCode, newItemQuantity);
              }}
              className="space-y-3.5"
            >
              {/* 이름 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                  이름 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="물품 이름을 입력하세요"
                  className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-zinc-900 dark:text-white transition-all"
                  autoFocus
                />
              </div>

              {/* 물품코드 & 수량 (2-Column Grid) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                    물품코드
                  </label>
                  <input
                    type="text"
                    value={newItemCode}
                    onChange={(e) => setNewItemCode(e.target.value)}
                    placeholder="코드 또는 품번 (선택)"
                    className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-zinc-900 dark:text-white transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                    수량 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(e.target.value)}
                    placeholder="예: 1, 2박스"
                    className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-zinc-900 dark:text-white transition-all"
                  />
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddOrderModal(false);
                    setNewItemName("");
                    setNewItemCode("");
                    setNewItemQuantity("1");
                  }}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs transition-all cursor-pointer shadow-sm shadow-blue-600/30 active:scale-95"
                >
                  추가
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
