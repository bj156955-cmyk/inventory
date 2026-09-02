"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Package, Lock, User, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const DOMAIN = "@atelier.app";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const email = `${userId.trim().toLowerCase()}${DOMAIN}`;

    try {
      if (isSignUp) {
        // Validate if user initials are registered in allowed_users first
        const { data: allowed, error: allowedError } = await supabase
          .from("allowed_users")
          .select("*")
          .ilike("username", userId.trim())
          .single();

        if (allowedError || !allowed) {
          throw new Error("등록되지 않은 팀원 이니셜입니다. 관리자에게 이니셜 등록을 먼저 요청해 주세요.");
        }

        // Sign Up
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg("가입 신청 완료! 이메일 인증을 확인하시거나 바로 로그인해 보세요.");
        setIsSignUp(false);
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("인증에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-950 min-h-[100dvh]">
      <div className="w-full max-w-[420px] p-6 sm:p-10 bg-white dark:bg-zinc-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-6 sm:space-y-8 transition-all duration-300">
        
        {/* Header Branding */}
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-900 dark:bg-zinc-100 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center mx-auto shadow-xl hover:rotate-6 transition-all duration-300">
            <Package className="text-white dark:text-zinc-950 w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black font-headline tracking-tighter text-zinc-900 dark:text-white">
              Atelier
            </h2>
            <p className="text-zinc-400 dark:text-zinc-500 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mt-1">
              {isSignUp ? "Create New Access" : "Warehouse & Collaboration"}
            </p>
          </div>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4 sm:space-y-5">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="USER ID"
              className="w-full pl-11 sm:pl-12 pr-4 py-3.5 sm:py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 text-xs sm:text-sm font-bold tracking-wider uppercase placeholder:text-zinc-400 transition-all border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PASSWORD"
              className="w-full pl-11 sm:pl-12 pr-4 py-3.5 sm:py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 text-xs sm:text-sm font-bold tracking-wider placeholder:text-zinc-400 transition-all border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          {errorMsg && (
            <div className="p-3.5 sm:p-4 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-2xl text-[11px] sm:text-xs font-bold tracking-tight">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 sm:p-4 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-2xl text-[11px] sm:text-xs font-bold tracking-tight">
              ✅ {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white py-3.5 sm:py-4 rounded-2xl font-headline font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? "처리 중..." : isSignUp ? "계정 등록 신청" : "Atelier 입장"}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className="text-xs font-black text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white transition-colors uppercase tracking-wider cursor-pointer"
          >
            {isSignUp ? "기존 계정으로 로그인" : "초대받은 분 가입하기"}
          </button>
        </div>

      </div>
    </div>
  );
}
