"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Package } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
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
        return "Atelier";
    }
  };

  const currentUserInitials = user?.email?.split("@")[0].toUpperCase() || "USER";

  if (loading) {
    return (
      <div className="min-h-screen bg-surface dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary dark:text-blue-500 animate-spin" />
          <p className="text-xs font-black tracking-widest text-primary/50 uppercase dark:text-gray-400">
            Atelier Connecting...
          </p>
        </div>
      </div>
    );
  }

  if (isLoginPage) {
    return <div className="flex-1 flex flex-col min-h-[100dvh]">{children}</div>;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] w-full bg-surface dark:bg-slate-950">
      {/* Mobile Top App Bar */}
      <header className="md:hidden sticky top-0 left-0 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.05] px-4 py-2.5 pt-[max(0.6rem,env(safe-area-inset-top))] flex items-center justify-between z-40 shadow-sm select-none">
        <Link href="/inventory" className="flex items-center gap-2 active:scale-95 transition-transform">
          <div className="w-7 h-7 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-headline font-black text-sm tracking-tight text-primary dark:text-blue-400">Atelier</span>
            <span className="text-on-surface-variant/30 text-xs">/</span>
            <span className="font-bold text-xs text-foreground dark:text-gray-200">{getPageTitle()}</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link 
            href="/chat"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low dark:bg-slate-800 rounded-xl border border-black/[0.03] dark:border-white/[0.03] active:scale-95 transition-transform"
          >
            <div className="w-5 h-5 rounded-lg bg-primary/10 dark:bg-blue-500/20 text-primary dark:text-blue-400 flex items-center justify-center font-headline font-black text-[9px]">
              {currentUserInitials.slice(0, 2)}
            </div>
            <span className="text-[10px] font-extrabold text-foreground dark:text-white truncate max-w-[60px]">
              {currentUserInitials}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
