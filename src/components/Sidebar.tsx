"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { 
  Package, 
  Calendar, 
  Megaphone, 
  FlaskConical,
  LogOut,
  Sun,
  Moon,
  Laptop
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { theme, toggleTheme, resolvedTheme } = useTheme();

  // 4 Core Tabs (Inventory, Lab, Calendar, Notices)
  const navTabs = [
    { name: "Inventory", shortName: "재고", href: "/inventory", icon: Package },
    { name: "Lab Space", shortName: "연구실", href: "/lab", icon: FlaskConical },
    { name: "Calendar", shortName: "일정", href: "/calendar", icon: Calendar },
    { name: "Notices", shortName: "공지", href: "/notices", icon: Megaphone },
  ];

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
            {navTabs.map((item) => {
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

      {/* Mobile Bottom Bar Navigation (Clean 4-Tab Layout) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-200/80 dark:border-zinc-800/80 px-3 py-2 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-around items-center z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] select-none">
        {navTabs.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl transition-all active:scale-90 ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-black scale-105"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400" : ""}`}>
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? "font-black text-blue-600 dark:text-blue-400" : "font-semibold text-zinc-400 dark:text-zinc-500"}`}>
                {item.shortName}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

