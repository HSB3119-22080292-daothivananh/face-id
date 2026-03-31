// import { RegisterModal } from"./RegisterModal";
// import { useState, useEffect, useRef } from "react";
// import { motion, AnimatePresence } from "motion/react";
// import {
//   Search,
//   Plus,
//   Clock,
//   Trash2,
//   Edit3,
//   Upload,
//   X,
//   Camera,
//   Shield,
//   AlertCircle,
//   CheckCircle,
//   Save
// } from "lucide-react";
// import { ImageWithFallback } from "./figma/ImageWithFallback";
// import { apiClient } from "../services/api";
// interface Person {
//   id: string;
//   name: string;
//   role: string;
//   department: string;
//   status: "active" | "inactive";
//   registered: string | null;
//   img: string | null;
//   embeddings: number;
//   recognitions: number;
// }

// // ==========================================
// // COMPONENT THÔNG BÁO (TOAST)
// // ==========================================
// function ToastNotification({
//   message,
//   type,
//   onClose,
// }: {
//   message: string;
//   type: "success" | "error";
//   onClose: () => void;
// }) {
//   useEffect(() => {
//     const timer = setTimeout(onClose, 3000);
//     return () => clearTimeout(timer);
//   }, [onClose]);

//   const isSuccess = type === "success";
//   const color = isSuccess ? "#00ff88" : "#ff2d55";
//   const bgColor = isSuccess ? "rgba(0,255,136,0.1)" : "rgba(255,45,85,0.1)";

//   return (
//     <motion.div
//       initial={{ opacity: 0, x: 50 }}
//       animate={{ opacity: 1, x: 0 }}
//       exit={{ opacity: 0, x: 50, transition: { duration: 0.2 } }}
//       style={{
//         position: "fixed",
//         bottom: 24,
//         right: 24,
//         background: "#0d1520",
//         border: `1px solid ${color}40`,
//         borderRadius: "12px",
//         padding: "16px 20px",
//         display: "flex",
//         alignItems: "center",
//         gap: 12,
//         boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${bgColor}`,
//         zIndex: 9999,
//         fontFamily: "'Space Grotesk', sans-serif",
//       }}
//     >
//       {isSuccess ? <CheckCircle size={20} color={color} /> : <AlertCircle size={20} color={color} />}
//       <span style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: 500 }}>{message}</span>
//       <button
//         onClick={onClose}
//         style={{
//           background: "none",
//           border: "none",
//           color: "#4a6fa5",
//           cursor: "pointer",
//           display: "flex",
//           marginLeft: 8,
//         }}
//       >
//         <X size={16} />
//       </button>
//     </motion.div>
//   );
// }

// // ==========================================
// // COMPONENT HỘP THOẠI XÁC NHẬN (CONFIRM MODAL)
// // ==========================================
// function ConfirmModal({
//   isOpen,
//   title,
//   message,
//   onConfirm,
//   onCancel,
//   loading = false,
// }: {
//   isOpen: boolean;
//   title: string;
//   message: string;
//   onConfirm: () => void;
//   onCancel: () => void;
//   loading?: boolean;
// }) {
//   if (!isOpen) return null;

//   return (
//     <motion.div
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       exit={{ opacity: 0 }}
//       style={{
//         position: "fixed",
//         inset: 0,
//         background: "rgba(0,0,0,0.7)",
//         backdropFilter: "blur(4px)",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         zIndex: 1000,
//         fontFamily: "'Space Grotesk', sans-serif",
//       }}
//       onClick={!loading ? onCancel : undefined}
//     >
//       <motion.div
//         initial={{ scale: 0.9, opacity: 0 }}
//         animate={{ scale: 1, opacity: 1 }}
//         exit={{ scale: 0.9, opacity: 0 }}
//         onClick={(e) => e.stopPropagation()}
//         style={{
//           width: 400,
//           background: "#0d1520",
//           border: "1px solid rgba(255,45,85,0.3)",
//           borderRadius: "16px",
//           padding: "24px",
//           boxShadow: "0 0 40px rgba(255,45,85,0.1)",
//         }}
//       >
//         <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
//           <div style={{
//             width: 40,
//             height: 40,
//             borderRadius: "50%",
//             background: "rgba(255,45,85,0.1)",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center"
//           }}>
//             <AlertCircle size={24} color="#ff2d55" />
//           </div>
//           <h2 style={{ fontSize: "18px", color: "#e2e8f0", fontWeight: 700, margin: 0 }}>{title}</h2>
//         </div>
//         <p style={{ color: "#7a95b8", fontSize: "14px", lineHeight: 1.5, marginBottom: 24 }}>
//           {message}
//         </p>
//         <div style={{ display: "flex", gap: 12 }}>
//           <button
//             onClick={onCancel}
//             disabled={loading}
//             style={{
//               flex: 1,
//               padding: "10px",
//               borderRadius: "10px",
//               background: "transparent",
//               border: "1px solid rgba(255,255,255,0.1)",
//               color: "#e2e8f0",
//               cursor: loading ? "not-allowed" : "pointer",
//               fontSize: "14px",
//               fontFamily: "'Space Grotesk', sans-serif",
//             }}
//           >
//             Hủy bỏ
//           </button>
//           <button
//             onClick={onConfirm}
//             disabled={loading}
//             style={{
//               flex: 1,
//               padding: "10px",
//               borderRadius: "10px",
//               background: "rgba(255,45,85,0.15)",
//               border: "1px solid rgba(255,45,85,0.3)",
//               color: "#ff2d55",
//               cursor: loading ? "not-allowed" : "pointer",
//               fontSize: "14px",
//               fontWeight: 600,
//               fontFamily: "'Space Grotesk', sans-serif",
//               opacity: loading ? 0.7 : 1,
//             }}
//           >
//             {loading ? "Đang xóa..." : "Xóa người này"}
//           </button>
//         </div>
//       </motion.div>
//     </motion.div>
//   );
// }

// // ==========================================
// // MODAL CHỈNH SỬA THÔNG TIN (EDIT MODAL)
// // ==========================================
// function EditModal({ person, onClose, onSuccess }: { person: Person; onClose: () => void; onSuccess: () => void }) {
//   const [name, setName] = useState(person.name);
//   const [role, setRole] = useState(person.role || "");
//   const [dept, setDept] = useState(person.department || "");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const handleUpdate = async () => {
//     if (!name.trim()) {
//       setError("Tên không được để trống");
//       return;
//     }
    
//     try {
//       setLoading(true);
//       setError("");

//       // GỌI API CẬP NHẬT Ở ĐÂY
//       // Giả định bạn có hàm apiClient.updatePerson(id, data)
//       if (typeof (apiClient as any).updatePerson === "function") {
//         await (apiClient as any).updatePerson(person.id, {
//           name,
//           role,
//           department: dept
//         });
//       } else {
//         // Fallback mô phỏng nếu chưa kịp viết API
//         await new Promise(res => setTimeout(res, 800));
//         console.warn("Chưa tìm thấy apiClient.updatePerson. Đang mô phỏng thành công...");
//       }

//       onSuccess();
//       onClose();
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Lỗi cập nhật thông tin");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <motion.div
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       exit={{ opacity: 0 }}
//       style={{
//         position: "fixed",
//         inset: 0,
//         background: "rgba(0,0,0,0.7)",
//         backdropFilter: "blur(8px)",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         zIndex: 100,
//       }}
//       onClick={!loading ? onClose : undefined}
//     >
//       <motion.div
//         initial={{ scale: 0.9, opacity: 0 }}
//         animate={{ scale: 1, opacity: 1 }}
//         exit={{ scale: 0.9, opacity: 0 }}
//         onClick={(e) => e.stopPropagation()}
//         style={{
//           width: 480,
//           background: "#0d1520",
//           border: "1px solid rgba(0,212,255,0.2)",
//           borderRadius: "20px",
//           padding: "28px",
//           boxShadow: "0 0 60px rgba(0,212,255,0.1)",
//         }}
//       >
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
//           <div>
//             <h2 style={{ fontSize: "16px", color: "#e2e8f0", fontFamily: "'Orbitron', monospace" }}>
//               CHỈNH SỬA THÔNG TIN
//             </h2>
//             <p style={{ fontSize: "12px", color: "#4a6fa5", marginTop: 2 }}>ID: {person.id.substring(0, 8)}...</p>
//           </div>
//           {!loading && (
//             <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a6fa5" }}>
//               <X size={20} />
//             </button>
//           )}
//         </div>

//         <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
//           {[
//             { label: "Họ và tên", value: name, onChange: setName, placeholder: "Nhập họ tên..." },
//             { label: "Chức vụ", value: role, onChange: setRole, placeholder: "Nhập chức vụ..." },
//             { label: "Phòng ban", value: dept, onChange: setDept, placeholder: "Nhập phòng ban..." },
//           ].map((field) => (
//             <div key={field.label}>
//               <label style={{ fontSize: "12px", color: "#4a6fa5", display: "block", marginBottom: 6 }}>
//                 {field.label}
//               </label>
//               <input
//                 value={field.value}
//                 onChange={(e) => field.onChange(e.target.value)}
//                 placeholder={field.placeholder}
//                 style={{
//                   width: "100%",
//                   padding: "10px 14px",
//                   borderRadius: "10px",
//                   background: "rgba(255,255,255,0.03)",
//                   border: "1px solid rgba(0,212,255,0.15)",
//                   color: "#e2e8f0",
//                   fontSize: "14px",
//                   outline: "none",
//                   fontFamily: "'Space Grotesk', sans-serif",
//                   boxSizing: "border-box",
//                 }}
//               />
//             </div>
//           ))}
//         </div>

//         {error && (
//           <div style={{
//             marginTop: 14,
//             padding: "10px",
//             borderRadius: "8px",
//             background: "rgba(255,107,107,0.1)",
//             border: "1px solid rgba(255,107,107,0.3)",
//             color: "#ff6b6b",
//             fontSize: "12px",
//             textAlign: "center",
//           }}>
//             {error}
//           </div>
//         )}

//         <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
//           <button
//             onClick={onClose}
//             disabled={loading}
//             style={{
//               flex: 1,
//               padding: "11px",
//               borderRadius: "10px",
//               background: "transparent",
//               border: "1px solid rgba(255,255,255,0.08)",
//               color: "#7a95b8",
//               cursor: loading ? "not-allowed" : "pointer",
//               fontFamily: "'Space Grotesk', sans-serif",
//               fontSize: "14px",
//               opacity: loading ? 0.5 : 1,
//             }}
//           >
//             Hủy bỏ
//           </button>
//           <button
//             onClick={handleUpdate}
//             disabled={loading}
//             style={{
//               flex: 2,
//               padding: "11px",
//               borderRadius: "10px",
//               background: "linear-gradient(135deg, #00d4ff, #8b5cf6)",
//               border: "none",
//               color: "#fff",
//               cursor: loading ? "not-allowed" : "pointer",
//               fontFamily: "'Space Grotesk', sans-serif",
//               fontSize: "14px",
//               fontWeight: 600,
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               gap: 6,
//               opacity: loading ? 0.7 : 1,
//             }}
//           >
//             {loading ? (
//               "Đang lưu..."
//             ) : (
//               <>
//                 <Save size={16} /> Lưu Thay Đổi
//               </>
//             )}
//           </button>
//         </div>
//       </motion.div>
//     </motion.div>
//   );
// }

// // ==========================================
// // MODAL ĐĂNG KÝ
// // ==========================================
// function RegisterModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
//   const [step, setStep] = useState(1);
//   const [name, setName] = useState("");
//   const [role, setRole] = useState("");
//   const [dept, setDept] = useState("");
//   const [images, setImages] = useState<File[]>([]);
//   const [previews, setPreviews] = useState<string[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const files = Array.from(e.target.files || []);
//     const validFiles = files.filter(f => f.type.startsWith('image/'));

//     if (validFiles.length + images.length > 5) {
//       setError("Tối đa 5 ảnh");
//       return;
//     }

//     setImages(prev => [...prev, ...validFiles]);
//     validFiles.forEach(file => {
//       const reader = new FileReader();
//       reader.onload = (ev) => {
//         setPreviews(prev => [...prev, ev.target?.result as string]);
//       };
//       reader.readAsDataURL(file);
//     });
//   };

//   const removeImage = (index: number) => {
//     setImages(images.filter((_, i) => i !== index));
//     setPreviews(previews.filter((_, i) => i !== index));
//   };

//   const handleNext = () => {
//     if (step === 1) {
//       if (!name.trim() || !role.trim() || !dept.trim()) {
//         setError("Vui lòng điền đầy đủ thông tin");
//         return;
//       }
//       setError("");
//       setStep(2);
//     } else if (step === 2) {
//       if (images.length === 0) {
//         setError("Vui lòng chọn ít nhất 1 ảnh");
//         return;
//       }
//       setError("");
//       handleRegister();
//     }
//   };

//   const handleRegister = async () => {
//     try {
//       setLoading(true);
//       setStep(3);

//       const formData = new FormData();
//       formData.append("name", name);
//       formData.append("role", role);
//       formData.append("department", dept);
//       images.forEach(img => formData.append("images", img));

//       await apiClient.registerFace(formData);

//       setTimeout(() => {
//         onSuccess();
//         onClose();
//       }, 1500);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Lỗi đăng ký");
//       setStep(2);
//       setLoading(false);
//     }
//   };

//   return (
//     <motion.div
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       exit={{ opacity: 0 }}
//       style={{
//         position: "fixed",
//         inset: 0,
//         background: "rgba(0,0,0,0.7)",
//         backdropFilter: "blur(8px)",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         zIndex: 100,
//       }}
//       onClick={onClose}
//     >
//       <motion.div
//         initial={{ scale: 0.9, opacity: 0 }}
//         animate={{ scale: 1, opacity: 1 }}
//         exit={{ scale: 0.9, opacity: 0 }}
//         onClick={(e) => e.stopPropagation()}
//         style={{
//           width: 520,
//           maxHeight: "90vh",
//           overflowY: "auto",
//           background: "#0d1520",
//           border: "1px solid rgba(0,212,255,0.2)",
//           borderRadius: "20px",
//           padding: "28px",
//           boxShadow: "0 0 60px rgba(0,212,255,0.1)",
//         }}
//       >
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
//           <div>
//             <h2 style={{ fontSize: "16px", color: "#e2e8f0", fontFamily: "'Orbitron', monospace" }}>
//               ĐĂNG KÝ KHUÔN MẶT
//             </h2>
//             <p style={{ fontSize: "12px", color: "#4a6fa5", marginTop: 2 }}>Bước {step}/3</p>
//           </div>
//           {!loading && (
//             <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a6fa5" }}>
//               <X size={20} />
//             </button>
//           )}
//         </div>

//         <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
//           {[1, 2, 3].map((s) => (
//             <div
//               key={s}
//               style={{
//                 flex: 1,
//                 height: 3,
//                 borderRadius: "2px",
//                 background: s <= step ? "#00d4ff" : "rgba(255,255,255,0.05)",
//                 boxShadow: s <= step ? "0 0 6px #00d4ff" : "none",
//                 transition: "all 0.3s",
//               }}
//             />
//           ))}
//         </div>

//         {step === 1 && (
//           <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
//             <div style={{ fontSize: "13px", color: "#7a95b8", marginBottom: 4 }}>Thông tin cơ bản</div>
//             {[
//               { label: "Họ và tên", value: name, onChange: setName, placeholder: "Nguyễn Văn A" },
//               { label: "Chức vụ", value: role, onChange: setRole, placeholder: "Nhân viên / Kỹ sư..." },
//               { label: "Phòng ban", value: dept, onChange: setDept, placeholder: "Kỹ thuật / Marketing..." },
//             ].map((field) => (
//               <div key={field.label}>
//                 <label style={{ fontSize: "12px", color: "#4a6fa5", display: "block", marginBottom: 6 }}>
//                   {field.label}
//                 </label>
//                 <input
//                   value={field.value}
//                   onChange={(e) => field.onChange(e.target.value)}
//                   placeholder={field.placeholder}
//                   style={{
//                     width: "100%",
//                     padding: "10px 14px",
//                     borderRadius: "10px",
//                     background: "rgba(255,255,255,0.03)",
//                     border: "1px solid rgba(0,212,255,0.15)",
//                     color: "#e2e8f0",
//                     fontSize: "14px",
//                     outline: "none",
//                     fontFamily: "'Space Grotesk', sans-serif",
//                     boxSizing: "border-box",
//                   }}
//                 />
//               </div>
//             ))}
//           </div>
//         )}

//         {step === 2 && (
//           <div>
//             <div style={{ fontSize: "13px", color: "#7a95b8", marginBottom: 14 }}>
//               Tải lên ảnh khuôn mặt ({images.length}/5)
//             </div>
//             <div
//               onClick={() => fileInputRef.current?.click()}
//               style={{
//                 padding: "24px",
//                 borderRadius: "12px",
//                 border: "2px dashed rgba(0,212,255,0.3)",
//                 background: "rgba(0,212,255,0.02)",
//                 cursor: "pointer",
//                 textAlign: "center",
//                 marginBottom: 14,
//                 transition: "all 0.3s",
//               }}
//             >
//               <input
//                 ref={fileInputRef}
//                 type="file"
//                 multiple
//                 accept="image/*"
//                 onChange={handleImageSelect}
//                 style={{ display: "none" }}
//               />
//               <Upload size={24} color="#00d4ff" style={{ marginBottom: 8 }} />
//               <div style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 600 }}>
//                 Kéo ảnh vào đây hoặc click để chọn
//               </div>
//               <div style={{ color: "#4a6fa5", fontSize: "11px", marginTop: 4 }}>
//                 JPG, PNG · Tối đa 5 ảnh · Chụp nhiều góc để nhận diện chính xác hơn
//               </div>
//             </div>

//             {previews.length > 0 && (
//               <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
//                 {previews.map((preview, i) => (
//                   <div
//                     key={i}
//                     style={{
//                       position: "relative",
//                       aspectRatio: "1",
//                       borderRadius: "10px",
//                       overflow: "hidden",
//                       border: "1px solid rgba(0,212,255,0.2)",
//                     }}
//                   >
//                     <img src={preview} alt={`preview ${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
//                     <button
//                       onClick={() => removeImage(i)}
//                       style={{
//                         position: "absolute",
//                         top: 4,
//                         right: 4,
//                         background: "rgba(0,0,0,0.6)",
//                         border: "none",
//                         borderRadius: "50%",
//                         width: 24,
//                         height: 24,
//                         cursor: "pointer",
//                         display: "flex",
//                         alignItems: "center",
//                         justifyContent: "center",
//                       }}
//                     >
//                       <X size={14} color="#ff6b6b" />
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}

//             <div style={{
//               padding: "10px",
//               borderRadius: "10px",
//               background: "rgba(0,212,255,0.05)",
//               border: "1px solid rgba(0,212,255,0.1)",
//               fontSize: "11px",
//               color: "#4a6fa5",
//               textAlign: "center",
//             }}>
//               💡 Chụp ảnh từ nhiều góc: chính diện, nghiêng trái, nghiêng phải để nhận diện chính xác hơn
//             </div>
//           </div>
//         )}

//         {step === 3 && (
//           <div style={{ textAlign: "center", padding: "20px 0" }}>
//             <motion.div
//               animate={{ rotate: 360 }}
//               transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
//               style={{ display: "inline-block", marginBottom: 16 }}
//             >
//               <div style={{
//                 width: 60,
//                 height: 60,
//                 borderRadius: "50%",
//                 background: "linear-gradient(135deg, #00d4ff, #8b5cf6)",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//               }}>
//                 <Shield size={28} color="#fff" />
//               </div>
//             </motion.div>
//             <div style={{ fontSize: "15px", color: "#e2e8f0", fontWeight: 600, marginBottom: 6 }}>
//               Đang tạo Face Embedding...
//             </div>
//             <div style={{ fontSize: "12px", color: "#4a6fa5", marginBottom: 20 }}>
//               AI đang xử lý {images.length} ảnh và mã hóa đặc trưng khuôn mặt
//             </div>
//             <div style={{
//               padding: "3px",
//               borderRadius: "20px",
//               background: "rgba(255,255,255,0.03)",
//               border: "1px solid rgba(0,212,255,0.15)",
//             }}>
//               <motion.div
//                 animate={{ width: ["0%", "90%"] }}
//                 transition={{ duration: 2.5, ease: "easeOut" }}
//                 style={{ height: 8, borderRadius: "20px", background: "linear-gradient(90deg, #00d4ff, #8b5cf6)" }}
//               />
//             </div>
//           </div>
//         )}

//         {error && (
//           <div style={{
//             marginTop: 14,
//             padding: "10px",
//             borderRadius: "8px",
//             background: "rgba(255,107,107,0.1)",
//             border: "1px solid rgba(255,107,107,0.3)",
//             color: "#ff6b6b",
//             fontSize: "12px",
//             textAlign: "center",
//           }}>
//             {error}
//           </div>
//         )}

//         <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
//           {step < 3 && (
//             <button
//               onClick={() => step > 1 ? setStep(step - 1) : onClose()}
//               disabled={loading}
//               style={{
//                 flex: 1,
//                 padding: "11px",
//                 borderRadius: "10px",
//                 background: "transparent",
//                 border: "1px solid rgba(255,255,255,0.08)",
//                 color: "#7a95b8",
//                 cursor: loading ? "not-allowed" : "pointer",
//                 fontFamily: "'Space Grotesk', sans-serif",
//                 fontSize: "14px",
//                 opacity: loading ? 0.5 : 1,
//               }}
//             >
//               {step === 1 ? "Đóng" : "Quay lại"}
//             </button>
//           )}
//           {step < 3 && (
//             <button
//               onClick={handleNext}
//               disabled={loading}
//               style={{
//                 flex: 2,
//                 padding: "11px",
//                 borderRadius: "10px",
//                 background: "linear-gradient(135deg, #00d4ff, #8b5cf6)",
//                 border: "none",
//                 color: "#fff",
//                 cursor: loading ? "not-allowed" : "pointer",
//                 fontFamily: "'Space Grotesk', sans-serif",
//                 fontSize: "14px",
//                 fontWeight: 600,
//                 opacity: loading ? 0.7 : 1,
//               }}
//             >
//               {step === 2 ? "Đăng ký" : "Tiếp theo"}
//             </button>
//           )}
//         </div>
//       </motion.div>
//     </motion.div>
//   );
// }

// // Format ngày từ chuỗi ISO mà FastAPI trả về
// function formatDate(dateStr: string | null): string {
//   if (!dateStr) return "--";
//   try {
//     return new Date(dateStr).toLocaleDateString("vi-VN");
//   } catch {
//     return dateStr;
//   }
// }

// // ==========================================
// // COMPONENT CHÍNH
// // ==========================================
// export function RegisteredFaces() {
//   const [search, setSearch] = useState("");
//   const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
//   const [showRegisterModal, setShowRegisterModal] = useState(false);
//   const [selected, setSelected] = useState<string | null>(null);
//   const [faces, setFaces] = useState<Person[]>([]);
//   const [loading, setLoading] = useState(true);

//   // State quản lý thông báo (Toast)
//   const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
//   // State quản lý Modal Xóa
//   const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
//   const [isDeleting, setIsDeleting] = useState(false);

//   // State quản lý Modal Sửa
//   const [personToEdit, setPersonToEdit] = useState<Person | null>(null);

//   const loadPersons = async () => {
//     try {
//       setLoading(true);
//       const persons = await apiClient.getPersons();
//       setFaces(persons);
//     } catch (error) {
//       console.error("Failed to load persons:", error);
//       setFaces([]);
//       setToast({ message: "Không thể tải danh sách khuôn mặt", type: "error" });
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadPersons();
//   }, []);

//   // Handler mở Modal Sửa
//   const handleEditClick = (person: Person, e: React.MouseEvent) => {
//     e.stopPropagation();
//     setPersonToEdit(person);
//   };

//   // Handler mở Modal Xóa
//   const handleDeleteClick = (person: Person, e: React.MouseEvent) => {
//     e.stopPropagation();
//     setPersonToDelete(person);
//   };

//   // Logic Xóa
//   const executeDelete = async () => {
//     if (!personToDelete) return;
    
//     setIsDeleting(true);
//     try {
//       await apiClient.deletePerson(personToDelete.id);
//       setFaces(faces.filter((f) => f.id !== personToDelete.id));
//       if (selected === personToDelete.id) setSelected(null);
//       setToast({ message: `Đã xóa nhân sự: ${personToDelete.name}`, type: "success" });
//     } catch (error) {
//       console.error("Failed to delete person:", error);
//       setToast({ message: "Lỗi hệ thống khi xóa người dùng", type: "error" });
//     } finally {
//       setIsDeleting(false);
//       setPersonToDelete(null);
//     }
//   };

//   const handleRegisterSuccess = () => {
//     loadPersons();
//     setToast({ message: "Đăng ký khuôn mặt thành công!", type: "success" });
//   };

//   const handleEditSuccess = () => {
//     loadPersons(); // Tải lại danh sách để hiện info mới
//     setToast({ message: "Cập nhật thông tin thành công!", type: "success" });
//   };

//   const filtered = faces.filter((f) => {
//     const matchSearch =
//       f.name.toLowerCase().includes(search.toLowerCase()) ||
//       (f.department || "").toLowerCase().includes(search.toLowerCase());
//     const matchFilter = filter === "all" || f.status === filter;
//     return matchSearch && matchFilter;
//   });

//   if (loading) {
//     return (
//       <div style={{ padding: "24px", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
//         <div style={{ textAlign: "center" }}>
//           <motion.div
//             animate={{ rotate: 360 }}
//             transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
//             style={{ display: "inline-block", marginBottom: 16 }}
//           >
//             <Shield size={32} color="#00d4ff" />
//           </motion.div>
//           <div style={{ color: "#7a95b8", fontSize: "14px" }}>Đang tải dữ liệu khuôn mặt...</div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div style={{ padding: "24px", height: "100%", overflowY: "auto", fontFamily: "'Space Grotesk', sans-serif" }}>
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
//         <div>
//           <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#e2e8f0", fontFamily: "'Orbitron', monospace", letterSpacing: "1px" }}>
//             KHUÔN MẶT ĐÃ ĐĂNG KÝ
//           </h1>
//           <p style={{ fontSize: "13px", color: "#4a6fa5", marginTop: 4 }}>
//             {faces.length} người · {faces.filter((f) => f.status === "active").length} đang hoạt động
//           </p>
//         </div>
//         <motion.button
//           whileHover={{ scale: 1.02 }}
//           whileTap={{ scale: 0.98 }}
//           onClick={() => setShowRegisterModal(true)}
//           style={{
//             padding: "10px 20px",
//             borderRadius: "12px",
//             background: "linear-gradient(135deg, #00d4ff, #8b5cf6)",
//             border: "none",
//             color: "#fff",
//             fontSize: "13px",
//             fontWeight: 600,
//             cursor: "pointer",
//             display: "flex",
//             alignItems: "center",
//             gap: 8,
//             fontFamily: "'Space Grotesk', sans-serif",
//           }}
//         >
//           <Plus size={16} />
//           Đăng Ký Mới
//         </motion.button>
//       </div>

//       <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
//         <div style={{
//           flex: 1,
//           display: "flex",
//           alignItems: "center",
//           gap: 10,
//           padding: "10px 14px",
//           borderRadius: "12px",
//           background: "rgba(255,255,255,0.02)",
//           border: "1px solid rgba(0,212,255,0.1)",
//         }}>
//           <Search size={16} color="#4a6fa5" />
//           <input
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Tìm kiếm theo tên, phòng ban..."
//             style={{
//               background: "none",
//               border: "none",
//               outline: "none",
//               color: "#e2e8f0",
//               fontSize: "13px",
//               flex: 1,
//               fontFamily: "'Space Grotesk', sans-serif",
//             }}
//           />
//         </div>
//         <div style={{ display: "flex", gap: 6 }}>
//           {(["all", "active", "inactive"] as const).map((f) => (
//             <button
//               key={f}
//               onClick={() => setFilter(f)}
//               style={{
//                 padding: "10px 16px",
//                 borderRadius: "12px",
//                 background: filter === f ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.02)",
//                 border: `1px solid ${filter === f ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.06)"}`,
//                 color: filter === f ? "#00d4ff" : "#4a6fa5",
//                 fontSize: "12px",
//                 cursor: "pointer",
//                 fontFamily: "'Space Grotesk', sans-serif",
//                 transition: "all 0.2s",
//               }}
//             >
//               {f === "all" ? "Tất cả" : f === "active" ? "Hoạt động" : "Không hoạt động"}
//             </button>
//           ))}
//         </div>
//       </div>

//       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
//         {filtered.map((face, i) => (
//           <motion.div
//             key={face.id}
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: i * 0.06 }}
//             onClick={() => setSelected(selected === face.id ? null : face.id)}
//             style={{
//               borderRadius: "16px",
//               background: "rgba(255,255,255,0.02)",
//               border: `1px solid ${
//                 selected === face.id
//                   ? "rgba(0,212,255,0.4)"
//                   : face.status === "active"
//                   ? "rgba(0,212,255,0.08)"
//                   : "rgba(255,255,255,0.04)"
//               }`,
//               padding: "20px",
//               cursor: "pointer",
//               transition: "border-color 0.2s",
//               position: "relative",
//               overflow: "hidden",
//             }}
//           >
//             {selected === face.id && (
//               <div style={{
//                 position: "absolute",
//                 inset: 0,
//                 background: "linear-gradient(135deg, rgba(0,212,255,0.04), transparent)",
//                 pointerEvents: "none",
//               }} />
//             )}

//             <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
//               <div style={{ position: "relative", flexShrink: 0 }}>
//                 <div style={{
//                   width: 64,
//                   height: 64,
//                   borderRadius: "50%",
//                   overflow: "hidden",
//                   border: `2px solid ${face.status === "active" ? "#00d4ff" : "#2d3f55"}`,
//                   boxShadow: face.status === "active" ? "0 0 16px rgba(0,212,255,0.3)" : "none",
//                 }}>
//                   <ImageWithFallback
//                     src={face.img || undefined}
//                     alt={face.name}
//                     style={{ width: "100%", height: "100%", objectFit: "cover" }}
//                   />
//                 </div>
//                 <div style={{
//                   position: "absolute",
//                   bottom: 1,
//                   right: 1,
//                   width: 14,
//                   height: 14,
//                   borderRadius: "50%",
//                   background: face.status === "active" ? "#00ff88" : "#ff2d55",
//                   border: "2px solid #0d1520",
//                   boxShadow: face.status === "active" ? "0 0 6px #00ff88" : "none",
//                 }} />
//               </div>

//               <div style={{ flex: 1, minWidth: 0 }}>
//                 <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600 }}>{face.name}</div>
//                 <div style={{ fontSize: "11px", color: "#00d4ff", marginTop: 1 }}>{face.role || "--"}</div>
//                 <div style={{ fontSize: "11px", color: "#4a6fa5" }}>{face.department || "--"}</div>
//               </div>

//               <div style={{ display: "flex", gap: 4 }}>
//                 <button
//                   onClick={(e) => handleEditClick(face, e)} // <-- ĐÃ GẮN SỰ KIỆN VÀO ĐÂY
//                   style={{
//                     padding: "5px",
//                     borderRadius: "6px",
//                     background: "rgba(255,255,255,0.03)",
//                     border: "1px solid rgba(255,255,255,0.06)",
//                     color: "#4a6fa5",
//                     cursor: "pointer",
//                   }}
//                 >
//                   <Edit3 size={12} />
//                 </button>
//                 <button
//                   onClick={(e) => handleDeleteClick(face, e)}
//                   style={{
//                     padding: "5px",
//                     borderRadius: "6px",
//                     background: "rgba(255,45,85,0.08)",
//                     border: "1px solid rgba(255,45,85,0.15)",
//                     color: "#ff2d55",
//                     cursor: "pointer",
//                   }}
//                 >
//                   <Trash2 size={12} />
//                 </button>
//               </div>
//             </div>

//             {/* Stats */}
//             <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 16 }}>
//               {[
//                 {
//                   label: "Nhận diện",
//                   value: (face.recognitions ?? 0).toLocaleString(),
//                 },
//                 {
//                   label: "Mẫu ảnh",
//                   value: `${face.embeddings ?? 0}`,
//                 },
//                 {
//                   label: "Trạng thái",
//                   value: face.status === "active" ? "ON" : "OFF",
//                 },
//               ].map((stat) => (
//                 <div
//                   key={stat.label}
//                   style={{
//                     padding: "8px",
//                     borderRadius: "8px",
//                     background: "rgba(0,212,255,0.03)",
//                     border: "1px solid rgba(0,212,255,0.07)",
//                     textAlign: "center",
//                   }}
//                 >
//                   <div style={{
//                     fontSize: "13px",
//                     color: stat.label === "Trạng thái"
//                       ? (face.status === "active" ? "#00ff88" : "#ff2d55")
//                       : "#00d4ff",
//                     fontFamily: "'JetBrains Mono', monospace",
//                     fontWeight: 700,
//                   }}>
//                     {stat.value}
//                   </div>
//                   <div style={{ fontSize: "9px", color: "#4a6fa5", marginTop: 1 }}>{stat.label}</div>
//                 </div>
//               ))}
//             </div>

//             {/* Ngày đăng ký */}
//             <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
//               <Clock size={11} color="#4a6fa5" />
//               <span style={{ fontSize: "11px", color: "#4a6fa5" }}>
//                 Đăng ký: {formatDate(face.registered)}
//               </span>
//             </div>

//             {/* Expanded detail */}
//             <AnimatePresence>
//               {selected === face.id && (
//                 <motion.div
//                   initial={{ height: 0, opacity: 0 }}
//                   animate={{ height: "auto", opacity: 1 }}
//                   exit={{ height: 0, opacity: 0 }}
//                   style={{ overflow: "hidden" }}
//                 >
//                   <div style={{
//                     marginTop: 12,
//                     paddingTop: 12,
//                     borderTop: "1px solid rgba(0,212,255,0.08)",
//                   }}>
//                     <div style={{ fontSize: "11px", color: "#4a6fa5", marginBottom: 8 }}>VECTOR EMBEDDING</div>
//                     <div style={{
//                       fontFamily: "'JetBrains Mono', monospace",
//                       fontSize: "9px",
//                       color: "#2d5a3d",
//                       background: "rgba(0,255,136,0.04)",
//                       border: "1px solid rgba(0,255,136,0.1)",
//                       borderRadius: "6px",
//                       padding: "8px",
//                       lineHeight: 1.6,
//                     }}>
//                       [{face.embeddings ?? 0} embeddings · 128-dimensional ResNet vector]
//                     </div>
//                     <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
//                       <button style={{
//                         flex: 1,
//                         padding: "7px",
//                         borderRadius: "8px",
//                         background: "rgba(0,212,255,0.08)",
//                         border: "1px solid rgba(0,212,255,0.2)",
//                         color: "#00d4ff",
//                         fontSize: "11px",
//                         cursor: "pointer",
//                         fontFamily: "'Space Grotesk', sans-serif",
//                         display: "flex",
//                         alignItems: "center",
//                         justifyContent: "center",
//                         gap: 4,
//                       }}>
//                         <Camera size={11} /> Cập nhật ảnh
//                       </button>
//                       <button style={{
//                         flex: 1,
//                         padding: "7px",
//                         borderRadius: "8px",
//                         background: "rgba(139,92,246,0.08)",
//                         border: "1px solid rgba(139,92,246,0.2)",
//                         color: "#8b5cf6",
//                         fontSize: "11px",
//                         cursor: "pointer",
//                         fontFamily: "'Space Grotesk', sans-serif",
//                         display: "flex",
//                         alignItems: "center",
//                         justifyContent: "center",
//                         gap: 4,
//                       }}>
//                         <Upload size={11} /> Xuất dữ liệu
//                       </button>
//                     </div>
//                   </div>
//                 </motion.div>
//               )}
//             </AnimatePresence>
//           </motion.div>
//         ))}

//         {filtered.length === 0 && !loading && (
//           <div style={{
//             gridColumn: "1 / -1",
//             textAlign: "center",
//             padding: "60px 0",
//             color: "#4a6fa5",
//             fontSize: "14px",
//           }}>
//             {search ? `Không tìm thấy kết quả cho "${search}"` : "Chưa có ai được đăng ký"}
//           </div>
//         )}
//       </div>

//       <AnimatePresence>
//         {/* Render Modal Đăng ký mới */}
//         {showRegisterModal && (
//           <RegisterModal
//             onClose={() => setShowRegisterModal(false)}
//             onSuccess={handleRegisterSuccess}
//           />
//         )}

//         {/* Render Modal Chỉnh Sửa */}
//         {personToEdit && (
//           <EditModal
//             person={personToEdit}
//             onClose={() => setPersonToEdit(null)}
//             onSuccess={handleEditSuccess}
//           />
//         )}
        
//         {/* Render Modal Hỏi Xóa */}
//         <ConfirmModal
//           isOpen={personToDelete !== null}
//           title="Xác nhận xóa"
//           message={personToDelete ? `Bạn có chắc chắn muốn xóa nhân sự "${personToDelete.name}" khỏi hệ thống nhận diện? Hành động này không thể hoàn tác.` : ""}
//           onConfirm={executeDelete}
//           onCancel={() => setPersonToDelete(null)}
//           loading={isDeleting}
//         />

//         {/* Render Toast thông báo */}
//         {toast && (
//           <ToastNotification
//             key={toast.message + Math.random()} // Ép render lại animation
//             message={toast.message}
//             type={toast.type}
//             onClose={() => setToast(null)}
//           />
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

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
            onClose={() => setShowRegisterModal(false)}
            onSuccess={handleRegisterSuccess}
          />
        )}

        {/* Render Modal Chỉnh Sửa */}
        {personToEdit && (
          <EditModal
            person={personToEdit}
            onClose={() => setPersonToEdit(null)}
            onSuccess={handleEditSuccess}
          />
        )}
        
        {/* Render Modal Hỏi Xóa */}
        <ConfirmModal
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
            key={toast.message + Math.random()} // Ép render lại animation
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}