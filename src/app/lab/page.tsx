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
  X
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
  "18:00", "18:30", "19:00", "19:30"
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

export default function LabPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<string[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [cleaningState, setCleaningState] = useState<CleaningState | null>(null);
  const [draggedRowIdx, setDraggedRowIdx] = useState<number | null>(null);
  const [showAddSelect, setShowAddSelect] = useState(false);
  const [loading, setLoading] = useState(true);
  
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

  // Global mouseup listener for cell drag selection
  useEffect(() => {
    const handleGlobalMouseUp = async () => {
      if (isDragging && activeDrag && dragStart !== null && dragEnd !== null) {
        const minIdx = Math.min(dragStart, dragEnd);
        const maxIdx = Math.max(dragStart, dragEnd);
        const rangeSlots = SLOTS.slice(minIdx, maxIdx + 1);

        const currentUserInitials = user?.email?.split("@")[0].toUpperCase() || "UNKNOWN";

        // Check which slots in the range are reserved by the current user
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
          // If all selected slots in the range are already reserved by me, cancel all of them
          updated = updated.filter(r => !(
            r.equipment === activeDrag.equipment && 
            r.day === activeDrag.day && 
            rangeSlots.includes(r.slot)
          ));
        } else {
          // Check if booking these slots exceeds the 2-hour limit (4 consecutive slots)
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
            setIsDragging(false);
            setActiveDrag(null);
            setDragStart(null);
            setDragEnd(null);
            return;
          }

          // Otherwise, reserve all slots in the range (leaving others' reservations untouched)
          rangeSlots.forEach((slot) => {
            const isReservedByOther = othersReservationsInRange.includes(slot);
            if (!isReservedByOther) {
              // Remove old reservation by me if any
              updated = updated.filter(r => !(
                r.equipment === activeDrag.equipment && 
                r.day === activeDrag.day && 
                r.slot === slot
              ));
              // Add new reservation
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

        // Save to Database
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

  // Find helper to search reservation state
  const getReservedUser = (equipment: string, day: string, slot: string) => {
    return reservations.find(r => r.equipment === equipment && r.day === day && r.slot === slot)?.user || "";
  };

  return (
    <div className="flex-1 p-6 md:p-10 space-y-6 bg-surface dark:bg-slate-900 flex flex-col min-h-0">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-black font-headline text-primary dark:text-blue-400 tracking-tighter">
            Lab Equipment & Workspace Hub
          </h2>
          <p className="text-xs md:text-sm text-on-surface-variant dark:text-gray-400 font-semibold mt-1">
            연구실 내 벤치 예약 상태를 점검하고 주간 청소당번 배정을 확인합니다.
          </p>
        </div>
        
        <button
          onClick={fetchLabData}
          className="p-3 bg-white dark:bg-slate-800 text-on-surface-variant dark:text-gray-400 rounded-2xl hover:text-primary dark:hover:text-white border border-black/[0.03] dark:border-white/[0.03] shadow-sm hover:shadow transition-all"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-primary dark:text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 flex flex-col min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          
          {/* Top Section: Two Reservation Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Table 1: Equipment A */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 shadow-md border border-black/[0.02] dark:border-white/[0.02] flex flex-col h-[520px]">
              <div className="pb-3 border-b border-black/[0.02] dark:border-white/[0.02] shrink-0">
                <h3 className="text-base font-black text-primary dark:text-white flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-blue-500 animate-pulse" />
                  <span>오른쪽 벤치</span>
                </h3>
              </div>

              {/* Scrollable Scheduler */}
              <div className="flex-1 overflow-auto mt-4 border border-black/[0.03] dark:border-white/[0.03] rounded-2xl custom-scrollbar">
                <table className="w-full table-fixed text-center border-collapse text-[11px] font-semibold">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700 text-on-surface-variant dark:text-gray-300 border-b border-black/[0.02] dark:border-white/[0.02] z-10">
                    <tr>
                      <th className="py-2.5 px-3 font-black bg-slate-100 dark:bg-slate-800/80 w-16">시간</th>
                      {DAYS.map(day => (
                        <th key={day} className="py-2.5 font-black w-[17.6%]">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                    {SLOTS.map((slot) => (
                      <tr key={slot} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all">
                        <td className="py-2 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] font-black border-r border-black/[0.01] dark:border-white/[0.01] sticky left-0 z-0 select-none">
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

                          return (
                            <td 
                              key={day}
                              onMouseDown={() => handleCellMouseDown("A", day, slot)}
                              onMouseEnter={() => handleCellMouseEnter("A", day, slot)}
                              className={`py-1.5 px-1 border-r border-black/[0.01] dark:border-white/[0.01] cursor-pointer transition-all select-none ${
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
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 shadow-md border border-black/[0.02] dark:border-white/[0.02] flex flex-col h-[520px]">
              <div className="pb-3 border-b border-black/[0.02] dark:border-white/[0.02] shrink-0">
                <h3 className="text-base font-black text-primary dark:text-white flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-emerald-500 animate-pulse" />
                  <span>왼쪽 벤치</span>
                </h3>
              </div>

              {/* Scrollable Scheduler */}
              <div className="flex-1 overflow-auto mt-4 border border-black/[0.03] dark:border-white/[0.03] rounded-2xl custom-scrollbar">
                <table className="w-full table-fixed text-center border-collapse text-[11px] font-semibold">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700 text-on-surface-variant dark:text-gray-300 border-b border-black/[0.02] dark:border-white/[0.02] z-10">
                    <tr>
                      <th className="py-2.5 px-3 font-black bg-slate-100 dark:bg-slate-800/80 w-16">시간</th>
                      {DAYS.map(day => (
                        <th key={day} className="py-2.5 font-black w-[17.6%]">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                    {SLOTS.map((slot) => (
                      <tr key={slot} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all">
                        <td className="py-2 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] font-black border-r border-black/[0.01] dark:border-white/[0.01] sticky left-0 z-0 select-none">
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

                          return (
                            <td 
                              key={day}
                              onMouseDown={() => handleCellMouseDown("B", day, slot)}
                              onMouseEnter={() => handleCellMouseEnter("B", day, slot)}
                              className={`py-1.5 px-1 border-r border-black/[0.01] dark:border-white/[0.01] cursor-pointer transition-all select-none ${
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

          {/* Bottom Section: Left Empty, Right Cleaning Duty */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
            
            {/* Left Column: Left Empty as requested */}
            <div className="border-2 border-dashed border-black/[0.06] dark:border-white/[0.06] rounded-[2.5rem] h-[340px] flex items-center justify-center text-on-surface-variant/30 dark:text-gray-600 select-none">
              <div className="text-center space-y-1">
                <HelpCircle className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs font-black uppercase tracking-widest">기능 준비 공간</p>
                <p className="text-[10px] font-medium opacity-60">추가로 배치할 기능이 기획되면 채워집니다.</p>
              </div>
            </div>

            {/* Right Column: Cleaning & Waste Duties Table */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 shadow-md border border-black/[0.02] dark:border-white/[0.02] h-[340px] flex flex-col justify-between overflow-hidden">
              
              <div className="flex justify-between items-center pb-2 border-b border-black/[0.02] dark:border-white/[0.02] shrink-0">
                <h3 className="text-sm font-black text-primary dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-amber-500" />
                  <span>연구실 주간 청소 당번</span>
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
              <div className="flex-1 overflow-y-auto my-3 border border-black/[0.03] dark:border-white/[0.03] rounded-2xl custom-scrollbar">
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
                                <GripVertical className="w-3.5 h-3.5 text-on-surface-variant/30 shrink-0 cursor-grab active:cursor-grabbing" />
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

    </div>
  );
}
