"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { 
  Package, 
  Calendar, 
  Megaphone, 
  MessageSquare,
  Users,
  FlaskConical,
  LogOut,
  MoreHorizontal,
  X,
  ChevronRight,
  ShieldCheck,
  Sun,
  Moon,
  Laptop
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, setTheme, toggleTheme, resolvedTheme } = useTheme();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const currentUserInitials = user?.email?.split("@")[0].toUpperCase() || "USER";

  // 4 Core Mobile Tabs
  const primaryTabs = [
    { name: "Inventory", shortName: "재고", href: "/inventory", icon: Package },
    { name: "Lab Space", shortName: "연구실", href: "/lab", icon: FlaskConical },
    { name: "Calendar", shortName: "일정", href: "/calendar", icon: Calendar },
    { name: "Chat", shortName: "채팅", href: "/chat", icon: MessageSquare },
  ];

  // Secondary Features inside More Bottom Sheet
  const moreItems: Array<{
    name: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    { name: "공지사항", description: "연구실 주요 공지 및 안내", href: "/notices", icon: Megaphone },
    { name: "팀원 디렉토리", description: "등록된 팀원 및 접속 현황", href: "/members", icon: Users },
  ];

  // All desktop items
  const allDesktopItems = [
    { name: "Inventory", shortName: "재고", href: "/inventory", icon: Package },
    { name: "Lab Space", shortName: "연구실", href: "/lab", icon: FlaskConical },
    { name: "Calendar", shortName: "일정", href: "/calendar", icon: Calendar },
    { name: "Chat", shortName: "채팅", href: "/chat", icon: MessageSquare },
    { name: "Notices", shortName: "공지", href: "/notices", icon: Megaphone },
    { name: "Members", shortName: "팀원", href: "/members", icon: Users },
  ];

  const isMoreActive = ["/notices", "/members"].includes(pathname);

  return (
    <>
      {/* Desktop Sidebar (Left Fixed) */}
      <aside className="hidden md:flex flex-col items-center justify-between py-8 w-20 lg:w-24 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 min-h-screen fixed top-0 left-0 z-50">
        <div className="flex flex-col items-center space-y-10 w-full">
          {/* Logo */}
          <Link 
            href="/inventory" 
            className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all duration-300"
            title="재고 관리 홈"
          >
            <Package className="text-white w-6 h-6" />
          </Link>

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-4 w-full items-center">
            {allDesktopItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={`${item.name} (${item.shortName})`}
                  className={`group relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105"
                      : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <span className="absolute -left-1 w-1.5 h-6 bg-blue-600 rounded-r-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop Footer Actions: Theme Toggle & Logout */}
        <div className="flex flex-col items-center space-y-3">
          <button
            type="button"
            onClick={toggleTheme}
            title={`테마 변경 (현재: ${theme === "system" ? "시스템" : theme === "dark" ? "다크" : "라이트"})`}
            className="p-3 rounded-2xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-white dark:hover:bg-zinc-800 transition-all duration-200 cursor-pointer active:scale-95"
          >
            {theme === "system" ? (
              <Laptop className="w-5 h-5" />
            ) : resolvedTheme === "dark" ? (
              <Moon className="w-5 h-5 text-amber-300" />
            ) : (
              <Sun className="w-5 h-5 text-amber-500" />
            )}
          </button>

          <button 
            onClick={async () => {
              if (window.confirm("로그아웃하시겠습니까?")) {
                await signOut();
              }
            }}
            title="로그아웃 (Sign Out)" 
            className="text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 dark:text-zinc-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 p-3 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Bar Navigation (Clean 5-Tab Layout) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-200/80 dark:border-zinc-800/80 px-3 py-2 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-around items-center z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] select-none">
        {primaryTabs.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl transition-all active:scale-90 ${
                isActive
                  ? "text-zinc-900 dark:text-white font-black scale-105"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white" : ""}`}>
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? "font-black text-zinc-900 dark:text-white" : "font-semibold text-zinc-400 dark:text-zinc-500"}`}>
                {item.shortName}
              </span>
            </Link>
          );
        })}

        {/* 5th Tab: More (Bottom Sheet Trigger) */}
        <button
          type="button"
          onClick={() => setMoreSheetOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl transition-all active:scale-90 cursor-pointer ${
            isMoreActive
              ? "text-zinc-900 dark:text-white font-black scale-105"
              : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all relative ${isMoreActive ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white" : ""}`}>
            <MoreHorizontal className={`w-5 h-5 ${isMoreActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            {isMoreActive && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-zinc-900 dark:bg-white rounded-full ring-2 ring-white dark:ring-zinc-950" />
            )}
          </div>
          <span className={`text-[10px] mt-0.5 tracking-tight ${isMoreActive ? "font-black text-zinc-900 dark:text-white" : "font-semibold text-zinc-400 dark:text-zinc-500"}`}>
            더보기
          </span>
        </button>
      </nav>

      {/* Mobile More Bottom Sheet Modal */}
      {moreSheetOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            onClick={() => setMoreSheetOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn transition-opacity"
          />

          {/* Sheet Container */}
          <div className="relative bg-white dark:bg-zinc-900 rounded-t-[2.5rem] p-6 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-2xl border-t border-zinc-200 dark:border-zinc-800 space-y-6 animate-slideUp z-10">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto" />

            {/* User Profile Summary */}
            <div className="flex items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 rounded-2xl flex items-center justify-center font-headline font-black text-sm shadow-md">
                  {currentUserInitials}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white">{currentUserInitials}</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-[9px] font-black text-zinc-800 dark:text-zinc-200 rounded-md">
                      <ShieldCheck className="w-3 h-3" />
                      <span>인증됨</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate max-w-[180px]">
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMoreSheetOpen(false)}
                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items List */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider px-1">
                추가 기능 및 소통
              </h4>

              <div className="space-y-1.5">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMoreSheetOpen(false)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl transition-all active:scale-[0.98] ${
                        isActive
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-black shadow-sm"
                          : "bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200/50 dark:border-zinc-700/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isActive 
                            ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-950" 
                            : "bg-zinc-200/70 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                        }`}>
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{item.name}</span>
                          </div>
                          <p className={`text-[10px] font-medium ${isActive ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400 dark:text-zinc-500"}`}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Theme Mode Selector Section */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider px-1">
                화면 테마 설정
              </h4>
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    theme === "light"
                      ? "bg-white text-zinc-950 shadow-sm font-black"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>라이트</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    theme === "dark"
                      ? "bg-zinc-900 text-white shadow-sm font-black"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <Moon className="w-4 h-4 text-amber-300" />
                  <span>다크</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    theme === "system"
                      ? "bg-blue-600 text-white shadow-sm font-black"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <Laptop className="w-4 h-4" />
                  <span>시스템</span>
                </button>
              </div>
            </div>

            {/* Sign Out Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={async () => {
                  setMoreSheetOpen(false);
                  if (window.confirm("로그아웃하시겠습니까?")) {
                    await signOut();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-zinc-100 hover:bg-rose-500/10 dark:bg-zinc-800 dark:hover:bg-rose-500/10 text-zinc-600 hover:text-rose-500 dark:text-zinc-400 dark:hover:text-rose-400 rounded-2xl font-bold text-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

