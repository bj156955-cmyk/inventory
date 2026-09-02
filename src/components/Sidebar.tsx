"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  LayoutDashboard, 
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
  ShieldCheck
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const currentUserInitials = user?.email?.split("@")[0].toUpperCase() || "USER";

  // 5 Core Mobile Tabs
  const primaryTabs = [
    { name: "Dashboard", shortName: "홈", href: "/", icon: LayoutDashboard },
    { name: "Inventory", shortName: "재고", href: "/inventory", icon: Package },
    { name: "Lab Space", shortName: "연구실", href: "/lab", icon: FlaskConical },
    { name: "Calendar", shortName: "일정", href: "/calendar", icon: Calendar },
  ];

  // Secondary Features inside More Bottom Sheet
  const moreItems = [
    { name: "실시간 채팅", description: "팀원 간 실시간 메시지 교환", href: "/chat", icon: MessageSquare, badge: "Live" },
    { name: "공지사항", description: "연구실 주요 공지 및 안내", href: "/notices", icon: Megaphone },
    { name: "팀원 디렉토리", description: "등록된 팀원 및 접속 현황", href: "/members", icon: Users },
  ];

  // All desktop items
  const allDesktopItems = [
    { name: "Dashboard", shortName: "홈", href: "/", icon: LayoutDashboard },
    { name: "Lab Space", shortName: "연구실", href: "/lab", icon: FlaskConical },
    { name: "Inventory", shortName: "재고", href: "/inventory", icon: Package },
    { name: "Calendar", shortName: "일정", href: "/calendar", icon: Calendar },
    { name: "Notices", shortName: "공지", href: "/notices", icon: Megaphone },
    { name: "Chat", shortName: "채팅", href: "/chat", icon: MessageSquare },
    { name: "Members", shortName: "팀원", href: "/members", icon: Users },
  ];

  const isMoreActive = ["/chat", "/notices", "/members"].includes(pathname);

  return (
    <>
      {/* Desktop Sidebar (Left Fixed) */}
      <aside className="hidden md:flex flex-col items-center justify-between py-8 w-20 lg:w-24 bg-surface-container-low border-r border-black/[0.04] dark:border-white/[0.04] min-h-screen fixed top-0 left-0 z-50">
        <div className="flex flex-col items-center space-y-10 w-full">
          {/* Logo */}
          <Link 
            href="/" 
            className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
            title="Atelier Home"
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
                      ? "bg-primary text-white shadow-md scale-105"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <span className="absolute -left-1 w-1.5 h-6 bg-primary dark:bg-blue-500 rounded-r-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop Logout */}
        <button 
          onClick={async () => {
            if (window.confirm("Atelier에서 로그아웃하시겠습니까?")) {
              await signOut();
            }
          }}
          title="로그아웃 (Sign Out)" 
          className="text-on-surface-variant/70 hover:text-error hover:bg-red-50 dark:hover:bg-red-950/30 p-3 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </aside>

      {/* Mobile Bottom Bar Navigation (Clean 5-Tab Layout) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-t border-black/[0.06] dark:border-white/[0.06] px-3 py-2 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-around items-center z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] select-none">
        {primaryTabs.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl transition-all active:scale-90 ${
                isActive
                  ? "text-primary dark:text-blue-400 font-black scale-105"
                  : "text-on-surface-variant/60 dark:text-gray-400 hover:text-primary"
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? "bg-primary/10 dark:bg-blue-500/20" : ""}`}>
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? "font-black" : "font-semibold"}`}>
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
              ? "text-primary dark:text-blue-400 font-black scale-105"
              : "text-on-surface-variant/60 dark:text-gray-400 hover:text-primary"
          }`}
        >
          <div className={`p-1 rounded-xl transition-all relative ${isMoreActive ? "bg-primary/10 dark:bg-blue-500/20" : ""}`}>
            <MoreHorizontal className={`w-5 h-5 ${isMoreActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            {isMoreActive && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            )}
          </div>
          <span className={`text-[10px] mt-0.5 tracking-tight ${isMoreActive ? "font-black" : "font-semibold"}`}>
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn transition-opacity"
          />

          {/* Sheet Container */}
          <div className="relative bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-6 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-2xl border-t border-black/[0.05] dark:border-white/[0.05] space-y-6 animate-slideUp z-10">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-black/10 dark:bg-white/10 rounded-full mx-auto" />

            {/* User Profile Summary */}
            <div className="flex items-center justify-between p-4 bg-surface-container-low dark:bg-slate-800/80 rounded-2xl border border-black/[0.02] dark:border-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary text-white rounded-2xl flex items-center justify-center font-headline font-black text-sm shadow-md">
                  {currentUserInitials}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-foreground dark:text-white">{currentUserInitials}</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-[9px] font-black text-emerald-600 dark:text-emerald-400 rounded-md">
                      <ShieldCheck className="w-3 h-3" />
                      <span>인증됨</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant/60 dark:text-gray-400 font-medium truncate max-w-[180px]">
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMoreSheetOpen(false)}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-on-surface-variant/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items List */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-on-surface-variant/40 dark:text-gray-500 tracking-wider px-1">
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
                          ? "bg-primary/10 dark:bg-blue-500/20 text-primary dark:text-blue-400 font-black border border-primary/20"
                          : "bg-surface-container-lowest dark:bg-slate-800 text-foreground dark:text-gray-200 hover:bg-surface-container-low border border-black/[0.02] dark:border-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isActive ? "bg-primary text-white dark:bg-blue-500" : "bg-black/5 dark:bg-white/5 text-on-surface-variant dark:text-gray-300"
                        }`}>
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{item.name}</span>
                            {item.badge && (
                              <span className="px-1.5 py-0.2 bg-red-500 text-white text-[8px] font-black rounded-full animate-pulse">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-on-surface-variant/50 dark:text-gray-400 font-medium">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-on-surface-variant/40" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Sign Out Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={async () => {
                  setMoreSheetOpen(false);
                  if (window.confirm("Atelier에서 로그아웃하시겠습니까?")) {
                    await signOut();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl font-bold text-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Atelier 로그아웃</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

