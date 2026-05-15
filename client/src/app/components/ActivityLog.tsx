import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircle, AlertTriangle, XCircle, Download, Filter, Search, Calendar, ScanFace, Loader2 } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { apiClient } from "../services/api";

interface ActivityEntry {
  id: string;
  name: string;
  time: string;
  date: string;
  status: "success" | "unknown" | "error";
  confidence: number;
  camera: string;
  img: string | null;
  action: "Vào" | "Ra" | "Từ chối" | "Lỗi";
}

const STATUS_CONFIG = {
  success: { color: "#00ff88", bg: "rgba(0,255,136,0.1)", border: "rgba(0,255,136,0.2)", icon: CheckCircle, label: "Nhận diện" },
  unknown: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.2)", icon: AlertTriangle, label: "Người lạ" },
  error: { color: "#ff2d55", bg: "rgba(255,45,85,0.1)", border: "rgba(255,45,85,0.2)", icon: XCircle, label: "Lỗi" },
};

export function ActivityLog() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [LogData, setLogData] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const perPage = 8;

  // Load activity logs from API
  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        const logs = await apiClient.getActivityLog();
        setLogData(logs as ActivityEntry[]);
      } catch (error) {
        console.error("Failed to load activity logs:", error);
        setLogData([]);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, []);

  const filtered = LogData.filter((item) => {
    const s = statusFilter === "all" || item.status === statusFilter;
    const q = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.camera.toLowerCase().includes(search.toLowerCase());
    return s && q;
  });

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const stats = {
    total: LogData.length,
    success: LogData.filter((l) => l.status === "success").length,
    unknown: LogData.filter((l) => l.status === "unknown").length,
    error: LogData.filter((l) => l.status === "error").length,
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            style={{ display: "inline-block", marginBottom: 16 }}
          >
            <Loader2 size={36} color="var(--app-accent, #00d4ff)" />
          </motion.div>
          <div style={{ color: "var(--app-muted, #7a95b8)", fontSize: "14px" }}>Đang tải nhật ký hoạt động...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", height: "100%", overflowY: "auto", fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#e2e8f0", fontFamily: "'Orbitron', monospace", letterSpacing: "1px" }}>
            NHẬT KÝ HOẠT ĐỘNG
          </h1>
          <p style={{ fontSize: "13px", color: "#4a6fa5", marginTop: 4 }}>
            {stats.total} sự kiện · 28/03/2026
          </p>
        </div>
        <button
          style={{
            padding: "10px 16px",
            borderRadius: "12px",
            background: "rgba(0,212,255,0.06)",
            border: "1px solid rgba(0,212,255,0.2)",
            color: "#00d4ff",
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          <Download size={14} />
          Xuất CSV
        </button>
      </div>

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Tổng sự kiện", value: stats.total, color: "#00d4ff" },
          { label: "Nhận diện thành công", value: stats.success, color: "#00ff88" },
          { label: "Người lạ", value: stats.unknown, color: "#fbbf24" },
          { label: "Lỗi hệ thống", value: stats.error, color: "#ff2d55" },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: "14px",
              borderRadius: "12px",
              background: `${s.color}08`,
              border: `1px solid ${s.color}20`,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "24px", color: s.color, fontFamily: "'Orbitron', monospace", fontWeight: 700 }}>
              {s.value}
            </div>
            <div style={{ fontSize: "11px", color: "#4a6fa5", marginTop: 2 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(0,212,255,0.1)",
          }}
        >
          <Search size={14} color="#4a6fa5" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm kiếm tên, camera..."
            style={{
              background: "none",
              border: "none",
              outline: "none",
              color: "#e2e8f0",
              fontSize: "13px",
              flex: 1,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "success", "unknown", "error"].map((f) => (
            <button
              key={f}
              onClick={() => { setStatusFilter(f); setPage(1); }}
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                background: statusFilter === f ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${statusFilter === f ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.06)"}`,
                color: statusFilter === f ? "#00d4ff" : "#4a6fa5",
                fontSize: "12px",
                cursor: "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
                transition: "all 0.2s",
              }}
            >
              {f === "all" ? "Tất cả" : f === "success" ? "Thành công" : f === "unknown" ? "Người lạ" : "Lỗi"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          borderRadius: "16px",
          border: "1px solid rgba(0,212,255,0.1)",
          overflow: "hidden",
          background: "rgba(255,255,255,0.01)",
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "48px 1fr 140px 100px 120px 110px 90px",
            padding: "12px 16px",
            background: "rgba(0,212,255,0.04)",
            borderBottom: "1px solid rgba(0,212,255,0.08)",
          }}
        >
          {["", "Tên / Camera", "Thời gian", "Trạng thái", "Hành động", "Độ chính xác", ""].map((h, i) => (
            <div key={i} style={{ fontSize: "11px", color: "#4a6fa5", letterSpacing: "0.5px" }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {paginated.map((item, i) => {
          const cfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              style={{
                display: "grid",
                gridTemplateColumns: "48px 1fr 140px 100px 120px 110px 90px",
                padding: "12px 16px",
                alignItems: "center",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,212,255,0.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {/* Avatar */}
              <div>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: `1.5px solid ${cfg.color}50`,
                  }}
                >
                  {item.img ? (
                    <ImageWithFallback
                      src={item.img}
                      alt={item.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: cfg.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={14} color={cfg.color} />
                    </div>
                  )}
                </div>
              </div>

              {/* Name & camera */}
              <div>
                <div style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: 500 }}>{item.name}</div>
                <div style={{ fontSize: "11px", color: "#4a6fa5" }}>{item.camera}</div>
              </div>

              {/* Time */}
              <div>
                <div style={{ fontSize: "12px", color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>
                  {item.time}
                </div>
                <div style={{ fontSize: "10px", color: "#4a6fa5" }}>{item.date}</div>
              </div>

              {/* Status */}
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 8px",
                    borderRadius: "20px",
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                  }}
                >
                  <Icon size={10} color={cfg.color} />
                  <span style={{ fontSize: "10px", color: cfg.color }}>{cfg.label}</span>
                </div>
              </div>

              {/* Action */}
              <div style={{ fontSize: "12px", color: "#7a95b8" }}>{item.action}</div>

              {/* Confidence */}
              <div>
                {item.confidence > 0 ? (
                  <div>
                    <div style={{ fontSize: "13px", color: cfg.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                      {item.confidence}%
                    </div>
                    <div style={{ height: 3, borderRadius: "2px", background: "rgba(255,255,255,0.05)", marginTop: 3 }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${item.confidence}%`,
                          borderRadius: "2px",
                          background: cfg.color,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: "12px", color: "#2d3f55" }}>—</span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#4a6fa5",
                    fontSize: "11px",
                    cursor: "pointer",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  Chi tiết
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: page === p ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${page === p ? "rgba(0,212,255,0.4)" : "rgba(255,255,255,0.06)"}`,
                color: page === p ? "#00d4ff" : "#4a6fa5",
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
                transition: "all 0.2s",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
