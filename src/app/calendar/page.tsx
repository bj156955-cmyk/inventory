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
  RefreshCw,
  Calendar
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
  "2026-09-28": "대체공휴일(추석)",
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

const getColorForUser = (userName?: string) => {
  const name = (userName || "UNKNOWN").toUpperCase();
  const colors = [
    {
      bg: "bg-blue-500/15",
      border: "border-blue-500/30",
      text: "text-blue-400",
      hoverBg: "hover:bg-blue-500/25",
      badge: "bg-blue-500/15 border border-blue-500/30 text-blue-400",
      dot: "bg-blue-400",
    },
    {
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      hoverBg: "hover:bg-emerald-500/25",
      badge: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400",
      dot: "bg-emerald-400",
    },
    {
      bg: "bg-purple-500/15",
      border: "border-purple-500/30",
      text: "text-purple-400",
      hoverBg: "hover:bg-purple-500/25",
      badge: "bg-purple-500/15 border border-purple-500/30 text-purple-400",
      dot: "bg-purple-400",
    },
    {
      bg: "bg-amber-500/15",
      border: "border-amber-500/30",
      text: "text-amber-400",
      hoverBg: "hover:bg-amber-500/25",
      badge: "bg-amber-500/15 border border-amber-500/30 text-amber-400",
      dot: "bg-amber-400",
    },
    {
      bg: "bg-rose-500/15",
      border: "border-rose-500/30",
      text: "text-rose-400",
      hoverBg: "hover:bg-rose-500/25",
      badge: "bg-rose-500/15 border border-rose-500/30 text-rose-400",
      dot: "bg-rose-400",
    },
    {
      bg: "bg-cyan-500/15",
      border: "border-cyan-500/30",
      text: "text-cyan-400",
      hoverBg: "hover:bg-cyan-500/25",
      badge: "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400",
      dot: "bg-cyan-400",
    },
    {
      bg: "bg-fuchsia-500/15",
      border: "border-fuchsia-500/30",
      text: "text-fuchsia-400",
      hoverBg: "hover:bg-fuchsia-500/25",
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

  // Drag selection states
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    if (isSameDay(day, activeDay)) {
      setSelectedDate(day);
      setSelectedEvent(null);
      setFormTitle("");
      setFormDesc("");
      setFormStartDate(format(day, "yyyy-MM-dd"));
      setFormEndDate(format(day, "yyyy-MM-dd"));
      setFormStartTime("09:00");
      setFormEndTime("18:00");
      const defaultUser = user?.email?.split("@")[0].toUpperCase() || "UNKNOWN";
      setSelectedMembers([defaultUser]);
      setModalOpen(true);
    } else {
      setActiveDay(day);
    }
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
    setFormStartTime(format(startDateObj, "HH:mm"));
    setFormEndTime(format(endDateObj, "HH:mm"));
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
    const startStr = `${formStartDate}T${formStartTime}:00`;
    const endStr = `${formEndDate}T${formEndTime}:00`;

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
    <div className="flex-1 p-3 sm:p-6 md:p-8 space-y-3 sm:space-y-4 bg-zinc-50 dark:bg-zinc-950 flex flex-col min-h-0">
      
      {/* Slim Top Month & Actions Bar */}
      <div className="flex items-center justify-between gap-2 shrink-0 bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1 sm:gap-2">
          <button 
            onClick={handlePrevMonth}
            className="p-1.5 sm:p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer text-zinc-500 dark:text-zinc-400 active:scale-95"
            title="이전 달"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <span className="text-xs sm:text-base font-black text-zinc-900 dark:text-white px-2 uppercase tracking-wider">
            {format(currentMonth, "yyyy. MMMM", { locale: ko })}
          </span>
          <button 
            onClick={handleNextMonth}
            className="p-1.5 sm:p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer text-zinc-500 dark:text-zinc-400 active:scale-95"
            title="다음 달"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const today = new Date();
              const todayStr = format(today, "yyyy-MM-dd");
              setSelectedDate(today);
              setSelectedEvent(null);
              setFormTitle("");
              setFormDesc("");
              setFormStartDate(todayStr);
              setFormEndDate(todayStr);
              setFormStartTime("09:00");
              setFormEndTime("18:00");
              const defaultUser = user?.email?.split("@")[0].toUpperCase() || "UNKNOWN";
              setSelectedMembers([defaultUser]);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
            title="새 일정 등록"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">새 일정</span>
          </button>
          <button
            onClick={() => {
              setLoading(true);
              fetchEvents();
            }}
            className="p-1.5 sm:p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-xl transition-all cursor-pointer active:scale-95 shrink-0"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>


      {/* Master-Detail Layout: Calendar + Selected Day Agenda */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 sm:gap-6 min-h-[400px]">
        
        {/* Left Column: Calendar Grid */}
        <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col min-h-[360px]">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/60">
            {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
              <div 
                key={day} 
                className={`py-2.5 sm:py-4 text-center text-[10px] sm:text-xs font-black uppercase tracking-widest ${
                  idx === 0 ? "text-rose-400" : idx === 6 ? "text-sky-400" : "text-zinc-700 dark:text-zinc-200"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-7 grid-rows-6 divide-x divide-y divide-zinc-200/60 dark:divide-zinc-800/60 border-t border-zinc-200/60 dark:border-zinc-800/60">
              {days.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const dayEvents = events.filter((e) => {
                  const startStr = format(new Date(e.start_time), "yyyy-MM-dd");
                  const endStr = format(new Date(e.end_time), "yyyy-MM-dd");
                  return dayStr >= startStr && dayStr <= endStr;
                });

                // Sort events deterministically so they align horizontally in the grid
                dayEvents.sort((a, b) => {
                  const aDuration = new Date(a.end_time).getTime() - new Date(a.start_time).getTime();
                  const bDuration = new Date(b.end_time).getTime() - new Date(b.start_time).getTime();
                  if (bDuration !== aDuration) {
                    return bDuration - aDuration; // longer duration first
                  }
                  const aStart = new Date(a.start_time).getTime();
                  const bStart = new Date(b.start_time).getTime();
                  if (aStart !== bStart) {
                    return aStart - bStart; // earlier start time first
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
                    className={`pt-2 pb-1.5 flex flex-col space-y-1.5 h-full min-h-[70px] overflow-hidden cursor-pointer select-none transition-all ${
                      isSelectedInDrag 
                        ? "bg-blue-500/10 ring-2 ring-blue-500/40" 
                        : isActive
                        ? "bg-blue-500/5 ring-2 ring-blue-500"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    } ${
                      isCurrentMonth 
                        ? isHoliday || isSunday
                          ? "text-rose-400"
                          : isSaturday
                          ? "text-sky-400"
                          : "text-zinc-900 dark:text-white" 
                        : "text-zinc-400 dark:text-zinc-600 opacity-40"
                    }`}
                  >
                    {/* Day Header */}
                    <div className="flex justify-between items-center px-2">
                      <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday 
                          ? "bg-blue-600 text-white font-black shadow-sm shadow-blue-600/40 ring-2 ring-blue-400" 
                          : isHoliday || isSunday
                          ? "text-rose-400 font-extrabold" 
                          : isSaturday
                          ? "text-sky-400 font-extrabold"
                          : ""
                      }`}>
                        {format(day, "d")}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md border border-zinc-200/60 dark:border-zinc-700/60">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Day Events List (Desktop Only) */}
                    <div className="hidden md:flex flex-1 flex-col gap-1 overflow-y-auto custom-scrollbar px-0">
                      {isHoliday && (
                        <div className="mx-2 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[9px] font-black text-zinc-700 dark:text-zinc-300 rounded-md truncate select-none flex items-center gap-1 shrink-0">
                          <span>•</span> {holidayName}
                        </div>
                      )}
                      {dayEvents.slice(0, isHoliday ? 2 : 3).map((event) => {
                        const color = getColorForEvent(event.created_by);
                        const startStr = format(new Date(event.start_time), "yyyy-MM-dd");
                        const endStr = format(new Date(event.end_time), "yyyy-MM-dd");
                        const isStartDay = dayStr === startStr;
                        const isEndDay = dayStr === endStr;
                        const isMultiDay = startStr !== endStr;

                        let cellStyle = "mx-2 rounded-lg";
                        if (isMultiDay) {
                          if (isStartDay) {
                            cellStyle = "ml-2 mr-0 rounded-l-lg border-r-0";
                          } else if (isEndDay) {
                            cellStyle = "mr-2 ml-0 rounded-r-lg border-l-0";
                          } else {
                            cellStyle = "mx-0 rounded-none border-l-0 border-r-0";
                          }
                        }

                        return (
                          <div
                            key={event.id}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => openViewModal(e, event)}
                            className={`px-2 py-1 ${color.bg} border ${color.border} text-[9px] font-bold ${color.text} ${cellStyle} truncate ${color.hoverBg} transition-colors`}
                          >
                            <span className="opacity-75 font-normal mr-0.5">{format(new Date(event.start_time), "HH:mm")}</span>
                            <span className="font-extrabold mr-1 bg-black/[0.04] dark:bg-white/[0.08] px-1 rounded-sm text-[8px] tracking-tight">{event.created_by}</span>
                            {event.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > (isHoliday ? 2 : 3) && (
                        <div className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 text-center uppercase tracking-wider mx-2">
                          + {dayEvents.length - (isHoliday ? 2 : 3)} more
                        </div>
                      )}
                    </div>

                    {/* Day Events Dots (Mobile Only) */}
                    <div className="flex md:hidden flex-row flex-wrap gap-0.5 px-2 items-center justify-center min-h-[8px] overflow-hidden">
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

        {/* Right Column: Selected Day's Agenda Detail */}
        <div className="w-full lg:w-[320px] bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0">
          <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <h3 className="text-sm font-black text-zinc-900 dark:text-white">
              📅 {format(activeDay, "M월 d일 (E)", { locale: ko })}
            </h3>
            <button
              onClick={() => {
                setSelectedDate(activeDay);
                setSelectedEvent(null);
                setFormTitle("");
                setFormDesc("");
                setFormStartDate(format(activeDay, "yyyy-MM-dd"));
                setFormEndDate(format(activeDay, "yyyy-MM-dd"));
                setFormStartTime("09:00");
                setFormEndTime("18:00");
                const defaultUser = user?.email?.split("@")[0].toUpperCase() || "UNKNOWN";
                setSelectedMembers([defaultUser]);
                setModalOpen(true);
              }}
              className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold shadow-sm shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
              title="새 일정 추가"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Agenda Scrollable List */}
          <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1 custom-scrollbar min-h-[200px]">
            {(() => {
              const activeDayStr = format(activeDay, "yyyy-MM-dd");
              const activeDayEvents = events.filter((e) => {
                const startStr = format(new Date(e.start_time), "yyyy-MM-dd");
                const endStr = format(new Date(e.end_time), "yyyy-MM-dd");
                return activeDayStr >= startStr && activeDayStr <= endStr;
              });

              // Sort activeDayEvents by start time
              activeDayEvents.sort((a, b) => a.start_time.localeCompare(b.start_time));

              if (activeDayEvents.length === 0) {
                return (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 dark:text-zinc-500">
                    <Calendar className="w-10 h-10 mb-2 opacity-30" />
                    <span className="text-[11px] font-bold">이날은 등록된 일정이 없습니다.</span>
                  </div>
                );
              }

              return activeDayEvents.map((event) => {
                const color = getColorForEvent(event.created_by);
                const startStr = format(new Date(event.start_time), "yyyy-MM-dd");
                const endStr = format(new Date(event.end_time), "yyyy-MM-dd");
                const isMultiDay = startStr !== endStr;

                return (
                  <div
                    key={event.id}
                    onClick={(e) => openViewModal(e, event)}
                    className={`p-3.5 rounded-2xl border ${color.bg} ${color.border} ${color.text} hover:scale-[1.02] cursor-pointer transition-all duration-200 flex flex-col gap-1.5`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-extrabold text-xs tracking-tight line-clamp-1">{event.title}</span>
                      <span className="text-[9px] font-medium opacity-80 shrink-0">
                        {isMultiDay ? "종일" : `${format(new Date(event.start_time), "HH:mm")} ~ ${format(new Date(event.end_time), "HH:mm")}`}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-[10px] opacity-75 line-clamp-2 leading-relaxed">{event.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {event.created_by.split(",").map(m => {
                        const memberColor = getColorForUser(m.trim());
                        return (
                          <span key={m} className={`px-2 py-0.5 text-[8px] font-black rounded-md ${memberColor.badge}`}>
                            {m.trim()}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Add / Edit / View Modal */}
      {modalOpen && selectedDate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-[480px] rounded-[2.5rem] shadow-2xl p-8 md:p-10 space-y-6 border border-zinc-200 dark:border-zinc-800">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
                {selectedEvent ? "일정 관리" : "새 일정 등록"}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Selected Date Indicator */}
            <div className="text-xs font-black uppercase text-zinc-600 dark:text-zinc-400 tracking-widest bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-xl inline-block border border-zinc-200 dark:border-zinc-700">
              📅 {format(selectedDate, "yyyy년 MM월 dd일", { locale: ko })}
            </div>

            {/* Event Form */}
            <form onSubmit={handleSaveEvent} className="space-y-4">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">일정 제목</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="예: 전체 회의, 자재 입고 예정일"
                  className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 text-sm font-medium text-zinc-900 dark:text-white"
                />
              </div>

              {/* Target Member (Color preview & Multi-select) */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>대상 팀원 (중복 선택 가능)</span>
                </label>
                
                {/* Selected/Available Members Grid */}
                <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  {allMembers.map((member) => {
                    const isSelected = selectedMembers.includes(member);
                    return (
                      <button
                        key={member}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (selectedMembers.length > 1) {
                              setSelectedMembers(selectedMembers.filter(m => m !== member));
                            }
                          } else {
                            setSelectedMembers([...selectedMembers, member]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                          isSelected 
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-transparent shadow-sm scale-105" 
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white dark:bg-zinc-950" : "bg-zinc-400"}`} />
                        {member}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">시작일</label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/20 text-xs font-semibold text-center text-zinc-900 dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">종료일</label>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/20 text-xs font-semibold text-center text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>시작 시간</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/20 text-sm font-semibold text-center text-zinc-900 dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>종료 시간</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/20 text-sm font-semibold text-center text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>일정 상세 정보</span>
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="회의 내용, 전달사항 등을 작성해 주세요."
                  className="w-full h-24 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/20 text-xs font-semibold resize-none text-zinc-900 dark:text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                {selectedEvent && (
                  <button
                    type="button"
                    onClick={handleDeleteEvent}
                    className="p-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl font-black text-sm hover:shadow transition-all cursor-pointer flex items-center justify-center border border-zinc-200 dark:border-zinc-700"
                    title="일정 삭제"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-4 border border-zinc-200 dark:border-zinc-700 rounded-2xl font-black text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm shadow-md shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
