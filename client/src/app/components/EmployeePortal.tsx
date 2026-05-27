import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogOut,
  MapPin,
  RefreshCw,
  UserCircle,
  X,
} from "lucide-react";
import { apiClient, type EmployeeNotification, type EmployeeProfile } from "../services/api";
import { clearStoredAuth, getStoredAuth } from "./Auth";

const weekDays = ["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "Chủ nhật"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthCells(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(year, month - 1, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function EmployeePortal() {
  const navigate = useNavigate();
  const auth = getStoredAuth();
  const token = auth?.token || "";
  const profile = auth?.user as EmployeeProfile | undefined;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([]);
  const [attendance, setAttendance] = useState<EmployeeNotification[]>([]);
  const [selectedCheckin, setSelectedCheckin] = useState<EmployeeNotification | null>(null);
  const [unread, setUnread] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const attendanceByDay = useMemo(() => {
    const map = new Map<string, EmployeeNotification[]>();
    attendance.forEach((item) => {
      const key = item.day_key || item.attendance_time?.slice(0, 10);
      if (!key) return;
      map.set(key, [...(map.get(key) || []), item]);
    });
    return map;
  }, [attendance]);

  const latestNotification = notifications.find((item) => item.status === "unread") ?? notifications[0];

  const loadData = async (quiet = false) => {
    if (!token) return;
    try {
      if (!quiet) setSyncing(true);
      setError("");
      const [notificationResult, calendarResult] = await Promise.all([
        apiClient.getEmployeeNotifications(token),
        apiClient.getEmployeeAttendance(token, year, month),
      ]);
      setNotifications(notificationResult.data);
      setUnread(notificationResult.unread);
      setAttendance(calendarResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu điểm danh");
    } finally {
      if (!quiet) setSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, year, month]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setInterval(() => loadData(true), 5000);
    return () => window.clearInterval(timer);
  }, [token, year, month]);

  const handleLogout = () => {
    clearStoredAuth();
    navigate("/login", { replace: true });
  };

  const markAllRead = async () => {
    if (!token || unread === 0) return;
    setSyncing(true);
    try {
      await apiClient.markEmployeeNotificationsRead(token);
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật thông báo");
    } finally {
      setSyncing(false);
    }
  };

  const goPrevMonth = () => {
    if (month === 1) {
      setYear((value) => value - 1);
      setMonth(12);
      return;
    }
    setMonth((value) => value - 1);
  };

  const goNextMonth = () => {
    if (month === 12) {
      setYear((value) => value + 1);
      setMonth(1);
      return;
    }
    setMonth((value) => value + 1);
  };

  const years = Array.from({ length: 7 }, (_, index) => now.getFullYear() - 3 + index);
  const cells = monthCells(year, month);

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", color: "var(--app-text)" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(255,255,255,0.92)",
          borderBottom: "1px solid var(--app-border)",
          backdropFilter: "blur(16px)",
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={iconBoxStyle}>
            <UserCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{profile?.name || "Nhân viên"}</div>
            <div style={{ fontSize: 13, color: "var(--app-muted)" }}>
              {profile?.department || "Chưa có phòng ban"} · {profile?.role || "Chưa có chức vụ"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button onClick={markAllRead} disabled={syncing || unread === 0} style={actionButtonStyle}>
            <Bell size={16} />
            {unread} chưa đọc
          </button>
          <button onClick={() => loadData()} disabled={syncing} style={actionButtonStyle}>
            <RefreshCw size={16} style={{ animation: syncing ? "spin 1s linear infinite" : undefined }} />
            Làm mới
          </button>
          <button onClick={handleLogout} style={dangerButtonStyle}>
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </header>

      <main style={{ padding: 20, display: "grid", gap: 18, maxWidth: 1120, margin: "0 auto" }}>
        {latestNotification && (
          <section style={successBandStyle}>
            <CheckCircle2 size={22} />
            <div>
              <div style={{ fontWeight: 800 }}>{latestNotification.title}</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>
                Check-in lúc {latestNotification.time} ngày {latestNotification.date}
              </div>
            </div>
          </section>
        )}

        {error && <div style={errorStyle}>{error}</div>}

        <section style={calendarShellStyle}>
          <div style={calendarHeaderStyle}>
            <button onClick={goPrevMonth} style={roundButtonStyle} title="Tháng trước">
              <ChevronLeft size={22} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <CalendarDays size={24} />
              <div style={{ fontSize: "clamp(18px, 3vw, 26px)", fontWeight: 900, color: "#ffffff" }}>
                THÁNG {pad(month)} - {year}
              </div>
            </div>
            <button onClick={goNextMonth} style={roundButtonStyle} title="Tháng sau">
              <ChevronRight size={22} />
            </button>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select value={month} onChange={(event) => setMonth(Number(event.target.value))} style={selectStyle}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
                  <option key={item} value={item}>Tháng {item}</option>
                ))}
              </select>
              <select value={year} onChange={(event) => setYear(Number(event.target.value))} style={selectStyle}>
                {years.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={weekGridStyle}>
            {weekDays.map((day) => (
              <div key={day} style={weekDayStyle}>{day}</div>
            ))}
          </div>

          <div style={dayGridStyle}>
            {cells.map((date) => {
              const key = formatDateKey(date);
              const records = attendanceByDay.get(key) || [];
              const inMonth = date.getMonth() + 1 === month;
              const isToday = key === formatDateKey(now);
              const primaryRecord = records[0];

              return (
                <button
                  key={key}
                  onClick={() => primaryRecord && setSelectedCheckin(primaryRecord)}
                  disabled={!primaryRecord}
                  style={{
                    ...dayCellStyle,
                    opacity: inMonth ? 1 : 0.42,
                    background: isToday ? "#fff4d6" : records.length > 0 ? "rgba(5,150,105,0.07)" : "#ffffff",
                    borderColor: isToday ? "rgba(217,119,6,0.28)" : records.length > 0 ? "rgba(5,150,105,0.22)" : "var(--app-border)",
                    cursor: primaryRecord ? "pointer" : "default",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: date.getDay() === 0 ? "#dc2626" : "#0f172a" }}>
                      {date.getDate()}
                    </span>
                    {records.length > 0 && (
                      <span style={checkBadgeStyle}>
                        <CheckCircle2 size={12} />
                        {records.length}
                      </span>
                    )}
                  </div>
                  {primaryRecord ? (
                    <div style={{ marginTop: "auto", display: "grid", gap: 4 }}>
                      <div style={{ fontSize: 12, color: "var(--app-success)", fontWeight: 800 }}>Đã điểm danh</div>
                      <div style={{ fontSize: 12, color: "var(--app-muted)" }}>{primaryRecord.time}</div>
                    </div>
                  ) : (
                    <div style={{ marginTop: "auto", fontSize: 12, color: "var(--app-placeholder)" }}>Chưa check-in</div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {selectedCheckin && (
        <div style={modalOverlayStyle} onClick={() => setSelectedCheckin(null)}>
          <section style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--app-muted)" }}>Thông tin check-in</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{selectedCheckin.title}</div>
              </div>
              <button onClick={() => setSelectedCheckin(null)} style={modalCloseStyle}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              <InfoRow icon={<Clock size={17} />} label="Thời gian" value={`${selectedCheckin.time} · ${selectedCheckin.date}`} />
              <InfoRow icon={<UserCircle size={17} />} label="Nhân viên" value={profile?.name || ""} />
              <InfoRow icon={<MapPin size={17} />} label="Camera" value={selectedCheckin.camera || "Cổng Chính"} />
              <InfoRow icon={<CheckCircle2 size={17} />} label="Trạng thái" value="Đã điểm danh xong" />
              <InfoRow
                icon={<CalendarDays size={17} />}
                label="Độ chính xác"
                value={selectedCheckin.confidence != null ? `${selectedCheckin.confidence.toFixed(1)}%` : "Đã ghi nhận"}
              />
            </div>

            <div style={{ marginTop: 18, padding: 14, borderRadius: 8, background: "var(--app-bg-subtle)", color: "var(--app-muted)", fontSize: 13 }}>
              {selectedCheckin.message}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "24px 110px minmax(0, 1fr)", alignItems: "center", gap: 8 }}>
      <div style={{ color: "var(--app-accent)", display: "grid", placeItems: "center" }}>{icon}</div>
      <div style={{ color: "var(--app-muted)", fontSize: 13 }}>{label}</div>
      <div style={{ fontWeight: 700, minWidth: 0, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

const iconBoxStyle: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 8,
  display: "grid",
  placeItems: "center",
  background: "var(--app-accent-subtle)",
  color: "var(--app-accent)",
};

const actionButtonStyle: CSSProperties = {
  height: 38,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  background: "var(--app-surface)",
  color: "var(--app-text)",
  display: "flex",
  alignItems: "center",
  gap: 7,
  cursor: "pointer",
  fontWeight: 700,
};

const dangerButtonStyle: CSSProperties = {
  ...actionButtonStyle,
  color: "var(--app-danger)",
  background: "var(--app-danger-bg)",
  border: "1px solid var(--app-danger-border)",
};

const successBandStyle: CSSProperties = {
  borderRadius: 8,
  padding: 16,
  background: "var(--app-success-bg)",
  border: "1px solid var(--app-success-border)",
  color: "var(--app-success)",
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const errorStyle: CSSProperties = {
  borderRadius: 8,
  padding: "12px 14px",
  background: "var(--app-danger-bg)",
  border: "1px solid var(--app-danger-border)",
  color: "var(--app-danger)",
  fontSize: 13,
};

const calendarShellStyle: CSSProperties = {
  borderRadius: 8,
  overflow: "hidden",
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  boxShadow: "var(--app-shadow)",
};

const calendarHeaderStyle: CSSProperties = {
  minHeight: 64,
  padding: "10px 16px",
  background: "#4caf5b",
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const roundButtonStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  border: "none",
  background: "#ffffff",
  color: "#4caf5b",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const selectStyle: CSSProperties = {
  height: 34,
  minWidth: 108,
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.5)",
  background: "#ffffff",
  color: "#0f172a",
  padding: "0 10px",
  fontWeight: 700,
};

const weekGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(96px, 1fr))",
  borderBottom: "1px solid var(--app-border)",
  overflowX: "auto",
};

const weekDayStyle: CSSProperties = {
  minHeight: 38,
  display: "grid",
  placeItems: "center",
  color: "var(--app-muted)",
  fontWeight: 700,
  fontSize: 14,
};

const dayGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(96px, 1fr))",
  overflowX: "auto",
};

const dayCellStyle: CSSProperties = {
  minHeight: 118,
  padding: 10,
  border: "none",
  borderRight: "1px solid var(--app-border)",
  borderBottom: "1px solid var(--app-border)",
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const checkBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 7px",
  borderRadius: 999,
  background: "var(--app-success-bg)",
  color: "var(--app-success)",
  border: "1px solid var(--app-success-border)",
  fontSize: 11,
  fontWeight: 800,
};

const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "grid",
  placeItems: "center",
  padding: 18,
  background: "rgba(15,23,42,0.38)",
  backdropFilter: "blur(6px)",
};

const modalStyle: CSSProperties = {
  width: "min(100%, 460px)",
  borderRadius: 8,
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  boxShadow: "var(--app-shadow-xl)",
  padding: 20,
};

const modalCloseStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  background: "var(--app-bg-subtle)",
  color: "var(--app-text)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};
