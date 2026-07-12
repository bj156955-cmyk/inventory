"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { 
  Users, 
  UserPlus, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  CircleDot
} from "lucide-react";

// Same color mapping function to maintain UI consistency
const getColorForUser = (userName: string) => {
  const name = (userName || "UNKNOWN").toUpperCase();
  const colors = [
    {
      bg: "bg-blue-50/80 dark:bg-blue-950/20",
      border: "border-blue-200/50 dark:border-blue-900/30",
      text: "text-blue-700 dark:text-blue-300",
      hoverBg: "hover:bg-blue-100/50 dark:hover:bg-blue-900/10",
      badge: "bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-300",
      dot: "bg-blue-500",
    },
    {
      bg: "bg-emerald-50/80 dark:bg-emerald-950/20",
      border: "border-emerald-200/50 dark:border-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-300",
      hoverBg: "hover:bg-emerald-100/50 dark:hover:bg-emerald-900/10",
      badge: "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
    },
    {
      bg: "bg-violet-50/80 dark:bg-violet-950/20",
      border: "border-violet-200/50 dark:border-violet-900/30",
      text: "text-violet-700 dark:text-violet-300",
      hoverBg: "hover:bg-violet-100/50 dark:hover:bg-violet-900/10",
      badge: "bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/30 text-violet-700 dark:text-violet-300",
      dot: "bg-violet-500",
    },
    {
      bg: "bg-amber-50/80 dark:bg-amber-950/20",
      border: "border-amber-200/50 dark:border-amber-900/30",
      text: "text-amber-700 dark:text-amber-300",
      hoverBg: "hover:bg-amber-100/50 dark:hover:bg-amber-900/10",
      badge: "bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
    },
    {
      bg: "bg-rose-50/80 dark:bg-rose-950/20",
      border: "border-rose-200/50 dark:border-rose-900/30",
      text: "text-rose-700 dark:text-rose-300",
      hoverBg: "hover:bg-rose-100/50 dark:hover:bg-rose-900/10",
      badge: "bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300",
      dot: "bg-rose-500",
    },
    {
      bg: "bg-cyan-50/80 dark:bg-cyan-950/20",
      border: "border-cyan-200/50 dark:border-cyan-900/30",
      text: "text-cyan-700 dark:text-cyan-300",
      hoverBg: "hover:bg-cyan-100/50 dark:hover:bg-cyan-900/10",
      badge: "bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900/30 text-cyan-700 dark:text-cyan-300",
      dot: "bg-cyan-500",
    },
    {
      bg: "bg-fuchsia-50/80 dark:bg-fuchsia-950/20",
      border: "border-fuchsia-200/50 dark:border-fuchsia-900/30",
      text: "text-fuchsia-700 dark:text-fuchsia-300",
      hoverBg: "hover:bg-fuchsia-100/50 dark:hover:bg-fuchsia-900/10",
      badge: "bg-fuchsia-50 dark:bg-fuchsia-950/40 border border-fuchsia-100 dark:border-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300",
      dot: "bg-fuchsia-500",
    }
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const DEFAULT_MEMBERS = ["BJ", "YG", "MJ", "JS", "HS", "HM", "NY", "SH", "TH"];

export default function MembersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<string[]>(DEFAULT_MEMBERS);
  const [onlineMembers, setOnlineMembers] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [newMemberName, setNewMemberName] = useState("");

  // 1. Fetch Registered Team Members from allowed_users
  const fetchRegisteredMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("allowed_users")
        .select("username")
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const list = data.map((d: any) => d.username.toUpperCase());
        setMembers(list);
      } else {
        setMembers(DEFAULT_MEMBERS);
      }
    } catch (err) {
      console.error("Error fetching registered team members:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Setup Real-time Presence
  useEffect(() => {
    fetchRegisteredMembers();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const currentUserInitials = user.email?.split("@")[0].toUpperCase() || "UNKNOWN";
    
    // Setup Supabase Presence channel
    const channel = supabase.channel("team-presence", {
      config: {
        presence: {
          key: currentUserInitials,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const onlineMap: { [key: string]: string } = {};
        
        // Robust extraction from payloads
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            const initials = (presence.initials || presence.user || "").toUpperCase();
            if (initials) {
              onlineMap[initials] = presence.online_at || new Date().toLocaleTimeString();
            }
          });
        });
        setOnlineMembers(onlineMap);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("Joined: ", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("Left: ", key, leftPresences);
      });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          initials: currentUserInitials,
          user: currentUserInitials,
          online_at: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
        });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // 3. Register New Member
  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newMemberName.trim().toUpperCase();
    if (!cleanName) return;

    if (members.includes(cleanName)) {
      alert("이미 등록된 이니셜(이름)입니다.");
      return;
    }

    setMembers([...members, cleanName]);
    setNewMemberName("");

    try {
      const currentUserInitials = user?.email?.split("@")[0].toUpperCase() || "UNKNOWN";
      const { error } = await supabase
        .from("allowed_users")
        .insert([{ username: cleanName, created_by: currentUserInitials }]);
      if (error) throw error;
      fetchRegisteredMembers();
    } catch (err) {
      console.error("Error saving updated member list:", err);
    }
  };

  // 4. Delete Registered Member
  const handleDeleteMember = async (memberName: string) => {
    if (memberName === "BJ") {
      alert("BJ 계정은 삭제할 수 없습니다.");
      return;
    }
    if (!confirm(`${memberName} 팀원을 등록 명단에서 삭제하시겠습니까?`)) return;

    setMembers(members.filter(m => m !== memberName));

    try {
      const { error } = await supabase
        .from("allowed_users")
        .delete()
        .ilike("username", memberName);
      if (error) throw error;
      fetchRegisteredMembers();
    } catch (err) {
      console.error("Error deleting team member:", err);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-10 space-y-6 bg-surface dark:bg-slate-900 flex flex-col min-h-0">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-black font-headline text-primary dark:text-blue-400 tracking-tighter">
            Team Workspace Directory
          </h2>
          <p className="text-xs md:text-sm text-on-surface-variant dark:text-gray-400 font-semibold mt-1">
            등록된 팀원 목록을 확인하고 실시간 네트워크 접속 현황을 모니터링합니다.
          </p>
        </div>
        
        <button
          onClick={fetchRegisteredMembers}
          className="p-3 bg-white dark:bg-slate-800 text-on-surface-variant dark:text-gray-400 rounded-2xl hover:text-primary dark:hover:text-white border border-black/[0.03] dark:border-white/[0.03] shadow-sm hover:shadow transition-all"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* Left 2 Columns: Directory Grid */}
        <div className="lg:col-span-2 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 shadow-md border border-black/[0.02] dark:border-white/[0.02] overflow-hidden">
          <div className="flex justify-between items-center pb-4 border-b border-black/[0.02] dark:border-white/[0.02]">
            <h3 className="text-lg font-black text-primary dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span>등록된 팀원 리스트 ({members.length}명)</span>
            </h3>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-primary dark:text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 mt-4 flex flex-wrap gap-4 content-start custom-scrollbar">
              {members.map((member) => {
                const color = getColorForUser(member);
                const isOnline = !!onlineMembers[member];
                const onlineTime = onlineMembers[member];
                
                return (
                  <div 
                    key={member}
                    className="w-full sm:w-[260px] p-4 bg-surface-container-low dark:bg-slate-900/60 rounded-[1.8rem] border border-black/[0.02] dark:border-white/[0.02] hover:border-black/[0.08] dark:hover:border-white/[0.08] hover:shadow-md transition-all duration-300 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center font-headline font-black text-sm border shadow-inner ${color.badge}`}>
                        {member}
                      </div>

                      {/* Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground dark:text-white">{member}</span>
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-[9px] font-black text-emerald-600 dark:text-emerald-400 rounded-lg select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              <span>ON</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-400 rounded-lg select-none">
                              <span>OFF</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-black text-on-surface-variant/40 dark:text-gray-500 uppercase tracking-wide">
                          {isOnline ? (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>접속 시각: {onlineTime}</span>
                            </>
                          ) : (
                            <span>현재 오프라인</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete Action */}
                    {member !== "ADMIN" && (
                      <button 
                        onClick={() => handleDeleteMember(member)}
                        className="p-2 text-on-surface-variant/40 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-white dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="팀원 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Column: Register Form */}
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 shadow-md border border-black/[0.02] dark:border-white/[0.02] space-y-6 shrink-0 flex flex-col">
          <div className="pb-4 border-b border-black/[0.02] dark:border-white/[0.02]">
            <h3 className="text-lg font-black text-primary dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              <span>새 팀원 등록</span>
            </h3>
          </div>

          <form onSubmit={handleRegisterMember} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-on-surface-variant/50 dark:text-gray-400 tracking-wider">
                팀원 이니셜 / 이름
              </label>
              <input
                type="text"
                required
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="예: HONG, LJM (영문/이니셜 권장)"
                className="w-full px-4 py-3 bg-surface-container-low dark:bg-slate-900 border border-black/[0.03] dark:border-white/[0.03] rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-semibold"
              />
            </div>

            {newMemberName.trim() && (
              <div className="p-4 bg-surface-container-low dark:bg-slate-900/60 rounded-2xl flex items-center justify-between border border-black/[0.02] dark:border-white/[0.02] animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-headline font-black text-xs border ${getColorForUser(newMemberName).badge}`}>
                    {newMemberName.trim().toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-foreground dark:text-gray-300">이 스타일로 자동 적용됩니다</span>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${getColorForUser(newMemberName).dot}`} />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-primary dark:bg-blue-600 text-white rounded-2xl font-black text-sm shadow-md hover:shadow-xl hover:scale-[1.01] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>명단에 등록</span>
            </button>
          </form>

          {/* Active Online Members & Guide Card */}
          <div className="flex-1 p-5 bg-surface-container-low dark:bg-slate-900/60 rounded-[1.8rem] border border-black/[0.01] flex flex-col justify-between space-y-4 overflow-hidden">
            
            {/* Online Members List */}
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
              <h4 className="text-xs font-black text-primary dark:text-blue-400 flex items-center gap-1.5 pb-2 border-b border-black/5 dark:border-white/5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse animate-ping absolute" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse relative" />
                <span>현재 접속 중 ({Object.keys(onlineMembers).length}명)</span>
              </h4>
              
              {Object.keys(onlineMembers).length === 0 ? (
                <div className="py-8 text-center text-[10px] text-on-surface-variant/40 dark:text-gray-500 font-bold">
                  현재 접속 중인 팀원이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.keys(onlineMembers).map((onlineUser) => {
                    const color = getColorForUser(onlineUser);
                    const time = onlineMembers[onlineUser];
                    return (
                      <div 
                        key={onlineUser}
                        className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-xl border border-black/[0.01] dark:border-white/[0.01] shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center font-headline font-black text-[9px] border ${color.badge}`}>
                            {onlineUser}
                          </div>
                          <span className="text-xs font-bold text-foreground dark:text-white">{onlineUser}</span>
                        </div>
                        <span className="text-[9px] font-black text-on-surface-variant/40 dark:text-gray-500">
                          {time} 접속
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Guide Info (At the bottom) */}
            <div className="space-y-1 pt-3 border-t border-black/5 dark:border-white/5 shrink-0">
              <h4 className="text-[10px] font-black text-on-surface-variant/50 dark:text-gray-400 flex items-center gap-1">
                <CircleDot className="w-3 h-3 text-primary" />
                <span>실시간 접속 표시 정보</span>
              </h4>
              <p className="text-[9px] leading-relaxed text-on-surface-variant/60 dark:text-gray-400 font-semibold">
                팀원들이 브라우저 탭을 열어 시스템에 머무는 동안, 웹소켓 Presence를 기반으로 실시간 정보가 공유됩니다.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
