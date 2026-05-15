import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  CalendarClock,
  Database,
  ScanFace,
  ShieldAlert,
  Users,
  Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import { apiClient, type ActivityLogEntry, type MemoryStatus, type Person } from "../services/api";

interface StatisticsPayload {
  hourlyData: Array<{ time: string; recognized: number; denied: number; unknown: number }>;
  weeklyData: Array<{ day: string; value: number }>;
}

function DashboardCard({
  title,
  value,
  detail,
  accent,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  accent: string;
  icon: any;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div
      style={{
        borderRadius: isMobile ? 16 : 24,
        padding: isMobile ? 16 : 20,
        background: "var(--app-surface)",
        border: "1px solid var(--app-border)",
        boxShadow: "var(--app-shadow)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div
          style={{
            width: isMobile ? 40 : 46,
            height: isMobile ? 40 : 46,
            borderRadius: isMobile ? 12 : 16,
            display: "grid",
            placeItems: "center",
            background: `${accent}20`,
            border: `1px solid ${accent}28`,
            flexShrink: 0,
          }}
        >
          <Icon size={isMobile ? 18 : 20} color={accent} />
        </div>
        <div style={{ minWidth: 0, textAlign: "right", flex: 1 }}>
          <div style={{ fontSize: isMobile ? 11 : 13, color: "var(--app-muted)", lineHeight: 1.4 }}>{title}</div>
          <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 700, marginTop: isMobile ? 6 : 10, lineHeight: 1.2 }}>{value}</div>
        </div>
      </div>
      <div style={{ marginTop: isMobile ? 10 : 14, fontSize: isMobile ? 11 : 13, color: "var(--app-muted)", lineHeight: 1.4 }}>{detail}</div>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const [persons, setPersons] = useState<Person[]>([]);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [statistics, setStatistics] = useState<StatisticsPayload>({ hourlyData: [], weeklyData: [] });
  const [memory, setMemory] = useState<MemoryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [personsData, logsData, statsData, memoryData] = await Promise.all([
          apiClient.getPersons(),
          apiClient.getActivityLog(),
          apiClient.getStatistics(),
          apiClient.getMemoryStatus(),
        ]);

        if (!mounted) {
          return;
        }

        setPersons(personsData);
        setLogs(logsData);
        setStatistics(statsData);
        setMemory(memoryData);
      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu dashboard");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const todayKey = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const activePersons = persons.filter((person) => person.status === "active").length;
  const expiredPersons = persons.filter((person) => person.is_expired).length;
  const totalRecognitions = logs.filter((log) => log.status === "success").length;
  const todayRecognitions = logs.filter((log) => log.status === "success" && log.date === todayKey).length;
  const unknownToday = logs.filter((log) => log.status === "unknown" && log.date === todayKey).length;
  const recentLogs = logs.slice(0, 6);
  const flaggedProfiles = persons.filter((person) => person.is_expired || person.status === "inactive").slice(0, 5);

  const tooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) {
      return null;
    }

    return (
      <div
        style={{
          borderRadius: isMobile ? 12 : 16,
          padding: isMobile ? 8 : 12,
          background: "var(--app-surface-overlay)",
          border: "1px solid var(--app-border)",
          boxShadow: "var(--app-shadow)",
          fontSize: isMobile ? 11 : 12,
        }}
      >
        <div style={{ fontSize: isMobile ? 10 : 12, color: "var(--app-muted)", marginBottom: isMobile ? 4 : 8 }}>{label}</div>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 8, marginTop: isMobile ? 2 : 4 }}>
            <div style={{ width: isMobile ? 6 : 8, height: isMobile ? 6 : 8, borderRadius: 999, background: entry.color }} />
            <div style={{ fontSize: isMobile ? 11 : 13 }}>{entry.value}</div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: isMobile ? 16 : 28, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", marginBottom: isMobile ? 12 : 16 }}>
            <Loader2 size={isMobile ? 28 : 36} color="var(--app-accent)" />
          </motion.div>
          <div style={{ color: "var(--app-muted)", fontSize: isMobile ? 12 : 14 }}>Đang tải dữ liệu dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 12 : 28, display: "grid", gap: isMobile ? 16 : 20, maxWidth: "100%", overflowX: "hidden" }}>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          borderRadius: isMobile ? 16 : 28,
          padding: isMobile ? 16 : 24,
          border: "1px solid var(--app-border)",
          background: "linear-gradient(135deg, #ffffff, var(--app-bg-subtle))",
          boxShadow: "var(--app-shadow)",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          gap: isMobile ? 16 : 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ maxWidth: isMobile ? "100%" : 620, flex: isMobile ? "none" : 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: isMobile ? 4 : 8,
              padding: isMobile ? "6px 10px" : "8px 12px",
              borderRadius: 999,
              background: "rgba(125,211,252,0.08)",
              border: "1px solid rgba(125,211,252,0.16)",
              color: "var(--app-accent)",
              fontSize: isMobile ? 10 : 12,
              marginBottom: isMobile ? 12 : 16,
              flexWrap: "wrap",
            }}
          >
            <Database size={isMobile ? 12 : 14} />
            <span>Dữ liệu lấy trực tiếp từ API người dùng, log và thống kê</span>
          </div>
          <div style={{ 
            fontSize: isMobile ? 20 : 30, 
            fontWeight: 700, 
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}>
            Bỏ số liệu giả, giữ lại phần hữu ích để vận hành
          </div>
          <div style={{ 
            marginTop: isMobile ? 8 : 10, 
            color: "var(--app-muted)", 
            fontSize: isMobile ? 12 : 14, 
            lineHeight: 1.6,
          }}>
            Dashboard hiện chỉ giữ các chỉ số lấy được từ backend: hồ sơ đăng ký, lượt nhận diện, trạng thái RAM và những hồ sơ cần kiểm tra.
          </div>
        </div>

        <div style={{ 
          display: "flex", 
          gap: isMobile ? 8 : 12, 
          flexWrap: "wrap", 
          alignItems: "flex-start",
          flexDirection: isMobile ? "column" : "row",
          width: isMobile ? "100%" : "auto",
        }}>
          <button
            onClick={() => navigate("/faces")}
            style={{
              padding: isMobile ? "10px 14px" : "12px 16px",
              borderRadius: isMobile ? 14 : 18,
              border: "1px solid rgba(125,211,252,0.22)",
              background: "rgba(125,211,252,0.12)",
              color: "var(--app-text)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 6 : 8,
              fontSize: isMobile ? 13 : 14,
              flex: isMobile ? 1 : "none",
              justifyContent: "center",
              minWidth: isMobile ? "100%" : "auto",
            }}
          >
            Xem hồ sơ người dùng
            <ArrowRight size={isMobile ? 14 : 16} />
          </button>
          <button
            onClick={() => navigate("/live")}
            style={{
              padding: isMobile ? "10px 14px" : "12px 16px",
              borderRadius: isMobile ? 14 : 18,
              border: "1px solid rgba(245,158,11,0.18)",
              background: "rgba(245,158,11,0.1)",
              color: "var(--app-text)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 6 : 8,
              fontSize: isMobile ? 13 : 14,
              flex: isMobile ? 1 : "none",
              justifyContent: "center",
              minWidth: isMobile ? "100%" : "auto",
            }}
          >
            Mở camera trực tiếp
            <ArrowRight size={isMobile ? 14 : 16} />
          </button>
        </div>
      </motion.section>

      {error && (
        <div
          style={{
            borderRadius: isMobile ? 12 : 20,
            padding: isMobile ? "10px 12px" : "14px 16px",
            background: "rgba(251,113,133,0.08)",
            border: "1px solid rgba(251,113,133,0.18)",
            color: "var(--app-danger)",
            fontSize: isMobile ? 12 : 14,
          }}
        >
          {error}
        </div>
      )}

      <section style={{ 
        display: "grid", 
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", 
        gap: isMobile ? 12 : 16,
      }}>
        <DashboardCard
          title="Người dùng đã đăng ký"
          value={String(persons.length)}
          detail={`${activePersons} hồ sơ đang hoạt động`}
          accent="#7dd3fc"
          icon={Users}
        />
        <DashboardCard
          title="Nhận diện hôm nay"
          value={String(todayRecognitions)}
          detail={`${unknownToday} lượt người lạ trong ngày`}
          accent="#34d399"
          icon={ScanFace}
        />
        <DashboardCard
          title="Embedding trên RAM"
          value={String(memory?.ramCount ?? 0)}
          detail={memory?.loaded ? "Bộ nhớ nhận diện đã sẵn sàng" : "RAM chưa nạp hoàn tất"}
          accent="#f59e0b"
          icon={Database}
        />
        <DashboardCard
          title="Hồ sơ cần xử lý"
          value={String(expiredPersons)}
          detail={`${totalRecognitions} lượt nhận diện thành công đã lưu`}
          accent="#fb7185"
          icon={ShieldAlert}
        />
      </section>

      <section style={{ 
        display: "grid", 
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))", 
        gap: isMobile ? 16 : 20,
      }}>
        <div
          style={{
            borderRadius: isMobile ? 16 : 28,
            padding: isMobile ? 16 : 22,
            background: "var(--app-surface)",
            border: "1px solid var(--app-border)",
            boxShadow: "var(--app-shadow)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: isMobile ? 14 : 18, flexDirection: isMobile ? "column" : "row" }}>
            <div>
              <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600 }}>Nhận diện theo 24 giờ</div>
              <div style={{ fontSize: isMobile ? 11 : 13, color: "var(--app-muted)", marginTop: 4 }}>
                Gồm nhận diện thành công, từ chối và người lạ.
              </div>
            </div>
            <div style={{ display: "flex", gap: isMobile ? 8 : 10, alignItems: "flex-start", flexWrap: "wrap" }}>
              {[
                { label: "Nhận diện", color: "var(--app-accent-strong)" },
                { label: "Từ chối", color: "var(--app-danger)" },
                { label: "Người lạ", color: "var(--app-warm)" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 6, fontSize: isMobile ? 10 : 12, color: "var(--app-muted)" }}>
                  <div style={{ width: isMobile ? 6 : 8, height: isMobile ? 6 : 8, borderRadius: 999, background: item.color }} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: "100%", height: isMobile ? 220 : 260 }}>
            <ResponsiveContainer>
              <AreaChart data={statistics.hourlyData}>
                <defs>
                  <linearGradient id="dashboard-recognition" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--app-accent-strong)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--app-accent-strong)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dashboard-denied" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--app-danger)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--app-danger)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dashboard-unknown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--app-warm)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--app-warm)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.08)" />
                <XAxis dataKey="time" tick={{ fill: "#8ea2bd", fontSize: isMobile ? 9 : 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8ea2bd", fontSize: isMobile ? 9 : 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={tooltip} />
                <Area type="monotone" dataKey="recognized" stroke="var(--app-accent-strong)" strokeWidth={2} fill="url(#dashboard-recognition)" />
                <Area type="monotone" dataKey="denied" stroke="var(--app-danger)" strokeWidth={2} fill="url(#dashboard-denied)" />
                <Area type="monotone" dataKey="unknown" stroke="var(--app-warm)" strokeWidth={2} fill="url(#dashboard-unknown)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: "grid", gap: isMobile ? 16 : 20 }}>
          <div
            style={{
              borderRadius: isMobile ? 16 : 28,
              padding: isMobile ? 16 : 22,
              background: "var(--app-surface)",
              border: "1px solid var(--app-border)",
              boxShadow: "var(--app-shadow)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 10, marginBottom: isMobile ? 14 : 18 }}>
              <CalendarClock size={isMobile ? 16 : 18} color="var(--app-warm)" />
              <div>
                <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600 }}>Tần suất theo tuần</div>
                <div style={{ fontSize: isMobile ? 11 : 13, color: "var(--app-muted)", marginTop: 4 }}>
                  Theo log nhận diện thành công đã lưu.
                </div>
              </div>
            </div>

            <div style={{ width: "100%", height: isMobile ? 180 : 220 }}>
              <ResponsiveContainer>
                <BarChart data={statistics.weeklyData} barSize={isMobile ? 16 : 22}>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.08)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#8ea2bd", fontSize: isMobile ? 9 : 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8ea2bd", fontSize: isMobile ? 9 : 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={tooltip} />
                  <Bar dataKey="value" fill="var(--app-warm)" radius={[isMobile ? 4 : 8, isMobile ? 4 : 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            style={{
              borderRadius: isMobile ? 16 : 28,
              padding: isMobile ? 16 : 22,
              background: "var(--app-surface)",
              border: "1px solid var(--app-border)",
              boxShadow: "var(--app-shadow)",
            }}
          >
            <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600 }}>Hồ sơ cần chú ý</div>
            <div style={{ fontSize: isMobile ? 11 : 13, color: "var(--app-muted)", marginTop: 4, marginBottom: isMobile ? 14 : 18 }}>
              Ưu tiên kiểm tra hồ sơ hết hạn hoặc đã bị tạm khóa.
            </div>

            {flaggedProfiles.length === 0 ? (
              <div style={{ color: "var(--app-muted)", fontSize: isMobile ? 12 : 13 }}>Không có hồ sơ cảnh báo.</div>
            ) : (
              <div style={{ display: "grid", gap: isMobile ? 10 : 12 }}>
                {flaggedProfiles.map((person) => (
                  <div
                    key={person.id}
                    style={{
                      padding: isMobile ? 12 : 14,
                      borderRadius: isMobile ? 14 : 18,
                      background: "var(--app-bg-subtle)",
                      border: "1px solid var(--app-border)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: isMobile ? 13 : 14 }}>{person.name}</div>
                        <div style={{ fontSize: isMobile ? 11 : 13, color: "var(--app-muted)", marginTop: 4 }}>
                          {person.department || "Chưa có phòng ban"} · {person.role || "Chưa có chức vụ"}
                        </div>
                      </div>
                      <div
                        style={{
                          alignSelf: isMobile ? "flex-start" : "flex-start",
                          padding: isMobile ? "4px 8px" : "6px 10px",
                          borderRadius: 999,
                          fontSize: isMobile ? 10 : 12,
                          border: `1px solid ${person.is_expired ? "rgba(251,113,133,0.2)" : "rgba(245,158,11,0.2)"}`,
                          background: person.is_expired ? "rgba(251,113,133,0.08)" : "rgba(245,158,11,0.08)",
                          color: person.is_expired ? "var(--app-danger)" : "var(--app-warm)",
                          marginTop: isMobile ? 8 : 0,
                        }}
                      >
                        {person.is_expired ? "Hết hạn" : "Tạm khóa"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        style={{
          borderRadius: isMobile ? 16 : 28,
          padding: isMobile ? 16 : 22,
          background: "var(--app-surface)",
          border: "1px solid var(--app-border)",
          boxShadow: "var(--app-shadow)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: isMobile ? 14 : 18, flexDirection: isMobile ? "column" : "row" }}>
          <div>
            <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600 }}>Hoạt động gần đây</div>
            <div style={{ fontSize: isMobile ? 11 : 13, color: "var(--app-muted)", marginTop: 4 }}>
              6 sự kiện mới nhất từ bảng `recognition_logs`.
            </div>
          </div>
          <button
            onClick={() => navigate("/activity")}
            style={{
              padding: isMobile ? "8px 12px" : "10px 14px",
              borderRadius: isMobile ? 12 : 16,
              border: "1px solid var(--app-border)",
              background: "var(--app-bg-subtle)",
              color: "var(--app-text)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 6 : 8,
              fontSize: isMobile ? 12 : 13,
              alignSelf: isMobile ? "stretch" : "auto",
              justifyContent: "center",
            }}
          >
            Mở nhật ký
            <ArrowRight size={isMobile ? 13 : 15} />
          </button>
        </div>

        {recentLogs.length === 0 ? (
          <div style={{ fontSize: isMobile ? 12 : 13, color: "var(--app-muted)" }}>Chưa có log nhận diện.</div>
        ) : (
          <div style={{ display: "grid", gap: isMobile ? 10 : 12 }}>
            {recentLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.2fr) minmax(120px, 0.8fr) minmax(140px, 0.8fr) auto",
                  gap: isMobile ? 8 : 12,
                  alignItems: "center",
                  padding: isMobile ? 12 : 14,
                  borderRadius: isMobile ? 14 : 18,
                  background: "var(--app-bg-subtle)",
                  border: "1px solid var(--app-border)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: isMobile ? 13 : 14 }}>{log.name}</div>
                  <div style={{ fontSize: isMobile ? 11 : 13, color: "var(--app-muted)", marginTop: 4 }}>{log.camera}</div>
                </div>
                <div style={{ fontSize: isMobile ? 11 : 13, color: "var(--app-muted)" }}>{log.date}</div>
                <div style={{ fontSize: isMobile ? 11 : 13, color: "var(--app-muted)" }}>{log.time}</div>
                <div
                  style={{
                    padding: isMobile ? "4px 8px" : "6px 10px",
                    borderRadius: 999,
                    fontSize: isMobile ? 10 : 12,
                    border:
                      log.status === "success"
                        ? "1px solid rgba(52,211,153,0.2)"
                        : log.status === "unknown"
                          ? "1px solid rgba(245,158,11,0.2)"
                          : "1px solid rgba(251,113,133,0.2)",
                    background:
                      log.status === "success"
                        ? "rgba(52,211,153,0.08)"
                        : log.status === "unknown"
                          ? "rgba(245,158,11,0.08)"
                          : "rgba(251,113,133,0.08)",
                    color:
                      log.status === "success"
                        ? "var(--app-success)"
                        : log.status === "unknown"
                          ? "var(--app-warm)"
                          : "var(--app-danger)",
                    textAlign: "center",
                    justifySelf: isMobile ? "flex-start" : "auto",
                  }}
                >
                  {log.status === "success" ? "Thành công" : log.status === "unknown" ? "Người lạ" : "Lỗi"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}