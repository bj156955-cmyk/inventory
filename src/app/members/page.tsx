"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { AllowedUser, PresencePayload } from "@/types";
import { 
  Users, 
  UserPlus, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  CircleDot
} from "lucide-react";

// Color mapping function (Dark Pastel Accents)
const getColorForUser = (userName?: string) => {
  const name = (userName || "UNKNOWN").toUpperCase();
  const colors = [
    {
      badge: "bg-blue-500/15 border border-blue-500/30 text-blue-400",
      dot: "bg-blue-400",
    },
    {
      badge: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400",
      dot: "bg-emerald-400",
    },
    {
      badge: "bg-purple-500/15 border border-purple-500/30 text-purple-400",
      dot: "bg-purple-400",
    },
    {
      badge: "bg-amber-500/15 border border-amber-500/30 text-amber-400",
      dot: "bg-amber-400",
    },
    {
      badge: "bg-rose-500/15 border border-rose-500/30 text-rose-400",
      dot: "bg-rose-400",
    },
    {
      badge: "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400",
      dot: "bg-cyan-400",
    },
    {
      badge: "bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-400",
      dot: "bg-fuchsia-400",
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
    try {
      const { data, error } = await supabase
        .from("allowed_users")
        .select("username")
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const list = (data as AllowedUser[]).map((d) => d.username.toUpperCase());
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
    let ignore = false;

    const loadMembers = async () => {
      try {
        const { data, error } = await supabase
          .from("allowed_users")
          .select("username")
          .order("created_at", { ascending: true });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const list = (data as AllowedUser[]).map((d) => d.username.toUpperCase());
          if (!ignore) setMembers(list);
        } else {
          if (!ignore) setMembers(DEFAULT_MEMBERS);
        }
      } catch (err) {
        console.error("Error fetching registered team members:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadMembers();

    return () => {
      ignore = true;
    };
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
        Object.values(state).forEach((presences) => {
          (presences as unknown as PresencePayload[]).forEach((presence) => {
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
    <div className="flex-1 p-3 sm:p-6 md:p-8 space-y-3 sm:space-y-4 bg-zinc-50 dark:bg-zinc-950 flex flex-col min-h-0">
      
      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 min-h-0">
        
        {/* Left 2 Columns: Directory Grid */}
        <div className="lg:col-span-2 flex flex-col min-h-0 bg-white dark:bg-zinc-900 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="flex justify-between items-center pb-3 sm:pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span>등록된 팀원 리스트 ({members.length}명)</span>
            </h3>
            <button
              onClick={() => {
                setLoading(true);
                fetchRegisteredMembers();
              }}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-xl transition-all cursor-pointer active:scale-95 shrink-0"
              title="새로고침"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center min-h-[250px]">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 content-start custom-scrollbar">
              {members.map((member) => {
                const color = getColorForUser(member);
                const isOnline = !!onlineMembers[member];
                const onlineTime = onlineMembers[member];
                
                return (
                  <div 
                    key={member}
                    className="w-full p-3.5 sm:p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-[1.5rem] sm:rounded-[1.8rem] border border-zinc-200/60 dark:border-zinc-700/60 hover:border-zinc-400 dark:hover:border-zinc-500 hover:shadow-sm transition-all duration-200 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      {/* Avatar */}
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[1rem] sm:rounded-[1.2rem] flex items-center justify-center font-headline font-black text-xs sm:text-sm border shadow-inner shrink-0 ${color.badge}`}>
                        {member}
                      </div>

                      {/* Info */}
                      <div className="space-y-0.5 sm:space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-zinc-900 dark:text-white truncate">{member}</span>
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-black text-emerald-400 rounded-md select-none shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>ON</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[9px] font-black text-zinc-400 dark:text-zinc-500 rounded-md select-none shrink-0">
                              <span>OFF</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate">
                          {isOnline ? (
                            <>
                              <Clock className="w-2.5 h-2.5 shrink-0 text-emerald-400" />
                              <span className="truncate text-emerald-400/90">{onlineTime} 접속</span>
                            </>
                          ) : (
                            <span>오프라인</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete Action */}
                    {member !== "ADMIN" && (
                      <button 
                        onClick={() => handleDeleteMember(member)}
                        className="p-1.5 sm:p-2 text-zinc-400 hover:text-rose-400 dark:hover:text-rose-400 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
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
        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-6 shrink-0 flex flex-col">
          <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" />
              <span>새 팀원 등록</span>
            </h3>
          </div>

          <form onSubmit={handleRegisterMember} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                팀원 이니셜 / 이름
              </label>
              <input
                type="text"
                required
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="예: HONG, LJM (영문/이니셜 권장)"
                className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-zinc-900 dark:text-white"
              />
            </div>

            {newMemberName.trim() && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl flex items-center justify-between border border-zinc-200/60 dark:border-zinc-700/60 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-headline font-black text-xs border ${getColorForUser(newMemberName).badge}`}>
                    {newMemberName.trim().toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">이 스타일로 자동 적용됩니다</span>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${getColorForUser(newMemberName).dot}`} />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm shadow-md shadow-blue-600/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>명단에 등록</span>
            </button>
          </form>

          {/* Active Online Members & Guide Card */}
          <div className="flex-1 p-5 bg-zinc-50 dark:bg-zinc-800/60 rounded-[1.8rem] border border-zinc-200/60 dark:border-zinc-700/60 flex flex-col justify-between space-y-4 overflow-hidden">
            
            {/* Online Members List */}
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
              <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1.5 pb-2 border-b border-zinc-200/60 dark:border-zinc-700/60">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>현재 접속 중 ({Object.keys(onlineMembers).length}명)</span>
              </h4>
              
              {Object.keys(onlineMembers).length === 0 ? (
                <div className="py-8 text-center text-[10px] text-zinc-400 dark:text-zinc-500 font-bold">
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
                        className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center font-headline font-black text-[9px] border ${color.badge}`}>
                            {onlineUser}
                          </div>
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">{onlineUser}</span>
                        </div>
                        <span className="text-[9px] font-black text-emerald-400">
                          {time} 접속
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Guide Info (At the bottom) */}
            <div className="space-y-1 pt-3 border-t border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
              <h4 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <CircleDot className="w-3 h-3 text-blue-400" />
                <span>실시간 접속 표시 정보</span>
              </h4>
              <p className="text-[9px] leading-relaxed text-zinc-400 dark:text-zinc-500 font-semibold">
                팀원들이 브라우저 탭을 열어 시스템에 머무는 동안, 웹소켓 Presence를 기반으로 실시간 정보가 공유됩니다.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
