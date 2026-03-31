import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useLocation } from "react-router";
import {
  LayoutDashboard, Camera, Users, Activity, Settings,
  ChevronLeft, ChevronRight, Scan, Wifi, WifiOff,
  Bell, Shield, Zap, CheckCircle2, AlertTriangle, UserCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiClient } from "../services/api";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const API_URL = ((import.meta as any).env.VITE_API_URL as string) || "http://localhost:3001";

const navItems = [
  { path: "/",         label: "Dashboard",             icon: LayoutDashboard, end: true },
  { path: "/live",     label: "Live Nhận Diện",         icon: Camera },
  { path: "/faces",    label: "Khuôn Mặt Đã Đăng Ký",  icon: Users },
  { path: "/activity", label: "Nhật Ký Hoạt Động",      icon: Activity },
  { path: "/settings", label: "Cài Đặt",                icon: Settings },
];

interface NotificationEvent {
  id: string;
  name: string;
  type: "success" | "unknown";
  camera: string;
  time: string;          // "HH:mm:ss" từ backend
  img: string | null;
  read: boolean;
}

export function Layout() {
  const [collapsed,       setCollapsed]       = useState(false);
  const [online,          setOnline]          = useState(true);
  const [time,            setTime]            = useState(new Date());
  const [showNotifMenu,   setShowNotifMenu]   = useState(false);
  const [notifications,   setNotifications]   = useState<NotificationEvent[]>([]);
  const location = useLocation();
  const notifRef        = useRef<HTMLDivElement>(null);
  const lastLogIdRef    = useRef<string | null>(null);   // ID log cuối cùng đã xử lý
  const isFirstPollRef  = useRef(true);                  // Bỏ qua lần poll đầu (không spam)

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Clock ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Giả lập ping online ────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setOnline((o) => Math.random() > 0.05 || o), 5000);
    return () => clearInterval(t);
  }, []);

  // ── POLL nhật ký mỗi 3 giây → đẩy thông báo mới ─────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const logs = await apiClient.getActivityLog();   // GET /api/face/logs
        if (!logs || logs.length === 0) return;

        // Lần đầu chỉ ghi nhớ ID mới nhất, không hiện thông báo cũ
        if (isFirstPollRef.current) {
          lastLogIdRef.current = logs[0].id;
          isFirstPollRef.current = false;
          return;
        }

        // Tìm các bản ghi mới hơn ID đã biết
        const newLogs: typeof logs = [];
        for (const log of logs) {
          if (log.id === lastLogIdRef.current) break;
          newLogs.push(log);
        }
        if (newLogs.length === 0) return;

        // Cập nhật ID mới nhất
        lastLogIdRef.current = newLogs[0].id;

        // Chuyển thành NotificationEvent và thêm vào đầu danh sách
        const newNotifs: NotificationEvent[] = newLogs.map((log) => ({
          id:     log.id,
          name:   log.name,
          type:   log.status === "success" ? "success" : "unknown",
          camera: log.camera,
          time:   log.time,
          img:    log.img ?? null,
          read:   false,
        }));

        setNotifications((prev) => [...newNotifs, ...prev].slice(0, 30));
      } catch {
        // Bỏ qua lỗi mạng — không làm gián đoạn UI
      }
    };

    poll(); // Gọi ngay lần đầu để set lastLogIdRef
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, []);

  // ── Đóng dropdown khi click ngoài ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const fmt = (d: Date) =>
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#050a0f", minHeight: "100vh", display: "flex", fontFamily: "'Space Grotesk', sans-serif", color: "#e2e8f0" }}>

      {/* Background grid */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: `linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)`, backgroundSize: "40px 40px", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", top: "-20%", left: "-10%", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-20%", right: "-10%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* ═══ SIDEBAR ════════════════════════════════════════════════════════ */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        style={{ background: "rgba(5,10,15,0.95)", borderRight: "1px solid rgba(0,212,255,0.12)", display: "flex", flexDirection: "column", position: "relative", zIndex: 10, flexShrink: 0, backdropFilter: "blur(20px)" }}
      >
        {/* Logo */}
        <div style={{ padding: "24px 16px", borderBottom: "1px solid rgba(0,212,255,0.08)", display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
          <div style={{ width: 40, height: 40, borderRadius: "10px", background: "linear-gradient(135deg, #00d4ff, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 20px rgba(0,212,255,0.4)" }}>
            <Scan size={20} color="#fff" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "14px", fontWeight: 700, color: "#00d4ff", letterSpacing: "1px" }}>Vân Anh</div>
                <div style={{ fontSize: "10px", color: "#4a6fa5", letterSpacing: "2px" }}>RECOGNITION SYSTEM</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Clock */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ margin: "12px", padding: "10px 12px", borderRadius: "10px", background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: "10px", color: "#4a6fa5", letterSpacing: "1px" }}>HỆ THỐNG</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: online ? "#00ff88" : "#ff2d55", boxShadow: online ? "0 0 8px #00ff88" : "0 0 8px #ff2d55", animation: "pulse 2s infinite" }} />
                  {online ? <Wifi size={10} color="#00ff88" /> : <WifiOff size={10} color="#ff2d55" />}
                </div>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "18px", color: "#00d4ff", fontWeight: 700, letterSpacing: "2px" }}>{fmt(time)}</div>
              <div style={{ fontSize: "11px", color: "#4a6fa5", marginTop: 2 }}>{fmtDate(time)}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px", overflow: "hidden" }}>
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.end} style={{ textDecoration: "none" }}>
              {({ isActive }) => (
                <motion.div whileHover={{ x: 2 }} style={{ display: "flex", alignItems: "center", gap: "12px", padding: collapsed ? "12px" : "10px 12px", borderRadius: "10px", marginBottom: "4px", cursor: "pointer", background: isActive ? "rgba(0,212,255,0.1)" : "transparent", border: isActive ? "1px solid rgba(0,212,255,0.25)" : "1px solid transparent", justifyContent: collapsed ? "center" : "flex-start", position: "relative", overflow: "hidden", transition: "all 0.2s" }}>
                  {isActive && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: "60%", borderRadius: "0 3px 3px 0", background: "#00d4ff", boxShadow: "0 0 10px #00d4ff" }} />}
                  <item.icon size={18} color={isActive ? "#00d4ff" : "#4a6fa5"} style={{ flexShrink: 0 }} />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ fontSize: "13px", color: isActive ? "#00d4ff" : "#7a95b8", fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap" }}>
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: "16px", borderTop: "1px solid rgba(0,212,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #00d4ff, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>A</div>
                <div>
                  <div style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: 600 }}>Admin</div>
                  <div style={{ fontSize: "11px", color: "#4a6fa5" }}>Quản trị viên</div>
                </div>
                <Shield size={14} color="#00ff88" style={{ marginLeft: "auto" }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={() => setCollapsed(!collapsed)} style={{ position: "absolute", right: -12, top: "50%", transform: "translateY(-50%)", width: 24, height: 24, borderRadius: "50%", background: "#0d1520", border: "1px solid rgba(0,212,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 20, color: "#00d4ff" }}>
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </motion.aside>

      {/* ═══ MAIN ═══════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 1 }}>

        {/* Top bar */}
        <header style={{ height: 64, borderBottom: "1px solid rgba(0,212,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "rgba(5,10,15,0.8)", backdropFilter: "blur(20px)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 8px #00ff88" }} />
            <span style={{ fontSize: "12px", color: "#4a6fa5", letterSpacing: "1px" }}>CAMERA ĐANG HOẠT ĐỘNG</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: "20px", background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)" }}>
              <Zap size={12} color="#00ff88" />
              <span style={{ fontSize: "12px", color: "#00ff88", fontFamily: "'JetBrains Mono', monospace" }}>REALTIME POLLING 3s</span>
            </div>

            {/* ── NOTIFICATION BELL ── */}
            <div style={{ position: "relative" }} ref={notifRef}>
              <motion.div
                whileTap={{ scale: 0.85 }}
                style={{ cursor: "pointer", position: "relative", padding: 4 }}
                onClick={() => setShowNotifMenu((v) => !v)}
              >
                <Bell size={20} color={unreadCount > 0 ? "#e2e8f0" : "#4a6fa5"} />
                <AnimatePresence>
                  {unreadCount > 0 && (
                    <motion.div
                      key="badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: "8px", background: "#ff2d55", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "#fff", fontWeight: 700, padding: "0 3px", boxShadow: "0 0 8px rgba(255,45,85,0.6)" }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Dropdown */}
              <AnimatePresence>
                {showNotifMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                    style={{ position: "absolute", top: 44, right: 0, width: 360, background: "rgba(8,13,22,0.97)", backdropFilter: "blur(24px)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: "16px", boxShadow: "0 12px 48px rgba(0,0,0,0.6)", overflow: "hidden", zIndex: 200 }}
                  >
                    {/* Header */}
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(0,212,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>Thông báo</span>
                        {unreadCount > 0 && (
                          <span style={{ marginLeft: 8, padding: "1px 7px", borderRadius: "10px", background: "rgba(255,45,85,0.15)", border: "1px solid rgba(255,45,85,0.3)", fontSize: "10px", color: "#ff2d55" }}>
                            {unreadCount} mới
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} style={{ fontSize: "11px", color: "#00d4ff", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle2 size={12} /> Đánh dấu đã đọc
                        </button>
                      )}
                    </div>

                    {/* List */}
                    <div style={{ maxHeight: 380, overflowY: "auto" }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: "32px", textAlign: "center", color: "#4a6fa5", fontSize: "13px" }}>
                          Chưa có thông báo nào
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            style={{ padding: "11px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 12, alignItems: "center", background: n.read ? "transparent" : "rgba(0,212,255,0.04)", cursor: "default" }}
                            onClick={() => setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))}
                          >
                            {/* Avatar ảnh hoặc icon */}
                            <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: `2px solid ${n.type === "success" ? "#00ff88" : "#ff2d55"}50` }}>
                              {n.img ? (
                                <ImageWithFallback src={n.img} alt={n.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <div style={{ width: "100%", height: "100%", background: n.type === "success" ? "rgba(0,255,136,0.1)" : "rgba(255,45,85,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {n.type === "success"
                                    ? <UserCheck size={16} color="#00ff88" />
                                    : <AlertTriangle size={16} color="#ff2d55" />
                                  }
                                </div>
                              )}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: n.read ? 400 : 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                <span style={{ color: n.type === "success" ? "#00ff88" : "#ff2d55" }}>
                                  {n.type === "success" ? "✓" : "⚠"}
                                </span>{" "}
                                {n.name}
                              </div>
                              <div style={{ fontSize: "11px", color: "#4a6fa5", marginTop: 2, display: "flex", gap: 6 }}>
                                <span>{n.camera}</span>
                                <span>·</span>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{n.time}</span>
                              </div>
                            </div>

                            {!n.read && (
                              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00d4ff", flexShrink: 0, boxShadow: "0 0 6px #00d4ff" }} />
                            )}
                          </motion.div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(0,212,255,0.08)", textAlign: "center" }}>
                      <span style={{ fontSize: "11px", color: "#2d4060" }}>Cập nhật mỗi 3 giây · {notifications.length} sự kiện</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page */}
        <main style={{ flex: 1, overflow: "auto" }}>
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} style={{ height: "100%" }}>
            <Outlet />
          </motion.div>
        </main>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#050a0f}
        ::-webkit-scrollbar-thumb{background:rgba(0,212,255,0.2);border-radius:2px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(0,212,255,0.4)}
      `}</style>
    </div>
  );
}