"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { 
  Loader2, 
  Package, 
  Sun, 
  Moon, 
  Laptop, 
  LogOut, 
  ShieldCheck,
  Users,
  ChevronRight,
  ChevronDown,
  Upload,
  Download,
  FileSpreadsheet
} from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Top Bar Inventory Menu state
  const [inventoryMenuOpen, setInventoryMenuOpen] = useState(false);
  const inventoryMenuRef = useRef<HTMLDivElement>(null);

  const isLoginPage = pathname === "/login";

  // Close user dropdown & inventory menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (inventoryMenuRef.current && !inventoryMenuRef.current.contains(event.target as Node)) {
        setInventoryMenuOpen(false);
      }
    };
    if (userMenuOpen || inventoryMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen, inventoryMenuOpen]);

  const getPageTitle = () => {
    switch (pathname) {
      case "/":
      case "/inventory":
        return "재고 관리";
      case "/maintenance":
        return "장비 관리";
      case "/lab":
        return "연구실 공간";
      case "/calendar":
        return "팀 캘린더";
      case "/notices":
        return "공지사항";
      case "/members":
        return "팀원 목록";
      default:
        return "재고 관리";
    }
  };

  const currentUserInitials = user?.email?.split("@")[0].toUpperCase() || "USER";

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-xs font-black tracking-widest text-zinc-400 uppercase">
            연결 중...
          </p>
        </div>
      </div>
    );
  }

  if (isLoginPage) {
    return <div className="flex-1 flex flex-col min-h-[100dvh]">{children}</div>;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Mobile Top App Bar */}
      <header className="md:hidden sticky top-0 left-0 w-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 px-4 py-2.5 pt-[max(0.6rem,env(safe-area-inset-top))] flex items-center justify-between z-40 shadow-sm select-none">
        {/* Inventory Title & Dropdown Trigger */}
        <div className="relative" ref={inventoryMenuRef}>
          <button
            type="button"
            onClick={() => {
              if (pathname === "/inventory" || pathname === "/") {
                setInventoryMenuOpen(!inventoryMenuOpen);
              }
            }}
            className="flex items-center gap-2.5 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-7 h-7 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-600/30">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-1">
              <span className="font-black text-sm tracking-tight text-zinc-900 dark:text-white">
                {getPageTitle()}
              </span>
              {(pathname === "/inventory" || pathname === "/") && (
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${inventoryMenuOpen ? "rotate-180" : ""}`} />
              )}
            </div>
          </button>

          {/* Top Bar Dropdown Menu */}
          {inventoryMenuOpen && (pathname === "/inventory" || pathname === "/") && (
            <div className="absolute left-0 top-full mt-2.5 w-60 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-2 z-50 animate-fadeIn space-y-1">
              {/* 1. Import */}
              <button
                type="button"
                onClick={() => {
                  setInventoryMenuOpen(false);
                  window.dispatchEvent(new CustomEvent("inventory-import"));
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-zinc-800 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs transition-all cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs">Import</div>
                  <div className="text-[10px] text-zinc-400 font-normal">엑셀 파일로 일괄 등록</div>
                </div>
              </button>

              {/* 2. Export */}
              <button
                type="button"
                onClick={() => {
                  setInventoryMenuOpen(false);
                  window.dispatchEvent(new CustomEvent("inventory-export"));
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-zinc-800 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold text-xs transition-all cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs">Export</div>
                  <div className="text-[10px] text-zinc-400 font-normal">현재 재고 목록 엑셀 저장</div>
                </div>
              </button>

              {/* 3. 양식 다운로드 */}
              <button
                type="button"
                onClick={() => {
                  setInventoryMenuOpen(false);
                  window.dispatchEvent(new CustomEvent("inventory-download-template"));
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-zinc-800 dark:text-zinc-200 hover:text-amber-600 dark:hover:text-amber-400 font-bold text-xs transition-all cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs">양식 다운로드</div>
                  <div className="text-[10px] text-zinc-400 font-normal">등록용 엑셀 양식 받기</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* User Avatar & Dropdown Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center relative font-headline font-black text-[11px] text-zinc-900 dark:text-zinc-100 shadow-sm transition-all duration-200 cursor-pointer active:scale-90"
            title="사용자 메뉴 및 테마 설정"
          >
            <span>{currentUserInitials.slice(0, 2)}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 absolute -bottom-0.5 -right-0.5 animate-pulse" />
          </button>

          {/* User Popover Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-11 w-64 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-3.5 z-50 animate-fadeIn">
              
              {/* User Header */}
              <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-headline font-black text-xs shadow-sm shadow-blue-600/30 shrink-0">
                  {currentUserInitials.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-zinc-900 dark:text-white truncate">{currentUserInitials}</span>
                    <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-emerald-500/15 border border-emerald-500/30 text-[8px] font-black text-emerald-400 rounded shrink-0">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      <span>인증</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Members Directory Link Button */}
              <Link
                href="/members"
                onClick={() => setUserMenuOpen(false)}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all active:scale-[0.98] ${
                  pathname === "/members"
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-500"
                    : "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 border-zinc-200/60 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    pathname === "/members"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-500/15 text-blue-500 dark:text-blue-400"
                  }`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold">팀원 디렉토리</div>
                    <div className="text-[9px] text-zinc-400 dark:text-zinc-500">접속 현황 및 멤버 관리</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </Link>

              {/* Theme Settings Selector */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider px-0.5 block">
                  화면 테마 설정
                </span>
                <div className="grid grid-cols-3 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      theme === "light"
                        ? "bg-white text-zinc-950 shadow-sm font-black"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>라이트</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      theme === "dark"
                        ? "bg-zinc-900 text-white shadow-sm font-black"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-amber-300" />
                    <span>다크</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("system")}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      theme === "system"
                        ? "bg-blue-600 text-white shadow-sm font-black"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>시스템</span>
                  </button>
                </div>
              </div>

              {/* Logout Button */}
              <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={async () => {
                    setUserMenuOpen(false);
                    if (window.confirm("로그아웃하시겠습니까?")) {
                      await signOut();
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-zinc-100 hover:bg-rose-500/10 dark:bg-zinc-800 dark:hover:bg-rose-500/10 text-zinc-600 hover:text-rose-500 dark:text-zinc-400 dark:hover:text-rose-400 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>로그아웃</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </header>

      {/* Responsive Sidebar */}
      <Sidebar />
      
      {/* Main App Content Area */}
      <main className="flex-1 md:pl-20 lg:pl-24 pb-20 md:pb-0 min-h-[calc(100dvh-50px)] md:min-h-[100dvh] flex flex-col overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
