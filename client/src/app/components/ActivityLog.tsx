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
  success: { 
    color: "#10b981", 
    bg: "rgba(16, 185, 129, 0.08)", 
    border: "rgba(16, 185, 129, 0.2)", 
    icon: CheckCircle, 
    label: "Nhận diện",
    softBg: "rgba(16, 185, 129, 0.04)"
  },
  unknown: { 
    color: "#f59e0b", 
    bg: "rgba(245, 158, 11, 0.08)", 
    border: "rgba(245, 158, 11, 0.2)", 
    icon: AlertTriangle, 
    label: "Người lạ",
    softBg: "rgba(245, 158, 11, 0.04)"
  },
  error: { 
    color: "#ef4444", 
    bg: "rgba(239, 68, 68, 0.08)", 
    border: "rgba(239, 68, 68, 0.2)", 
    icon: XCircle, 
    label: "Lỗi",
    softBg: "rgba(239, 68, 68, 0.04)"
  },
};

export function ActivityLog() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [LogData, setLogData] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const perPage = 8;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      <div style={{ 
        padding: isMobile ? "12px" : "24px", 
        height: "100%", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        maxWidth: "100vw",
        overflowX: "hidden",
      }}>
        <div style={{ textAlign: "center" }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            style={{ display: "inline-block", marginBottom: 16 }}
          >
            <Loader2 size={isMobile ? 28 : 36} color="#6366f1" />
          </motion.div>
          <div style={{ color: "#6b7280", fontSize: isMobile ? "12px" : "14px" }}>Đang tải nhật ký hoạt động...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: isMobile ? "12px" : "24px", 
      height: "100%", 
      overflowY: "auto", 
      fontFamily: "'Space Grotesk', sans-serif",
      background: "#f8fafc",
      maxWidth: "100vw",
      overflowX: "hidden",
      boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "flex-start", 
        marginBottom: isMobile ? 16 : 24,
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 12 : 0,
        maxWidth: "100%",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ 
            fontSize: isMobile ? "18px" : "24px", 
            fontWeight: 700, 
            color: "#1e293b", 
            fontFamily: "'Orbitron', monospace", 
            letterSpacing: "0.5px",
            margin: 0,
            lineHeight: 1.3,
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}>
            NHẬT KÝ HOẠT ĐỘNG
          </h1>
          <p style={{ fontSize: isMobile ? "12px" : "14px", color: "#64748b", marginTop: 6, margin: 0 }}>
            {stats.total} sự kiện · 28/03/2026
          </p>
        </div>
        <button
          style={{
            padding: isMobile ? "8px 12px" : "10px 16px",
            borderRadius: "10px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            color: "#475569",
            fontSize: isMobile ? "12px" : "13px",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "'Space Grotesk', sans-serif",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            transition: "all 0.2s",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f1f5f9";
            e.currentTarget.style.borderColor = "#cbd5e1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#ffffff";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          <Download size={isMobile ? 14 : 16} />
          <span style={{ display: isMobile ? "none" : "inline" }}>Xuất CSV</span>
          <span style={{ display: isMobile ? "inline" : "none" }}>CSV</span>
        </button>
      </div>

      {/* Summary row */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", 
        gap: isMobile ? 10 : 16, 
        marginBottom: isMobile ? 16 : 24,
        maxWidth: "100%",
      }}>
        {[
          { label: "Tổng sự kiện", value: stats.total, color: "#6366f1", bg: "rgba(99, 102, 241, 0.06)" },
          { label: "Nhận diện thành công", value: stats.success, color: "#10b981", bg: "rgba(16, 185, 129, 0.06)" },
          { label: "Người lạ", value: stats.unknown, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.06)" },
          { label: "Lỗi hệ thống", value: stats.error, color: "#ef4444", bg: "rgba(239, 68, 68, 0.06)" },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: isMobile ? "12px 10px" : "18px",
              borderRadius: "14px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              minWidth: 0,
            }}
          >
            <div style={{ 
              fontSize: isMobile ? "20px" : "28px", 
              color: s.color, 
              fontFamily: "'Orbitron', monospace", 
              fontWeight: 700,
              marginBottom: 4,
              lineHeight: 1,
            }}>
              {s.value}
            </div>
            <div style={{ 
              fontSize: isMobile ? "10px" : "12px", 
              color: "#64748b", 
              fontWeight: 500, 
              lineHeight: 1.3,
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ 
        display: "flex", 
        gap: isMobile ? 8 : 12, 
        marginBottom: isMobile ? 16 : 20,
        background: "#ffffff",
        padding: isMobile ? "10px" : "12px",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        flexDirection: isMobile ? "column" : "row",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: isMobile ? "8px 10px" : "8px 12px",
            borderRadius: "8px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            maxWidth: "100%",
          }}
        >
          <Search size={isMobile ? 14 : 16} color="#94a3b8" style={{ flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm kiếm tên, camera..."
            style={{
              background: "none",
              border: "none",
              outline: "none",
              color: "#334155",
              fontSize: isMobile ? "13px" : "14px",
              flex: 1,
              fontFamily: "'Space Grotesk', sans-serif",
              minWidth: 0,
              maxWidth: "100%",
            }}
          />
        </div>
        <div style={{ 
          display: "flex", 
          gap: 6, 
          flexWrap: "wrap",
          maxWidth: "100%",
          overflowX: "auto",
          paddingBottom: isMobile ? 4 : 0,
        }}>
          {[
            { key: "all", label: "Tất cả", color: "#64748b" },
            { key: "success", label: "Thành công", color: "#10b981" },
            { key: "unknown", label: "Người lạ", color: "#f59e0b" },
            { key: "error", label: "Lỗi", color: "#ef4444" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => { setStatusFilter(f.key); setPage(1); }}
              style={{
                padding: isMobile ? "6px 10px" : "8px 14px",
                borderRadius: "8px",
                background: statusFilter === f.key ? `${STATUS_CONFIG[f.key as keyof typeof STATUS_CONFIG]?.softBg || '#f1f5f9'}` : "#f8fafc",
                border: `1px solid ${statusFilter === f.key ? (STATUS_CONFIG[f.key as keyof typeof STATUS_CONFIG]?.color || '#e2e8f0') : "#e2e8f0"}`,
                color: statusFilter === f.key ? (STATUS_CONFIG[f.key as keyof typeof STATUS_CONFIG]?.color || '#475569') : "#64748b",
                fontSize: isMobile ? "11px" : "13px",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Container */}
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: isMobile ? 12 : 0,
        maxWidth: "100%",
        boxSizing: "border-box",
      }}>
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
                background: "#ffffff",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                padding: isMobile ? "12px" : "0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                overflow: "hidden",
                maxWidth: "100%",
                boxSizing: "border-box",
              }}
            >
              {isMobile ? (
                // Mobile Card Layout
                <div style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: 10,
                  width: "100%",
                }}>
                  {/* Header */}
                  <div style={{ 
                    display: "flex", 
                    alignItems: "flex-start", 
                    gap: 10,
                    paddingBottom: 10,
                    borderBottom: "1px solid #f1f5f9",
                  }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: `2px solid ${cfg.color}30`,
                        background: cfg.softBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {item.img ? (
                        <ImageWithFallback
                          src={item.img}
                          alt={item.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <Icon size={16} color={cfg.color} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: "13px", 
                        color: "#1e293b", 
                        fontWeight: 600,
                        marginBottom: 2,
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        lineHeight: 1.3,
                      }}>{item.name}</div>
                      <div style={{ 
                        fontSize: "11px", 
                        color: "#94a3b8",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        lineHeight: 1.3,
                      }}>{item.camera}</div>
                    </div>
                  </div>
                  
                  {/* Info Grid */}
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(2, 1fr)", 
                    gap: 10,
                  }}>
                    <div>
                      <div style={{ fontSize: "9px", color: "#94a3b8", marginBottom: 2 }}>Thời gian</div>
                      <div style={{ fontSize: "12px", color: "#334155", fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                        {item.time}
                      </div>
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>{item.date}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "9px", color: "#94a3b8", marginBottom: 2 }}>Trạng thái</div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 6px",
                          borderRadius: "12px",
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                        }}
                      >
                        <Icon size={9} color={cfg.color} />
                        <span style={{ fontSize: "10px", color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "9px", color: "#94a3b8", marginBottom: 2 }}>Hành động</div>
                      <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>{item.action}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "9px", color: "#94a3b8", marginBottom: 2 }}>Độ chính xác</div>
                      {item.confidence > 0 ? (
                        <div>
                          <div style={{ fontSize: "12px", color: cfg.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                            {item.confidence}%
                          </div>
                          <div style={{ height: 3, borderRadius: "2px", background: "#f1f5f9", marginTop: 3, overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(item.confidence, 100)}%`,
                                borderRadius: "2px",
                                background: cfg.color,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: "11px", color: "#cbd5e1" }}>—</span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "8px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#475569",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "'Space Grotesk', sans-serif",
                      marginTop: 4,
                    }}
                  >
                    Xem chi tiết
                  </button>
                </div>
              ) : (
                // Desktop Table Row
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "48px 1fr 140px 110px 100px 120px 90px",
                    padding: "14px 16px",
                    alignItems: "center",
                    background: i % 2 === 0 ? "#ffffff" : "#fafafa",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <div>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: `2px solid ${cfg.color}30`,
                        background: cfg.softBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {item.img ? (
                        <ImageWithFallback
                          src={item.img}
                          alt={item.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <Icon size={16} color={cfg.color} />
                      )}
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: 600, wordBreak: "break-word", overflowWrap: "break-word" }}>{item.name}</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: 2, wordBreak: "break-word", overflowWrap: "break-word" }}>{item.camera}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: "13px", color: "#334155", fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                      {item.time}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: 2 }}>{item.date}</div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: "20px",
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                      }}
                    >
                      <Icon size={12} color={cfg.color} />
                      <span style={{ fontSize: "12px", color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>{item.action}</div>

                  <div>
                    {item.confidence > 0 ? (
                      <div>
                        <div style={{ fontSize: "14px", color: cfg.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                          {item.confidence}%
                        </div>
                        <div style={{ height: 4, borderRadius: "2px", background: "#f1f5f9", marginTop: 4, overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(item.confidence, 100)}%`,
                              borderRadius: "2px",
                              background: cfg.color,
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: "13px", color: "#cbd5e1" }}>—</span>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        color: "#475569",
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "'Space Grotesk', sans-serif",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f1f5f9";
                        e.currentTarget.style.borderColor = "#cbd5e1";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          gap: 8, 
          marginTop: isMobile ? 16 : 20,
          flexWrap: "wrap",
          maxWidth: "100%",
          padding: "0 8px",
          boxSizing: "border-box",
        }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                width: isMobile ? 32 : 36,
                height: isMobile ? 32 : 36,
                borderRadius: "8px",
                background: page === p ? "#6366f1" : "#ffffff",
                border: `1px solid ${page === p ? "#6366f1" : "#e2e8f0"}`,
                color: page === p ? "#ffffff" : "#64748b",
                fontSize: isMobile ? "12px" : "13px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
                transition: "all 0.2s",
                boxShadow: page === p ? "0 2px 4px rgba(99, 102, 241, 0.3)" : "none",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (page !== p) {
                  e.currentTarget.style.background = "#f1f5f9";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                }
              }}
              onMouseLeave={(e) => {
                if (page !== p) {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }
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