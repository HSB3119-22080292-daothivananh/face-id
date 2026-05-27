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
import { apiClient, type AdminEmployeeAccount, type EmployeeNotification, type EmployeeProfile } from "../services/api";
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

function monthDays(year: number, month: number) {
  const totalDays = new Date(year, month, 0).getDate();
  return Array.from({ length: totalDays }, (_, index) => new Date(year, month - 1, index + 1));
}

function useIsMobile(maxWidth = 760) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= maxWidth;
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= maxWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [maxWidth]);

  return isMobile;
}

export function EmployeePortal() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const auth = getStoredAuth();
  const token = auth?.token || "";
  const isAdmin = auth?.role === "admin";
  const profile = auth?.role === "employee" ? (auth.user as EmployeeProfile) : undefined;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([]);
  const [attendance, setAttendance] = useState<EmployeeNotification[]>([]);
  const [employees, setEmployees] = useState<AdminEmployeeAccount[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState("");
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
  const selectedEmployee = isAdmin
    ? employees.find((item) => item.person_id === selectedPersonId)
    : profile;
  const displayName = selectedEmployee?.name || (isAdmin ? "Chọn nhân viên" : "Nhân viên");
  const displayDepartment = selectedEmployee?.department || "Chưa có phòng ban";
  const displayRole = selectedEmployee?.role || "Chưa có chức vụ";

  const loadEmployees = async () => {
    if (!token || !isAdmin) return;
    const list = await apiClient.getAdminEmployees(token);
    setEmployees(list);
    setSelectedPersonId((current) => {
      if (current && list.some((item) => item.person_id === current)) return current;
      return list[0]?.person_id || "";
    });
  };

  const loadData = async (quiet = false) => {
    if (!token) return;
    if (isAdmin && !selectedPersonId) {
      setNotifications([]);
      setAttendance([]);
      setUnread(0);
      return;
    }
    try {
      if (!quiet) setSyncing(true);
      setError("");
      const [notificationResult, calendarResult] = isAdmin
        ? await Promise.all([
            apiClient.getAdminEmployeeNotifications(token, selectedPersonId),
            apiClient.getAdminEmployeeAttendance(token, selectedPersonId, year, month),
          ])
        : await Promise.all([
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
    loadEmployees().catch((err) => {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách nhân viên");
    });
  }, [token, isAdmin]);

  useEffect(() => {
    loadData();
  }, [token, year, month, selectedPersonId, isAdmin]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setInterval(() => loadData(true), 5000);
    return () => window.clearInterval(timer);
  }, [token, year, month, selectedPersonId, isAdmin]);

  const handleLogout = () => {
    clearStoredAuth();
    navigate("/login", { replace: true });
  };

  const markAllRead = async () => {
    if (!token || unread === 0 || isAdmin) return;
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
  const mobileDays = useMemo(() => monthDays(year, month), [year, month]);
  const checkedDays = attendanceByDay.size;
  const latestCheckinTime = latestNotification
    ? `${latestNotification.time} · ${latestNotification.date}`
    : "Chưa có dữ liệu";

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", color: "var(--app-text)" }}>
      <header
        style={{
          ...pageHeaderStyle,
          padding: isMobile ? 12 : "14px 20px",
          alignItems: isMobile ? "stretch" : "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div style={iconBoxStyle}>
            <UserCircle size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, overflowWrap: "anywhere" }}>{displayName}</div>
            <div style={{ fontSize: 13, color: "var(--app-muted)", overflowWrap: "anywhere" }}>
              {isAdmin ? "Admin đang xem màn nhân viên" : displayDepartment} · {displayRole}
            </div>
          </div>
        </div>

        <div style={{ ...headerActionsStyle, width: isMobile ? "100%" : undefined }}>
          {isAdmin && (
            <select
              value={selectedPersonId}
              onChange={(event) => {
                setSelectedPersonId(event.target.value);
                setSelectedCheckin(null);
              }}
              style={{ ...selectStyle, minWidth: isMobile ? 0 : 220, width: isMobile ? "100%" : undefined, height: 38 }}
            >
              {employees.map((employee) => (
                <option key={employee.person_id} value={employee.person_id}>
                  {employee.name} {employee.username ? `(${employee.username})` : ""}
                </option>
              ))}
            </select>
          )}
          {!isAdmin && (
            <button onClick={markAllRead} disabled={syncing || unread === 0} style={{ ...actionButtonStyle, flex: isMobile ? "1 1 100%" : undefined }}>
              <Bell size={16} />
              {unread} chưa đọc
            </button>
          )}
          <button onClick={() => loadData()} disabled={syncing} style={{ ...actionButtonStyle, flex: isMobile ? "1 1 0" : undefined }}>
            <RefreshCw size={16} style={{ animation: syncing ? "spin 1s linear infinite" : undefined }} />
            Làm mới
          </button>
          {isAdmin && (
            <button onClick={() => navigate("/", { replace: true })} style={{ ...actionButtonStyle, flex: isMobile ? "1 1 0" : undefined }}>
              <CalendarDays size={16} />
              Quản lý
            </button>
          )}
          <button onClick={handleLogout} style={{ ...dangerButtonStyle, flex: isMobile ? "1 1 0" : undefined }}>
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </header>

      <main style={{ padding: isMobile ? 12 : 20, display: "grid", gap: isMobile ? 12 : 18, maxWidth: 1180, margin: "0 auto" }}>
        {latestNotification && (
          <section style={successBandStyle}>
            <div style={successIconStyle}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800 }}>{latestNotification.title}</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>
                Check-in lúc {latestNotification.time} ngày {latestNotification.date}
              </div>
            </div>
          </section>
        )}

        {error && <div style={errorStyle}>{error}</div>}

        <section style={summaryGridStyle}>
          <article style={summaryCardStyle}>
            <div style={summaryIconStyle}><CalendarDays size={18} /></div>
            <div>
              <div style={summaryLabelStyle}>Kỳ đang xem</div>
              <div style={summaryValueStyle}>Tháng {pad(month)} / {year}</div>
            </div>
          </article>
          <article style={summaryCardStyle}>
            <div style={{ ...summaryIconStyle, background: "rgba(5,150,105,0.10)", color: "var(--app-success)" }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={summaryLabelStyle}>Ngày đã điểm danh</div>
              <div style={summaryValueStyle}>{checkedDays}</div>
            </div>
          </article>
          <article style={summaryCardStyle}>
            <div style={{ ...summaryIconStyle, background: "rgba(14,165,233,0.10)", color: "#0284c7" }}>
              <Clock size={18} />
            </div>
            <div>
              <div style={summaryLabelStyle}>Lần gần nhất</div>
              <div style={{ ...summaryValueStyle, fontSize: 15 }}>{latestCheckinTime}</div>
            </div>
          </article>
        </section>

        <section style={calendarShellStyle}>
          <div style={{ ...calendarHeaderStyle, ...(isMobile ? calendarHeaderMobileStyle : {}) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <div style={calendarHeaderIconStyle}>
                <CalendarDays size={22} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={calendarEyebrowStyle}>Lịch điểm danh</div>
                <div style={{ ...calendarTitleStyle, fontSize: isMobile ? 20 : 24 }}>Tháng {pad(month)} - {year}</div>
              </div>
            </div>

            <div style={{ ...calendarControlsStyle, ...(isMobile ? calendarControlsMobileStyle : {}) }}>
              <button onClick={goPrevMonth} style={roundButtonStyle} title="Tháng trước">
                <ChevronLeft size={20} />
              </button>
              <select value={month} onChange={(event) => setMonth(Number(event.target.value))} style={{ ...selectStyle, flex: isMobile ? "1 1 120px" : undefined }}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
                  <option key={item} value={item}>Tháng {item}</option>
                ))}
              </select>
              <select value={year} onChange={(event) => setYear(Number(event.target.value))} style={{ ...selectStyle, flex: isMobile ? "1 1 92px" : undefined }}>
                {years.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <button onClick={goNextMonth} style={roundButtonStyle} title="Tháng sau">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {isMobile ? (
            <div style={mobileListStyle}>
              {mobileDays.map((date) => {
                const key = formatDateKey(date);
                const records = attendanceByDay.get(key) || [];
                const primaryRecord = records[0];
                const isToday = key === formatDateKey(now);
                const weekday = weekDays[(date.getDay() + 6) % 7];

                return (
                  <button
                    key={key}
                    onClick={() => primaryRecord && setSelectedCheckin(primaryRecord)}
                    disabled={!primaryRecord}
                    style={{
                      ...mobileDayRowStyle,
                      ...(primaryRecord ? mobileDayRowActiveStyle : {}),
                      ...(isToday ? mobileDayRowTodayStyle : {}),
                      cursor: primaryRecord ? "pointer" : "default",
                    }}
                  >
                    <div style={mobileDateBoxStyle}>
                      <div style={mobileDateNumberStyle}>{pad(date.getDate())}</div>
                      <div style={mobileWeekdayStyle}>{weekday}</div>
                    </div>
                    <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {isToday && <span style={todayBadgeStyle}>Hôm nay</span>}
                        {primaryRecord ? (
                          <span style={mobileStatusOkStyle}>
                            <CheckCircle2 size={13} />
                            Đã điểm danh
                          </span>
                        ) : (
                          <span style={mobileStatusEmptyStyle}>Chưa check-in</span>
                        )}
                      </div>
                      <div style={mobileDayMetaStyle}>
                        {primaryRecord ? `Check-in lúc ${primaryRecord.time}` : "Không có bản ghi trong ngày này"}
                      </div>
                      {records.length > 1 && <div style={moreRecordStyle}>+{records.length - 1} lần khác</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={calendarBodyScrollStyle}>
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
                const hasRecords = records.length > 0;
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                return (
                  <button
                    key={key}
                    onClick={() => primaryRecord && setSelectedCheckin(primaryRecord)}
                    disabled={!primaryRecord}
                    style={{
                      ...dayCellStyle,
                      ...(hasRecords ? attendedDayCellStyle : {}),
                      ...(isToday ? todayDayCellStyle : {}),
                      opacity: inMonth ? 1 : 0.42,
                      cursor: primaryRecord ? "pointer" : "default",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ ...dayNumberStyle, color: isWeekend ? "#dc2626" : "#0f172a" }}>
                        {date.getDate()}
                      </span>
                      {isToday && <span style={todayBadgeStyle}>Hôm nay</span>}
                      {hasRecords && !isToday && (
                        <span style={checkBadgeStyle}>
                          <CheckCircle2 size={12} />
                          {records.length}
                        </span>
                      )}
                    </div>
                    {primaryRecord ? (
                      <div style={checkinCardStyle}>
                        <div style={checkinStatusStyle}>
                          <CheckCircle2 size={13} />
                          Đã điểm danh
                        </div>
                        <div style={checkinMetaStyle}>
                          <Clock size={12} />
                          {primaryRecord.time}
                        </div>
                        {records.length > 1 && <div style={moreRecordStyle}>+{records.length - 1} lần khác</div>}
                      </div>
                    ) : (
                      <div style={emptyCheckinStyle}>Chưa check-in</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          )}
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
              <InfoRow icon={<UserCircle size={17} />} label="Nhân viên" value={displayName} />
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

const pageHeaderStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  background: "rgba(255,255,255,0.94)",
  borderBottom: "1px solid var(--app-border)",
  backdropFilter: "blur(16px)",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const headerActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

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
  borderRadius: 10,
  padding: "14px 16px",
  background: "linear-gradient(135deg, rgba(5,150,105,0.10), rgba(14,165,233,0.08))",
  border: "1px solid rgba(5,150,105,0.18)",
  color: "var(--app-text)",
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const successIconStyle: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  color: "var(--app-success)",
  background: "#ffffff",
  border: "1px solid rgba(5,150,105,0.18)",
  boxShadow: "var(--app-shadow-xs)",
};

const errorStyle: CSSProperties = {
  borderRadius: 8,
  padding: "12px 14px",
  background: "var(--app-danger-bg)",
  border: "1px solid var(--app-danger-border)",
  color: "var(--app-danger)",
  fontSize: 13,
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const summaryCardStyle: CSSProperties = {
  minHeight: 86,
  padding: 16,
  borderRadius: 10,
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  boxShadow: "var(--app-shadow-xs)",
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const summaryIconStyle: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  background: "var(--app-accent-subtle)",
  color: "var(--app-accent)",
};

const summaryLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "var(--app-muted)",
  fontWeight: 700,
  textTransform: "uppercase",
};

const summaryValueStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 18,
  fontWeight: 900,
  color: "var(--app-text)",
};

const calendarShellStyle: CSSProperties = {
  borderRadius: 12,
  overflow: "hidden",
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  boxShadow: "var(--app-shadow)",
};

const calendarHeaderStyle: CSSProperties = {
  minHeight: 76,
  padding: "14px 16px",
  background: "#0f172a",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const calendarHeaderMobileStyle: CSSProperties = {
  padding: 14,
  alignItems: "stretch",
};

const calendarHeaderIconStyle: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.16)",
};

const calendarEyebrowStyle: CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.68)",
  fontWeight: 800,
  textTransform: "uppercase",
};

const calendarTitleStyle: CSSProperties = {
  marginTop: 2,
  fontSize: 24,
  fontWeight: 900,
  color: "#ffffff",
};

const calendarControlsStyle: CSSProperties = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const calendarControlsMobileStyle: CSSProperties = {
  width: "100%",
  marginLeft: 0,
};

const roundButtonStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.10)",
  color: "#ffffff",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const selectStyle: CSSProperties = {
  height: 36,
  minWidth: 108,
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  background: "#ffffff",
  color: "#0f172a",
  padding: "0 12px",
  fontWeight: 700,
};

const mobileListStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 12,
  background: "#f8fafc",
};

const mobileDayRowStyle: CSSProperties = {
  width: "100%",
  border: "1px solid var(--app-border)",
  borderRadius: 12,
  background: "#ffffff",
  padding: 12,
  display: "flex",
  alignItems: "center",
  gap: 12,
  textAlign: "left",
  color: "var(--app-text)",
};

const mobileDayRowActiveStyle: CSSProperties = {
  borderColor: "rgba(5,150,105,0.24)",
  background: "#f0fdf4",
};

const mobileDayRowTodayStyle: CSSProperties = {
  borderColor: "rgba(217,119,6,0.28)",
  background: "#fffbeb",
};

const mobileDateBoxStyle: CSSProperties = {
  width: 64,
  minWidth: 64,
  height: 64,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  background: "#ffffff",
  border: "1px solid var(--app-border)",
};

const mobileDateNumberStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  lineHeight: 1,
};

const mobileWeekdayStyle: CSSProperties = {
  marginTop: 5,
  fontSize: 11,
  color: "var(--app-muted)",
  fontWeight: 800,
};

const mobileStatusOkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minHeight: 26,
  padding: "0 9px",
  borderRadius: 999,
  background: "#ffffff",
  color: "var(--app-success)",
  border: "1px solid rgba(5,150,105,0.18)",
  fontSize: 12,
  fontWeight: 900,
};

const mobileStatusEmptyStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 26,
  padding: "0 9px",
  borderRadius: 999,
  background: "#f8fafc",
  color: "var(--app-muted)",
  border: "1px dashed var(--app-border)",
  fontSize: 12,
  fontWeight: 800,
};

const mobileDayMetaStyle: CSSProperties = {
  color: "var(--app-muted)",
  fontSize: 13,
  fontWeight: 700,
  overflowWrap: "anywhere",
};

const calendarBodyScrollStyle: CSSProperties = {
  overflowX: "auto",
};

const weekGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(112px, 1fr))",
  borderBottom: "1px solid var(--app-border)",
  background: "#f8fafc",
  minWidth: 784,
};

const weekDayStyle: CSSProperties = {
  minHeight: 42,
  display: "grid",
  placeItems: "center",
  color: "var(--app-muted)",
  fontWeight: 800,
  fontSize: 12,
  textTransform: "uppercase",
};

const dayGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(112px, 1fr))",
  background: "#eef2f7",
  gap: 1,
  minWidth: 784,
};

const dayCellStyle: CSSProperties = {
  minHeight: 132,
  padding: 12,
  border: "none",
  background: "#ffffff",
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
};

const attendedDayCellStyle: CSSProperties = {
  background: "#f0fdf4",
  boxShadow: "inset 3px 0 0 var(--app-success)",
};

const todayDayCellStyle: CSSProperties = {
  background: "#fffbeb",
  boxShadow: "inset 3px 0 0 #d97706",
};

const dayNumberStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  lineHeight: 1,
};

const todayBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 22,
  padding: "0 8px",
  borderRadius: 999,
  background: "#ffffff",
  border: "1px solid rgba(217,119,6,0.24)",
  color: "#b45309",
  fontSize: 11,
  fontWeight: 900,
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

const checkinCardStyle: CSSProperties = {
  marginTop: "auto",
  display: "grid",
  gap: 6,
  padding: 10,
  borderRadius: 10,
  background: "#ffffff",
  border: "1px solid rgba(5,150,105,0.18)",
  boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
};

const checkinStatusStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: "var(--app-success)",
  fontSize: 12,
  fontWeight: 900,
};

const checkinMetaStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  color: "var(--app-muted)",
  fontSize: 12,
  fontWeight: 700,
};

const moreRecordStyle: CSSProperties = {
  color: "#0284c7",
  fontSize: 12,
  fontWeight: 800,
};

const emptyCheckinStyle: CSSProperties = {
  marginTop: "auto",
  fontSize: 12,
  color: "var(--app-placeholder)",
  padding: "9px 10px",
  borderRadius: 10,
  background: "#f8fafc",
  border: "1px dashed var(--app-border)",
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
  borderRadius: 12,
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  boxShadow: "var(--app-shadow-xl)",
  padding: 22,
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
