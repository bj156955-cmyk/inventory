"use client";

import React, { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { CalendarEvent, PublicHoliday, AllowedUser } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  startOfMonth,
  format,
  addMonths,
  startOfWeek,
  addDays,
  differenceInCalendarDays,
} from "date-fns";
import { ko } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Minus,
  X,
  Clock,
  CalendarDays,
  Users,
  Trash2,
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

// ── Helpers ────────────────────────────────────────────────────────
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const WAVE_HEIGHT = 24; // px per event lane inside a week
const MAX_LANES = 4;
const WEEK_MIN_HEIGHT = 108;
const RENDER_RANGE = 3; // months kept mounted around the focused month

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const sameDay = (a: Date, b: Date) => format(a, "yyyy-MM-dd") === format(b, "yyyy-MM-dd");
const clampNum = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const TIME_PRESETS: { label: string; start: string; end: string }[] = [
  { label: "09:00 – 10:00", start: "09:00", end: "10:00" },
  { label: "10:00 – 12:00", start: "10:00", end: "12:00" },
  { label: "14:00 – 16:00", start: "14:00", end: "16:00" },
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

const getColorForEvent = (createdBy?: string) => getColorForUser(createdBy);

const parseMembers = (createdBy?: string) =>
  (createdBy || "UNKNOWN")
    .split(",")
    .map((m) => m.trim().toUpperCase())
    .filter(Boolean);

const isAllDayEvent = (event: CalendarEvent) => {
  const s = format(new Date(event.start_time), "HH:mm");
  const e = format(new Date(event.end_time), "HH:mm");
  return s === "00:00" && (e === "23:59" || e === "00:00");
};

const sortEvents = (list: CalendarEvent[]) =>
  [...list].sort((a, b) => {
    const aStart = new Date(a.start_time).getTime();
    const bStart = new Date(b.start_time).getTime();
    if (aStart !== bStart) return aStart - bStart;
    return a.id.localeCompare(b.id);
  });

type WeekSegment = { event: CalendarEvent; col: number; span: number; lane: number; multiDay: boolean };
type Week = { start: Date; days: Date[]; segments: WeekSegment[]; laneCount: number };

/** Turns events into week rows, splitting multi-day events into contiguous segments per week. */
const buildWeeks = (weeks: Date[][], events: CalendarEvent[]): Week[] =>
  weeks.map((days) => {
    const weekStart = days[0];
    const weekEnd = endOfDay(days[6]);
    const overlapping = sortEvents(
      events.filter((ev) => {
        const s = new Date(ev.start_time);
        const e = new Date(ev.end_time);
        return s <= weekEnd && e >= startOfDay(weekStart);
      })
    );

    // Lane assignment: find the first lane whose last column ends before this event starts
    const laneEnds: number[] = [];
    const segments: WeekSegment[] = overlapping.map((event) => {
      const fromStart = differenceInCalendarDays(new Date(event.start_time), weekStart);
      const fromEnd = differenceInCalendarDays(new Date(event.end_time), weekStart);
      const col = clampNum(fromStart, 0, 6);
      const endCol = Math.max(col, clampNum(fromEnd, 0, 6));
      let lane = laneEnds.findIndex((end) => end < col);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(endCol);
      } else {
        laneEnds[lane] = endCol;
      }
      const multiDay = differenceInCalendarDays(new Date(event.end_time), new Date(event.start_time)) > 0;
      return { event, col, span: endCol - col + 1, lane, multiDay };
    });

    return { start: startOfDay(weekStart), days, segments, laneCount: Math.min(laneEnds.length, MAX_LANES) };
  });

/** Compact event line used in the day side panel and the mobile list. */
function EventListItem({ event, onOpen }: { event: CalendarEvent; onOpen: (e: React.SyntheticEvent) => void }) {
  const color = getColorForEvent(event.created_by);
  const allDay = isAllDayEvent(event);
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const multiDay = !sameDay(start, end);
  const timeText = allDay
    ? multiDay
      ? `${format(start, "M/d")} – ${format(end, "M/d")} · 종일`
      : "종일"
    : multiDay
    ? `${format(start, "M/d HH:mm")} – ${format(end, "M/d HH:mm")}`
    : `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;

  return (
    <button
      type="button"
      onClick={(e) => onOpen(e)}
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
            <span key={m} className={`px-1.5 py-[1px] rounded-md text-[9.5px] font-black ${color.badge}`}>
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
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [activeDay, setActiveDay] = useState<Date>(() => startOfDay(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<{ [key: string]: string }>(FALLBACK_HOLIDAYS);

  const [allMembers, setAllMembers] = useState<string[]>(["BJ", "YG", "MJ", "JS", "HS", "HM", "NY", "SH", "TH"]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Modal + form states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formIsAllDay, setFormIsAllDay] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const memberPickerRef = useRef<HTMLDivElement>(null);

  // Drag-to-select state (refs drive the pointer logic; state only renders the highlight)
  const [dragRange, setDragRange] = useState<{ start: Date; end: Date } | null>(null);
  const dragStartRef = useRef<Date | null>(null);
  const dragMovedRef = useRef(false);
  const dragStartPointRef = useRef<{ x: number; y: number } | null>(null);

  // Scrolling calendar state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const scrollRafRef = useRef<number | null>(null);
  const [focusedMonthIndex, setFocusedMonthIndex] = useState(RENDER_RANGE);
  const [renderFirst, setRenderFirst] = useState(RENDER_RANGE - 1);
  const [renderLast, setRenderLast] = useState(RENDER_RANGE + 1);

  const currentUserInitials = user?.email?.split("@")[0].toUpperCase() || "UNKNOWN";

  // Month list: RENDER_RANGE months before/after the current one
  const months = React.useMemo(() => {
    const base = startOfMonth(new Date());
    return Array.from({ length: RENDER_RANGE * 2 + 1 }, (_, i) => addMonths(base, i - RENDER_RANGE));
  }, []);
  const maxMonthIndex = months.length - 1;
  const focusedMonth = months[focusedMonthIndex];

  // 고정 6주(42일) 그리드 — 모든 달이 같은 높이를 가져서 페이지 넘김이 흔들리지 않는다
  const ROWS_PER_MONTH = 6;
  const monthGrids = React.useMemo(
    () =>
      months.map((m) => {
        const start = startOfWeek(startOfMonth(m));
        return Array.from({ length: ROWS_PER_MONTH }, (_, r) =>
          Array.from({ length: 7 }, (_, c) => addDays(start, r * 7 + c))
        );
      }),
    [months]
  );

  const focusedWeeks = React.useMemo(() => buildWeeks(monthGrids[focusedMonthIndex], events), [monthGrids, focusedMonthIndex, events]);
  const focusedLaneCount = Math.max(0, ...focusedWeeks.map((w) => w.laneCount));
  const naturalRow = Math.max(WEEK_MIN_HEIGHT, 28 + Math.max(focusedLaneCount, 1) * WAVE_HEIGHT + 8);
  // 한 달 = 화면 한 장. 뷰포트 높이를 6주로 나눠 행 높이를 정하고, 일정이 많으면 그만큼만 늘린다.
  // 한 달 블록 = 월 제목 30 + 패딩 12/8 + 테두리 2 = 52px, 그 아래 6주가 화면을 꽉 채운다
  const MONTH_CHROME = 52;
  const rowHeight =
    viewportHeight > 0 ? Math.max((viewportHeight - MONTH_CHROME) / ROWS_PER_MONTH, naturalRow) : naturalRow;
  const pageUnit = rowHeight * ROWS_PER_MONTH + MONTH_CHROME;

  const eventsOnDay = useCallback(
    (day: Date) =>
      sortEvents(
        events.filter((e) => day >= startOfDay(new Date(e.start_time)) && day <= endOfDay(new Date(e.end_time)))
      ),
    [events]
  );
  const activeDayEvents = eventsOnDay(activeDay);

  // ── Data ──────────────────────────────────────────────────────────
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase.from("calendar_events").select("*");
      if (error) throw error;
      const fetchedEvents = data || [];
      setEvents(fetchedEvents);

      const creators = fetchedEvents
        .map((e) => e.created_by)
        .filter(Boolean)
        .flatMap((c: string) => c.split(",").map((m: string) => m.trim().toUpperCase()))
        .filter(Boolean);
      setAllMembers((prev) => Array.from(new Set([...prev, ...creators])));
    } catch (err) {
      console.error("Error fetching calendar events:", err);
    } finally {
      setLoading(false);
    }
  };

  // 공휴일 (연 단위, 실패 시 fallback 표 유지)
  useEffect(() => {
    let cancelled = false;
    const loadYear = async (year: number) => {
      try {
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`);
        if (!res.ok) throw new Error("API response error");
        const data = (await res.json()) as PublicHoliday[];
        if (cancelled) return;
        const map: { [key: string]: string } = {};
        data.forEach((h) => {
          map[h.date] = h.localName;
        });
        setHolidays((prev) => ({ ...prev, ...map }));
      } catch {
        // keep fallback holidays
      }
    };
    Array.from(new Set(months.map((m) => m.getFullYear()))).forEach(loadYear);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadCalendarData = async () => {
      try {
        const { data: eventData, error: eventError } = await supabase.from("calendar_events").select("*");
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
        if (!ignore) setAllMembers((prev) => Array.from(new Set([...prev, ...creators, ...userList])));
      } catch (err) {
        console.error("Error loading calendar data:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadCalendarData();

    const channel = supabase
      .channel("calendar-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // Close member picker on outside click (whole form counts as "inside")
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const form = memberPickerRef.current?.closest("form");
      const target = e.target as Node;
      const inside = (form && form.contains(target)) || memberPickerRef.current?.contains(target);
      if (!inside) setMemberPickerOpen(false);
    };
    if (memberPickerOpen) document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [memberPickerOpen]);

  // ── Modal openers ─────────────────────────────────────────────────
  const openNewEventModal = useCallback(
    (targetDate: Date, rangeEnd?: Date) => {
      setSelectedEvent(null);
      setFormTitle("");
      setFormDesc("");
      const startStr = format(targetDate, "yyyy-MM-dd");
      const endStr = format(rangeEnd || targetDate, "yyyy-MM-dd");
      setFormStartDate(startStr);
      setFormEndDate(endStr);
      setShowEndDate(startStr !== endStr);
      setFormStartTime("09:00");
      setFormEndTime("10:00");
      setFormIsAllDay(false);
      setSelectedMembers([currentUserInitials]);
      setMemberPickerOpen(false);
      setConfirmDelete(false);
      setFormError(null);
      setModalOpen(true);
    },
    [currentUserInitials]
  );

  const openViewModal = (e: React.SyntheticEvent, event: CalendarEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedEvent(event);
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    setFormTitle(event.title);
    setFormDesc(event.description || "");
    setFormStartDate(format(start, "yyyy-MM-dd"));
    setFormEndDate(format(end, "yyyy-MM-dd"));
    setShowEndDate(!sameDay(start, end));
    setFormStartTime(format(start, "HH:mm"));
    setFormEndTime(format(end, "HH:mm"));
    setFormIsAllDay(isAllDayEvent(event));
    setSelectedMembers(parseMembers(event.created_by));
    setMemberPickerOpen(false);
    setConfirmDelete(false);
    setFormError(null);
    setActiveDay(startOfDay(start));
    setModalOpen(true);
  };

  // ── Click / drag to create ────────────────────────────────────────
  const handleDayPointerDown = (day: Date, e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const d = startOfDay(day);
    dragStartRef.current = d;
    dragMovedRef.current = false;
    dragStartPointRef.current = { x: e.clientX, y: e.clientY };
    setDragRange({ start: d, end: d });
    if (e.pointerType === "mouse") e.preventDefault(); // avoid text selection while dragging
  };

  const handleDayPointerEnter = (day: Date) => {
    const start = dragStartRef.current;
    if (!start) return;
    const d = startOfDay(day);
    dragMovedRef.current = true;
    setDragRange({ start: start < d ? start : d, end: start < d ? d : start });
  };

  useEffect(() => {
    const finish = () => {
      const start = dragStartRef.current;
      if (!start) return;
      const range = dragRange && dragStartRef.current ? dragRange : { start, end: start };
      dragStartRef.current = null;
      dragMovedRef.current = false;
      dragStartPointRef.current = null;
      setDragRange(null);

      setActiveDay(range.start);
      // 날짜 클릭 = 하루 일정, 여러 날 끌기 = 기간 일정 → 바로 등록 폼
      openNewEventModal(range.start, sameDay(range.start, range.end) ? undefined : range.end);
    };
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [dragRange, openNewEventModal]);

  // ── Scrolling calendar (한 달 = 한 화면, 스크롤하면 다음 달) ──────────
  // 모든 달의 높이가 같으므로 N번째 달의 페이지는 N * pageUnit 에서 시작한다.
  const pageTop = (index: number) => index * pageUnit;

  const measureViewport = () => {
    const el = scrollRef.current;
    if (el) setViewportHeight(el.clientHeight);
  };

  const jumpToMonth = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = clampNum(index, 0, months.length - 1);
    setFocusedMonthIndex(idx);
    setRenderFirst(Math.max(0, idx - 1));
    setRenderLast(Math.min(months.length - 1, idx + 1));
    el.scrollTo({ top: pageTop(idx), behavior: "smooth" });
  };

  // Track the month filling the screen after each scroll frame
  const handleScroll = () => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      const idx = clampNum(Math.round(el.scrollTop / pageUnit), 0, months.length - 1);
      setFocusedMonthIndex((prev) => {
        if (prev === idx) return prev;
        setRenderFirst(Math.max(0, idx - 1));
        setRenderLast(Math.min(months.length - 1, idx + 1));
        return idx;
      });
    });
  };

  // Once the user stops scrolling, land exactly on a month page
  const snapTimerRef = useRef<number | null>(null);
  const scheduleSnap = () => {
    if (snapTimerRef.current !== null) window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = window.setTimeout(() => {
      snapTimerRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      const idx = clampNum(Math.round(el.scrollTop / pageUnit), 0, months.length - 1);
      const target = pageTop(idx);
      if (Math.abs(el.scrollTop - target) > 2) el.scrollTo({ top: target, behavior: "smooth" });
    }, 140);
  };

  const handleGoToday = () => {
    setActiveDay(startOfDay(new Date()));
    jumpToMonth(RENDER_RANGE);
  };

  // ── Save / delete ─────────────────────────────────────────────────
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
        const { error } = await supabase.from("calendar_events").update(payload).eq("id", selectedEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("calendar_events").insert([payload]);
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

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      const { error } = await supabase.from("calendar_events").delete().eq("id", selectedEvent.id);
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
    const totalDays =
      Math.round((new Date(`${endDate}T00:00:00`).getTime() - new Date(`${formStartDate}T00:00:00`).getTime()) / 86400000) + 1;
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

  // ── Calendar grid renderer ───────────────────────────────────────
  const initialScrollDone = useRef(false);

  // 캘린더 스크롤 영역 높이 측정 (창 크기 변경·폰트 로딩 후에도 다시 측정)
  useLayoutEffect(() => {
    measureViewport();
    const onResize = () => measureViewport();
    window.addEventListener("resize", onResize);
    const t = window.setTimeout(measureViewport, 300);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(t);
    };
  }, [loading]);

  // 오늘 달을 한 화면에 맞춰 시작
  useLayoutEffect(() => {
    if (loading || viewportHeight === 0 || initialScrollDone.current) return;
    const el = scrollRef.current;
    if (!el) return;
    initialScrollDone.current = true;
    el.scrollTop = pageTop(RENDER_RANGE);
    const id = window.requestAnimationFrame(() => {
      el.scrollTop = pageTop(RENDER_RANGE);
    });
    return () => window.cancelAnimationFrame(id);
    // pageTop 은 뷰포트 높이가 바뀔 때만 달라진다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, viewportHeight, pageUnit]);

  const renderMonth = (monthIndex: number) => {
    const m = months[monthIndex];
    const rows = monthGrids[monthIndex];
    const weeks = buildWeeks(rows, events);
    const inMonth = (d: Date) => d.getMonth() === m.getMonth();

    return (
      <div
        key={monthIndex}
        data-month={format(m, "yyyy-MM")}
        className="px-1 sm:px-2 pt-3 pb-2"
      >
        {/* Sticky month label */}
        <div className="sticky top-0 z-30 h-[30px] bg-white dark:bg-zinc-900 flex items-center gap-2">
          <span className="text-sm font-black text-zinc-900 dark:text-white tracking-tight tabular-nums">
            {format(m, "yyyy년 M월", { locale: ko })}
          </span>
          <span className="h-px flex-1 bg-zinc-200/80 dark:bg-zinc-800" />
        </div>

        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
          {weeks.map((week, wi) => (
            <div
              key={wi}
              className="relative grid grid-cols-7 divide-x divide-zinc-200/70 dark:divide-zinc-800/70 bg-white dark:bg-zinc-900"
              style={{ height: rowHeight }}
            >
              {/* Day backgrounds */}
              {week.days.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const dow = day.getDay();
                const holiday = holidays[dayStr];
                const isToday = sameDay(day, new Date());
                const isActive = sameDay(day, activeDay);
                const inRange = !!dragRange && day >= dragRange.start && day <= dragRange.end;
                const thisMonth = inMonth(day);
                return (
                  <div
                    key={dayStr}
                    data-day={dayStr}
                    onPointerEnter={() => handleDayPointerEnter(day)}
                    className={`relative flex flex-col min-h-0 overflow-hidden select-none cursor-pointer transition-colors ${
                      inRange
                        ? "bg-blue-500/15"
                        : isActive
                        ? "bg-blue-500/[0.06] dark:bg-blue-500/[0.09]"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    } ${thisMonth ? "" : "bg-zinc-50/70 dark:bg-zinc-950/50"}`}
                  >
                    <div className="flex items-center gap-1 px-1.5 pt-1">
                      <span
                        className={`text-[11px] sm:text-xs w-5 h-5 flex items-center justify-center rounded-full shrink-0 tabular-nums ${
                          isToday
                            ? "bg-blue-600 text-white font-black"
                            : !thisMonth
                            ? "text-zinc-300 dark:text-zinc-600 font-bold"
                            : dow === 0 || holiday
                            ? "text-rose-500 dark:text-rose-400 font-extrabold"
                            : dow === 6
                            ? "text-blue-500 dark:text-blue-400 font-extrabold"
                            : "text-zinc-700 dark:text-zinc-200 font-bold"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      {holiday && thisMonth && (
                        <span className="hidden xl:block text-[9px] font-bold text-rose-500/90 dark:text-rose-400/90 truncate">
                          {holiday}
                        </span>
                      )}
                    </div>

                    {/* Mobile: dots */}
                    <div className="sm:hidden flex flex-wrap gap-0.5 px-1.5 pt-0.5">
                      {week.segments
                        .filter((s) => sameDay(week.days[s.col], day) || (day >= week.days[0] && colOf(week, day) >= s.col && colOf(week, day) < s.col + s.span))
                        .slice(0, 3)
                        .map((s) => (
                          <span key={s.event.id} className={`w-1.5 h-1.5 rounded-full ${getColorForEvent(s.event.created_by).dot}`} />
                        ))}
                    </div>
                  </div>
                );
              })}

              {/* Continuous event bars (desktop/tablet). Mobile uses dots + the day bar below the grid. */}
              <div className="hidden sm:block">
              {week.segments
                .filter((s) => s.lane < MAX_LANES)
                .map(({ event, col, span, lane, multiDay }) => {
                  const color = getColorForEvent(event.created_by);
                  const start = new Date(event.start_time);
                  const end = new Date(event.end_time);
                  const isStart = sameDay(start, week.days[col]);
                  const isEnd = sameDay(end, week.days[col + span - 1]);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        openViewModal(e, event);
                      }}
                      title={`${event.title} · ${parseMembers(event.created_by).join(", ")}`}
                      style={{
                        left: `calc(${(col / 7) * 100}% + 3px)`,
                        width: `calc(${(span / 7) * 100}% - 6px)`,
                        top: 26 + lane * WAVE_HEIGHT,
                        borderTopLeftRadius: isStart ? 7 : 0,
                        borderBottomLeftRadius: isStart ? 7 : 0,
                        borderTopRightRadius: isEnd ? 7 : 0,
                        borderBottomRightRadius: isEnd ? 7 : 0,
                      }}
                      className={`absolute z-10 h-[20px] flex items-center gap-1.5 px-1.5 overflow-hidden cursor-pointer border ${color.bg} ${multiDay ? color.border : "border-transparent"} ${color.hoverBg} transition-colors`}
                    >
                      {isStart && !isAllDayEvent(event) && (
                        <span className={`text-[9.5px] font-black tabular-nums shrink-0 ${color.text}`}>
                          {format(start, "HH:mm")}
                        </span>
                      )}
                      <span className="text-[10.5px] font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                        {span > 1 && !isStart ? "‹ " : ""}
                        {event.title}
                        {span > 1 && !isEnd ? " ›" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  function colOf(week: Week, day: Date) {
    return differenceInCalendarDays(day, week.start);
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-2 sm:p-4 md:p-5 flex flex-col min-h-0 h-[calc(100dvh-50px-5rem)] md:h-[100dvh] max-h-[calc(100dvh-50px-5rem)] md:max-h-[100dvh] gap-2 sm:gap-3 bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Top bar — no add button: 날짜를 눌러서 등록 */}
      <div className="flex items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => jumpToMonth(clampNum(focusedMonthIndex - 1, 0, maxMonthIndex))}
            className="w-8 h-9 flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-xl shadow-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer active:scale-95"
            title="이전 달"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm sm:text-base font-black text-zinc-900 dark:text-white tabular-nums min-w-[92px] text-center">
            {format(focusedMonth, "yyyy. MM", { locale: ko })}
          </span>
          <button
            type="button"
            onClick={() => jumpToMonth(clampNum(focusedMonthIndex + 1, 0, maxMonthIndex))}
            className="w-8 h-9 flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-xl shadow-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer active:scale-95"
            title="다음 달"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleGoToday}
            className="px-3 py-2 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            오늘
          </button>
        </div>
        {dragRange ? (
          <p className="flex items-center gap-1.5 text-[11px] font-black text-blue-600 dark:text-blue-400 shrink-0 tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            {sameDay(dragRange.start, dragRange.end)
              ? `${format(dragRange.start, "M월 d일", { locale: ko })} 선택됨`
              : `${format(dragRange.start, "M.d", { locale: ko })} – ${format(dragRange.end, "M.d", { locale: ko })} · ${
                  differenceInCalendarDays(dragRange.end, dragRange.start) + 1
                }일 선택`}
          </p>
        ) : (
          <p className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 shrink-0">
            <CalendarDays className="w-3.5 h-3.5" />
            날짜 클릭 또는 여러 날 드래그로 일정 등록
          </p>
        )}
      </div>

      <div className="flex-1 flex gap-3 min-h-0">
        {/* Scrolling calendar */}
        <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl shadow-xs border border-zinc-200/90 dark:border-zinc-800 overflow-hidden flex flex-col min-w-0 min-h-0">
          <div className="grid grid-cols-7 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/90 dark:bg-zinc-800/40 shrink-0">
            {WEEKDAYS.map((day, idx) => (
              <div
                key={day}
                className={`py-2 text-center text-[11px] sm:text-xs font-bold tracking-wider ${
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

          {/* 스크롤 영역은 항상 마운트한다 (로딩 중에도 높이를 측정해 한 달=한 화면을 유지) */}
          <div
            ref={scrollRef}
            onScroll={() => {
              handleScroll();
              scheduleSnap();
            }}
            onPointerDown={(e) => {
              const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-day]");
              if (!cell?.dataset.day) return;
              handleDayPointerDown(new Date(`${cell.dataset.day}T00:00:00`), e);
            }}
            /* relative: 자식 달 블록의 offsetTop 을 스크롤 영역 기준 0부터 계산하기 위함 */
            className="relative flex-1 overflow-y-auto overscroll-contain custom-scrollbar min-h-0 touch-pan-y select-none"
          >
            {loading ? (
              <div className="h-full flex items-center justify-center p-20">
                <span className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              </div>
            ) : (
              <>
                {months.map((m, idx) => {
                  if (idx < renderFirst || idx > renderLast) {
                    // 렌더되지 않는 달도 같은 높이(6주)로 자리를 잡아 스크롤 위치가 튀지 않게 한다
                    return (
                      <div key={idx} className="px-1 sm:px-2 pt-3 pb-2" data-placeholder>
                        <div className="h-[30px]" />
                        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
                          {Array.from({ length: ROWS_PER_MONTH }, (_, i) => (
                            <div key={i} style={{ height: `${rowHeight}px` }} className="bg-white dark:bg-zinc-900" />
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return renderMonth(idx);
                })}
                <div className="h-4" />
              </>
            )}
          </div>
        </div>

        {/* Day panel (desktop) */}
        <aside className="hidden lg:flex flex-col w-[300px] xl:w-[330px] shrink-0 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-black text-zinc-900 dark:text-white tracking-tight truncate">{activeDayLabel}</h3>
                <p className="text-[10.5px] font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {activeHoliday ? (
                    <span className="text-rose-500 dark:text-rose-400">공휴일 · {activeHoliday}</span>
                  ) : activeDayEvents.length > 0 ? (
                    `일정 ${activeDayEvents.length}개`
                  ) : (
                    "이 날짜를 클릭하면 일정이 등록됩니다"
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {activeDayEvents.length === 0 ? (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center gap-2 px-6">
                <CalendarDays className="w-9 h-9 text-zinc-300 dark:text-zinc-700" />
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">이 날짜에 일정이 없습니다.</p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
                  달력에서 날짜를 누르면 바로 등록할 수 있어요.
                </p>
              </div>
            ) : (
              activeDayEvents.map((event) => <EventListItem key={event.id} event={event} onOpen={(e) => openViewModal(e, event)} />)
            )}
          </div>
        </aside>
      </div>

      {/* Mobile: selected day's events under the grid */}
      <div className="lg:hidden shrink-0 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-xs px-3 py-2 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black text-zinc-900 dark:text-white truncate">{activeDayLabel}</p>
          <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 truncate">
            {activeDayEvents.length > 0 ? activeDayEvents.map((e) => e.title).join(" · ") : activeHoliday || "일정 없음"}
          </p>
        </div>
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
                  {format(new Date(`${formStartDate}T00:00:00`), "M월 d일 (E)", { locale: ko })}
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
              <input
                type="text"
                required
                autoFocus
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="일정 제목"
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 text-base font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all"
              />

              {/* Date block */}
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
                      if (!showEndDate || !formEndDate || v > formEndDate) setFormEndDate(v);
                    }}
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold text-zinc-900 dark:text-white tabular-nums [color-scheme:light] dark:[color-scheme:dark] cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (showEndDate) {
                        setShowEndDate(false);
                        setFormEndDate(formStartDate);
                      } else {
                        setShowEndDate(true);
                      }
                    }}
                    className={`shrink-0 flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10.5px] font-black transition-all cursor-pointer active:scale-95 ${
                      showEndDate
                        ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                        : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    }`}
                  >
                    {showEndDate ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    <span>{showEndDate ? "종료일 삭제" : "기간 추가"}</span>
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
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold text-zinc-900 dark:text-white tabular-nums [color-scheme:light] dark:[color-scheme:dark] cursor-pointer"
                    />
                  </div>
                )}

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

              {/* Members */}
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
                      <span key={m} className={`px-1.5 py-[1px] rounded-md text-[10px] font-black ${getColorForUser(m).badge}`}>
                        {m}
                      </span>
                    ))}
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

              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="메모 (선택)"
                rows={2}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-medium resize-none text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-all"
              />

              {formError && <p className="text-[11px] font-bold text-rose-500 px-1">{formError}</p>}
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
