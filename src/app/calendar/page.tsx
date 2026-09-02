"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { CalendarEvent, PublicHoliday, AllowedUser } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  addMonths, 
  subMonths, 
  isSameDay,
  startOfWeek,
  endOfWeek
} from "date-fns";
import { ko } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Clock, 
  FileText,
  User,
  Trash2,
  RefreshCw
} from "lucide-react";

const FALLBACK_HOLIDAYS: { [key: string]: string } = {
  // 2025
  "2025-01-01": "신정",
  "2025-01-28": "설날 연휴",
  "2025-01-29": "설날",
  "2025-01-30": "설날 연휴",
  "2025-03-03": "대체공휴일(삼일절)",
  "2025-05-05": "어린이날 / 대체공휴일(부처님오신날)",
  "2025-06-06": "현충일",
  "2025-07-17": "제헌절",
  "2025-08-15": "광복절",
  "2025-10-03": "개천절",
  "2025-10-06": "추석 연휴",
  "2025-10-07": "추석",
  "2025-10-08": "추석 연휴 / 대체공휴일",
  "2025-10-09": "한글날",
  "2025-12-25": "성탄절",
  // 2026
  "2026-01-01": "신정",
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-03-02": "대체공휴일(삼일절)",
  "2026-05-01": "근로자의 날",
  "2026-05-05": "어린이날",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "대체공휴일(부처님오신날)",
  "2026-06-03": "지방선거일",
  "2026-06-06": "현충일",
  "2026-07-17": "제헌절",
  "2026-08-15": "광복절",
  "2026-08-17": "대체공휴일(광복절)",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",
  "2026-10-03": "개천절",
  "2026-10-05": "대체공휴일(개천절)",
  "2026-10-09": "한글날",
  "2026-12-25": "성탄절",
  // 2027
  "2027-01-01": "신정",
  "2027-02-06": "설날 연휴",
  "2027-02-07": "설날",
  "2027-02-08": "설날 연휴",
  "2027-02-09": "대체공휴일(설날)",
  "2027-03-01": "삼일절",
  "2027-05-03": "근로자의 날(대체)",
  "2027-05-05": "어린이날",
  "2027-05-13": "부처님오신날",
  "2027-06-06": "현충일",
  "2027-07-17": "제헌절",
  "2027-08-15": "광복절",
  "2027-08-16": "대체공휴일(광복절)",
  "2027-09-14": "추석 연휴",
  "2027-09-15": "추석",
  "2027-09-16": "추석 연휴",
  "2027-10-03": "개천절",
  "2027-10-04": "대체공휴일(개천절)",
  "2027-10-11": "대체공휴일(한글날)",
  "2027-12-25": "성탄절",
};

const USER_COLOR_PALETTES = [
  {
    bg: "bg-blue-50/80 dark:bg-blue-950/40",
    border: "border-blue-200/90 dark:border-blue-800/60",
    text: "text-blue-700 dark:text-blue-300",
    accent: "bg-blue-600 dark:bg-blue-500",
    hoverBg: "hover:bg-blue-100/70 dark:hover:bg-blue-900/50",
    badge: "bg-blue-100/90 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50",
    dot: "bg-blue-500",
  },
  {
    bg: "bg-emerald-50/80 dark:bg-emerald-950/40",
    border: "border-emerald-200/90 dark:border-emerald-800/60",
    text: "text-emerald-700 dark:text-emerald-300",
    accent: "bg-emerald-600 dark:bg-emerald-500",
    hoverBg: "hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50",
    badge: "bg-emerald-100/90 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50",
    dot: "bg-emerald-500",
  },
  {
    bg: "bg-purple-50/80 dark:bg-purple-950/40",
    border: "border-purple-200/90 dark:border-purple-800/60",
    text: "text-purple-700 dark:text-purple-300",
    accent: "bg-purple-600 dark:bg-purple-500",
    hoverBg: "hover:bg-purple-100/70 dark:hover:bg-purple-900/50",
    badge: "bg-purple-100/90 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50",
    dot: "bg-purple-500",
  },
  {
    bg: "bg-amber-50/80 dark:bg-amber-950/40",
    border: "border-amber-200/90 dark:border-amber-800/60",
    text: "text-amber-700 dark:text-amber-300",
    accent: "bg-amber-600 dark:bg-amber-500",
    hoverBg: "hover:bg-amber-100/70 dark:hover:bg-amber-900/50",
    badge: "bg-amber-100/90 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50",
    dot: "bg-amber-500",
  },
  {
    bg: "bg-rose-50/80 dark:bg-rose-950/40",
    border: "border-rose-200/90 dark:border-rose-800/60",
    text: "text-rose-700 dark:text-rose-300",
    accent: "bg-rose-600 dark:bg-rose-500",
    hoverBg: "hover:bg-rose-100/70 dark:hover:bg-rose-900/50",
    badge: "bg-rose-100/90 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50",
    dot: "bg-rose-500",
  },
  {
    bg: "bg-cyan-50/80 dark:bg-cyan-950/40",
    border: "border-cyan-200/90 dark:border-cyan-800/60",
    text: "text-cyan-700 dark:text-cyan-300",
    accent: "bg-cyan-600 dark:bg-cyan-500",
    hoverBg: "hover:bg-cyan-100/70 dark:hover:bg-cyan-900/50",
    badge: "bg-cyan-100/90 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50",
    dot: "bg-cyan-500",
  },
  {
    bg: "bg-indigo-50/80 dark:bg-indigo-950/40",
    border: "border-indigo-200/90 dark:border-indigo-800/60",
    text: "text-indigo-700 dark:text-indigo-300",
    accent: "bg-indigo-600 dark:bg-indigo-500",
    hoverBg: "hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50",
    badge: "bg-indigo-100/90 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50",
    dot: "bg-indigo-500",
  }
];

const getColorForUser = (userName?: string) => {
  const name = (userName || "UNKNOWN").toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % USER_COLOR_PALETTES.length;
  return USER_COLOR_PALETTES[index];
};

const getColorForEvent = (createdBy?: string) => {
  return getColorForUser(createdBy);
};

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [activeDay, setActiveDay] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<{ [key: string]: string }>({});
  
  // Member selection states
  const [allMembers, setAllMembers] = useState<string[]>(["BJ", "YG", "MJ", "JS", "HS", "HM", "NY", "SH", "TH"]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("18:00");
  const [formIsAllDay, setFormIsAllDay] = useState(false);

  // Drag selection states
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Go to Today
  const handleGoToday = () => {
    const now = new Date();
    setCurrentMonth(now);
    setActiveDay(now);
  };

  // Open New Event Modal Helper
  const openNewEventModal = (targetDate: Date = activeDay) => {
    setSelectedDate(targetDate);
    setSelectedEvent(null);
    setFormTitle("");
    setFormDesc("");
    const dateStr = format(targetDate, "yyyy-MM-dd");
    setFormStartDate(dateStr);
    setFormEndDate(dateStr);
    setFormStartTime("09:00");
    setFormEndTime("18:00");
    setFormIsAllDay(false);
    const defaultUser = user?.email?.split("@")[0].toUpperCase() || "UNKNOWN";
    setSelectedMembers([defaultUser]);
    setModalOpen(true);
  };

  // Fetch Calendar Events
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*");
      if (error) throw error;
      const fetchedEvents = data || [];
      setEvents(fetchedEvents);

      // Extract unique members from events
      const creators = fetchedEvents
        .map((e) => e.created_by)
        .filter(Boolean)
        .flatMap((c: string) => c.split(",").map((m: string) => m.trim().toUpperCase()))
        .filter(Boolean);
      
      setAllMembers((prev) => {
        const merged = Array.from(new Set([...prev, ...creators]));
        return merged;
      });
    } catch (err) {
      console.error("Error fetching calendar events:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Holidays dynamically with Fallback
  useEffect(() => {
    const year = currentMonth.getFullYear();
    const fetchHolidays = async () => {
      try {
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`);
        if (!res.ok) throw new Error("API response error");
        const data = await res.json();
        const holidayMap: { [key: string]: string } = {};
        (data as PublicHoliday[]).forEach((h) => {
          holidayMap[h.date] = h.localName;
        });
        // Merge with fallback data just in case API data is incomplete or has missing dates
        setHolidays({ ...FALLBACK_HOLIDAYS, ...holidayMap });
      } catch (err) {
        console.error("Error fetching public holidays, using fallback data:", err);
        setHolidays(FALLBACK_HOLIDAYS);
      }
    };

    fetchHolidays();
  }, [currentMonth]);

  useEffect(() => {
    let ignore = false;

    const loadCalendarData = async () => {
      try {
        const { data: eventData, error: eventError } = await supabase
          .from("calendar_events")
          .select("*");
        if (eventError) throw eventError;
        const fetchedEvents = eventData || [];
        if (!ignore) setEvents(fetchedEvents);

        const creators = fetchedEvents
          .map((e) => e.created_by)
          .filter(Boolean)
          .flatMap((c: string) => c.split(",").map((m: string) => m.trim().toUpperCase()))
          .filter(Boolean);

        const { data: userData, error: userError } = await supabase
          .from("allowed_users")
          .select("username")
          .order("created_at", { ascending: true });
        if (userError) throw userError;

        const userList = userData ? (userData as AllowedUser[]).map((d) => d.username.toUpperCase()) : [];

        if (!ignore) {
          setAllMembers((prev) => Array.from(new Set([...prev, ...creators, ...userList])));
        }
      } catch (err) {
        console.error("Error loading calendar data:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadCalendarData();

    // Setup Realtime Sync for calendar_events
    const channel = supabase
      .channel("calendar-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events" },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDayClick = (day: Date) => {
    setActiveDay(day);
    openNewEventModal(day);
  };

  const handleMouseDown = (date: Date) => {
    setIsDragging(true);
    setDragStart(date);
    setDragEnd(date);
  };

  const handleMouseEnter = (date: Date) => {
    if (isDragging) {
      setDragEnd(date);
    }
  };

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStart && dragEnd) {
      setIsDragging(false);
      
      const d1 = dragStart < dragEnd ? dragStart : dragEnd;
      const d2 = dragStart < dragEnd ? dragEnd : dragStart;
      
      setSelectedDate(d1);
      setActiveDay(d1);
      setSelectedEvent(null);
      setFormTitle("");
      setFormDesc("");
      setFormStartDate(format(d1, "yyyy-MM-dd"));
      setFormEndDate(format(d2, "yyyy-MM-dd"));
      setFormStartTime("09:00");
      setFormEndTime("18:00");
      setFormIsAllDay(false);
      setSelectedMembers([user?.email?.split("@")[0].toUpperCase() || "UNKNOWN"]);
      setModalOpen(true);
      
      setDragStart(null);
      setDragEnd(null);
    }
  }, [isDragging, dragStart, dragEnd, user]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [isDragging, handleMouseUp]);

  // Handlers for month nav
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Calendar Day Generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekCount = Math.ceil(days.length / 7);

  // Open modal to view/edit/delete event
  const openViewModal = (e: React.SyntheticEvent, event: CalendarEvent) => {
    e.stopPropagation(); // Prevent trigger day click
    setSelectedEvent(event);
    const startDateObj = new Date(event.start_time);
    const endDateObj = new Date(event.end_time);
    setSelectedDate(startDateObj);
    setFormTitle(event.title);
    setFormDesc(event.description || "");
    setFormStartDate(format(startDateObj, "yyyy-MM-dd"));
    setFormEndDate(format(endDateObj, "yyyy-MM-dd"));
    
    const startTimeStr = format(startDateObj, "HH:mm");
    const endTimeStr = format(endDateObj, "HH:mm");
    setFormStartTime(startTimeStr);
    setFormEndTime(endTimeStr);

    const isAllDayCalc = startTimeStr === "00:00" && (endTimeStr === "23:59" || endTimeStr === "00:00");
    setFormIsAllDay(isAllDayCalc);

    const members = (event.created_by || "UNKNOWN")
      .split(",")
      .map((m) => m.trim().toUpperCase())
      .filter(Boolean);
    setSelectedMembers(members);
    setModalOpen(true);
  };

  // Save/Update Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Build timestamp strings
    const startStr = formIsAllDay 
      ? `${formStartDate}T00:00:00` 
      : `${formStartDate}T${formStartTime}:00`;
    const endStr = formIsAllDay 
      ? `${formEndDate}T23:59:59` 
      : `${formEndDate}T${formEndTime}:00`;

    const payload = {
      title: formTitle,
      description: formDesc,
      start_time: new Date(startStr).toISOString(),
      end_time: new Date(endStr).toISOString(),
      created_by: selectedMembers.length > 0 ? selectedMembers.join(", ") : "UNKNOWN",
    };

    try {
      if (selectedEvent) {
        // Update
        const { error } = await supabase
          .from("calendar_events")
          .update(payload)
          .eq("id", selectedEvent.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from("calendar_events")
          .insert([payload]);
        if (error) throw error;
      }
      setModalOpen(false);
      fetchEvents();
    } catch (err) {
      console.error("Error saving calendar event:", err);
    }
  };

  // Delete Event
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    try {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", selectedEvent.id);
      if (error) throw error;
      setModalOpen(false);
      fetchEvents();
    } catch (err) {
      console.error("Error deleting calendar event:", err);
    }
  };


  return (
    <div className="flex-1 p-3 sm:p-5 md:p-6 flex flex-col min-h-0 lg:h-[100dvh] lg:max-h-[100dvh] lg:min-h-[640px] gap-3 bg-zinc-50 dark:bg-zinc-950">
      
      {/* Top Navigation & Action Bar */}
      <div className="flex items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-1 shadow-xs">
            <button 
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer text-zinc-600 dark:text-zinc-400 active:scale-95"
              title="이전 달"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm sm:text-base font-black text-zinc-900 dark:text-white px-3 min-w-[100px] sm:min-w-[120px] text-center tracking-tight">
              {format(currentMonth, "yyyy. MM", { locale: ko })}
            </span>
            <button 
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer text-zinc-600 dark:text-zinc-400 active:scale-95"
              title="다음 달"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleGoToday}
            className="px-3 py-2 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            title="오늘로 이동"
          >
            오늘
          </button>
        </div>

        <button
          type="button"
          onClick={() => openNewEventModal(activeDay)}
          className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
          title="새 일정 추가"
        >
          <Plus className="w-4 h-4" />
          <span>일정 추가</span>
        </button>
      </div>

      {/* Main Content: Full Calendar Grid Card */}
      <div className="flex-1 bg-white dark:bg-zinc-900 rounded-3xl shadow-xs border border-zinc-200/90 dark:border-zinc-800 overflow-hidden flex flex-col min-h-[500px] sm:min-h-[600px] lg:min-h-0">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-800/40 shrink-0">
          {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
            <div 
              key={day} 
              className={`py-2.5 sm:py-3.5 text-center text-xs sm:text-sm font-bold tracking-wider ${
                idx === 0 
                  ? "text-rose-500 dark:text-rose-400" 
                  : idx === 6 
                  ? "text-blue-500 dark:text-blue-400" 
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

          {/* Days Grid */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-20">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div 
              className="flex-1 grid grid-cols-7 divide-x divide-y divide-zinc-200/70 dark:divide-zinc-800/70 min-h-0"
              style={{
                gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))`
              }}
            >
              {days.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const dayEvents = events.filter((e) => {
                  const startStr = format(new Date(e.start_time), "yyyy-MM-dd");
                  const endStr = format(new Date(e.end_time), "yyyy-MM-dd");
                  return dayStr >= startStr && dayStr <= endStr;
                });

                // Sort events deterministically
                dayEvents.sort((a, b) => {
                  const aDuration = new Date(a.end_time).getTime() - new Date(a.start_time).getTime();
                  const bDuration = new Date(b.end_time).getTime() - new Date(b.start_time).getTime();
                  if (bDuration !== aDuration) {
                    return bDuration - aDuration;
                  }
                  const aStart = new Date(a.start_time).getTime();
                  const bStart = new Date(b.start_time).getTime();
                  if (aStart !== bStart) {
                    return aStart - bStart;
                  }
                  return a.id.localeCompare(b.id);
                });

                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isToday = isSameDay(day, new Date());
                const holidayName = holidays[dayStr];
                const isHoliday = !!holidayName;
                const isSunday = day.getDay() === 0;
                const isSaturday = day.getDay() === 6;
                const isSelectedInDrag = (() => {
                  if (!dragStart || !dragEnd) return false;
                  const start = dragStart < dragEnd ? dragStart : dragEnd;
                  const end = dragStart < dragEnd ? dragEnd : dragStart;
                  const startStr = format(start, "yyyy-MM-dd");
                  const endStr = format(end, "yyyy-MM-dd");
                  return dayStr >= startStr && dayStr <= endStr;
                })();
                
                const isActive = isSameDay(day, activeDay);
                
                return (
                  <div
                    key={day.toString()}
                    onMouseDown={() => handleMouseDown(day)}
                    onMouseEnter={() => handleMouseEnter(day)}
                    onClick={() => handleDayClick(day)}
                    className={`pt-1.5 pb-1 flex flex-col space-y-1 h-full min-h-[56px] sm:min-h-[72px] lg:min-h-0 overflow-hidden cursor-pointer select-none transition-colors ${
                      isSelectedInDrag 
                        ? "bg-blue-500/10 ring-2 ring-inset ring-blue-500/40" 
                        : isActive
                        ? "bg-blue-500/[0.04] dark:bg-blue-500/[0.08] ring-2 ring-inset ring-blue-600"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    } ${
                      isCurrentMonth 
                        ? isHoliday || isSunday
                          ? "text-rose-500 dark:text-rose-400"
                          : isSaturday
                          ? "text-blue-500 dark:text-blue-400"
                          : "text-zinc-900 dark:text-zinc-100" 
                        : "text-zinc-300 dark:text-zinc-600 opacity-40"
                    }`}
                  >
                    {/* Day Header */}
                    <div className="flex justify-between items-center px-1.5 sm:px-2 gap-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={`text-[11px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full shrink-0 ${
                          isToday 
                            ? "bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-400" 
                            : isHoliday || isSunday
                            ? "text-rose-500 dark:text-rose-400 font-extrabold" 
                            : isSaturday
                            ? "text-blue-500 dark:text-blue-400 font-extrabold"
                            : ""
                        }`}>
                          {format(day, "d")}
                        </span>
                        {isHoliday && isCurrentMonth && (
                          <span className="hidden sm:inline text-[9.5px] font-bold text-rose-500 dark:text-rose-400 truncate max-w-[65px] xl:max-w-[85px]">
                            {holidayName}
                          </span>
                        )}
                      </div>

                      {dayEvents.length > 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Day Events List (Desktop & Tablet) */}
                    <div className="hidden sm:flex flex-1 flex-col gap-1 overflow-y-auto custom-scrollbar px-0">
                      {isHoliday && (
                        <div className="sm:hidden mx-1 px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-[9px] font-black text-rose-600 dark:text-rose-400 rounded truncate">
                          {holidayName}
                        </div>
                      )}
                      {dayEvents.slice(0, 4).map((event) => {
                        const color = getColorForEvent(event.created_by);
                        const startStr = format(new Date(event.start_time), "yyyy-MM-dd");
                        const endStr = format(new Date(event.end_time), "yyyy-MM-dd");
                        const isStartDay = dayStr === startStr;
                        const isEndDay = dayStr === endStr;
                        const isMultiDay = startStr !== endStr;

                        let cellStyle = "mx-1 rounded-md";
                        if (isMultiDay) {
                          if (isStartDay) {
                            cellStyle = "ml-1 mr-0 rounded-l-md border-r-0";
                          } else if (isEndDay) {
                            cellStyle = "mr-1 ml-0 rounded-r-md border-l-0";
                          } else {
                            cellStyle = "mx-0 rounded-none border-x-0";
                          }
                        }

                        return (
                          <div
                            key={event.id}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => openViewModal(e, event)}
                            className={`px-1.5 py-0.5 ${color.bg} border ${color.border} text-[9.5px] sm:text-[10px] font-bold ${color.text} ${cellStyle} truncate ${color.hoverBg} transition-colors flex items-center gap-1 shadow-2xs`}
                          >
                            <span className="font-black bg-black/[0.06] dark:bg-white/[0.1] px-1 rounded-sm text-[8px] sm:text-[8.5px] tracking-tight shrink-0">
                              {event.created_by}
                            </span>
                            <span className="truncate">{event.title}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 4 && (
                        <div className="text-[8.5px] font-black text-zinc-400 dark:text-zinc-500 text-center uppercase tracking-wider mx-1">
                          + {dayEvents.length - 4}건 더보기
                        </div>
                      )}
                    </div>

                    {/* Day Events Dots (Mobile View) */}
                    <div className="flex sm:hidden flex-row flex-wrap gap-0.5 px-1.5 items-center justify-center min-h-[8px] overflow-hidden">
                      {dayEvents.slice(0, 3).map((event) => {
                        const color = getColorForEvent(event.created_by);
                        return (
                          <span 
                            key={event.id} 
                            className={`w-1.5 h-1.5 rounded-full ${color.dot} shrink-0`} 
                          />
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <span className="w-1 h-1 bg-zinc-400 rounded-full shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      {/* Add / Edit / View Modal */}
      {modalOpen && selectedDate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-[460px] rounded-[2rem] shadow-2xl p-6 sm:p-7 space-y-4 border border-zinc-200 dark:border-zinc-800">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {selectedEvent ? "일정 관리" : "새 일정 등록"}
                </h3>
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">
                  📅 {format(selectedDate, "yyyy년 M월 d일 (E)", { locale: ko })}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Form */}
            <form onSubmit={handleSaveEvent} className="space-y-3.5">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                  일정 제목 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="예: 팀 주간 회의, 실험실 정기 점검"
                  className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-zinc-900 dark:text-white transition-all"
                />
              </div>

              {/* Target Member Multi-select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>대상 팀원 (중복 선택 가능)</span>
                </label>
                
                <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
                  {allMembers.map((member) => {
                    const isSelected = selectedMembers.includes(member);
                    const memberColor = getColorForUser(member);
                    return (
                      <button
                        key={member}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (selectedMembers.length > 1) {
                              setSelectedMembers(selectedMembers.filter((m) => m !== member));
                            }
                          } else {
                            setSelectedMembers([...selectedMembers, member]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer active:scale-95 ${
                          isSelected 
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs font-black" 
                            : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : memberColor.dot}`} />
                        {member}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Range & All-day Toggle */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                    일정 기간
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formIsAllDay}
                      onChange={(e) => setFormIsAllDay(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700"
                    />
                    <span>종일 일정</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-zinc-400">시작일</span>
                    <input
                      type="date"
                      required
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-bold text-center text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-zinc-400">종료일</span>
                    <input
                      type="date"
                      required
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-bold text-center text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Time Range (Hidden if All-day) */}
              {!formIsAllDay && (
                <div className="grid grid-cols-2 gap-2.5 animate-fadeIn">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>시작 시간</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-bold text-center text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>종료 시간</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-bold text-center text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>상세 메모</span>
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="회의 내용, 전달사항 등을 입력하세요."
                  className="w-full h-20 px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-medium resize-none text-zinc-900 dark:text-white transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                {selectedEvent && (
                  <button
                    type="button"
                    onClick={handleDeleteEvent}
                    className="px-3 py-2 border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                    title="일정 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>삭제</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
                >
                  {selectedEvent ? "수정 완료" : "등록 완료"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
