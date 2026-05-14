import { useEffect, useMemo, useState } from "react";
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

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "--";
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
}: {
  title: string;
  icon: any;
  fields: Array<{ label: string; value: string }>;
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
          <Icon size={16} color="var(--app-accent)" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
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
            <div style={{ fontSize: 14, color: "var(--app-text-soft)", lineHeight: 1.5, wordBreak: "break-word" }}>
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
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadPersons = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getPersons();
      setPersons(data);
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
    loadPersons();
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

  useEffect(() => {
    if (filteredPersons.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!filteredPersons.some((person) => person.id === selectedId)) {
      setSelectedId(filteredPersons[0].id);
    }
  }, [filteredPersons, selectedId]);

  const selectedPerson = filteredPersons.find((person) => person.id === selectedId) ?? null;

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
      <div style={{ padding: 28 }}>
        <div
          style={{
            borderRadius: 28,
            padding: 32,
            background: "var(--app-surface)",
            border: "1px solid var(--app-border)",
            color: "var(--app-muted)",
          }}
        >
          Đang tải dữ liệu người dùng...
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
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ maxWidth: 700 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(125,211,252,0.08)",
              border: "1px solid rgba(125,211,252,0.16)",
              color: "var(--app-accent)",
              fontSize: 12,
              marginBottom: 14,
            }}
          >
            <Database size={14} />
            Hồ sơ hiển thị đầy đủ từ bảng `persons` và `citizen_ids`
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>Quản lý người dùng theo hồ sơ thật, không còn nút thừa</div>
          <div style={{ marginTop: 10, fontSize: 14, color: "var(--app-muted)", lineHeight: 1.7 }}>
            Trang này tập trung vào tra cứu, chỉnh sửa và xem chi tiết toàn bộ dữ liệu người dùng đang có trong database, bao gồm thông tin CCCD và đường dẫn ảnh.
          </div>
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

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20, alignItems: "start" }}>
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
            <div style={{ maxHeight: 760, overflow: "auto" }}>
              {filteredPersons.map((person) => {
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
                      gap: 12,
                      padding: "18px",
                      border: "none",
                      borderBottom: "1px solid rgba(148,163,184,0.08)",
                      background: isSelected ? "rgba(125,211,252,0.08)" : "transparent",
                      cursor: "pointer",
                      color: "inherit",
                    }}
                  >
                    <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 16,
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
                            <UserRound size={18} color="var(--app-muted)" />
                          </div>
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {person.name}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 13, color: "var(--app-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {person.role || "Chưa có chức vụ"}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--app-text-soft)" }}>{displayValue(person.department)}</div>
                    <div style={{ fontSize: 13, color: "var(--app-text-soft)" }}>{displayValue(person.id_number)}</div>
                    <div style={{ fontSize: 12, color: person.is_expired ? "var(--app-danger)" : person.status === "inactive" ? "var(--app-warm)" : "var(--app-success)" }}>
                      {person.is_expired ? "Hết hạn" : person.status === "inactive" ? "Tạm khóa" : "Hoạt động"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          {selectedPerson ? (
            <>
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
                fields={[
                  { label: "ID bản ghi CCCD", value: displayValue(selectedPerson.citizen_id_record_id) },
                  { label: "Số CCCD", value: displayValue(selectedPerson.id_number) },
                  { label: "Ngày sinh", value: displayValue(selectedPerson.dob) },
                  { label: "Giới tính", value: displayValue(selectedPerson.gender) },
                  { label: "Quốc tịch", value: displayValue(selectedPerson.nationality) },
                  { label: "Quê quán", value: displayValue(selectedPerson.hometown) },
                  { label: "Địa chỉ", value: displayValue(selectedPerson.address) },
                  { label: "Ngày cấp", value: displayValue(selectedPerson.issue_date) },
                  { label: "Hạn CCCD", value: displayValue(selectedPerson.expiry_date) },
                  { label: "Đặc điểm nhận dạng", value: displayValue(selectedPerson.special_features) },
                  { label: "Tạo bản ghi CCCD", value: formatDateTime(selectedPerson.citizen_created_at) },
                  { label: "Cập nhật bản ghi CCCD", value: formatDateTime(selectedPerson.citizen_updated_at) },
                ]}
              />

              <FieldGrid
                title="Metadata hệ thống"
                icon={Database}
                fields={[
                  { label: "img_url", value: displayValue(selectedPerson.img_url) },
                  { label: "img_path", value: displayValue(selectedPerson.img_path) },
                  { label: "front_img_path", value: displayValue(selectedPerson.front_img_path) },
                  { label: "back_img_path", value: displayValue(selectedPerson.back_img_path) },
                  { label: "Ảnh đại diện", value: displayValue(selectedPerson.img) },
                  { label: "Ảnh CCCD trước", value: displayValue(selectedPerson.cccd_front_img) },
                  { label: "Ảnh CCCD sau", value: displayValue(selectedPerson.cccd_back_img) },
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
            </>
          ) : (
            <div
              style={{
                borderRadius: 28,
                padding: 28,
                background: "var(--app-surface)",
                border: "1px solid var(--app-border)",
                color: "var(--app-muted)",
              }}
            >
              Chọn một hồ sơ ở danh sách bên trái để xem đầy đủ thông tin database.
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {showRegisterModal && (
          <RegisterModal
            onClose={() => setShowRegisterModal(false)}
            onSuccess={async () => {
              setShowRegisterModal(false);
              await loadPersons();
              setToast({ message: "Đăng ký người dùng thành công", type: "success" });
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
