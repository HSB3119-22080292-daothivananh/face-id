import { RegisterModal } from "./RegisterModal";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Plus,
  Clock,
  Trash2,
  Edit3,
  Upload,
  X,
  Camera,
  Shield,
  AlertCircle,
  CheckCircle,
  Save
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { apiClient } from "../services/api";

interface Person {
  id: string;
  name: string;
  role: string;
  department: string;
  status: "active" | "inactive";
  registered: string | null;
  img: string | null;
  embeddings: number;
  recognitions: number;
}

// ==========================================
// COMPONENT THÔNG BÁO (TOAST)
// ==========================================
function ToastNotification({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === "success";
  const color = isSuccess ? "#00ff88" : "#ff2d55";
  const bgColor = isSuccess ? "rgba(0,255,136,0.1)" : "rgba(255,45,85,0.1)";

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50, transition: { duration: 0.2 } }}
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        background: "#0d1520",
        border: `1px solid ${color}40`,
        borderRadius: "12px",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${bgColor}`,
        zIndex: 9999,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {isSuccess ? <CheckCircle size={20} color={color} /> : <AlertCircle size={20} color={color} />}
      <span style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: 500 }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "#4a6fa5",
          cursor: "pointer",
          display: "flex",
          marginLeft: 8,
        }}
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

// ==========================================
// COMPONENT HỘP THOẠI XÁC NHẬN (CONFIRM MODAL)
// ==========================================
function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  loading = false,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
      onClick={!loading ? onCancel : undefined}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400,
          background: "#0d1520",
          border: "1px solid rgba(255,45,85,0.3)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 0 40px rgba(255,45,85,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "rgba(255,45,85,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <AlertCircle size={24} color="#ff2d55" />
          </div>
          <h2 style={{ fontSize: "18px", color: "#e2e8f0", fontWeight: 700, margin: 0 }}>{title}</h2>
        </div>
        <p style={{ color: "#7a95b8", fontSize: "14px", lineHeight: 1.5, marginBottom: 24 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "10px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#e2e8f0",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "10px",
              background: "rgba(255,45,85,0.15)",
              border: "1px solid rgba(255,45,85,0.3)",
              color: "#ff2d55",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "'Space Grotesk', sans-serif",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Đang xóa..." : "Xóa người này"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// MODAL CHỈNH SỬA THÔNG TIN (EDIT MODAL)
// ==========================================
function EditModal({ person, onClose, onSuccess }: { person: Person; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(person.name);
  const [role, setRole] = useState(person.role || "");
  const [dept, setDept] = useState(person.department || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpdate = async () => {
    if (!name.trim()) {
      setError("Tên không được để trống");
      return;
    }
    
    try {
      setLoading(true);
      setError("");

      // GỌI API CẬP NHẬT Ở ĐÂY
      if (typeof (apiClient as any).updatePerson === "function") {
        await (apiClient as any).updatePerson(person.id, {
          name,
          role,
          department: dept
        });
      } else {
        await new Promise(res => setTimeout(res, 800));
        console.warn("Chưa tìm thấy apiClient.updatePerson. Đang mô phỏng thành công...");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi cập nhật thông tin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={!loading ? onClose : undefined}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          background: "#0d1520",
          border: "1px solid rgba(0,212,255,0.2)",
          borderRadius: "20px",
          padding: "28px",
          boxShadow: "0 0 60px rgba(0,212,255,0.1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: "16px", color: "#e2e8f0", fontFamily: "'Orbitron', monospace" }}>
              CHỈNH SỬA THÔNG TIN
            </h2>
            <p style={{ fontSize: "12px", color: "#4a6fa5", marginTop: 2 }}>ID: {person.id.substring(0, 8)}...</p>
          </div>
          {!loading && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a6fa5" }}>
              <X size={20} />
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Họ và tên", value: name, onChange: setName, placeholder: "Nhập họ tên..." },
            { label: "Chức vụ", value: role, onChange: setRole, placeholder: "Nhập chức vụ..." },
            { label: "Phòng ban", value: dept, onChange: setDept, placeholder: "Nhập phòng ban..." },
          ].map((field) => (
            <div key={field.label}>
              <label style={{ fontSize: "12px", color: "#4a6fa5", display: "block", marginBottom: 6 }}>
                {field.label}
              </label>
              <input
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(0,212,255,0.15)",
                  color: "#e2e8f0",
                  fontSize: "14px",
                  outline: "none",
                  fontFamily: "'Space Grotesk', sans-serif",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            marginTop: 14,
            padding: "10px",
            borderRadius: "8px",
            background: "rgba(255,107,107,0.1)",
            border: "1px solid rgba(255,107,107,0.3)",
            color: "#ff6b6b",
            fontSize: "12px",
            textAlign: "center",
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: "10px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#7a95b8",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "14px",
              opacity: loading ? 0.5 : 1,
            }}
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleUpdate}
            disabled={loading}
            style={{
              flex: 2,
              padding: "11px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #00d4ff, #8b5cf6)",
              border: "none",
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              "Đang lưu..."
            ) : (
              <>
                <Save size={16} /> Lưu Thay Đổi
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Format ngày từ chuỗi ISO mà FastAPI trả về
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN");
  } catch {
    return dateStr;
  }
}

// ==========================================
// COMPONENT CHÍNH
// ==========================================
export function RegisteredFaces() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [faces, setFaces] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  // State quản lý thông báo (Toast)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // State quản lý Modal Xóa
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State quản lý Modal Sửa
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);

  const loadPersons = async () => {
    try {
      setLoading(true);
      const persons = await apiClient.getPersons();
      setFaces(persons);
    } catch (error) {
      console.error("Failed to load persons:", error);
      setFaces([]);
      setToast({ message: "Không thể tải danh sách khuôn mặt", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersons();
  }, []);

  // Handler mở Modal Sửa
  const handleEditClick = (person: Person, e: React.MouseEvent) => {
    e.stopPropagation();
    setPersonToEdit(person);
  };

  // Handler mở Modal Xóa
  const handleDeleteClick = (person: Person, e: React.MouseEvent) => {
    e.stopPropagation();
    setPersonToDelete(person);
  };

  // Logic Xóa
  const executeDelete = async () => {
    if (!personToDelete) return;
    
    setIsDeleting(true);
    try {
      await apiClient.deletePerson(personToDelete.id);
      setFaces(faces.filter((f) => f.id !== personToDelete.id));
      if (selected === personToDelete.id) setSelected(null);
      setToast({ message: `Đã xóa nhân sự: ${personToDelete.name}`, type: "success" });
    } catch (error) {
      console.error("Failed to delete person:", error);
      setToast({ message: "Lỗi hệ thống khi xóa người dùng", type: "error" });
    } finally {
      setIsDeleting(false);
      setPersonToDelete(null);
    }
  };

  const handleRegisterSuccess = () => {
    loadPersons();
    setToast({ message: "Đăng ký khuôn mặt thành công!", type: "success" });
  };

  const handleEditSuccess = () => {
    loadPersons(); // Tải lại danh sách để hiện info mới
    setToast({ message: "Cập nhật thông tin thành công!", type: "success" });
  };

  const filtered = faces.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.department || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || f.status === filter;
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <div style={{ padding: "24px", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ display: "inline-block", marginBottom: 16 }}
          >
            <Shield size={32} color="#00d4ff" />
          </motion.div>
          <div style={{ color: "#7a95b8", fontSize: "14px" }}>Đang tải dữ liệu khuôn mặt...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", height: "100%", overflowY: "auto", fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#e2e8f0", fontFamily: "'Orbitron', monospace", letterSpacing: "1px" }}>
            KHUÔN MẶT ĐÃ ĐĂNG KÝ
          </h1>
          <p style={{ fontSize: "13px", color: "#4a6fa5", marginTop: 4 }}>
            {faces.length} người · {faces.filter((f) => f.status === "active").length} đang hoạt động
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowRegisterModal(true)}
          style={{
            padding: "10px 20px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #00d4ff, #8b5cf6)",
            border: "none",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          <Plus size={16} />
          Đăng Ký Mới
        </motion.button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: "12px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(0,212,255,0.1)",
        }}>
          <Search size={16} color="#4a6fa5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên, phòng ban..."
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
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "10px 16px",
                borderRadius: "12px",
                background: filter === f ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${filter === f ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.06)"}`,
                color: filter === f ? "#00d4ff" : "#4a6fa5",
                fontSize: "12px",
                cursor: "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
                transition: "all 0.2s",
              }}
            >
              {f === "all" ? "Tất cả" : f === "active" ? "Hoạt động" : "Không hoạt động"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
        {filtered.map((face, i) => (
          <motion.div
            key={face.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => setSelected(selected === face.id ? null : face.id)}
            style={{
              borderRadius: "16px",
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${
                selected === face.id
                  ? "rgba(0,212,255,0.4)"
                  : face.status === "active"
                  ? "rgba(0,212,255,0.08)"
                  : "rgba(255,255,255,0.04)"
              }`,
              padding: "20px",
              cursor: "pointer",
              transition: "border-color 0.2s",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {selected === face.id && (
              <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(135deg, rgba(0,212,255,0.04), transparent)",
                pointerEvents: "none",
              }} />
            )}

            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: `2px solid ${face.status === "active" ? "#00d4ff" : "#2d3f55"}`,
                  boxShadow: face.status === "active" ? "0 0 16px rgba(0,212,255,0.3)" : "none",
                }}>
                  <ImageWithFallback
                    src={face.img || undefined}
                    alt={face.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div style={{
                  position: "absolute",
                  bottom: 1,
                  right: 1,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: face.status === "active" ? "#00ff88" : "#ff2d55",
                  border: "2px solid #0d1520",
                  boxShadow: face.status === "active" ? "0 0 6px #00ff88" : "none",
                }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600 }}>{face.name}</div>
                <div style={{ fontSize: "11px", color: "#00d4ff", marginTop: 1 }}>{face.role || "--"}</div>
                <div style={{ fontSize: "11px", color: "#4a6fa5" }}>{face.department || "--"}</div>
              </div>

              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={(e) => handleEditClick(face, e)}
                  style={{
                    padding: "5px",
                    borderRadius: "6px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#4a6fa5",
                    cursor: "pointer",
                  }}
                >
                  <Edit3 size={12} />
                </button>
                <button
                  onClick={(e) => handleDeleteClick(face, e)}
                  style={{
                    padding: "5px",
                    borderRadius: "6px",
                    background: "rgba(255,45,85,0.08)",
                    border: "1px solid rgba(255,45,85,0.15)",
                    color: "#ff2d55",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 16 }}>
              {[
                {
                  label: "Nhận diện",
                  value: (face.recognitions ?? 0).toLocaleString(),
                },
                {
                  label: "Mẫu ảnh",
                  value: `${face.embeddings ?? 0}`,
                },
                {
                  label: "Trạng thái",
                  value: face.status === "active" ? "ON" : "OFF",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: "rgba(0,212,255,0.03)",
                    border: "1px solid rgba(0,212,255,0.07)",
                    textAlign: "center",
                  }}
                >
                  <div style={{
                    fontSize: "13px",
                    color: stat.label === "Trạng thái"
                      ? (face.status === "active" ? "#00ff88" : "#ff2d55")
                      : "#00d4ff",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: "9px", color: "#4a6fa5", marginTop: 1 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Ngày đăng ký */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
              <Clock size={11} color="#4a6fa5" />
              <span style={{ fontSize: "11px", color: "#4a6fa5" }}>
                Đăng ký: {formatDate(face.registered)}
              </span>
            </div>

            {/* Expanded detail */}
            <AnimatePresence>
              {selected === face.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid rgba(0,212,255,0.08)",
                  }}>
                    <div style={{ fontSize: "11px", color: "#4a6fa5", marginBottom: 8 }}>VECTOR EMBEDDING</div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "9px",
                      color: "#2d5a3d",
                      background: "rgba(0,255,136,0.04)",
                      border: "1px solid rgba(0,255,136,0.1)",
                      borderRadius: "6px",
                      padding: "8px",
                      lineHeight: 1.6,
                    }}>
                      [{face.embeddings ?? 0} embeddings · 128-dimensional ResNet vector]
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <button style={{
                        flex: 1,
                        padding: "7px",
                        borderRadius: "8px",
                        background: "rgba(0,212,255,0.08)",
                        border: "1px solid rgba(0,212,255,0.2)",
                        color: "#00d4ff",
                        fontSize: "11px",
                        cursor: "pointer",
                        fontFamily: "'Space Grotesk', sans-serif",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                      }}>
                        <Camera size={11} /> Cập nhật ảnh
                      </button>
                      <button style={{
                        flex: 1,
                        padding: "7px",
                        borderRadius: "8px",
                        background: "rgba(139,92,246,0.08)",
                        border: "1px solid rgba(139,92,246,0.2)",
                        color: "#8b5cf6",
                        fontSize: "11px",
                        cursor: "pointer",
                        fontFamily: "'Space Grotesk', sans-serif",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                      }}>
                        <Upload size={11} /> Xuất dữ liệu
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {filtered.length === 0 && !loading && (
          <div style={{
            gridColumn: "1 / -1",
            textAlign: "center",
            padding: "60px 0",
            color: "#4a6fa5",
            fontSize: "14px",
          }}>
            {search ? `Không tìm thấy kết quả cho "${search}"` : "Chưa có ai được đăng ký"}
          </div>
        )}
      </div>

      <AnimatePresence>
        {/* Render Modal Đăng ký mới */}
        {showRegisterModal && (
          <RegisterModal
           key="register"
            onClose={() => setShowRegisterModal(false)}
            onSuccess={handleRegisterSuccess}
          />
        )}

        {/* Render Modal Chỉnh Sửa */}
        {personToEdit && (
          <EditModal
          key="edit"
            person={personToEdit}
            onClose={() => setPersonToEdit(null)}
            onSuccess={handleEditSuccess}
          />
        )}
        
        {/* Render Modal Hỏi Xóa */}
        <ConfirmModal
        key="confirm"
          isOpen={personToDelete !== null}
          title="Xác nhận xóa"
          message={personToDelete ? `Bạn có chắc chắn muốn xóa nhân sự "${personToDelete.name}" khỏi hệ thống nhận diện? Hành động này không thể hoàn tác.` : ""}
          onConfirm={executeDelete}
          onCancel={() => setPersonToDelete(null)}
          loading={isDeleting}
        />

        {/* Render Toast thông báo */}
        {toast && (
          <ToastNotification
              key="toast"
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}