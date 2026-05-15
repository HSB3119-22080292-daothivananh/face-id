import { useState, useEffect } from "react";
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
  Menu,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useWindowSize } from "usehooks-ts"; // Let's check if usehooks-ts is available, if not we'll write a simple hook. Wait, it's safer to just write a simple hook or use CSS media queries.

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const currentMeta = pageMeta[location.pathname] ?? pageMeta["/"];

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Handle responsive sidebar behavior via resize listener
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        color: "var(--app-text)",
        position: "relative",
        overflowX: "hidden", // Prevent horizontal scroll on mobile
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

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.4)",
              backdropFilter: "blur(4px)",
              zIndex: 40,
            }}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ 
          width: collapsed ? 92 : 288,
          x: typeof window !== "undefined" && window.innerWidth < 768 ? (mobileOpen ? 0 : -300) : 0,
        }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} // Spring-like feel
        style={{
          position: typeof window !== "undefined" && window.innerWidth < 768 ? "fixed" : "relative",
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          padding: 20,
          borderRight: "1px solid var(--app-border)",
          background: "rgba(255, 255, 255, 0.95)", // More opaque for mobile visibility
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
                transition={{ duration: 0.2 }}
                style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "var(--app-accent)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
                    Face ID
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Console</div>
                </div>
                {/* Close button for mobile */}
                {typeof window !== "undefined" && window.innerWidth < 768 && (
                  <button onClick={() => setMobileOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--app-muted)" }}>
                    <X size={20} />
                  </button>
                )}
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

        <div style={{ marginTop: "auto" }} />

        {typeof window !== "undefined" && window.innerWidth >= 768 && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
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
          </motion.button>
        )}
      </motion.aside>

      <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "flex-start",
            gap: 16,
            alignItems: "center",
            padding: typeof window !== "undefined" && window.innerWidth < 768 ? "16px 20px" : "28px 36px 20px",
            borderBottom: "1px solid var(--app-border)",
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(16px)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          {typeof window !== "undefined" && window.innerWidth < 768 && (
            <button 
              onClick={() => setMobileOpen(true)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                marginRight: "4px",
                display: "grid",
                placeItems: "center",
                color: "var(--app-text)"
              }}
            >
              <Menu size={24} />
            </button>
          )}
          
          <div>
            <motion.div 
              initial={{ opacity: 0, y: -5 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.3 }}
              style={{ fontSize: typeof window !== "undefined" && window.innerWidth < 768 ? 22 : 28, fontWeight: 700, lineHeight: 1.2, color: "var(--app-text)" }}
            >
              {currentMeta.title}
            </motion.div>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ duration: 0.4, delay: 0.1 }}
              style={{ fontSize: 14, color: "var(--app-muted)", marginTop: 6 }}
            >
              {currentMeta.description}
            </motion.div>
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
