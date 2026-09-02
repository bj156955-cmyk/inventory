"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading } = useAuth();
  const isLoginPage = pathname === "/login";

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
    <div className="flex flex-col md:flex-row min-h-[100dvh] w-full">
      {/* Responsive Sidebar */}
      <Sidebar />
      
      {/* Main App Content Area */}
      <main className="flex-1 md:pl-20 lg:pl-24 pb-20 md:pb-0 min-h-[100dvh] flex flex-col overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
