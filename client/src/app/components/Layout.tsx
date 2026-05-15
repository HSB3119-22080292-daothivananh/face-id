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
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  Clock,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const navItems = [
  { path: "/", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { path: "/live", label: "Nhận diện trực tiếp", icon: Camera },
  { path: "/faces", label: "Người dùng", icon: Users },
  { path: "/activity", label: "Nhật ký", icon: Activity },
];

// ─── CUSTOM HOOK: Real-time Clock ──────────────────────────────────────────
function useCurrentTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return time;
}

// ─── CUSTOM HOOK: Weather API (OpenWeatherMap) ─────────────────────────────
function useWeather(location: string = "Hanoi,VN") {
  const [weather, setWeather] = useState<{
    temp: number;
    condition: string;
    icon: any;
    humidity: number;
    location: string;
    loading: boolean;
    error: string | null;
  }>({
    temp: 0,
    condition: "",
    icon: Sun,
    humidity: 0,
    location: "",
    loading: true,
    error: null,
  });

  useEffect(() => {
    const apiKey = import.meta.env?.VITE_WEATHER_API_KEY;
    if (!apiKey) {
      setWeather({
        temp: 28,
        condition: "Nắng nhẹ",
        icon: Sun,
        humidity: 65,
        location: "Hà Nội",
        loading: false,
        error: null,
      });
      return;
    }

    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric&lang=vi`
        );
        if (!res.ok) throw new Error("Không thể lấy dữ liệu thời tiết");
        const data = await res.json();
        
        const main = data.weather[0].main.toLowerCase();
        let icon = Sun;
        if (main.includes("cloud")) icon = Cloud;
        else if (main.includes("rain") || main.includes("drizzle")) icon = CloudRain;
        else if (main.includes("snow")) icon = CloudSnow;
        else if (main.includes("clear")) icon = Sun;

        setWeather({
          temp: Math.round(data.main.temp),
          condition: data.weather[0].description,
          icon,
          humidity: data.main.humidity,
          location: data.name,
          loading: false,
          error: null,
        });
      } catch (err) {
        setWeather((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Lỗi không xác định",
        }));
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, [location]);

  return weather;
}

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const currentTime = useCurrentTime();
  const weather = useWeather("Hanoi,VN");

  const timeString = currentTime.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const dateString = currentTime.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
        overflowX: "hidden",
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
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
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
          background: "rgba(255, 255, 255, 0.95)",
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
            justifyContent: "space-between",
            alignItems: "center",
            padding: typeof window !== "undefined" && window.innerWidth < 768 ? "12px 16px" : "28px 36px 20px",
            borderBottom: "1px solid var(--app-border)",
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(16px)",
            position: "sticky",
            top: 0,
            zIndex: 10,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {typeof window !== "undefined" && window.innerWidth < 768 && (
              <button 
                onClick={() => setMobileOpen(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--app-text)",
                }}
              >
                <Menu size={24} />
              </button>
            )}
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.4 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 8,
              padding: "8px 12px",
              background: "var(--app-surface, #f8fafc)",
              borderRadius: 12,
              border: "1px solid var(--app-border, #e2e8f0)",
              whiteSpace: "nowrap",
            }}>
              <Clock size={16} color="var(--app-muted, #64748b)" />
              <div style={{ textAlign: "right" }}>
                <div style={{ 
                  fontSize: 15, 
                  fontWeight: 600, 
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--app-text, #1e293b)",
                  lineHeight: 1,
                }}>
                  {timeString}
                </div>
                <div style={{ 
                  fontSize: 11, 
                  color: "var(--app-muted, #64748b)",
                  lineHeight: 1,
                }}>
                  {dateString}
                </div>
              </div>
            </div>

            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 8,
              padding: "8px 12px",
              background: "var(--app-surface, #f8fafc)",
              borderRadius: 12,
              border: "1px solid var(--app-border, #e2e8f0)",
              minWidth: 140,
              whiteSpace: "nowrap",
            }}>
              {weather.loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <Cloud size={18} color="var(--app-muted, #64748b)" />
                </motion.div>
              ) : weather.error ? (
                <Cloud size={18} color="#ef4444" />
              ) : (
                <weather.icon size={18} color="#f59e0b" />
              )}
              <div style={{ textAlign: "right", minWidth: 70 }}>
                <div style={{ 
                  fontSize: 15, 
                  fontWeight: 600,
                  color: "var(--app-text, #1e293b)",
                  lineHeight: 1,
                }}>
                  {weather.loading ? "--" : `${weather.temp}°C`}
                </div>
                <div style={{ 
                  fontSize: 11, 
                  color: "var(--app-muted, #64748b)",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 90,
                }}>
                  {weather.loading ? "Đang tải..." : weather.error ? "Lỗi API" : weather.condition}
                </div>
              </div>
            </div>
          </motion.div>
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