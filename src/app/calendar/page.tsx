"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
  isSameMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Clock,
  CalendarDays,
  Users,
  Trash2,
  RefreshCw,
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
    bar: "bg-blue-500",
  },
  {
    bg: "bg-emerald-50/80 dark:bg-emerald-950/40",
    border: "border-emerald-200/90 dark:border-emerald-800/60",
    text: "text-emerald-700 dark:text-emerald-300",
    accent: "bg-emerald-600 dark:bg-emerald-500",
    hoverBg: "hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50",
    badge: "bg-emerald-100/90 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  {
    bg: "bg-purple-50/80 dark:bg-purple-950/40",
    border: "border-purple-200/90 dark:border-purple-800/60",
    text: "text-purple-700 dark:text-purple-300",
    accent: "bg-purple-600 dark:bg-purple-500",
    hoverBg: "hover:bg-purple-100/70 dark:hover:bg-purple-900/50",
    badge: "bg-purple-100/90 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50",
    dot: "bg-purple-500",
    bar: "bg-purple-500",
  },
  {
    bg: "bg-amber-50/80 dark:bg-amber-950/40",
    border: "border-amber-200/90 dark:border-amber-800/60",
    text: "text-amber-700 dark:text-amber-300",
    accent: "bg-amber-600 dark:bg-amber-500",
    hoverBg: "hover:bg-amber-100/70 dark:hover:bg-amber-900/50",
    badge: "bg-amber-100/90 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  {
    bg: "bg-rose-50/80 dark:bg-rose-950/40",
    border: "border-rose-200/90 dark:border-rose-800/60",
    text: "text-rose-700 dark:text-rose-300",
    accent: "bg-rose-600 dark:bg-rose-500",
    hoverBg: "hover:bg-rose-100/70 dark:hover:bg-rose-900/50",
    badge: "bg-rose-100/90 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },
  {
    bg: "bg-cyan-50/80 dark:bg-cyan-950/40",
    border: "border-cyan-200/90 dark:border-cyan-800/60",
    text: "text-cyan-700 dark:text-cyan-300",
    accent: "bg-cyan-600 dark:bg-cyan-500",
    hoverBg: "hover:bg-cyan-100/70 dark:hover:bg-cyan-900/50",
    badge: "bg-cyan-100/90 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50",
    dot: "bg-cyan-500",
    bar: "bg-cyan-500",
  },
  {
    bg: "bg-indigo-50/80 dark:bg-indigo-950/40",
    border: "border-indigo-200/90 dark:border-indigo-800/60",
    text: "text-indigo-700 dark:text-indigo-300",
    accent: "bg-indigo-600 dark:bg-indigo-500",
    hoverBg: "hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50",
    badge: "bg-indigo-100/90 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50",
    dot: "bg-indigo-500",
    bar: "bg-indigo-500",
  },
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

// ── Helpers ────────────────────────────────────────────────────────
const parseMembers = (createdBy?: string) =>
  (createdBy || "UNKNOWN")
    .split(",")
    .map((m) => m.trim().toUpperCase())
    .filter(Boolean);

const sortEvents = (list: CalendarEvent[]) =>
  [...list].sort((a, b) => {
    const aStart = new Date(a.start_time).getTime();
    const bStart = new Date(b.start_time).getTime();
    if (aStart !== bStart) return aStart - bStart;
    return a.id.localeCompare(b.id);
  });

const isAllDayEvent = (event: CalendarEvent) => {
  const s = format(new Date(event.start_time), "HH:mm");
  const e = format(new Date(event.end_time), "HH:mm");
  return s === "00:00" && (e === "23:59" || e === "00:00");
};

const TIME_PRESETS: { label: string; start: string; end: string }[] = [
  { label: "09:00 – 10:00", start: "09:00", end: "10:00" },
  { label: "10:00 – 12:00", start: "10:00", end: "12:00" },
  { label: "14:00 – 16:00", start: "14:00", end: "16:00" },
];

// Compact event line used both inside calendar cells and in the day side panel
function EventChip({
  event,
  onOpen,
  compact = false,
  weekView = false,
}: {
  event: CalendarEvent;
  onOpen: (e: React.SyntheticEvent) => void;
  compact?: boolean;
  weekView?: boolean;
}) {
  const color = getColorForEvent(event.created_by);
  const allDay = isAllDayEvent(event);
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const timeLabel = allDay
    ? "종일"
    : weekView
    ? `${format(start, "HH:mm")}–${format(end, "HH:mm")}`
    : format(start, "HH:mm");

  return (
    <button
      type="button"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onOpen}
      title={`${event.title} · ${parseMembers(event.created_by).join(", ")}`}
      className={`w-full text-left flex items-center gap-1 rounded-md border-l-[3px] border-y border-r border-transparent pl-1.5 pr-1 py-[3px] ${color.bg} ${color.hoverBg} transition-colors cursor-pointer min-w-0`}
    >
      {!allDay && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.bar} ${compact ? "hidden" : ""}`} />
      )}
      <span className={`text-[10px] font-bold tabular-nums shrink-0 ${color.text} ${compact ? "w-[30px]" : ""}`}>
        {timeLabel}
      </span>
      <span className="text-[10.5px] font-semibold text-zinc-800 dark:text-zinc-100 truncate">
        {event.title}
      </span>
    </button>
  );
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [activeDay, setActiveDay] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<{ [key: string]: string }>({});

  const [allMembers, setAllMembers] = useState<string[]>(["BJ", "YG", "MJ", "JS", "HS", "HM", "NY", "SH", "TH"]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formIsAllDay, setFormIsAllDay] = useState(false);

  // UI states: one recurring property vs. multi-day override, member chip picker, delete confirmation
  const [showEndDate, setShowEndDate] = useState(false);
  const [endChangedManually, setEndChangedManually] = useState(false);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const memberPickerRef = useRef<HTMLDivElement>(null);

  // Drag selection states
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const currentUserInitials = user?.email?.split("@")[0].toUpperCase() || "UNKNOWN";

  // Go to Today
  const handleGoToday = () => {
    const now = new Date();
    setCurrentMonth(now);
    setActiveDay(now);
  };

  // Open New Event Modal Helper
  const openNewEventModal = useCallback((targetDate: Date = activeDay, rangeEnd?: Date) => {
    setSelectedEvent(null);
    setFormTitle("");
    setFormDesc("");
    const startStr = format(targetDate, "yyyy-MM-dd");
    const endStr = format(rangeEnd || targetDate, "yyyy-MM-dd");
    setFormStartDate(startStr);
    setFormEndDate(endStr);
    setShowEndDate(startStr !== endStr);
    setEndChangedManually(startStr !== endStr);
    setFormStartTime("09:00");
    setFormEndTime("10:00");
    setFormIsAllDay(false);
    setSelectedMembers([currentUserInitials]);
    setMemberPickerOpen(false);
    setConfirmDelete(false);
    setFormError(null);
    setModalOpen(true);
  }, [activeDay, currentUserInitials]);

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

  // Close member picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: PointerEvent) => {
      // A click inside the modal form (e.g. the 기간 추가 / 시간 preset buttons) must not
      // close the picker: those buttons re-render while under the pointer, which makes the
      // browser fire mousedown/click on different nodes. So compare against the whole form.
      const form = memberPickerRef.current?.closest("form");
      const target = e.target as Node;
      const inside = (form && form.contains(target)) || memberPickerRef.current?.contains(target);
      if (!inside) setMemberPickerOpen(false);
    };
    if (memberPickerOpen) {
      document.addEventListener("pointerdown", handleClickOutside);
    }
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [memberPickerOpen]);

  const handleDayClick = (day: Date) => {
    setActiveDay(day);
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

      setActiveDay(d1);
      setDragStart(null);
      setDragEnd(null);

      if (!isSameDay(d1, d2)) {
        // Multi-day selection → pre-fill the form with the range
        openNewEventModal(d1, d2);
      }
    }
  }, [isDragging, dragStart, dragEnd, openNewEventModal]);

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
  // A 6-week month whose last week belongs entirely to the next month is collapsed to 5 rows
  const lastWeek = days.slice(5 * 7);
  const rowsToRender =
    weekCount === 6 && lastWeek.every((d) => !isSameMonth(d, currentMonth)) ? 5 : weekCount;
  const renderedDays = days.slice(0, rowsToRender * 7);

  const eventsOnDay = useCallback(
    (day: Date) => {
      const dayStr = format(day, "yyyy-MM-dd");
      return sortEvents(
        events.filter((e) => {
          const s = format(new Date(e.start_time), "yyyy-MM-dd");
          const en = format(new Date(e.end_time), "yyyy-MM-dd");
          return dayStr >= s && dayStr <= en;
        })
      );
    },
    [events]
  );

  const activeDayEvents = eventsOnDay(activeDay);

  // Open modal to view/edit/delete event
  const openViewModal = (e: React.SyntheticEvent, event: CalendarEvent) => {
    e.stopPropagation(); // Prevent trigger day click
    e.preventDefault();
    setSelectedEvent(event);
    const startDateObj = new Date(event.start_time);
    const endDateObj = new Date(event.end_time);
    setFormTitle(event.title);
    setFormDesc(event.description || "");
    setFormStartDate(format(startDateObj, "yyyy-MM-dd"));
    setFormEndDate(format(endDateObj, "yyyy-MM-dd"));
    setShowEndDate(!isSameDay(startDateObj, endDateObj));
    setEndChangedManually(!isSameDay(startDateObj, endDateObj));
    setFormStartTime(format(startDateObj, "HH:mm"));
    setFormEndTime(format(endDateObj, "HH:mm"));
    setFormIsAllDay(isAllDayEvent(event));
    setSelectedMembers(parseMembers(event.created_by));
    setMemberPickerOpen(false);
    setConfirmDelete(false);
    setFormError(null);
    setModalOpen(true);
  };

  // Save/Update Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;

    const title = formTitle.trim();
    if (!title) {
      setFormError("일정 제목을 입력해 주세요.");
      return;
    }

    const endDate = showEndDate ? formEndDate || formStartDate : formStartDate;
    if (endDate < formStartDate) {
      setFormError("종료일이 시작일보다 빠를 수 없습니다.");
      return;
    }
    if (!formIsAllDay && showEndDate && endDate === formStartDate && formEndTime < formStartTime) {
      setFormError("종료 시간이 시작 시간보다 빠를 수 없습니다.");
      return;
    }

    // Build timestamp strings (keeps the existing storage format)
    const startStr = formIsAllDay ? `${formStartDate}T00:00:00` : `${formStartDate}T${formStartTime}:00`;
    const endStr = formIsAllDay ? `${endDate}T23:59:59` : `${endDate}T${formEndTime}:00`;

    const payload = {
      title,
      description: formDesc.trim(),
      start_time: new Date(startStr).toISOString(),
      end_time: new Date(endStr).toISOString(),
      created_by: selectedMembers.length > 0 ? selectedMembers.join(", ") : "UNKNOWN",
    };

    setSaving(true);
    setFormError(null);
    try {
      if (selectedEvent) {
        const { error } = await supabase
          .from("calendar_events")
          .update(payload)
          .eq("id", selectedEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("calendar_events")
          .insert([payload]);
        if (error) throw error;
      }
      setModalOpen(false);
      fetchEvents();
    } catch (err) {
      console.error("Error saving calendar event:", err);
      setFormError(err instanceof Error ? err.message : "일정 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Event
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
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
      setFormError("일정 삭제 중 오류가 발생했습니다.");
    }
  };

  const toggleMember = (member: string) => {
    setSelectedMembers((prev) =>
      prev.includes(member) ? (prev.length > 1 ? prev.filter((m) => m !== member) : prev) : [...prev, member]
    );
  };

  const durationLabel = (() => {
    if (!formStartDate) return "";
    const endDate = showEndDate ? formEndDate || formStartDate : formStartDate;
    const totalDays = Math.round(
      (new Date(`${endDate}T00:00:00`).getTime() - new Date(`${formStartDate}T00:00:00`).getTime()) / 86400000
    ) + 1;
    const dayText = totalDays > 1 ? `${totalDays}일` : "";
    if (formIsAllDay) return dayText ? `${dayText} · 종일` : "종일";
    if (!formStartTime || !formEndTime) return dayText;
    const [sh, sm] = formStartTime.split(":").map(Number);
    const [eh, em] = formEndTime.split(":").map(Number);
    const minutes = eh * 60 + em - (sh * 60 + sm);
    if (minutes <= 0) return dayText || `${formStartTime} 시작`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const timeText = `${h > 0 ? `${h}시간 ` : ""}${m > 0 ? `${m}분` : ""}`.trim();
    return [dayText, timeText].filter(Boolean).join(" · ");
  })();

  const activeDayLabel = `${format(activeDay, "M월 d일", { locale: ko })} ${format(activeDay, "EEEE", { locale: ko })}`;
  const activeHoliday = holidays[format(activeDay, "yyyy-MM-dd")];

  return (
    <div className="flex-1 p-2 sm:p-4 md:p-5 flex flex-col min-h-0 h-[calc(100dvh-50px-5rem)] md:h-[100dvh] max-h-[calc(100dvh-50px-5rem)] md:max-h-[100dvh] gap-2 sm:gap-3 bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
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
            <span className="text-sm sm:text-base font-black text-zinc-900 dark:text-white px-2 sm:px-3 min-w-[92px] sm:min-w-[116px] text-center tracking-tight tabular-nums">
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

      {/* Main Content */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Calendar Grid Card */}
        <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl shadow-xs border border-zinc-200/90 dark:border-zinc-800 overflow-hidden flex flex-col min-w-0 min-h-0">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-800/40 shrink-0">
            {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
              <div
                key={day}
                className={`py-2 sm:py-2.5 text-center text-[11px] sm:text-xs font-bold tracking-wider ${
                  idx === 0
                    ? "text-rose-500 dark:text-rose-400"
                    : idx === 6
                    ? "text-blue-500 dark:text-blue-400"
                    : "text-zinc-500 dark:text-zinc-400"
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
              style={{ gridTemplateRows: `repeat(${rowsToRender}, minmax(0, 1fr))` }}
            >
              {renderedDays.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const dayEvents = eventsOnDay(day);

                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());
                const holidayName = holidays[dayStr];
                const isHoliday = !!holidayName;
                const isSunday = day.getDay() === 0;
                const isSaturday = day.getDay() === 6;
                const isSelectedInDrag = (() => {
                  if (!dragStart || !dragEnd) return false;
                  const start = dragStart < dragEnd ? dragStart : dragEnd;
                  const end = dragStart < dragEnd ? dragEnd : dragStart;
                  const s = format(start, "yyyy-MM-dd");
                  const e = format(end, "yyyy-MM-dd");
                  return dayStr >= s && dayStr <= e;
                })();

                const isActive = isSameDay(day, activeDay);
                const visible = dayEvents.slice(0, 3);
                const hiddenCount = dayEvents.length - visible.length;

                return (
                  <div
                    key={day.toString()}
                    data-day={dayStr}
                    onMouseDown={() => handleMouseDown(day)}
                    onMouseEnter={() => handleMouseEnter(day)}
                    onClick={() => handleDayClick(day)}
                    className={`p-1 sm:p-1.5 flex flex-col gap-0.5 h-full min-h-0 overflow-hidden cursor-pointer select-none transition-colors ${
                      isSelectedInDrag
                        ? "bg-blue-500/10 ring-2 ring-inset ring-blue-500/40"
                        : isActive
                        ? "bg-blue-500/[0.05] dark:bg-blue-500/[0.08] ring-2 ring-inset ring-blue-600"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    } ${isCurrentMonth ? "" : "bg-zinc-50/60 dark:bg-zinc-950/40"}`}
                  >
                    {/* Day Header */}
                    <div className="flex justify-between items-center px-0.5 gap-1 shrink-0">
                      <span
                        className={`text-[11px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full shrink-0 tabular-nums ${
                          isToday
                            ? "bg-blue-600 text-white font-black shadow-xs"
                            : !isCurrentMonth
                            ? "text-zinc-300 dark:text-zinc-600"
                            : isHoliday || isSunday
                            ? "text-rose-500 dark:text-rose-400 font-extrabold"
                            : isSaturday
                            ? "text-blue-500 dark:text-blue-400 font-extrabold"
                            : "text-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      {isHoliday && isCurrentMonth && (
                        <span className="hidden md:block text-[9px] font-bold text-rose-500/90 dark:text-rose-400/90 truncate max-w-[70px] xl:max-w-[95px]">
                          {holidayName}
                        </span>
                      )}
                    </div>

                    {/* Events (desktop) */}
                    <div className="hidden sm:flex flex-col gap-[3px] flex-1 min-h-0 overflow-hidden">
                      {visible.map((event) => (
                        <EventChip key={event.id} event={event} onOpen={(e) => openViewModal(e, event)} />
                      ))}
                      {hiddenCount > 0 && (
                        <button
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDay(day);
                          }}
                          className="text-left px-1 text-[9.5px] font-bold text-zinc-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                        >
                          +{hiddenCount}개 더보기
                        </button>
                      )}
                    </div>

                    {/* Events (mobile): dot row */}
                    <div className="flex sm:hidden flex-row flex-wrap gap-0.5 px-1 items-center min-h-[6px] overflow-hidden">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${getColorForEvent(event.created_by).dot}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Day Panel (desktop) — keeps registered events clean & tappable */}
        <aside className="hidden lg:flex flex-col w-[300px] xl:w-[330px] shrink-0 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-black text-zinc-900 dark:text-white tracking-tight truncate">
                  {activeDayLabel}
                </h3>
                <p className="text-[10.5px] font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {activeHoliday ? (
                    <span className="text-rose-500 dark:text-rose-400">공휴일 · {activeHoliday}</span>
                  ) : activeDayEvents.length > 0 ? (
                    `일정 ${activeDayEvents.length}개`
                  ) : (
                    "등록된 일정 없음"
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openNewEventModal(activeDay)}
                className="w-8 h-8 shrink-0 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-sm shadow-blue-600/30 active:scale-90 transition-all cursor-pointer"
                title="이 날짜에 일정 추가"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {activeDayEvents.length === 0 ? (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center gap-2 px-6">
                <CalendarDays className="w-9 h-9 text-zinc-300 dark:text-zinc-700" />
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">이 날짜에 일정이 없습니다.</p>
                <button
                  type="button"
                  onClick={() => openNewEventModal(activeDay)}
                  className="text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  + 일정 추가하기
                </button>
              </div>
            ) : (
              activeDayEvents.map((event) => {
                const color = getColorForEvent(event.created_by);
                const allDay = isAllDayEvent(event);
                const start = new Date(event.start_time);
                const end = new Date(event.end_time);
                const multiDay = format(start, "yyyy-MM-dd") !== format(end, "yyyy-MM-dd");
                const timeText = allDay
                  ? multiDay
                    ? `${format(start, "M/d")} – ${format(end, "M/d")} · 종일`
                    : "종일"
                  : multiDay
                  ? `${format(start, "M/d HH:mm")} – ${format(end, "M/d HH:mm")}`
                  : `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={(e) => openViewModal(e, event)}
                    className="w-full text-left flex gap-2.5 p-2.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 hover:bg-white dark:hover:bg-zinc-800/70 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <span className={`w-1 self-stretch rounded-full shrink-0 ${color.bar}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold text-zinc-900 dark:text-white leading-snug break-words">
                        {event.title}
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-[10.5px] font-bold text-zinc-500 dark:text-zinc-400 tabular-nums">
                        <Clock className="w-3 h-3 shrink-0" />
                        {timeText}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1">
                        {parseMembers(event.created_by).map((m) => (
                          <span
                            key={m}
                            className={`px-1.5 py-[1px] rounded-md text-[9.5px] font-black ${color.badge}`}
                          >
                            {m}
                          </span>
                        ))}
                      </span>
                      {event.description && (
                        <span className="mt-1.5 block text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                          {event.description}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* Mobile: selected day's events under the grid */}
      <div className="lg:hidden shrink-0 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-xs px-3 py-2 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black text-zinc-900 dark:text-white truncate">{activeDayLabel}</p>
          <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 truncate">
            {activeDayEvents.length > 0
              ? activeDayEvents.map((e) => e.title).join(" · ")
              : activeHoliday || "일정 없음"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openNewEventModal(activeDay)}
          className="shrink-0 w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer"
          title="이 날짜에 일정 추가"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Add / Edit Modal — keyed so every open starts from a clean, fully-initialized form */}
      {modalOpen && formStartDate && (
        <div key={`evt-${selectedEvent?.id ?? "new"}-${formStartDate}`} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn">
          <form
            onSubmit={handleSaveEvent}
            className="bg-white dark:bg-zinc-900 w-full sm:max-w-[470px] max-h-[92dvh] sm:max-h-[90vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-start px-5 sm:px-6 pt-5 pb-3.5 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight font-headline">
                  {selectedEvent ? "일정" : "새 일정"}
                </h3>
                <p className="text-[11.5px] font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5 tabular-nums">
                  {format(new Date(`${formStartDate || format(new Date(), "yyyy-MM-dd")}T00:00:00`), "M월 d일 (E)", { locale: ko })}
                  {showEndDate && formEndDate && formEndDate !== formStartDate && (
                    <>
                      {" – "}
                      {format(new Date(`${formEndDate}T00:00:00`), "M월 d일 (E)", { locale: ko })}
                    </>
                  )}
                  <span className="text-zinc-300 dark:text-zinc-600"> · </span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{durationLabel}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 -mr-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-6 py-4 space-y-4">
              {/* Title — the only required field */}
              <input
                type="text"
                required
                autoFocus
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="일정 제목"
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 text-base font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all"
              />

              {/* Date */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="flex items-center gap-3 px-3.5 py-2.5 bg-zinc-50/70 dark:bg-zinc-800/30">
                  <CalendarDays className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormStartDate(v);
                      if (!endChangedManually || (formEndDate && v > formEndDate)) {
                        setFormEndDate(v);
                      }
                    }}
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold text-zinc-900 dark:text-white tabular-nums [color-scheme:light] dark:[color-scheme:dark] cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (showEndDate) {
                        setShowEndDate(false);
                        setFormEndDate(formStartDate);
                        setEndChangedManually(false);
                      } else {
                        setShowEndDate(true);
                        setEndChangedManually(true);
                      }
                    }}
                    className={`shrink-0 flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10.5px] font-black transition-all cursor-pointer active:scale-95 ${
                      showEndDate
                        ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                        : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    }`}
                  >
                    {showEndDate ? <ChevronUp className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    <span>{showEndDate ? "기간 일정" : "기간 추가"}</span>
                  </button>
                </div>

                {showEndDate && (
                  <div className="flex items-center gap-3 px-3.5 py-2.5 border-t border-zinc-100 dark:border-zinc-800/80 animate-fadeIn">
                    <span className="w-4 shrink-0 text-center text-[10px] font-black text-zinc-400">→</span>
                    <input
                      type="date"
                      required
                      min={formStartDate}
                      value={formEndDate}
                      onChange={(e) => {
                        setFormEndDate(e.target.value);
                        setEndChangedManually(true);
                      }}
                      className="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold text-zinc-900 dark:text-white tabular-nums [color-scheme:light] dark:[color-scheme:dark] cursor-pointer"
                    />
                  </div>
                )}

                {/* Time row */}
                <div className="flex items-center gap-2 px-3.5 py-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
                  <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                  {formIsAllDay ? (
                    <span className="flex-1 text-sm font-bold text-zinc-500 dark:text-zinc-400">하루 종일</span>
                  ) : (
                    <>
                      <input
                        type="time"
                        required
                        value={formStartTime}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFormStartTime(v);
                          if (v > formEndTime) setFormEndTime(v);
                        }}
                        className="bg-transparent outline-none text-sm font-bold text-zinc-900 dark:text-white tabular-nums [color-scheme:light] dark:[color-scheme:dark] cursor-pointer"
                      />
                      <span className="text-zinc-400 font-bold shrink-0">–</span>
                      <input
                        type="time"
                        required
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="bg-transparent outline-none text-sm font-bold text-zinc-900 dark:text-white tabular-nums [color-scheme:light] dark:[color-scheme:dark] cursor-pointer"
                      />
                      {!showEndDate && (
                        <span className="hidden xs:inline sm:inline ml-auto text-[11px] font-bold text-zinc-400 dark:text-zinc-500 tabular-nums">
                          {durationLabel}
                        </span>
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setFormIsAllDay((v) => !v)}
                    className={`ml-auto shrink-0 px-2 py-1 rounded-lg text-[10.5px] font-black transition-all cursor-pointer active:scale-95 ${
                      formIsAllDay
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    종일
                  </button>
                </div>

                {/* Quick time presets */}
                {!formIsAllDay && (
                  <div className="flex flex-wrap gap-1.5 px-3.5 pt-0.5 pb-2.5">
                    {TIME_PRESETS.map((p) => {
                      const active = formStartTime === p.start && formEndTime === p.end;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => {
                            setFormStartTime(p.start);
                            setFormEndTime(p.end);
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold tabular-nums transition-all cursor-pointer active:scale-95 ${
                            active
                              ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/40"
                              : "bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Members — compact summary + popover picker (aside from the <button> to avoid nested buttons) */}
              <div ref={memberPickerRef}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setMemberPickerOpen((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setMemberPickerOpen((v) => !v);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="flex flex-wrap items-center gap-1 min-w-0 flex-1 text-left">
                    {selectedMembers.map((m) => (
                      <span
                        key={m}
                        className={`px-1.5 py-[1px] rounded-md text-[10px] font-black ${getColorForUser(m).badge}`}
                      >
                        {m}
                      </span>
                    ))}
                    {selectedMembers.length === 0 && (
                      <span className="text-xs font-semibold text-zinc-400">참여 팀원 선택</span>
                    )}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${memberPickerOpen ? "rotate-180" : ""}`}
                  />
                </div>

                {memberPickerOpen && (
                  <div className="relative mt-2 p-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl animate-fadeIn">
                    <div className="flex flex-wrap gap-1.5">
                      {allMembers.map((member) => {
                        const isSelected = selectedMembers.includes(member);
                        return (
                          <button
                            key={member}
                            type="button"
                            onClick={() => toggleMember(member)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer active:scale-95 ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs font-black"
                                : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-blue-400"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : getColorForUser(member).dot}`} />
                            {member}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setMemberPickerOpen(false)}
                      className="mt-2 w-full py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] font-black text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                    >
                      완료
                    </button>
                  </div>
                )}
              </div>

              {/* Description (optional) */}
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="메모 (선택)"
                rows={2}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-medium resize-none text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-all"
              />

              {formError && (
                <p className="text-[11px] font-bold text-rose-500 px-1">{formError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 sm:px-6 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 flex gap-2.5">
              {selectedEvent && (
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  className={`flex items-center gap-1 px-3 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    confirmDelete
                      ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse"
                      : "border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  }`}
                  title="일정 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{confirmDelete ? "한 번 더" : "삭제"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? "저장 중..." : selectedEvent ? "저장" : "등록"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
