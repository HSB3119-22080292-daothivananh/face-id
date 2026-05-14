import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router";
import {
  Activity,
  Camera,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  LayoutDashboard,
  ScanFace,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const navItems = [
  { path: "/", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { path: "/live", label: "Nhận diện trực tiếp", icon: Camera },
  { path: "/faces", label: "Người dùng", icon: Users },
  { path: "/activity", label: "Nhật ký", icon: Activity },
];

const pageMeta: Record<string, { eyebrow: string; title: string; description: string }> = {
  "/": {
    eyebrow: "Bảng điều khiển",
    title: "Tập trung vào dữ liệu thật",
    description: "Tổng hợp đăng ký, nhận diện và các hồ sơ cần theo dõi từ database.",
  },
  "/live": {
    eyebrow: "Camera",
    title: "Nhận diện trực tiếp",
    description: "Theo dõi camera theo thời gian thực và phản hồi tức thì từ backend nhận diện.",
  },
  "/faces": {
    eyebrow: "Hồ sơ",
    title: "Người dùng và dữ liệu CCCD",
    description: "Hiển thị đầy đủ thông tin đã lưu trong database, ưu tiên tra cứu và kiểm soát hồ sơ.",
  },
  "/activity": {
    eyebrow: "Lịch sử",
    title: "Nhật ký hoạt động",
    description: "Xem lại các lượt nhận diện, người lạ và trạng thái hệ thống theo thời gian.",
  },
};

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const currentMeta = pageMeta[location.pathname] ?? pageMeta["/"];
  const todayLabel = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        color: "var(--app-text)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(148, 163, 184, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.04) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), rgba(0,0,0,0.2))",
        }}
      />

      <motion.aside
        animate={{ width: collapsed ? 92 : 288 }}
        transition={{ duration: 0.24, ease: "easeInOut" }}
        style={{
          position: "relative",
          zIndex: 1,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          padding: 20,
          borderRight: "1px solid var(--app-border)",
          background: "rgba(255, 255, 255, 0.86)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 12px 18px",
            borderBottom: "1px solid var(--app-border)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, var(--app-accent-subtle), var(--app-accent-muted))",
              border: "1px solid var(--app-border)",
              boxShadow: "var(--app-shadow)",
              flexShrink: 0,
            }}
          >
            <ScanFace size={24} color="var(--app-text)" />
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
              >
                <div style={{ fontSize: 11, color: "var(--app-accent)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Face ID Console
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>Quản trị nhận diện</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: collapsed ? "10px 8px" : "16px 18px",
            borderRadius: 22,
            background: "linear-gradient(180deg, #ffffff, var(--app-bg-subtle))",
            border: "1px solid var(--app-border)",
          }}
        >
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: "grid", gap: 10 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      background: "var(--app-accent-subtle)",
                      border: "1px solid var(--app-border)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Fingerprint size={16} color="var(--app-accent)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Giao diện tinh gọn</div>
                    <div style={{ fontSize: 12, color: "var(--app-muted)" }}>Bỏ bớt phần giả lập, ưu tiên dữ liệu DB</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav style={{ marginTop: 20, display: "grid", gap: 8 }}>
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.end} style={{ textDecoration: "none" }}>
              {({ isActive }) => (
                <motion.div
                  whileHover={{ x: collapsed ? 0 : 2 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: 12,
                    minHeight: 52,
                    padding: collapsed ? "0 10px" : "0 16px",
                    borderRadius: 18,
                    border: isActive ? "1px solid var(--app-border)" : "1px solid transparent",
                    background: isActive ? "linear-gradient(135deg, var(--app-accent-subtle), transparent)" : "transparent",
                    color: isActive ? "var(--app-text)" : "var(--app-muted)",
                  }}
                >
                  <item.icon size={18} color={isActive ? "var(--app-accent)" : "currentColor"} />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ fontSize: 14, fontWeight: isActive ? 600 : 500 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: 18 }}>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  padding: 16,
                  borderRadius: 22,
                  background: "linear-gradient(180deg, #ffffff, var(--app-bg-subtle))",
                  border: "1px solid var(--app-border)",
                  color: "var(--app-muted)",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                Dữ liệu người dùng, ảnh khuôn mặt và CCCD đang lấy từ database hiện tại.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => setCollapsed((value) => !value)}
          style={{
            position: "absolute",
            right: -14,
            top: 32,
            width: 28,
            height: 28,
            borderRadius: 999,
            border: "1px solid var(--app-border-strong)",
            background: "#ffffff",
            color: "var(--app-text)",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            boxShadow: "var(--app-shadow)",
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </motion.aside>

      <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            padding: "28px 36px 20px",
            borderBottom: "1px solid var(--app-border)",
            background: "rgba(255, 255, 255, 0.72)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: "var(--app-accent)",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                marginBottom: 8,
              }}
            >
              {currentMeta.eyebrow}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{currentMeta.title}</div>
            <div style={{ fontSize: 14, color: "var(--app-muted)", marginTop: 6 }}>{currentMeta.description}</div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid var(--app-border)",
                background: "#ffffff",
                fontSize: 12,
                color: "var(--app-text-soft)",
              }}
            >
              {todayLabel}
            </div>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(5, 150, 105, 0.16)",
                background: "rgba(5, 150, 105, 0.06)",
                fontSize: 12,
                color: "var(--app-success)",
              }}
            >
              Dữ liệu đồng bộ theo API
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflow: "auto" }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
