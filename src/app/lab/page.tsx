"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { 
  FlaskConical, 
  Settings, 
  Calendar, 
  Trash2, 
  Check, 
  User, 
  RefreshCw,
  Sparkles,
  HelpCircle,
  Plus,
  GripVertical,
  X,
  ShoppingCart,
  Truck
} from "lucide-react";

// Maintain UI consistency
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

const DAYS = ["월", "화", "수", "목", "금"];
const SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", 
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", 
  "18:00", "18:30", "19:00"
];

interface Reservation {
  equipment: string; // "A" or "B"
  day: string; // "월", "화", ...
  slot: string; // "09:00", ...
  user: string; // "BJ", ...
}

interface CleaningAssignment {
  member: string;
  cleaning: boolean;
  waste: boolean;
}

interface CleaningState {
  assignments: CleaningAssignment[];
  baseWeek: number;
}

interface LabOrder {
  id: string;
  itemName: string;
  requestedBy: string;
  status: "REQUESTED" | "ORDERED" | "RECEIVED";
  createdAt: string;
  orderedAt?: string;
  orderedBy?: string;
  receivedAt?: string;
  receivedBy?: string;
}

export default function LabPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<string[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [cleaningState, setCleaningState] = useState<CleaningState | null>(null);
  const [draggedRowIdx, setDraggedRowIdx] = useState<number | null>(null);
  const [showAddSelect, setShowAddSelect] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Mobile day tab and reservation modal states
  const getTodayDayString = () => {
    const day = new Date().getDay();
    if (day === 0 || day === 6) return "월";
    return DAYS[day - 1];
  };
  const [selectedDayTab, setSelectedDayTab] = useState<string>(getTodayDayString());
  const [mobileResModalOpen, setMobileResModalOpen] = useState(false);
  const [mobileResTarget, setMobileResTarget] = useState<{ equipment: string, day: string, slot: string } | null>(null);
  const [mobileResDuration, setMobileResDuration] = useState<number>(1);
  
  // Orders states
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [orderDbId, setOrderDbId] = useState<string | null>(null);
  const [showAddOrderInput, setShowAddOrderInput] = useState(false);
  const [newItemName, setNewItemName] = useState("");

  // Drag states
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [activeDrag, setActiveDrag] = useState<{ equipment: string; day: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Database record references
  const [resDbId, setResDbId] = useState<string | null>(null);
  const [cleanDbId, setCleanDbId] = useState<string | null>(null);

  // 1. Fetch Registered Team Members from allowed_users
  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("allowed_users")
        .select("username")
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (data) {
        setMembers(data.map((d: any) => d.username.toUpperCase()));
      }
    } catch (err) {
      console.error("Error fetching members:", err);
    }
  };

  // 2. Fetch Reservations and Cleaning duties from notices table shadow rows
  const fetchLabData = async () => {
    setLoading(true);
    try {
      // Fetch reservations
      const { data: resData, error: resError } = await supabase
        .from("notices")
        .select("*")
        .eq("title", "__LAB_RESERVATIONS__")
        .limit(1);
      
      if (resError) throw resError;
      
      if (resData && resData.length > 0) {
        setResDbId(resData[0].id);
        setReservations(JSON.parse(resData[0].content) as Reservation[]);
      } else {
        setReservations([]);
      }

      // Fetch cleaning duties
      const { data: cleanData, error: cleanError } = await supabase
        .from("notices")
        .select("*")
        .eq("title", "__LAB_CLEANING__")
        .limit(1);
      
      if (cleanError) throw cleanError;

      if (cleanData && cleanData.length > 0) {
        setCleanDbId(cleanData[0].id);
        const parsed = JSON.parse(cleanData[0].content);
        if (parsed.assignments) {
          const sanitized = (parsed.assignments as any[]).map((item: any) => ({
            member: item.member,
            cleaning: typeof item.cleaning === "boolean" ? item.cleaning : (item.cleaning !== "면제" && !!item.cleaning),
            waste: typeof item.waste === "boolean" ? item.waste : (item.waste !== "면제" && !!item.waste)
          }));
          setCleaningState({
            baseWeek: parsed.baseWeek || 0,
            assignments: sanitized
          });
        } else if (parsed.baseSequence) {
          // Backward compatibility adapter
          const baseSeq = parsed.baseSequence as string[];
          const N = baseSeq.length;
          const convertedAssignments = baseSeq.map((member, i) => {
            // First 3 clean, middle shifted by N/2 waste
            const cleaning = i < Math.min(3, N);
            const s = Math.max(1, Math.floor(N / 2));
            const wasteIdx = (i - s + N) % N;
            const waste = wasteIdx < Math.min(2, N);
            return { member, cleaning, waste };
          });
          setCleaningState({
            baseWeek: parsed.baseWeek || 0,
            assignments: convertedAssignments
          });
        }
      } else {
        setCleaningState(null);
      }

      // Fetch lab orders
      const { data: orderData, error: orderError } = await supabase
        .from("notices")
        .select("*")
        .eq("title", "__LAB_ORDERS__")
        .limit(1);
      
      if (orderError) throw orderError;

      if (orderData && orderData.length > 0) {
        setOrderDbId(orderData[0].id);
        setOrders(JSON.parse(orderData[0].content) as LabOrder[]);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Error fetching lab workspace data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchLabData();
  }, []);

  const saveReservationsState = async (updated: Reservation[]) => {
    try {
      if (resDbId) {
        await supabase
          .from("notices")
          .update({ content: JSON.stringify(updated) })
          .eq("id", resDbId);
      } else {
        const { data } = await supabase
          .from("notices")
          .insert([{
            title: "__LAB_RESERVATIONS__",
            content: JSON.stringify(updated),
            created_by: "SYSTEM"
          }])
          .select();
        if (data && data.length > 0) setResDbId(data[0].id);
      }
    } catch (err) {
      console.error("Error saving reservations:", err);
    }
  };

  const commitDurationReservation = async (equipment: string, day: string, startSlot: string, durationSlots: number) => {
    const startIdx = SLOTS.indexOf(startSlot);
    const rangeSlots = SLOTS.slice(startIdx, startIdx + durationSlots);
    const currentUserInitials = user?.email?.split("@")[0].toUpperCase() || "UNKNOWN";

    const isBlocked = rangeSlots.some(slot => {
      const res = reservations.find(r => r.equipment === equipment && r.day === day && r.slot === slot);
      return res && res.user !== currentUserInitials;
    });

    if (isBlocked) {
      alert("다른 사용자의 예약과 겹치는 구간이 있어 예약할 수 없습니다.");
      return;
    }

    const existingSlots = reservations
      .filter(r => r.equipment === equipment && r.day === day && r.user === currentUserInitials && !rangeSlots.includes(r.slot))
      .map(r => r.slot);
    
    const mergedSlots = Array.from(new Set([...existingSlots, ...rangeSlots]));
    const mergedIndices = mergedSlots.map(slot => SLOTS.indexOf(slot)).sort((a, b) => a - b);

    let maxStreak = 0;
    let currentStreak = 0;
    let lastIdx = -999;
    for (const idx of mergedIndices) {
      if (idx === lastIdx + 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      maxStreak = Math.max(maxStreak, currentStreak);
      lastIdx = idx;
    }

    if (maxStreak > 4) {
      alert("예약은 최대 연속 2시간(4칸)까지만 가능합니다.");
      return;
    }

    let updated = [...reservations];
    rangeSlots.forEach((slot) => {
      updated = updated.filter(r => !(
        r.equipment === equipment && 
        r.day === day && 
        r.slot === slot
      ));
      updated.push({
        equipment,
        day,
        slot,
        user: currentUserInitials
      });
    });

    setReservations(updated);
    await saveReservationsState(updated);
    setMobileResModalOpen(false);
  };

  // Global mouseup listener for cell drag selection
  useEffect(() => {
    const handleGlobalMouseUp = async () => {
      if (isDragging && activeDrag && dragStart !== null && dragEnd !== null) {
        setIsDragging(false);
        const currentUserInitials = user?.email?.split("@")[0].toUpperCase() || "UNKNOWN";

        if (dragStart === dragEnd) {
          // Tap/Click on a single slot
          const slot = SLOTS[dragStart];
          const existingRes = reservations.find(r => r.equipment === activeDrag.equipment && r.day === activeDrag.day && r.slot === slot);
          if (existingRes) {
            if (existingRes.user === currentUserInitials) {
              if (window.confirm("이 예약을 취소하시겠습니까?")) {
                const updated = reservations.filter(r => !(
                  r.equipment === activeDrag.equipment &&
                  r.day === activeDrag.day &&
                  r.slot === slot
                ));
                setReservations(updated);
                await saveReservationsState(updated);
              }
            }
          } else {
            // Open Duration select modal
            setMobileResTarget({ equipment: activeDrag.equipment, day: activeDrag.day, slot });
            setMobileResDuration(1);
            setMobileResModalOpen(true);
          }
        } else {
          // Drag-select a range
          const minIdx = Math.min(dragStart, dragEnd);
          const maxIdx = Math.max(dragStart, dragEnd);
          const rangeSlots = SLOTS.slice(minIdx, maxIdx + 1);

          const myReservationsInRange = rangeSlots.filter(slot => {
            const res = reservations.find(r => r.equipment === activeDrag.equipment && r.day === activeDrag.day && r.slot === slot);
            return res && res.user === currentUserInitials;
          });

          const othersReservationsInRange = rangeSlots.filter(slot => {
            const res = reservations.find(r => r.equipment === activeDrag.equipment && r.day === activeDrag.day && r.slot === slot);
            return res && res.user !== currentUserInitials;
          });

          let updated = [...reservations];

          if (myReservationsInRange.length === rangeSlots.length) {
            updated = updated.filter(r => !(
              r.equipment === activeDrag.equipment && 
              r.day === activeDrag.day && 
              rangeSlots.includes(r.slot)
            ));
          } else {
            const existingSlots = reservations
              .filter(r => r.equipment === activeDrag.equipment && r.day === activeDrag.day && r.user === currentUserInitials)
              .map(r => r.slot);
            
            const mergedSlots = Array.from(new Set([...existingSlots, ...rangeSlots]));
            const mergedIndices = mergedSlots.map(slot => SLOTS.indexOf(slot)).sort((a, b) => a - b);

            let maxStreak = 0;
            let currentStreak = 0;
            let lastIdx = -999;
            for (const idx of mergedIndices) {
              if (idx === lastIdx + 1) {
                currentStreak++;
              } else {
                currentStreak = 1;
              }
              maxStreak = Math.max(maxStreak, currentStreak);
              lastIdx = idx;
            }

            if (maxStreak > 4) {
              alert("예약은 최대 연속 2시간(4칸)까지만 가능합니다.");
              setActiveDrag(null);
              setDragStart(null);
              setDragEnd(null);
              return;
            }

            rangeSlots.forEach((slot) => {
              const isReservedByOther = othersReservationsInRange.includes(slot);
              if (!isReservedByOther) {
                updated = updated.filter(r => !(
                  r.equipment === activeDrag.equipment && 
                  r.day === activeDrag.day && 
                  r.slot === slot
                ));
                updated.push({
                  equipment: activeDrag.equipment,
                  day: activeDrag.day,
                  slot,
                  user: currentUserInitials
                });
              }
            });
          }

          setReservations(updated);
          await saveReservationsState(updated);
        }
      }
      setIsDragging(false);
      setActiveDrag(null);
      setDragStart(null);
      setDragEnd(null);
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, activeDrag, dragStart, dragEnd, reservations, resDbId, user]);

  // Drag mouse event handlers
  const handleCellMouseDown = (equipment: string, day: string, slot: string) => {
    setIsDragging(true);
    const idx = SLOTS.indexOf(slot);
    setDragStart(idx);
    setDragEnd(idx);
    setActiveDrag({ equipment, day });
  };

  const handleCellMouseEnter = (equipment: string, day: string, slot: string) => {
    if (!isDragging || !activeDrag) return;
    if (activeDrag.equipment !== equipment || activeDrag.day !== day) return;
    const idx = SLOTS.indexOf(slot);
    setDragEnd(idx);
  };

  // Reference Monday: Monday, Jan 5, 2026
  const getWeekOffset = () => {
    const referenceDate = new Date("2026-01-05");
    const currentDate = new Date();
    const diff = currentDate.getTime() - referenceDate.getTime();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.floor(diff / oneWeek);
  };



  // 4. Weekly Cleaning & Waste Duty Handlers (Live Editing & Rearranging)
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
      console.error("Error saving cleaning rota:", err);
    }
  };

  const handleToggleDuty = async (rotatedIdx: number, field: "cleaning" | "waste") => {
    const newBase = [...baseAssignments];
    newBase[rotatedIdx] = {
      ...newBase[rotatedIdx],
      [field]: !newBase[rotatedIdx][field]
    };
    
    const currentWeek = getWeekOffset();
    const newState = {
      assignments: newBase,
      baseWeek: currentWeek
    };
    
    setCleaningState(newState);
    await saveCleaningState(newState);
  };

  const handleRemoveUser = async (rotatedIdx: number) => {
    const newBase = baseAssignments.filter((_, idx) => idx !== rotatedIdx);
    const currentWeek = getWeekOffset();
    const newState = {
      assignments: newBase,
      baseWeek: currentWeek
    };
    
    setCleaningState(newState);
    await saveCleaningState(newState);
  };

  const handleAddUser = async (member: string) => {
    if (!member) return;
    if (baseAssignments.some(item => item.member === member)) return;
    
    const newBase = [
      ...baseAssignments,
      { member, cleaning: false, waste: false }
    ];
    
    const currentWeek = getWeekOffset();
    const newState = {
      assignments: newBase,
      baseWeek: currentWeek
    };
    
    setCleaningState(newState);
    setShowAddSelect(false);
    await saveCleaningState(newState);
  };

  const handleRowDrop = async (srcIdx: number, destIdx: number) => {
    const newBase = [...baseAssignments];
    const draggedItem = newBase[srcIdx];
    newBase.splice(srcIdx, 1);
    newBase.splice(destIdx, 0, draggedItem);
    
    const currentWeek = getWeekOffset();
    const newState = {
      assignments: newBase,
      baseWeek: currentWeek
    };
    
    setCleaningState(newState);
    await saveCleaningState(newState);
  };

  // 5. Item Order Handlers (Live Sync)
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
      console.error("Error saving orders:", err);
    }
  };

  const handleAddOrder = async (itemName: string) => {
    if (!itemName.trim()) return;
    const currentUserInitials = user?.email?.split("@")[0].toUpperCase() || "UNKNOWN";
    
    const newOrder: LabOrder = {
      id: Math.random().toString(36).substring(2, 9),
      itemName: itemName.trim(),
      requestedBy: currentUserInitials,
      status: "REQUESTED",
      createdAt: new Date().toISOString()
    };
    
    const updated = [...orders, newOrder];
    setOrders(updated);
    setNewItemName("");
    setShowAddOrderInput(false);
    await saveOrdersState(updated);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: "ORDERED" | "RECEIVED") => {
    const currentUserInitials = user?.email?.split("@")[0].toUpperCase() || "UNKNOWN";
    
    const updated = orders.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          status: newStatus,
          orderedAt: newStatus === "ORDERED" ? new Date().toISOString() : order.orderedAt,
          orderedBy: newStatus === "ORDERED" ? currentUserInitials : order.orderedBy,
          receivedAt: newStatus === "RECEIVED" ? new Date().toISOString() : order.receivedAt,
          receivedBy: newStatus === "RECEIVED" ? currentUserInitials : order.receivedBy
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

  const currentWeek = getWeekOffset();
  const baseWeek = cleaningState?.baseWeek !== undefined ? cleaningState.baseWeek : currentWeek;
  const shift = currentWeek - baseWeek;
  
  // Resolve base assignments
  const baseAssignments = cleaningState?.assignments && cleaningState.assignments.length > 0
    ? cleaningState.assignments
    : members.map((member, i) => {
        const total = members.length;
        // Default: first 3 members clean, middle shifted by total/2 get waste
        const cleaning = i < Math.min(3, total);
        const s = Math.max(1, Math.floor(total / 2));
        const wasteIdx = (i - s + total) % total;
        const waste = wasteIdx < Math.min(2, total);
        
        return { member, cleaning, waste };
      });

  const N = baseAssignments.length;

  const assignments = baseAssignments.map((item, i) => {
    if (N === 0) return { member: item.member, cleaning: false, waste: false };
    
    let rotatedIdx = (i - shift) % N;
    if (rotatedIdx < 0) rotatedIdx += N;
    
    const sourceItem = baseAssignments[rotatedIdx];
    return {
      member: item.member,
      cleaning: sourceItem.cleaning,
      waste: sourceItem.waste
    };
  });

  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const visibleOrders = orders.filter(order => {
    if (order.status !== "RECEIVED") return true;
    if (!order.receivedAt) return true;
    return new Date(order.receivedAt).getTime() >= threeDaysAgo;
  });
  // Find helper to search reservation state
  const getReservedUser = (equipment: string, day: string, slot: string) => {
    return reservations.find(r => r.equipment === equipment && r.day === day && r.slot === slot)?.user || "";
  };

  // Get weekly date range string: (MM.DD ~ MM.DD)
  const getWeeklyDateRangeString = () => {
    const today = new Date();
    const day = today.getDay();
    const daysToMonday = day === 0 ? 6 : day - 1;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const format = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`;
    return `(${format(monday)} ~ ${format(sunday)})`;
  };

  return (
    <div className="flex-1 p-6 md:p-10 bg-surface dark:bg-slate-900 flex flex-col min-h-0">

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-primary dark:text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 flex flex-col min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          
          {/* Mobile Day Selector Tabs */}
          <div className="flex md:hidden items-center justify-center gap-1.5 p-1 bg-white dark:bg-slate-800 rounded-2xl border border-black/[0.03] dark:border-white/[0.03] shadow-sm select-none shrink-0">
            {DAYS.map((day) => {
              const isActive = selectedDayTab === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDayTab(day)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    isActive 
                      ? "bg-primary text-white dark:bg-blue-600 shadow-sm"
                      : "text-on-surface-variant/60 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {day}요일
                </button>
              );
            })}
          </div>

          {/* Top Section: Two Reservation Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Table 1: Equipment A */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 shadow-md border border-black/[0.02] dark:border-white/[0.02] flex flex-col h-full">
              <div className="pb-3 border-b border-black/[0.02] dark:border-white/[0.02] shrink-0">
                <h3 className="text-base font-black text-primary dark:text-white flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-emerald-500 animate-pulse" />
                  <span>왼쪽 벤치</span>
                </h3>
              </div>

              {/* Scroll-free Scheduler */}
              <div className="mt-4 border border-black/[0.03] dark:border-white/[0.03] rounded-2xl">
                <table className="w-full table-fixed text-center border-collapse text-[11px] font-semibold">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700 text-on-surface-variant dark:text-gray-300 border-b border-black/[0.02] dark:border-white/[0.02] z-10">
                    <tr>
                      <th className="py-2 px-3 font-black bg-slate-100 dark:bg-slate-800/80 w-16">시간</th>
                      {DAYS.map(day => {
                        const isTabActive = day === selectedDayTab;
                        return (
                          <th 
                            key={day} 
                            className={`py-2 font-black ${
                              isTabActive 
                                ? "table-cell w-full md:w-[17.6%]" 
                                : "hidden md:table-cell md:w-[17.6%]"
                            }`}
                          >
                            {day}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                    {SLOTS.map((slot) => (
                      <tr key={slot} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all">
                        <td className="py-1.5 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] font-black border-r border-black/[0.01] dark:border-white/[0.01] sticky left-0 z-0 select-none">
                          {slot}
                        </td>
                        {DAYS.map((day) => {
                          const userRes = getReservedUser("A", day, slot);
                          const color = userRes ? getColorForUser(userRes) : null;
                          const isSelectedInDrag = (() => {
                            if (!isDragging || !activeDrag) return false;
                            if (activeDrag.equipment !== "A" || activeDrag.day !== day) return false;
                            if (dragStart === null || dragEnd === null) return false;
                            const idx = SLOTS.indexOf(slot);
                            const min = Math.min(dragStart, dragEnd);
                            const max = Math.max(dragStart, dragEnd);
                            return idx >= min && idx <= max;
                          })();

                          const isTabActive = day === selectedDayTab;

                          return (
                            <td 
                              key={day}
                              onMouseDown={() => handleCellMouseDown("A", day, slot)}
                              onMouseEnter={() => handleCellMouseEnter("A", day, slot)}
                              className={`py-1.5 px-0.5 border-r border-black/[0.01] dark:border-white/[0.01] cursor-pointer transition-all select-none ${
                                isTabActive ? "table-cell" : "hidden md:table-cell"
                              } ${
                                userRes 
                                  ? `${color?.bg} ${color?.text} hover:opacity-90` 
                                  : isSelectedInDrag
                                  ? "bg-blue-100/60 dark:bg-blue-900/30 ring-1 ring-blue-400"
                                  : "hover:bg-primary/5 text-transparent hover:text-primary/30"
                              }`}
                            >
                              <div className="py-0.5 rounded-lg flex items-center justify-center font-bold text-[10px]">
                                {userRes ? userRes : "+"}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Equipment B */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 shadow-md border border-black/[0.02] dark:border-white/[0.02] flex flex-col h-full">
              <div className="pb-3 border-b border-black/[0.02] dark:border-white/[0.02] shrink-0">
                <h3 className="text-base font-black text-primary dark:text-white flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-blue-500 animate-pulse" />
                  <span>오른쪽 벤치</span>
                </h3>
              </div>

              {/* Scroll-free Scheduler */}
              <div className="mt-4 border border-black/[0.03] dark:border-white/[0.03] rounded-2xl">
                <table className="w-full table-fixed text-center border-collapse text-[11px] font-semibold">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700 text-on-surface-variant dark:text-gray-300 border-b border-black/[0.02] dark:border-white/[0.02] z-10">
                    <tr>
                      <th className="py-2 px-3 font-black bg-slate-100 dark:bg-slate-800/80 w-16">시간</th>
                      {DAYS.map(day => {
                        const isTabActive = day === selectedDayTab;
                        return (
                          <th 
                            key={day} 
                            className={`py-2 font-black ${
                              isTabActive 
                                ? "table-cell w-full md:w-[17.6%]" 
                                : "hidden md:table-cell md:w-[17.6%]"
                            }`}
                          >
                            {day}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                    {SLOTS.map((slot) => (
                      <tr key={slot} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all">
                        <td className="py-1.5 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] font-black border-r border-black/[0.01] dark:border-white/[0.01] sticky left-0 z-0 select-none">
                          {slot}
                        </td>
                        {DAYS.map((day) => {
                          const userRes = getReservedUser("B", day, slot);
                          const color = userRes ? getColorForUser(userRes) : null;
                          const isSelectedInDrag = (() => {
                            if (!isDragging || !activeDrag) return false;
                            if (activeDrag.equipment !== "B" || activeDrag.day !== day) return false;
                            if (dragStart === null || dragEnd === null) return false;
                            const idx = SLOTS.indexOf(slot);
                            const min = Math.min(dragStart, dragEnd);
                            const max = Math.max(dragStart, dragEnd);
                            return idx >= min && idx <= max;
                          })();

                          const isTabActive = day === selectedDayTab;

                          return (
                            <td 
                              key={day}
                              onMouseDown={() => handleCellMouseDown("B", day, slot)}
                              onMouseEnter={() => handleCellMouseEnter("B", day, slot)}
                              className={`py-1.5 px-0.5 border-r border-black/[0.01] dark:border-white/[0.01] cursor-pointer transition-all select-none ${
                                isTabActive ? "table-cell" : "hidden md:table-cell"
                              } ${
                                userRes 
                                  ? `${color?.bg} ${color?.text} hover:opacity-90` 
                                  : isSelectedInDrag
                                  ? "bg-blue-100/60 dark:bg-blue-900/30 ring-1 ring-blue-400"
                                  : "hover:bg-primary/5 text-transparent hover:text-primary/30"
                              }`}
                            >
                              <div className="py-0.5 rounded-lg flex items-center justify-center font-bold text-[10px]">
                                {userRes ? userRes : "+"}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Bottom Section: Left Orders, Right Cleaning Duty */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">

            {/* Left Column: Item Orders Status */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 shadow-md border border-black/[0.02] dark:border-white/[0.02] min-h-[340px] h-full flex flex-col justify-between overflow-hidden">
              
              <div className="flex justify-between items-center pb-2 border-b border-black/[0.02] dark:border-white/[0.02] shrink-0">
                <h3 className="text-sm font-black text-primary dark:text-white flex items-center gap-2">
                  <ShoppingCart className="w-4.5 h-4.5 text-blue-500" />
                  <span>연구실 물품 주문 현황</span>
                </h3>
                
                <button
                  onClick={() => setShowAddOrderInput(!showAddOrderInput)}
                  className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold shadow-sm transition-all cursor-pointer"
                  title="물품 추가"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Inline Addition Input Form */}
              {showAddOrderInput && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddOrder(newItemName);
                  }}
                  className="flex gap-1.5 p-2 mt-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-black/[0.01] dark:border-white/[0.01] shrink-0 animate-fade-in"
                >
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="주문할 물품명을 입력하세요..."
                    className="flex-1 bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-foreground outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-[10px] font-black cursor-pointer shadow-sm transition-all"
                  >
                    추가
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddOrderInput(false);
                      setNewItemName("");
                    }}
                    className="px-2.5 py-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-750 dark:hover:bg-slate-600 text-foreground dark:text-gray-200 rounded-xl text-[10px] font-black cursor-pointer transition-all"
                  >
                    취소
                  </button>
                </form>
              )}

              {/* Orders List Container */}
              <div className="flex-1 overflow-y-auto my-3 space-y-2 pr-1 custom-scrollbar min-h-[160px]">
                {visibleOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-on-surface-variant/30 dark:text-gray-600 select-none py-10">
                    <ShoppingCart className="w-8 h-8 mx-auto opacity-30 mb-2" />
                    <p className="text-xs font-black uppercase tracking-widest">주문 내역 없음</p>
                    <p className="text-[9px] font-medium opacity-60 mt-1">우측 상단 + 버튼으로 새 주문을 등록하세요.</p>
                  </div>
                ) : (
                  visibleOrders.map((order) => {
                    const hasRequested = order.status === "REQUESTED";
                    const hasOrdered = order.status === "ORDERED";
                    const hasReceived = order.status === "RECEIVED";
                    const color = getColorForUser(order.requestedBy);

                    const statusClass = hasRequested
                      ? "bg-amber-50/30 border-amber-200/40 dark:bg-amber-950/10 dark:border-amber-900/20"
                      : hasOrdered
                      ? "bg-blue-50/30 border-blue-200/40 dark:bg-blue-950/10 dark:border-blue-900/20"
                      : "bg-slate-100/30 border-slate-200/10 dark:bg-slate-900/20 dark:border-slate-800/10 opacity-30";

                    return (
                      <div 
                        key={order.id} 
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all group ${statusClass}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center font-headline font-black text-[8px] border ${color.badge} shrink-0`}>
                            {order.requestedBy}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-[10px] font-bold text-foreground dark:text-gray-200 truncate ${
                              hasReceived ? "line-through text-on-surface-variant/40" : ""
                            }`}>
                              {order.itemName}
                            </span>
                            <span className="text-[8px] text-on-surface-variant/50 dark:text-gray-400 font-semibold flex items-center gap-1 mt-0.5 select-none">
                              <span>요청: {order.requestedBy}</span>
                              {order.orderedBy && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-600 dark:text-amber-400">주문: {order.orderedBy}</span>
                                </>
                              )}
                              {order.receivedBy && (
                                <>
                                  <span>•</span>
                                  <span className="text-blue-600 dark:text-blue-400">수령: {order.receivedBy}</span>
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
                            className={`p-1.5 rounded-lg transition-all flex items-center justify-center border ${
                              hasRequested
                                ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-900/30 cursor-pointer"
                                : "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/20 opacity-50 cursor-not-allowed"
                            }`}
                            title={hasRequested ? "물품 주문하기" : "주문 완료"}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>

                          {/* Step 2: Truck (Receive) Button */}
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(order.id, "RECEIVED")}
                            disabled={!hasOrdered}
                            className={`p-1.5 rounded-lg transition-all flex items-center justify-center border ${
                              hasOrdered
                                ? "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-900/30 cursor-pointer animate-pulse"
                                : hasReceived
                                ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed"
                                : "bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-700 opacity-20 cursor-not-allowed"
                            }`}
                            title={hasOrdered ? "수령 완료 처리" : hasReceived ? "수령 완료됨" : "수령 준비 대기"}
                          >
                            <Truck className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete (X) Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order.id)}
                            className="text-on-surface-variant/40 dark:text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-all p-0.5 shrink-0 cursor-pointer"
                            title="제거"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Caption */}
              <div className="text-[9px] text-on-surface-variant/50 dark:text-gray-500 font-bold flex items-center justify-between shrink-0 pt-2 border-t border-black/5 dark:border-white/5 select-none">
                <span>※ 수령 완료 물품은 3일 후 자동 제거됩니다.</span>
              </div>

            </div>

            {/* Right Column: Cleaning & Waste Duties Table */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 shadow-md border border-black/[0.02] dark:border-white/[0.02] min-h-[340px] h-full flex flex-col justify-between overflow-hidden">
              
              <div className="flex justify-between items-center pb-2 border-b border-black/[0.02] dark:border-white/[0.02] shrink-0">
                <h3 className="text-sm font-black text-primary dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-amber-500" />
                  <span>연구실 주간 청소 {getWeeklyDateRangeString()}</span>
                </h3>
                
                <div className="flex items-center gap-1.5 relative">
                  {showAddSelect && (
                    <select
                      className="bg-white dark:bg-slate-700 border border-black/15 dark:border-white/15 rounded-lg px-2 py-1 text-[10px] outline-none font-bold text-foreground w-[120px] cursor-pointer absolute right-8 top-0 z-20 animate-fade-in shadow-lg"
                      defaultValue=""
                      onChange={(e) => handleAddUser(e.target.value)}
                      onBlur={() => setTimeout(() => setShowAddSelect(false), 200)}
                    >
                      <option value="" disabled>멤버 추가...</option>
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
                    className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold shadow-sm transition-all cursor-pointer"
                    title="사용자 추가"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Weekly Duties 3-Column Table with Drag Sorting */}
              <div className="my-3 border border-black/[0.03] dark:border-white/[0.03] rounded-2xl">
                <table className="w-full text-center border-collapse text-[11px] font-semibold table-fixed">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700 text-on-surface-variant dark:text-gray-300 border-b border-black/[0.02] dark:border-white/[0.02] z-10 select-none">
                    <tr>
                      <th className="py-2.5 font-black w-[34%] bg-slate-50 dark:bg-slate-700">사용자</th>
                      <th className="py-2.5 font-black w-[33%] bg-slate-50 dark:bg-slate-700">청소</th>
                      <th className="py-2.5 font-black w-[33%] bg-slate-50 dark:bg-slate-700">폐기물</th>
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
                          <td className="py-2 border-r border-black/[0.01] dark:border-white/[0.01]">
                            <div className="flex items-center justify-between gap-1.5 px-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {/* Desktop: Drag Grip */}
                                <GripVertical className="hidden md:block w-3.5 h-3.5 text-on-surface-variant/30 shrink-0 cursor-grab active:cursor-grabbing" />
                                
                                {/* Mobile: Move Buttons */}
                                <div className="flex md:hidden items-center gap-0.5 shrink-0 select-none">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleRowDrop(idx, idx - 1)}
                                    className={`p-0.5 rounded text-[8px] font-black hover:bg-slate-100 dark:hover:bg-slate-700 ${
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
                                    className={`p-0.5 rounded text-[8px] font-black hover:bg-slate-100 dark:hover:bg-slate-700 ${
                                      idx === assignments.length - 1 ? "opacity-20 cursor-not-allowed" : "text-primary dark:text-blue-400 cursor-pointer"
                                    }`}
                                    title="아래로 이동"
                                  >
                                    ▼
                                  </button>
                                </div>

                                <span className="text-[10px] text-foreground dark:text-white font-bold truncate">
                                  {row.member}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveUser(rotatedIdx)}
                                className="text-on-surface-variant/40 dark:text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-all p-0.5 shrink-0 cursor-pointer"
                                title="제거"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td 
                            className={`py-2 border-r border-black/[0.01] dark:border-white/[0.01] px-1 cursor-pointer select-none transition-all ${
                              row.cleaning 
                                ? "bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500" 
                                : "hover:bg-slate-50 dark:hover:bg-slate-700/20"
                            }`}
                            onClick={() => handleToggleDuty(rotatedIdx, "cleaning")}
                          />
                          <td 
                            className={`py-2 px-1 cursor-pointer select-none transition-all ${
                              row.waste 
                                ? "bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500" 
                                : "hover:bg-slate-50 dark:hover:bg-slate-700/20"
                            }`}
                            onClick={() => handleToggleDuty(rotatedIdx, "waste")}
                          />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Caption */}
              <div className="text-[9px] text-on-surface-variant/50 dark:text-gray-500 font-bold flex items-center justify-between shrink-0 pt-2 border-t border-black/5 dark:border-white/5 select-none">
                <span>※ 드래그하여 순번을 정하고, 빈 칸을 눌러 배출 주간 당번을 표시합니다.</span>
                <span>offset: +{shift}주</span>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Mobile/Tap Duration Select Reservation Modal */}
      {mobileResModalOpen && mobileResTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[400px] rounded-[2.5rem] shadow-2xl p-8 space-y-6">
            
            <div className="flex justify-between items-center pb-2 border-b border-black/[0.02] dark:border-white/[0.02]">
              <h3 className="text-lg font-black text-primary dark:text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-blue-500" />
                <span>{mobileResTarget.equipment === "A" ? "왼쪽 벤치" : "오른쪽 벤치"} 예약</span>
              </h3>
              <button 
                onClick={() => setMobileResModalOpen(false)}
                className="p-1 hover:bg-surface-container-low dark:hover:bg-slate-800 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5 text-on-surface-variant/40" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-black/[0.02] dark:border-white/[0.02] space-y-2">
                <div className="text-xs font-bold text-on-surface-variant/60 dark:text-gray-400">
                  📅 예약 일시: <span className="text-foreground dark:text-white font-extrabold">{mobileResTarget.day}요일 {mobileResTarget.slot}</span>
                </div>
                <div className="text-xs font-bold text-on-surface-variant/60 dark:text-gray-400">
                  👤 예약자: <span className="text-foreground dark:text-white font-extrabold">{user?.email?.split("@")[0].toUpperCase()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-on-surface-variant/50 dark:text-gray-400 tracking-wider">이용 예정 시간</label>
                <div className="grid grid-cols-1 gap-2">
                  {(() => {
                    const options = [];
                    const startIdx = SLOTS.indexOf(mobileResTarget.slot);
                    const currentUserInitials = user?.email?.split("@")[0].toUpperCase() || "UNKNOWN";
                    
                    for (let len = 1; len <= 4; len++) {
                      const endIdx = startIdx + len - 1;
                      if (endIdx >= SLOTS.length) break;
                      
                      const targetSlots = SLOTS.slice(startIdx, endIdx + 1);
                      const isBlocked = targetSlots.some(s => {
                        const res = reservations.find(r => r.equipment === mobileResTarget.equipment && r.day === mobileResTarget.day && r.slot === s);
                        return res && res.user !== currentUserInitials;
                      });
                      
                      if (isBlocked) break;
                      
                      const getEndText = (slotStr: string) => {
                        const [h, m] = slotStr.split(":").map(Number);
                        let newM = m + 30;
                        let newH = h;
                        if (newM >= 60) {
                          newM = 0;
                          newH += 1;
                        }
                        return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
                      };
                      
                      const endText = getEndText(targetSlots[targetSlots.length - 1]);
                      options.push({
                        count: len,
                        label: `${len * 30}분 (${mobileResTarget.slot} ~ ${endText})`
                      });
                    }

                    if (options.length === 0) {
                      return <p className="text-xs text-red-500 font-bold p-2">선택 가능한 시간대가 없습니다 (다음 슬롯에 이미 예약이 있음).</p>;
                    }

                    return options.map(opt => (
                      <button
                        key={opt.count}
                        type="button"
                        onClick={() => setMobileResDuration(opt.count)}
                        className={`p-3 rounded-xl text-left text-xs font-bold transition-all border cursor-pointer ${
                          mobileResDuration === opt.count
                            ? "bg-blue-500 border-blue-500 text-white shadow-sm font-extrabold"
                            : "bg-white dark:bg-slate-900 border-black/5 dark:border-white/5 text-on-surface-variant/70 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ));
                  })()}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => setMobileResModalOpen(false)}
                className="flex-1 py-3 border border-black/5 dark:border-white/5 rounded-2xl font-black text-sm text-primary dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => commitDurationReservation(mobileResTarget.equipment, mobileResTarget.day, mobileResTarget.slot, mobileResDuration)}
                className="flex-1 py-3 bg-primary dark:bg-blue-600 text-white rounded-2xl font-black text-sm shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                예약 완료
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
