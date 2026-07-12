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
    } catch (err: any) {
      setErrorMsg(err.message || "인증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-surface dark:bg-slate-950">
      <div className="w-full max-w-[420px] p-10 bg-surface-container-lowest dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-black/[0.02] dark:border-white/[0.02] space-y-8 transition-all duration-300">
        
        {/* Header Branding */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary rounded-[2rem] flex items-center justify-center mx-auto shadow-xl hover:rotate-6 transition-all duration-300">
            <Package className="text-white w-10 h-10" />
          </div>
          <div>
            <h2 className="text-3xl font-black font-headline tracking-tighter text-primary dark:text-blue-400">
              Atelier
            </h2>
            <p className="text-on-surface-variant dark:text-gray-400 text-xs font-semibold uppercase tracking-widest mt-1">
              {isSignUp ? "Create New Access" : "Warehouse & Collaboration"}
            </p>
          </div>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="space-y-5">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 dark:text-gray-500 w-5 h-5" />
            <input
              type="text"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="USER ID"
              className="w-full pl-12 pr-4 py-4 bg-surface-container-low dark:bg-slate-800 text-foreground rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-blue-500/20 text-xs font-bold tracking-widest uppercase placeholder:text-on-surface-variant/30 transition-all border border-black/[0.03] dark:border-white/[0.03]"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 dark:text-gray-500 w-5 h-5" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PASSWORD"
              className="w-full pl-12 pr-4 py-4 bg-surface-container-low dark:bg-slate-800 text-foreground rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-blue-500/20 text-xs font-bold tracking-widest placeholder:text-on-surface-variant/30 transition-all border border-black/[0.03] dark:border-white/[0.03]"
            />
          </div>

          {errorMsg && (
            <div className="p-4 bg-error-container text-error rounded-2xl text-[11px] font-bold tracking-tight">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-2xl text-[11px] font-bold tracking-tight">
              ✅ {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary dark:bg-blue-600 hover:bg-primary-container dark:hover:bg-blue-700 text-white py-4 rounded-2xl font-headline font-black flex items-center justify-center gap-2 shadow-lg hover:shadow-2xl transition-all duration-200 active:scale-[0.98] disabled:opacity-55"
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
            className="text-xs font-black text-on-surface-variant/60 hover:text-primary dark:text-gray-400 dark:hover:text-blue-400 transition-colors uppercase tracking-widest"
          >
            {isSignUp ? "기존 계정으로 로그인" : "초대받은 분 가입하기"}
          </button>
        </div>

      </div>
    </div>
  );
}
