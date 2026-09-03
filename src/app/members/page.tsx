"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { AllowedUser, PresencePayload } from "@/types";
import { 
  Users, 
  UserPlus, 
  Plus,
  Trash2, 
  X
} from "lucide-react";



const DEFAULT_MEMBERS = ["BJ", "YG", "MJ", "JS", "HS", "HM", "NY", "SH", "TH"];

export default function MembersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<string[]>(DEFAULT_MEMBERS);
  const [onlineMembers, setOnlineMembers] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [newMemberName, setNewMemberName] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showAddModal) {
        setShowAddModal(false);
        setNewMemberName("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddModal]);

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
    setShowAddModal(false);

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
      
      {/* Directory Card */}
      <div className="w-full max-w-lg sm:max-w-xl mx-auto h-fit max-h-[calc(100vh-5rem)] flex flex-col bg-white dark:bg-zinc-900 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-7 shadow-sm border border-zinc-200 dark:border-zinc-800 transition-all">
        
        {/* Header: Title + Circular Plus Button */}
        <div className="flex justify-between items-center pb-3 sm:pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span>팀원 디렉토리 ({members.length}명)</span>
          </h3>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-sm shadow-blue-600/30 transition-all cursor-pointer active:scale-95 shrink-0"
            title="팀원 추가"
          >
            <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>

        {/* 3-Column Grid Member List */}
        {loading ? (
          <div className="py-12 flex items-center justify-center min-h-[160px]">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-y-auto pr-1 mt-4 grid grid-cols-3 gap-2.5 sm:gap-3.5 content-start custom-scrollbar">
            {members.map((member) => {
              const isOnline = !!onlineMembers[member];
              
              return (
                <div 
                  key={member}
                  className="relative group p-3.5 sm:p-4.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl sm:rounded-3xl border border-zinc-200/70 dark:border-zinc-700/70 hover:border-zinc-400 dark:hover:border-zinc-500 hover:shadow-xs transition-all flex items-center justify-center select-none"
                >
                  {/* Initials Only */}
                  <span className="font-headline font-black text-sm sm:text-base text-zinc-900 dark:text-zinc-100 tracking-wider">
                    {member}
                  </span>

                  {/* Online Status: Small green dot only */}
                  {isOnline && (
                    <span 
                      className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" 
                      title="온라인"
                    />
                  )}

                  {/* Delete Button on hover */}
                  {member !== "ADMIN" && member !== "BJ" && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMember(member);
                      }}
                      className="absolute bottom-1.5 right-1.5 p-1.5 text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Team Member Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[300] flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
              setNewMemberName("");
            }
          }}
        >
          <div className="bg-white dark:bg-zinc-900 w-[95%] sm:w-full max-w-[420px] rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 border border-zinc-200 dark:border-zinc-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/30">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base text-zinc-900 dark:text-white">
                    새 팀원 등록
                  </h4>
                  <p className="text-[10px] text-zinc-400">
                    추가할 팀원의 이니셜을 입력해주세요
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setNewMemberName("");
                }}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRegisterMember} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                  팀원 이니셜 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-zinc-900 dark:text-white transition-all"
                  autoFocus
                />
              </div>



              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewMemberName("");
                  }}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs transition-all cursor-pointer shadow-sm shadow-blue-600/30 active:scale-95"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
