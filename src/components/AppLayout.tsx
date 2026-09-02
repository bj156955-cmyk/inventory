"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Loader2, Package, Sun, Moon, Laptop } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { theme, toggleTheme, resolvedTheme } = useTheme();
  const isLoginPage = pathname === "/login";

  const getPageTitle = () => {
    switch (pathname) {
      case "/":
      case "/inventory":
        return "재고 관리";
      case "/lab":
        return "연구실 공간";
      case "/calendar":
        return "팀 캘린더";
      case "/chat":
        return "실시간 채팅";
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
        <Link href="/inventory" className="flex items-center gap-2.5 active:scale-95 transition-transform">
          <div className="w-7 h-7 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-600/30">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-sm tracking-tight text-zinc-900 dark:text-white">
            {getPageTitle()}
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          {/* Quick Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-blue-500 dark:hover:text-blue-400 transition-all cursor-pointer active:scale-90"
            title={`현재: ${theme === "system" ? "시스템 (" + resolvedTheme + ")" : theme === "dark" ? "다크" : "라이트"} (클릭하여 변경)`}
          >
            {theme === "system" ? (
              <Laptop className="w-4 h-4" />
            ) : resolvedTheme === "dark" ? (
              <Moon className="w-4 h-4 text-amber-300" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>

          <Link 
            href="/chat"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-transform"
          >
            <div className="w-5 h-5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white flex items-center justify-center font-headline font-black text-[9px]">
              {currentUserInitials.slice(0, 2)}
            </div>
            <span className="text-[10px] font-extrabold text-zinc-900 dark:text-white truncate max-w-[60px]">
              {currentUserInitials}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </Link>
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
