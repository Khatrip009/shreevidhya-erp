import { useState, useRef, useEffect } from "react";
import {
  Bell,
  Search,
  LogOut,
  UserCircle2,
  Check,
  Menu,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabase";
import { useAuth } from "../context/AuthContext";
import GlobalSearch from "./GlobalSearch";

export default function Header({ onMenuClick }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch student record only if the user is a Student (to get their photo)
  const { data: student } = useQuery({
    queryKey: ["header-student-photo", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("photo_url")
        .eq("user_id", profile.id)
        .single();
      return data;
    },
    enabled: !!profile && profile.role === "Student",
  });

  // Live unread count – only for admin/teacher (students won't use it)
const { data: unreadCount = 0 } = useQuery({
  queryKey: ["notification-unread-count"],
  queryFn: async () => {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      // If there's any error (including missing column), return 0
      return error ? 0 : count || 0;
    } catch {
      return 0;
    }
  },
  refetchInterval: 30_000,
  // Only admins see the notification bell – disable for teachers and students
  enabled: profile?.role === "Admin" || profile?.role === "Super Admin",
});
  // Fetch last 5 notifications (for dropdown)
  const { data: recentNotifications = [] } = useQuery({
    queryKey: ["notifications-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      return error ? [] : data;
    },
    enabled: dropdownOpen,
    refetchOnMount: false,
    staleTime: 10_000,
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notification-unread-count"],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications-recent"],
      });
    },
  });

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notification-unread-count"],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications-recent"],
      });
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const today = new Date();
  const isAdmin = profile?.role === "Admin" || profile?.role === "Super Admin";
  const isTeacher = profile?.role === "Teacher";

  // Determine the avatar image
  const avatarUrl = profile?.avatar_url;                          // from profiles table
  const studentPhotoUrl = student?.photo_url;                    // from students table (for students)
  const userAvatar = avatarUrl || studentPhotoUrl || null;       // fallback chain

  return (
    <header className="bg-white border-b border-secondary-light px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between">
      {/* Left section: hamburger + date */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-secondary-bg"
          aria-label="Open menu"
        >
          <Menu size={22} className="text-secondary-dark" />
        </button>
        <div className="hidden sm:block">
          <p className="text-sm text-secondary-dark font-montserrat whitespace-nowrap">
            {today.toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Center Search – only for admins on desktop */}
      {isAdmin && <GlobalSearch />}

      {/* Right Side */}
      <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
        {/* Notification Bell – for admin and teacher */}
        {(isAdmin || isTeacher) && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="relative p-1"
            >
              <Bell size={22} className="text-secondary-dark hover:text-primary transition" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] h-5 w-5 rounded-full flex items-center justify-center font-medium">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-secondary-light z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-light">
                  <h4 className="font-semibold text-sm text-secondary-dark">Notifications</h4>
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    className="text-xs text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {recentNotifications.length === 0 ? (
                    <p className="p-4 text-sm text-center text-secondary">No notifications</p>
                  ) : (
                    recentNotifications.map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-secondary-light hover:bg-gray-50 ${
                          !n.is_read ? "bg-blue-50/50" : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-secondary-dark">{n.title}</p>
                          <p className="text-xs text-secondary mt-1 truncate">{n.message}</p>
                          <span className="text-xs text-secondary-light mt-1 block">
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                        {!n.is_read && (
                          <button
                            onClick={() => markReadMutation.mutate(n.id)}
                            className="text-primary hover:text-primary-light mt-1 flex-shrink-0"
                            title="Mark as read"
                          >
                            <Check size={16} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-3 border-t border-secondary-light">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate("/notifications");
                    }}
                    className="w-full text-center text-sm text-primary hover:underline font-medium"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User avatar and info */}
        <div className="flex items-center gap-2 lg:gap-3">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt="User avatar"
              className="w-10 h-10 rounded-full object-cover border border-secondary-light"
            />
          ) : (
            <UserCircle2 size={38} className="text-primary flex-shrink-0" />
          )}
          <div className="hidden sm:block">
            <h3 className="font-semibold text-secondary-dark font-montserrat text-sm lg:text-base">
              {profile?.full_name || "User"}
            </h3>
            <p className="text-xs text-secondary">{profile?.role || "Admin"}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1 sm:gap-2 bg-accent hover:bg-accent-light text-white px-2 sm:px-4 py-2 rounded-lg transition font-montserrat text-sm"
          title="Logout"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}