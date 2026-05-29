import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  CreditCard,
  Database,
  FileImage,
  PencilLine,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UserRound,
  X,
  ChevronLeft,
  ChevronRight,
  ScanFace,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { apiClient, type Person } from "../services/api";
import { RegisterModal } from "./RegisterModal";
import { ImageWithFallback } from "./figma/ImageWithFallback";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  try {
    return new Date(value).toLocaleDateString("vi-VN");
  } catch {
    return value;
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  try {
    return new Date(value).toLocaleString("vi-VN");
  } catch {
    return value;
  }
}

function displayValue(value: string | number | null | undefined, hidden: boolean = false) {
  if (!value) {
    return "--";
  }
  
  if (hidden) {
    return "••••••••";
  }

  return String(value);
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      style={{
        borderRadius: 20,
        padding: 18,
        background: "var(--app-surface)",
        border: "1px solid var(--app-border)",
      }}
    >
      <div style={{ fontSize: 13, color: "var(--app-muted)" }}>{label}</div>
      <div style={{ marginTop: 10, fontSize: 28, fontWeight: 700, color: accent }}>{value}</div>
    </div>
  );
}

function StatusBadge({ person }: { person: Person }) {
  const isInactive = person.status === "inactive";
  const isExpired = person.is_expired;

  let color = "var(--app-success)";
  let background = "rgba(52,211,153,0.08)";
  let border = "rgba(52,211,153,0.18)";
  let label = "Hoạt động";

  if (isExpired) {
    color = "var(--app-danger)";
    background = "rgba(251,113,133,0.08)";
    border = "rgba(251,113,133,0.18)";
    label = "Hết hạn";
  } else if (isInactive) {
    color = "var(--app-warm)";
    background = "rgba(245,158,11,0.08)";
    border = "rgba(245,158,11,0.18)";
    label = "Tạm khóa";
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 12px",
        borderRadius: 999,
        border: `1px solid ${border}`,
        background,
        color,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      <CheckCircle2 size={14} />
      {label}
    </div>
  );
}

function FieldGrid({
  title,
  icon: Icon,
  fields,
  hidden,
  onToggleHidden,
  showToggle,
}: {
  title: string;
  icon: any;
  fields: Array<{ label: string; value: string }>;
  hidden?: boolean;
  onToggleHidden?: () => void;
  showToggle?: boolean;
}) {
  return (
    <section
      style={{
        borderRadius: 24,
        padding: 20,
        background: "var(--app-bg-subtle)",
        border: "1px solid var(--app-border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "rgba(125,211,252,0.08)",
            border: "1px solid rgba(125,211,252,0.14)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon size={16} color="var(--app-accent)" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>{title}</div>
        {showToggle && onToggleHidden && (
          <button
            onClick={onToggleHidden}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 10,
              border: "1px solid var(--app-border)",
              background: hidden ? "rgba(245,158,11,0.08)" : "var(--app-surface)",
              color: hidden ? "var(--app-warm)" : "var(--app-muted)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
            {hidden ? "Ẩn thông tin" : "Hiện thông tin"}
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {fields.map((field) => (
          <div
            key={field.label}
            style={{
              minHeight: 76,
              padding: 14,
              borderRadius: 18,
              background: "var(--app-bg-subtle)",
              border: "1px solid rgba(148,163,184,0.12)",
            }}
          >
            <div style={{ fontSize: 12, color: "var(--app-muted)", marginBottom: 8 }}>{field.label}</div>
            <div style={{ fontSize: 14, color: hidden ? "var(--app-muted)" : "var(--app-text-soft)", lineHeight: 1.5, wordBreak: "break-all", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis" }}>
              {field.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2600);
    return () => clearTimeout(timer);
  }, [onClose]);

  const color = type === "success" ? "#34d399" : "#fb7185";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 1200,
        borderRadius: 18,
        padding: "14px 16px",
        background: "var(--app-surface)",
        border: `1px solid ${color}30`,
        color: "var(--app-text)",
        boxShadow: "var(--app-shadow)",
      }}
    >
      {message}
    </motion.div>
  );
}

let cachedPersons: Person[] | null = null;

function ConfirmModal({
  person,
  deleting,
  onConfirm,
  onClose,
}: {
  person: Person | null;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!person) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(10px)",
      }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 28,
          padding: 24,
          background: "var(--app-surface)",
          border: "1px solid rgba(251,113,133,0.18)",
          boxShadow: "var(--app-shadow)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              background: "rgba(251,113,133,0.08)",
              border: "1px solid rgba(251,113,133,0.16)",
            }}
          >
            <ShieldAlert size={20} color="var(--app-danger)" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Xóa người dùng</div>
            <div style={{ fontSize: 13, color: "var(--app-muted)", marginTop: 4 }}>
              Hành động này sẽ xóa hồ sơ và embedding tương ứng.
            </div>
          </div>
        </div>

        <div style={{ fontSize: 14, color: "var(--app-text-soft)", lineHeight: 1.7 }}>
          Xác nhận xóa hồ sơ <strong>{person.name}</strong> khỏi hệ thống?
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button
            onClick={onClose}
            disabled={deleting}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 16,
              border: "1px solid var(--app-border)",
              background: "transparent",
              color: "var(--app-text)",
              cursor: "pointer",
            }}
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 16,
              border: "1px solid rgba(251,113,133,0.18)",
              background: "rgba(251,113,133,0.12)",
              color: "var(--app-danger)",
              cursor: "pointer",
            }}
          >
            {deleting ? "Đang xóa..." : "Xóa hồ sơ"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EditModal({
  person,
  onClose,
  onSaved,
}: {
  person: Person | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [name, setName] = useState(person?.name ?? "");
  const [role, setRole] = useState(person?.role ?? "");
  const [department, setDepartment] = useState(person?.department ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(person?.name ?? "");
    setRole(person?.role ?? "");
    setDepartment(person?.department ?? "");
    setError("");
  }, [person]);

  if (!person) {
    return null;
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Tên người dùng không được để trống.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await apiClient.updatePerson(person.id, { name, role, department });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật hồ sơ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(10px)",
      }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          borderRadius: 28,
          padding: 24,
          background: "var(--app-surface)",
          border: "1px solid var(--app-border)",
          boxShadow: "var(--app-shadow)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Chỉnh sửa hồ sơ</div>
            <div style={{ fontSize: 13, color: "var(--app-muted)", marginTop: 4 }}>{person.id}</div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: "1px solid var(--app-border)",
              background: "transparent",
              color: "var(--app-text)",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {[
            { label: "Họ tên hệ thống", value: name, setValue: setName },
            { label: "Chức vụ", value: role, setValue: setRole },
            { label: "Phòng ban", value: department, setValue: setDepartment },
          ].map((field) => (
            <label key={field.label} style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--app-muted)" }}>{field.label}</span>
              <input
                value={field.value}
                onChange={(event) => field.setValue(event.target.value)}
                style={{
                  minHeight: 48,
                  borderRadius: 16,
                  border: "1px solid var(--app-border)",
                  background: "var(--app-bg-subtle)",
                  color: "var(--app-text)",
                  padding: "0 14px",
                  outline: "none",
                }}
              />
            </label>
          ))}
        </div>

        {error && (
          <div
            style={{
              marginTop: 14,
              borderRadius: 16,
              padding: "12px 14px",
              background: "rgba(251,113,133,0.08)",
              border: "1px solid rgba(251,113,133,0.18)",
              color: "var(--app-danger)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              flex: 1,
              minHeight: 46,
              borderRadius: 16,
              border: "1px solid var(--app-border)",
              background: "transparent",
              color: "var(--app-text)",
              cursor: "pointer",
            }}
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            style={{
              flex: 1,
              minHeight: 46,
              borderRadius: 16,
              border: "1px solid rgba(125,211,252,0.2)",
              background: "rgba(125,211,252,0.12)",
              color: "var(--app-text)",
              cursor: "pointer",
            }}
          >
            {submitting ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function RegisteredFaces() {
  const [persons, setPersons] = useState<Person[]>(() => cachedPersons ?? []);
  const [loading, setLoading] = useState(() => !cachedPersons);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showCCCDInfo, setShowCCCDInfo] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const loadedDetailIds = useRef<Set<string>>(new Set());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const loadPersons = async (showInitialLoader = false) => {
    try {
      if (showInitialLoader || persons.length === 0) {
        setLoading(true);
      }
      const data = await apiClient.getPersons();
      setPersons((current) => {
        const merged = data.map((person) => {
          const existing = current.find((item) => item.id === person.id);
          if (!existing) {
            return person;
          }

          return {
            ...person,
            img_url: existing.img_url || person.img_url,
            img: existing.img || person.img,
            cccd_front_img: existing.cccd_front_img || person.cccd_front_img,
            cccd_back_img: existing.cccd_back_img || person.cccd_back_img,
          };
        });
        cachedPersons = merged;
        return merged;
      });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Không thể tải dữ liệu người dùng",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersons(!cachedPersons);
  }, []);

  const filteredPersons = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return persons.filter((person) => {
      const matchesSearch =
        !keyword ||
        [person.name, person.role, person.department, person.id_number, person.full_name, person.address]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "expired" && person.is_expired) ||
        (statusFilter !== "expired" && person.status === statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [persons, search, statusFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.ceil(filteredPersons.length / pageSize);
  const paginatedPersons = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPersons.slice(start, start + pageSize);
  }, [filteredPersons, currentPage, pageSize]);

  useEffect(() => {
    if (paginatedPersons.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!paginatedPersons.some((person) => person.id === selectedId)) {
      setSelectedId(paginatedPersons[0].id);
    }
  }, [paginatedPersons, selectedId]);

  const selectedPerson = persons.find((person) => person.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId || loadedDetailIds.current.has(selectedId)) {
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError("");

    apiClient
      .getPersonDetail(selectedId)
      .then((detail) => {
        if (cancelled) {
          return;
        }

        loadedDetailIds.current.add(selectedId);
        setPersons((current) => {
          const merged = current.map((person) => (person.id === selectedId ? { ...person, ...detail } : person));
          cachedPersons = merged;
          return merged;
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setDetailError(err instanceof Error ? err.message : "Khong the tai chi tiet nguoi dung");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const summary = {
    total: persons.length,
    active: persons.filter((person) => person.status === "active").length,
    expired: persons.filter((person) => person.is_expired).length,
    missingIdCard: persons.filter((person) => !person.id_number).length,
  };

  const deletePerson = async () => {
    if (!personToDelete) {
      return;
    }

    try {
      setDeleting(true);
      await apiClient.deletePerson(personToDelete.id);
      setToast({ message: `Đã xóa hồ sơ ${personToDelete.name}`, type: "success" });
      if (selectedId === personToDelete.id) {
        setSelectedId(null);
      }
      await loadPersons();
      setPersonToDelete(null);
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Không thể xóa hồ sơ",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 28, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", marginBottom: 16 }}>
            <Loader2 size={36} color="var(--app-accent)" />
          </motion.div>
          <div style={{ color: "var(--app-muted)", fontSize: 14 }}>Đang tải dữ liệu người dùng...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 28, display: "grid", gap: 20 }}>
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--app-text)" }}>
          Hồ sơ người dùng
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          style={{
            minHeight: 48,
            padding: "0 18px",
            borderRadius: 18,
            border: "1px solid rgba(125,211,252,0.2)",
            background: "rgba(125,211,252,0.12)",
            color: "var(--app-text)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Plus size={16} />
          Đăng ký người dùng mới
        </button>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <MetricCard label="Tổng hồ sơ" value={String(summary.total)} accent="var(--app-accent)" />
        <MetricCard label="Đang hoạt động" value={String(summary.active)} accent="var(--app-success)" />
        <MetricCard label="Hết hạn làm việc" value={String(summary.expired)} accent="var(--app-danger)" />
        <MetricCard label="Thiếu CCCD" value={String(summary.missingIdCard)} accent="var(--app-warm)" />
      </section>

      <section
        style={{
          borderRadius: 28,
          padding: 18,
          background: "var(--app-surface)",
          border: "1px solid var(--app-border)",
          boxShadow: "var(--app-shadow)",
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              flex: 1,
              minWidth: 240,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 14px",
              minHeight: 48,
              borderRadius: 18,
              border: "1px solid var(--app-border)",
              background: "var(--app-bg-subtle)",
            }}
          >
            <Search size={16} color="var(--app-muted)" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên, CCCD, phòng ban, địa chỉ..."
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                color: "var(--app-text)",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { key: "all", label: "Tất cả" },
              { key: "active", label: "Hoạt động" },
              { key: "inactive", label: "Tạm khóa" },
              { key: "expired", label: "Hết hạn" },
            ].map((item) => {
              const isActive = statusFilter === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => setStatusFilter(item.key as typeof statusFilter)}
                  style={{
                    minHeight: 44,
                    padding: "0 14px",
                    borderRadius: 16,
                    border: isActive ? "1px solid rgba(125,211,252,0.22)" : "1px solid var(--app-border)",
                    background: isActive ? "rgba(125,211,252,0.12)" : "var(--app-bg-subtle)",
                    color: isActive ? "var(--app-text)" : "var(--app-muted)",
                    cursor: "pointer",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, alignItems: "start" }}>
        <div
          style={{
            borderRadius: 28,
            overflow: "hidden",
            background: "var(--app-surface)",
            border: "1px solid var(--app-border)",
            boxShadow: "var(--app-shadow)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr) auto",
              gap: 12,
              padding: "16px 18px",
              borderBottom: "1px solid var(--app-border)",
              color: "var(--app-muted)",
              fontSize: 12,
            }}
          >
            <div>Người dùng</div>
            <div>Phòng ban</div>
            <div>CCCD</div>
            <div>Trạng thái</div>
          </div>

          {filteredPersons.length === 0 ? (
            <div style={{ padding: 28, color: "var(--app-muted)", fontSize: 14 }}>
              Không có hồ sơ phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ flex: 1, overflow: "auto", maxHeight: "calc(100vh - 380px)" }}>
                {paginatedPersons.map((person) => {
                  const isSelected = person.id === selectedId;

                  return (
                    <button
                      key={person.id}
                      onClick={() => setSelectedId(person.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr) auto",
                        gap: 10,
                        padding: "10px 18px",
                        border: "none",
                        borderBottom: "1px solid rgba(148,163,184,0.08)",
                        background: isSelected ? "var(--app-accent-subtle)" : "transparent",
                        cursor: "pointer",
                        color: "inherit",
                        transition: "background 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            overflow: "hidden",
                            border: "1px solid rgba(148,163,184,0.16)",
                            background: "var(--app-bg-subtle)",
                            flexShrink: 0,
                          }}
                        >
                          {person.img ? (
                            <ImageWithFallback
                              src={person.img}
                              alt={person.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
                              <UserRound size={16} color="var(--app-muted)" />
                            </div>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {person.name}
                          </div>
                          <div style={{ marginTop: 2, fontSize: 12, color: "var(--app-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {person.role || "Chưa có chức vụ"}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--app-text-soft)", alignSelf: "center" }}>{displayValue(person.department)}</div>
                      <div style={{ fontSize: 13, color: "var(--app-text-soft)", alignSelf: "center" }}>{displayValue(person.id_number)}</div>
                      <div style={{ fontSize: 12, alignSelf: "center", color: person.is_expired ? "var(--app-danger)" : person.status === "inactive" ? "var(--app-warm)" : "var(--app-success)" }}>
                        {person.is_expired ? "Hết hạn" : person.status === "inactive" ? "Tạm khóa" : "Hoạt động"}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  padding: "12px 18px",
                  borderTop: "1px solid var(--app-border)",
                  background: "var(--app-bg-subtle)"
                }}>
                  <div style={{ fontSize: 13, color: "var(--app-muted)" }}>
                    Trang {currentPage} / {totalPages} ({filteredPersons.length} hồ sơ)
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--app-border)",
                        background: currentPage === 1 ? "transparent" : "var(--app-surface)",
                        color: currentPage === 1 ? "var(--app-muted)" : "var(--app-text)",
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--app-border)",
                        background: currentPage === totalPages ? "transparent" : "var(--app-surface)",
                        color: currentPage === totalPages ? "var(--app-muted)" : "var(--app-text)",
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedPerson && (
          <div style={{ display: "grid", gap: 18 }}>
            <section
              style={{
                borderRadius: 28,
                padding: 22,
                background: "var(--app-surface)",
                border: "1px solid var(--app-border)",
                boxShadow: "var(--app-shadow)",
              }}
            >
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 24,
                      overflow: "hidden",
                      border: "1px solid rgba(148,163,184,0.18)",
                      background: "var(--app-bg-subtle)",
                      flexShrink: 0,
                    }}
                  >
                    {selectedPerson.img ? (
                      <ImageWithFallback
                        src={selectedPerson.img}
                        alt={selectedPerson.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
                        <UserRound size={26} color="var(--app-muted)" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>{selectedPerson.name}</div>
                    <div style={{ marginTop: 6, color: "var(--app-muted)", fontSize: 14 }}>
                      {selectedPerson.role || "Chưa có chức vụ"} · {selectedPerson.department || "Chưa có phòng ban"}
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <StatusBadge person={selectedPerson} />
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => setPersonToEdit(selectedPerson)}
                    style={{
                      minHeight: 42,
                      padding: "0 14px",
                      borderRadius: 16,
                      border: "1px solid var(--app-border)",
                      background: "var(--app-bg-subtle)",
                      color: "var(--app-text)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <PencilLine size={15} />
                    Sửa
                  </button>
                  <button
                    onClick={() => setPersonToDelete(selectedPerson)}
                    style={{
                      minHeight: 42,
                      padding: "0 14px",
                      borderRadius: 16,
                      border: "1px solid rgba(251,113,133,0.18)",
                      background: "rgba(251,113,133,0.12)",
                      color: "var(--app-danger)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Trash2 size={15} />
                    Xóa
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                <div style={{ padding: 14, borderRadius: 18, background: "var(--app-bg-subtle)", border: "1px solid var(--app-border)" }}>
                  <div style={{ fontSize: 12, color: "var(--app-muted)" }}>Embeddings</div>
                  <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700 }}>{selectedPerson.embeddings}</div>
                </div>
                <div style={{ padding: 14, borderRadius: 18, background: "var(--app-bg-subtle)", border: "1px solid var(--app-border)" }}>
                  <div style={{ fontSize: 12, color: "var(--app-muted)" }}>Lượt nhận diện</div>
                  <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700 }}>{selectedPerson.recognitions}</div>
                </div>
                <div style={{ padding: 14, borderRadius: 18, background: "var(--app-bg-subtle)", border: "1px solid var(--app-border)" }}>
                  <div style={{ fontSize: 12, color: "var(--app-muted)" }}>Ngày đăng ký</div>
                  <div style={{ marginTop: 8, fontSize: 16, fontWeight: 600 }}>{formatDate(selectedPerson.registered_at)}</div>
                </div>
              </div>
            </section>

            {(detailLoading || detailError) && (
              <div
                style={{
                  borderRadius: 16,
                  padding: "10px 14px",
                  background: detailError ? "rgba(251,113,133,0.08)" : "var(--app-bg-subtle)",
                  border: `1px solid ${detailError ? "rgba(251,113,133,0.18)" : "var(--app-border)"}`,
                  color: detailError ? "var(--app-danger)" : "var(--app-muted)",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {detailLoading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                {detailError || "Dang tai anh va chi tiet CCCD..."}
              </div>
            )}

            <FieldGrid
              title="Hồ sơ cơ bản"
              icon={UserRound}
              fields={[
                { label: "ID người dùng", value: displayValue(selectedPerson.id) },
                { label: "Tên hệ thống", value: displayValue(selectedPerson.name) },
                { label: "Tên theo CCCD", value: displayValue(selectedPerson.full_name) },
                { label: "Chức vụ", value: displayValue(selectedPerson.role) },
                { label: "Phòng ban", value: displayValue(selectedPerson.department) },
                { label: "Trạng thái DB", value: selectedPerson.status === "active" ? "active" : "inactive" },
                { label: "Hết hạn làm việc", value: formatDate(selectedPerson.work_expiry_date) },
                { label: "Đăng ký lúc", value: formatDateTime(selectedPerson.registered_at) },
                { label: "Cập nhật lúc", value: formatDateTime(selectedPerson.updated_at) },
              ]}
            />

            <FieldGrid
              title="Thông tin CCCD"
              icon={CreditCard}
              hidden={!showCCCDInfo}
              showToggle={true}
              onToggleHidden={() => setShowCCCDInfo(!showCCCDInfo)}
              fields={[
                { label: "ID bản ghi CCCD", value: displayValue(selectedPerson.citizen_id_record_id, !showCCCDInfo) },
                { label: "Số CCCD", value: displayValue(selectedPerson.id_number, !showCCCDInfo) },
                { label: "Ngày sinh", value: displayValue(selectedPerson.dob, !showCCCDInfo) },
                { label: "Giới tính", value: displayValue(selectedPerson.gender, !showCCCDInfo) },
                { label: "Quốc tịch", value: displayValue(selectedPerson.nationality, !showCCCDInfo) },
                { label: "Quê quán", value: displayValue(selectedPerson.hometown, !showCCCDInfo) },
                { label: "Địa chỉ", value: displayValue(selectedPerson.address, !showCCCDInfo) },
                { label: "Ngày cấp", value: displayValue(selectedPerson.issue_date, !showCCCDInfo) },
                { label: "Hạn CCCD", value: displayValue(selectedPerson.expiry_date, !showCCCDInfo) },
                { label: "Đặc điểm nhận dạng", value: displayValue(selectedPerson.special_features, !showCCCDInfo) },
                { label: "Tạo bản ghi CCCD", value: formatDateTime(selectedPerson.citizen_created_at) },
                { label: "Cập nhật bản ghi CCCD", value: formatDateTime(selectedPerson.citizen_updated_at) },
              ]}
            />

            <FieldGrid
              title="Metadata hệ thống (Base64)"
              icon={Database}
              fields={[
                { label: "Ảnh đại diện", value: displayValue(selectedPerson.img_url) },
                { label: "CCCD mặt trước", value: displayValue(selectedPerson.cccd_front_img) },
                { label: "CCCD mặt sau", value: displayValue(selectedPerson.cccd_back_img) },
              ]}
            />

            <section
              style={{
                borderRadius: 24,
                padding: 20,
                background: "var(--app-bg-subtle)",
                border: "1px solid var(--app-border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: "rgba(125,211,252,0.08)",
                    border: "1px solid rgba(125,211,252,0.14)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <FileImage size={16} color="var(--app-accent)" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Ảnh lưu trong hệ thống</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                {[
                  { label: "Ảnh đại diện", src: selectedPerson.img },
                  { label: "CCCD mặt trước", src: selectedPerson.cccd_front_img },
                  { label: "CCCD mặt sau", src: selectedPerson.cccd_back_img },
                ].map((image) => (
                  <div
                    key={image.label}
                    style={{
                      borderRadius: 20,
                      overflow: "hidden",
                      background: "var(--app-surface)",
                      border: "1px solid rgba(148,163,184,0.12)",
                    }}
                  >
                    <div style={{ aspectRatio: "4 / 3", background: "var(--app-bg-subtle)" }}>
                      {image.src ? (
                        <ImageWithFallback
                          src={image.src}
                          alt={image.label}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "var(--app-muted)" }}>
                          Không có ảnh
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 12, fontSize: 13, color: "var(--app-text-soft)" }}>{image.label}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>

      <AnimatePresence>
        {showRegisterModal && (
          <RegisterModal
            onClose={() => setShowRegisterModal(false)}
            onSuccess={async (result) => {
              setShowRegisterModal(false);
              await loadPersons();
              const accountMessage = result.account
                ? `Đăng ký thành công. Username: ${result.account.username} - MK tạm: ${result.account.temporary_password}${result.account.email_sent ? " - đã gửi email" : " - chưa gửi được email, kiểm tra cấu hình email backend"}`
                : "Đăng ký người dùng thành công";
              setToast({ message: accountMessage, type: "success" });
            }}
          />
        )}

        {personToEdit && (
          <EditModal
            person={personToEdit}
            onClose={() => setPersonToEdit(null)}
            onSaved={async () => {
              await loadPersons();
              setToast({ message: "Đã cập nhật hồ sơ", type: "success" });
            }}
          />
        )}

        {personToDelete && (
          <ConfirmModal
            person={personToDelete}
            deleting={deleting}
            onClose={() => {
              if (!deleting) {
                setPersonToDelete(null);
              }
            }}
            onConfirm={deletePerson}
          />
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
