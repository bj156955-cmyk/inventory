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
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Lab Space", href: "/lab", icon: FlaskConical },
    { name: "Inventory", href: "/inventory", icon: Package },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Notices", href: "/notices", icon: Megaphone },
    { name: "Chat", href: "/chat", icon: MessageSquare },
    { name: "Members", href: "/members", icon: Users },
  ];

  return (
    <>
      {/* Desktop Sidebar (Left Fixed) */}
      <aside className="hidden md:flex flex-col items-center justify-between py-10 w-24 bg-surface-container-low border-r border-black/[0.03] dark:border-white/[0.03] min-h-screen fixed top-0 left-0 z-50">
        <div className="flex flex-col items-center space-y-12 w-full">
          {/* Logo */}
          <Link href="/" className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg hover:rotate-6 transition-all duration-300">
            <Package className="text-white w-6 h-6" />
          </Link>

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-6 w-full items-center">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={item.name}
                  className={`relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-white shadow-md scale-105"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <span className="absolute left-0 w-1 h-6 bg-primary dark:bg-blue-500 rounded-r-full -translate-x-3 md:hidden" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop Logout (Optional) */}
        <button 
          onClick={async () => {
            if (window.confirm("Atelier에서 로그아웃하시겠습니까?")) {
              await signOut();
            }
          }}
          title="Sign Out" 
          className="text-on-surface-variant hover:text-error hover:bg-red-50 dark:hover:bg-red-950/20 p-3 rounded-2xl transition-all duration-200 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </aside>

      {/* Mobile Bottom Bar Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-black/[0.03] dark:border-white/[0.03] px-6 py-4 pb-6 flex justify-between items-center z-50 shadow-[0_-4px_30px_rgba(0,0,0,0.03)]">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center gap-1 transition-all ${
                isActive
                  ? "text-primary dark:text-blue-400 font-bold scale-105"
                  : "text-on-surface-variant/60 dark:text-gray-400"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] uppercase tracking-widest">{item.name.slice(0, 4)}</span>
            </Link>
          );
        })}
        <button 
          onClick={async () => {
            if (window.confirm("Atelier에서 로그아웃하시겠습니까?")) {
              await signOut();
            }
          }}
          className="flex flex-col items-center gap-1 text-on-surface-variant/60 dark:text-gray-400 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-widest">Exit</span>
        </button>
      </nav>
    </>
  );
}
