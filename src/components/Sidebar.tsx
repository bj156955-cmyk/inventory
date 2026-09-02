"use client";

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
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  const menuItems = [
    { name: "Dashboard", shortName: "홈", href: "/", icon: LayoutDashboard },
    { name: "Lab Space", shortName: "연구실", href: "/lab", icon: FlaskConical },
    { name: "Inventory", shortName: "재고", href: "/inventory", icon: Package },
    { name: "Calendar", shortName: "일정", href: "/calendar", icon: Calendar },
    { name: "Notices", shortName: "공지", href: "/notices", icon: Megaphone },
    { name: "Chat", shortName: "채팅", href: "/chat", icon: MessageSquare },
    { name: "Members", shortName: "팀원", href: "/members", icon: Users },
  ];

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
            {menuItems.map((item) => {
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

      {/* Mobile Bottom Bar Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-black/[0.04] dark:border-white/[0.04] px-1.5 sm:px-4 py-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-around items-center z-50 shadow-[0_-4px_25px_rgba(0,0,0,0.04)] select-none">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
                isActive
                  ? "text-primary dark:text-blue-400 font-extrabold scale-105 bg-primary/5 dark:bg-blue-500/10"
                  : "text-on-surface-variant/60 dark:text-gray-400 hover:text-primary"
              }`}
            >
              <Icon className={`w-4.5 h-4.5 sm:w-5 sm:h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
              <span className="text-[9px] sm:text-[10px] font-bold mt-0.5 tracking-tight">{item.shortName}</span>
            </Link>
          );
        })}
        <button 
          onClick={async () => {
            if (window.confirm("Atelier에서 로그아웃하시겠습니까?")) {
              await signOut();
            }
          }}
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 text-on-surface-variant/50 hover:text-red-500 dark:text-gray-400 cursor-pointer"
          title="로그아웃"
        >
          <LogOut className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[1.8]" />
          <span className="text-[9px] sm:text-[10px] font-bold mt-0.5 tracking-tight">종료</span>
        </button>
      </nav>
    </>
  );
}
