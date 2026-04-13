// import { useState, useRef, useEffect } from "react";
// import { motion, AnimatePresence } from "framer-motion"; // Đã sửa 'motion/react' thành chuẩn 'framer-motion'
// import {
//   X, Upload, Shield, Camera, CreditCard,
//   ChevronRight, Check, AlertTriangle, Info, RefreshCw, QrCode
// } from "lucide-react";
// import { apiClient } from "../services/api";

// // ─── Props ────────────────────────────────────────────────────────────────────
// interface Props {
//   onClose: () => void;
//   onSuccess: () => void;
// }

// // ─── CCCD field definitions ───────────────────────────────────────────────────
// interface CCCDData {
//   id_number: string;
//   full_name: string;
//   dob: string;
//   gender: string;
//   nationality: string;
//   hometown: string;
//   address: string;
//   expiry_date: string;
//   issue_date: string;
//   issued_by: string;
//   special_features: string;
// }

// const CCCD_FIELDS: Array<{
//   key: keyof CCCDData;
//   label: string;
//   placeholder: string;
//   full?: boolean;
// }> = [
//   { key: "full_name",        label: "Họ và tên *",         placeholder: "NGUYỄN VĂN A",                    full: true },
//   { key: "id_number",        label: "Số CCCD / CMND",      placeholder: "0XX XXX XXX XXX" },
//   { key: "dob",              label: "Ngày sinh",           placeholder: "01/01/1990" },
//   { key: "gender",           label: "Giới tính",           placeholder: "Nam / Nữ" },
//   { key: "nationality",      label: "Quốc tịch",           placeholder: "Việt Nam" },
//   { key: "hometown",         label: "Quê quán",            placeholder: "Tỉnh / Thành phố...",             full: true },
//   { key: "address",          label: "Nơi thường trú",      placeholder: "Số nhà, đường, phường, quận, TP", full: true },
//   { key: "expiry_date",      label: "Có giá trị đến",      placeholder: "01/01/2030" },
//   { key: "issue_date",       label: "Ngày cấp",            placeholder: "01/01/2020" },
//   { key: "issued_by",        label: "Nơi cấp",             placeholder: "Cục Cảnh sát QLHC...",            full: true },
//   { key: "special_features", label: "Đặc điểm nhận dạng",  placeholder: "Sẹo, nốt ruồi...",                full: true },
// ];

// // ─── Shared Styles ────────────────────────────────────────────────────────────
// const inputStyle: React.CSSProperties = {
//   width: "100%",
//   padding: "9px 12px",
//   borderRadius: "9px",
//   background: "rgba(255,255,255,0.03)",
//   border: "1px solid rgba(0,212,255,0.15)",
//   color: "#e2e8f0",
//   fontSize: "12px",
//   outline: "none",
//   fontFamily: "'Space Grotesk', sans-serif",
//   boxSizing: "border-box",
//   transition: "border-color 0.2s",
// };

// // ─── Step Indicator ───────────────────────────────────────────────────────────
// function StepIndicator({ current }: { current: number }) {
//   const steps = [
//     { n: 1, label: "CCCD" },
//     { n: 2, label: "Khuôn mặt" },
//     { n: 3, label: "Công việc" },
//   ];
//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 }}>
//       {steps.map((s, i) => (
//         <div key={s.n} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
//           <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
//             <div style={{
//               width: 28, height: 28, borderRadius: "50%",
//               background: current > s.n
//                 ? "linear-gradient(135deg,#00ff88,#00d4ff)"
//                 : current === s.n
//                   ? "linear-gradient(135deg,#00d4ff,#8b5cf6)"
//                   : "rgba(255,255,255,0.05)",
//               border: `2px solid ${current >= s.n ? "transparent" : "rgba(255,255,255,0.1)"}`,
//               display: "flex", alignItems: "center", justifyContent: "center",
//               fontSize: "11px", fontWeight: 700,
//               color: current >= s.n ? "#000" : "#3a5070",
//               transition: "all 0.3s",
//             }}>
//               {current > s.n ? <Check size={13} /> : s.n}
//             </div>
//             <span style={{ fontSize: "9px", color: current >= s.n ? "#7ab8d4" : "#2a4060", whiteSpace: "nowrap" }}>
//               {s.label}
//             </span>
//           </div>
//           {i < steps.length - 1 && (
//             <div style={{
//               flex: 1, height: 2, marginBottom: 14, marginLeft: 6, marginRight: 6,
//               background: current > s.n
//                 ? "linear-gradient(90deg,#00ff88,#00d4ff)"
//                 : "rgba(255,255,255,0.06)",
//               transition: "background 0.4s",
//             }} />
//           )}
//         </div>
//       ))}
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // STEP 1 — CCCD Upload + OCR Scan
// // ═════════════════════════════════════════════════════════════════════════════
// function StepCCCD({
//   onNext,
// }: {
//   onNext: (data: Partial<CCCDData>, front: File | null, back: File | null) => void;
// }) {
//   const [cccd, setCccd] = useState<Partial<CCCDData>>({ nationality: "Việt Nam" });
//   const [frontImg, setFrontImg] = useState<string>();
//   const [backImg, setBackImg] = useState<string>();
//   const [frontFile, setFrontFile] = useState<File | null>(null);
//   const [backFile, setBackFile] = useState<File | null>(null);

//   const [frontScanning, setFrontScanning] = useState(false);
//   const [frontMsg, setFrontMsg] = useState("");
//   const [frontStatus, setFrontStatus] = useState<"idle" | "ok" | "fail">("idle");

//   const [backScanning, setBackScanning] = useState(false);
//   const [backMsg, setBackMsg] = useState("");
//   const [backStatus, setBackStatus] = useState<"idle" | "ok" | "fail">("idle");

//   const frontRef = useRef<HTMLInputElement>(null);
//   const backRef = useRef<HTMLInputElement>(null);

//   // ── Mặt trước ──────────────────────────────────────────────────────────────
//   const handleFront = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     // Kiểm tra định dạng (Chống lỗi HEIC)
//     if (!file.type.match(/^image\/(jpeg|png|webp|jpg)$/i)) {
//       setFrontStatus("fail");
//       setFrontMsg("Chỉ hỗ trợ JPG, PNG, WEBP. Nếu dùng iPhone, hãy chuyển sang JPG.");
//       return;
//     }

//     setFrontFile(file);
//     setFrontImg(URL.createObjectURL(file));
//     setFrontScanning(true);
//     setFrontMsg("AI đang phân tích mặt trước...");
//     setFrontStatus("idle");

//     try {
//       const response = await apiClient.extractOCR(file, "front");
//       if (response.success && response.data && Object.keys(response.data).length > 0) {
//         setCccd((prev) => ({ ...prev, ...response.data }));
//         setFrontStatus("ok");
//         setFrontMsg("✓ Thành công!");
//       } else {
//         setFrontStatus("fail");
//         setFrontMsg("Ảnh mờ hoặc sai mặt, hãy thử lại.");
//       }
//     } catch {
//       setFrontStatus("fail");
//       setFrontMsg("Lỗi kết nối AI.");
//     } finally {
//       setFrontScanning(false);
//       e.target.value = ""; // Reset để chọn lại cùng ảnh
//     }
//   };

//   // ── Mặt sau ────────────────────────────────────────────────────────────────
//   const handleBack = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     // Kiểm tra định dạng (Chống lỗi HEIC)
//     if (!file.type.match(/^image\/(jpeg|png|webp|jpg)$/i)) {
//       setBackStatus("fail");
//       setBackMsg("Chỉ hỗ trợ JPG, PNG, WEBP. Nếu dùng iPhone, hãy chuyển sang JPG.");
//       return;
//     }

//     setBackFile(file);
//     setBackImg(URL.createObjectURL(file));
//     setBackScanning(true);
//     setBackMsg("AI đang quét mặt sau...");
//     setBackStatus("idle");

//     try {
//       const response = await apiClient.extractOCR(file, "back");
//       if (response.success && response.data) {
//         const { issue_date, issued_by, special_features } = response.data;

//         setCccd((prev) => ({
//           ...prev,
//           ...(issue_date       && { issue_date }),
//           ...(issued_by        && { issued_by }),
//           ...(special_features && { special_features }),
//         }));

//         const hasData = issue_date || issued_by || special_features;
//         if (hasData) {
//           setBackStatus("ok");
//           setBackMsg("✓ Đã lấy dữ liệu mặt sau.");
//         } else {
//           setBackStatus("fail");
//           setBackMsg("Không tìm thấy thông tin, kiểm tra ảnh lại.");
//         }
//       } else {
//         setBackStatus("fail");
//         setBackMsg("Phản hồi không hợp lệ từ server.");
//       }
//     } catch {
//       setBackStatus("fail");
//       setBackMsg("Lỗi khi quét mặt sau.");
//     } finally {
//       setBackScanning(false);
//       e.target.value = ""; // Reset để chọn lại cùng ảnh
//     }
//   };

//   const canNext = !!cccd.full_name?.trim();

//   const getBoxStyle = (status: string, hasImg: boolean | undefined) => ({
//     border: `2px dashed ${
//       status === "ok"   ? "rgba(0,255,136,0.5)"  :
//       status === "fail" ? "rgba(255,200,0,0.4)"  :
//       hasImg            ? "rgba(0,212,255,0.4)"  :
//                           "rgba(0,212,255,0.15)"
//     }`,
//     background: hasImg ? "transparent" : "rgba(0,212,255,0.03)",
//   });

//   const StatusBadge = ({
//     status,
//     scanning,
//     color,
//   }: {
//     status: string;
//     scanning: boolean;
//     color: string;
//   }) => (
//     <div
//       style={{
//         position: "absolute", top: 4, right: 4,
//         width: 18, height: 18, borderRadius: "50%",
//         background:
//           status === "ok"   ? "#00ff88" :
//           status === "fail" ? "#ffc800" :
//           color,
//         display: "flex", alignItems: "center", justifyContent: "center",
//         boxShadow: `0 0 8px ${status === "ok" ? "#00ff88" : status === "fail" ? "#ffc800" : color}`,
//       }}
//     >
//       {status === "ok"   ? <Check size={10} color="#000" /> :
//        status === "fail" ? <AlertTriangle size={9} color="#000" /> :
//        scanning          ? <RefreshCw size={9} color="#fff" style={{ animation: "spin 1s linear infinite" }} /> :
//                            null}
//     </div>
//   );

//   return (
//     <div>
//       <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

//       <div style={{ fontSize: "12px", color: "#4a6fa5", marginBottom: 14 }}>
//         Chụp CCCD — AI sẽ tự động bóc tách dữ liệu và điền vào form ⚡
//       </div>

//       {/* ── Hai ô upload ─────────────────────────────────────────────────── */}
//       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
//         {/* Mặt trước */}
//         <div>
//           <div style={{ fontSize: "11px", color: "#4a6fa5", marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}>
//             <QrCode size={11} color="#00d4ff" /> Mặt trước
//           </div>
//           <div
//             onClick={() => frontRef.current?.click()}
//             style={{
//               aspectRatio: "85.6/54", borderRadius: "10px", overflow: "hidden",
//               cursor: "pointer", position: "relative",
//               display: "flex", alignItems: "center", justifyContent: "center",
//               transition: "all 0.3s", ...getBoxStyle(frontStatus, !!frontImg),
//             }}
//           >
//             {/* VÁ LỖI CỐT LÕI: Ép chuẩn file ảnh, chặn click đúp */}
//             <input
//               ref={frontRef} type="file" accept="image/jpeg, image/png, image/webp" style={{ display: "none" }}
//               onChange={handleFront} onClick={(e) => e.stopPropagation()}
//             />
//             {frontImg ? (
//               <>
//                 <img src={frontImg} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="CCCD mặt trước" />
//                 {frontScanning && (
//                   <motion.div
//                     animate={{ top: ["0%", "100%", "0%"] }}
//                     transition={{ duration: 1.5, repeat: Infinity }}
//                     style={{ position: "absolute", left: 0, right: 0, height: 2, background: "#00d4ff", boxShadow: "0 0 8px #00d4ff" }}
//                   />
//                 )}
//                 <StatusBadge status={frontStatus} scanning={frontScanning} color="rgba(0,212,255,0.8)" />
//               </>
//             ) : (
//               <div style={{ textAlign: "center", pointerEvents: "none" }}>
//                 <QrCode size={22} color="#2a5060" />
//                 <div style={{ fontSize: "8px", color: "#2a5060", marginTop: 4 }}>Chọn mặt trước</div>
//               </div>
//             )}
//           </div>
//           <div style={{ marginTop: 4, fontSize: "10px", minHeight: 14, color: frontStatus === "ok" ? "#00ff88" : frontStatus === "fail" ? "#ffc800" : "#00d4ff" }}>
//             {frontMsg}
//           </div>
//         </div>

//         {/* Mặt sau */}
//         <div>
//           <div style={{ fontSize: "11px", color: "#4a6fa5", marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}>
//             <CreditCard size={11} color="#8b5cf6" /> Mặt sau
//           </div>
//           <div
//             onClick={() => backRef.current?.click()}
//             style={{
//               aspectRatio: "85.6/54", borderRadius: "10px", overflow: "hidden",
//               cursor: "pointer", position: "relative",
//               display: "flex", alignItems: "center", justifyContent: "center",
//               transition: "all 0.3s", ...getBoxStyle(backStatus, !!backImg),
//             }}
//           >
//             {/* VÁ LỖI CỐT LÕI: Ép chuẩn file ảnh, chặn click đúp */}
//             <input
//               ref={backRef} type="file" accept="image/jpeg, image/png, image/webp" style={{ display: "none" }}
//               onChange={handleBack} onClick={(e) => e.stopPropagation()}
//             />
//             {backImg ? (
//               <>
//                 <img src={backImg} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="CCCD mặt sau" />
//                 {backScanning && (
//                   <motion.div
//                     animate={{ top: ["0%", "100%", "0%"] }}
//                     transition={{ duration: 1.5, repeat: Infinity }}
//                     style={{ position: "absolute", left: 0, right: 0, height: 2, background: "#8b5cf6", boxShadow: "0 0 8px #8b5cf6" }}
//                   />
//                 )}
//                 <StatusBadge status={backStatus} scanning={backScanning} color="rgba(139,92,246,0.8)" />
//               </>
//             ) : (
//               <div style={{ textAlign: "center", pointerEvents: "none" }}>
//                 <Upload size={20} color="#2a3050" />
//                 <div style={{ fontSize: "8px", color: "#2a3050", marginTop: 4 }}>Chọn mặt sau</div>
//               </div>
//             )}
//           </div>
//           <div style={{ marginTop: 4, fontSize: "10px", minHeight: 14, color: backStatus === "ok" ? "#00ff88" : backStatus === "fail" ? "#ffc800" : "#8b5cf6" }}>
//             {backMsg}
//           </div>
//         </div>
//       </div>

//       {/* ── Banner hướng dẫn nếu chưa scan được full ─────────────────────── */}
//       {(frontStatus === "fail" || backStatus === "fail") && (
//         <motion.div
//           initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
//           style={{ marginBottom: 12, padding: "8px 12px", borderRadius: "8px", background: "rgba(255,200,0,0.06)", border: "1px solid rgba(255,200,0,0.2)", fontSize: "11px", color: "#ffc800", display: "flex", gap: 6, alignItems: "flex-start" }}
//         >
//           <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
//           <span>Một số thông tin chưa đọc được — hãy chụp ảnh rõ nét, đủ sáng và kiểm tra lại form bên dưới.</span>
//         </motion.div>
//       )}

//       {/* ── Form kiểm tra thông tin ──────────────────────────────────────── */}
//       <div style={{ background: "rgba(0,200,80,0.03)", border: "1px solid rgba(0,200,80,0.1)", borderRadius: "12px", padding: "14px", marginBottom: 16 }}>
//         <div style={{ fontSize: "11px", color: "#00c840", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
//           <Info size={11} /> Kiểm tra và bổ sung thông tin nếu cần
//         </div>
//         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
//           {CCCD_FIELDS.map((f) => (
//             <div key={f.key} style={{ gridColumn: f.full ? "1/-1" : "auto" }}>
//               <label style={{ fontSize: "10px", color: "#4a8a5a", display: "block", marginBottom: 3 }}>
//                 {f.label}
//               </label>
//               <input
//                 value={cccd[f.key] || ""}
//                 onChange={(e) => setCccd((p) => ({ ...p, [f.key]: e.target.value }))}
//                 placeholder={f.placeholder}
//                 style={{
//                   ...inputStyle,
//                   borderColor:
//                     f.key === "full_name" && cccd.full_name
//                       ? "rgba(0,255,136,0.3)"
//                       : cccd[f.key]
//                         ? "rgba(0,212,255,0.25)"
//                         : "rgba(0,212,255,0.1)",
//                 }}
//               />
//             </div>
//           ))}
//         </div>
//       </div>

//       <button
//         onClick={() => onNext(cccd, frontFile, backFile)}
//         disabled={!canNext}
//         style={{
//           width: "100%", padding: "12px", borderRadius: "12px",
//           background: canNext ? "linear-gradient(135deg,#00c840,#00d4ff)" : "rgba(255,255,255,0.04)",
//           border: "none",
//           color: canNext ? "#fff" : "#2d4060",
//           cursor: canNext ? "pointer" : "not-allowed",
//           fontSize: "13px", fontWeight: 600,
//           display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
//           transition: "all 0.2s",
//         }}
//       >
//         Tiếp theo — Hình ảnh khuôn mặt <ChevronRight size={15} />
//       </button>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // STEP 2 — Face Capture (Webcam OR Upload)
// // ═════════════════════════════════════════════════════════════════════════════
// function StepFace({
//   onNext,
//   onBack,
// }: {
//   onNext: (files: File[]) => void;
//   onBack: () => void;
// }) {
//   const [mode, setMode] = useState<"choose" | "webcam" | "upload">("choose");
//   const [files, setFiles] = useState<File[]>([]);
//   const [previews, setPreviews] = useState<string[]>([]);
//   const fileRef = useRef<HTMLInputElement>(null);
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const [camActive, setCamActive] = useState(false);
//   const [camError, setCamError] = useState("");

//   useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

//   const startWebcam = async () => {
//     setCamError("");
//     try {
//       const s = await navigator.mediaDevices.getUserMedia({
//         video: { width: 640, height: 480, facingMode: "user" },
//       });
//       streamRef.current = s;
//       if (videoRef.current) {
//         videoRef.current.srcObject = s;
//         await videoRef.current.play();
//       }
//       setCamActive(true);
//     } catch {
//       setCamError("Không thể truy cập Camera. Hãy kiểm tra quyền trình duyệt.");
//     }
//   };

//   const stopWebcam = () => {
//     streamRef.current?.getTracks().forEach((t) => t.stop());
//     streamRef.current = null;
//     setCamActive(false);
//   };

//   const snapPhoto = () => {
//     if (!videoRef.current || !canvasRef.current || files.length >= 5) return;
//     const c = canvasRef.current;
//     c.width = 640;
//     c.height = 480;
//     const ctx = c.getContext("2d")!;
//     ctx.scale(-1, 1);
//     ctx.drawImage(videoRef.current, -640, 0, 640, 480);
//     const url = c.toDataURL("image/jpeg", 0.9);
//     c.toBlob((blob) => {
//       const f = new File([blob!], `face_${Date.now()}.jpg`, { type: "image/jpeg" });
//       setFiles((p) => [...p, f]);
//       setPreviews((p) => [...p, url]);
//     }, "image/jpeg", 0.9);
//   };

//   const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const fs = Array.from(e.target.files || [])
//       // VÁ LỖI CỐT LÕI: Lọc sạch file rác/HEIC ngay lập tức
//       .filter((f) => f.type.match(/^image\/(jpeg|png|webp|jpg)$/i))
//       .slice(0, 5 - files.length);
      
//     setFiles((p) => [...p, ...fs]);
//     fs.forEach((f) => {
//       const r = new FileReader();
//       r.onload = (ev) => setPreviews((p) => [...p, ev.target?.result as string]);
//       r.readAsDataURL(f);
//     });
//     e.target.value = "";
//   };

//   const removeFile = (i: number) => {
//     setFiles((p) => p.filter((_, j) => j !== i));
//     setPreviews((p) => p.filter((_, j) => j !== i));
//   };

//   if (mode === "choose") {
//     return (
//       <div>
//         <div style={{ fontSize: "12px", color: "#4a6fa5", marginBottom: 16 }}>
//           Cung cấp ít nhất 1 ảnh khuôn mặt để nhận diện (tối đa 5 ảnh)
//         </div>
//         <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
//           {[
//             { id: "webcam", emoji: "📷", title: "Chụp ảnh trực tiếp", sub: "Mở Webcam/Camera chụp ngay tại chỗ", color: "#00d4ff" },
//             { id: "upload", emoji: "🖼️", title: "Tải ảnh có sẵn",    sub: "Upload file ảnh rõ nét từ thiết bị",  color: "#8b5cf6" },
//           ].map((m) => (
//             <motion.div
//               key={m.id}
//               whileHover={{ x: 4 }}
//               whileTap={{ scale: 0.98 }}
//               onClick={() => setMode(m.id as "webcam" | "upload")}
//               style={{
//                 display: "flex", alignItems: "center", gap: 14,
//                 padding: "14px 16px", borderRadius: "14px",
//                 background: `${m.color}06`, border: `1px solid ${m.color}18`,
//                 cursor: "pointer",
//               }}
//             >
//               <span style={{ fontSize: "26px" }}>{m.emoji}</span>
//               <div style={{ flex: 1 }}>
//                 <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600 }}>{m.title}</div>
//                 <div style={{ fontSize: "11px", color: "#4a6fa5" }}>{m.sub}</div>
//               </div>
//               <ChevronRight size={16} color={m.color} />
//             </motion.div>
//           ))}
//         </div>
//         <button
//           onClick={onBack}
//           style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#7a95b8", fontSize: "12px", cursor: "pointer" }}
//         >
//           ← Quay lại bước trước
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div>
//       <div
//         style={{
//           position: "relative", borderRadius: "16px", overflow: "hidden",
//           background: "#020408", aspectRatio: "4/3",
//           border: "2px solid rgba(0,212,255,0.2)", marginBottom: 12,
//         }}
//       >
//         {mode === "webcam" ? (
//           <>
//             <video
//               ref={videoRef} autoPlay playsInline muted
//               style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
//             />
//             <canvas ref={canvasRef} style={{ display: "none" }} />

//             {!camActive ? (
//               <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
//                 {camError && (
//                   <div style={{ color: "#ffc800", fontSize: "11px", textAlign: "center", padding: "0 20px" }}>{camError}</div>
//                 )}
//                 <button
//                   onClick={startWebcam}
//                   style={{ padding: "12px 24px", borderRadius: "12px", background: "#00d4ff", border: "none", color: "#000", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
//                 >
//                   <Camera size={18} /> Bật Camera
//                 </button>
//               </div>
//             ) : (
//               <>
//                 {[
//                   { top: 8, left: 8, borderTop: "2px solid #00d4ff", borderLeft: "2px solid #00d4ff" },
//                   { top: 8, right: 8, borderTop: "2px solid #00d4ff", borderRight: "2px solid #00d4ff" },
//                   { bottom: 8, left: 8, borderBottom: "2px solid #00d4ff", borderLeft: "2px solid #00d4ff" },
//                   { bottom: 8, right: 8, borderBottom: "2px solid #00d4ff", borderRight: "2px solid #00d4ff" },
//                 ].map((s, i) => (
//                   <div key={i} style={{ position: "absolute", width: 20, height: 20, ...s }} />
//                 ))}

//                 <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 10 }}>
//                   <button
//                     onClick={snapPhoto}
//                     disabled={files.length >= 5}
//                     style={{
//                       padding: "10px 24px", borderRadius: "20px",
//                       background: files.length < 5 ? "#00ff88" : "#333",
//                       border: "none", fontWeight: 700, cursor: files.length < 5 ? "pointer" : "not-allowed",
//                     }}
//                   >
//                     📸 Chụp ({files.length}/5)
//                   </button>
//                   <button
//                     onClick={stopWebcam}
//                     style={{ padding: "10px 16px", borderRadius: "20px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "#e2e8f0", cursor: "pointer" }}
//                   >
//                     Dừng
//                   </button>
//                 </div>
//               </>
//             )}
//           </>
//         ) : (
//           <div
//             onClick={() => fileRef.current?.click()}
//             style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 8 }}
//           >
//             {/* VÁ LỖI CỐT LÕI: Ép chuẩn file ảnh, chặn click đúp */}
//             <input 
//               ref={fileRef} 
//               type="file" 
//               multiple 
//               accept="image/jpeg, image/png, image/webp" 
//               onChange={handleUpload} 
//               onClick={(e) => e.stopPropagation()} 
//               style={{ display: "none" }} 
//             />
//             <Upload size={32} color="#8b5cf6" />
//             <div style={{ color: "#e2e8f0", fontSize: "14px" }}>Chọn ảnh khuôn mặt ({files.length}/5)</div>
//             <div style={{ fontSize: "11px", color: "#4a6fa5" }}>Hỗ trợ JPG, PNG, WEBP</div>
//           </div>
//         )}
//       </div>

//       {previews.length > 0 && (
//         <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
//           {previews.map((src, i) => (
//             <motion.div
//               key={i}
//               initial={{ scale: 0.8, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               style={{ position: "relative", width: 56, height: 56, borderRadius: "8px", overflow: "hidden", border: "1px solid #00d4ff" }}
//             >
//               <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={`face-${i}`} />
//               <button
//                 onClick={() => removeFile(i)}
//                 style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.7)", border: "none", cursor: "pointer", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
//               >
//                 <X size={10} color="#ff6b6b" />
//               </button>
//             </motion.div>
//           ))}
//         </div>
//       )}

//       <div style={{ display: "flex", gap: 8 }}>
//         <button
//           onClick={() => { stopWebcam(); setMode("choose"); }}
//           style={{ flex: 1, padding: "10px", borderRadius: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#7a95b8", cursor: "pointer" }}
//         >
//           ← Chọn lại
//         </button>
//         <button
//           onClick={() => onNext(files)}
//           disabled={files.length === 0}
//           style={{
//             flex: 2, padding: "10px", borderRadius: "10px",
//             background: files.length > 0 ? "#00d4ff" : "#1a2a3a",
//             border: "none",
//             color: files.length > 0 ? "#000" : "#4a6fa5",
//             fontWeight: 700, cursor: files.length > 0 ? "pointer" : "not-allowed",
//           }}
//         >
//           Tiếp theo →
//         </button>
//       </div>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // STEP 3 — Thông tin công việc
// // ═════════════════════════════════════════════════════════════════════════════
// function StepInfo({
//   defaultName,
//   onSubmit,
//   onBack,
//   submitting,
//   error,
// }: {
//   defaultName: string;
//   onSubmit: (data: { name: string; role: string; dept: string; expiry: string }) => void;
//   onBack: () => void;
//   submitting: boolean;
//   error: string;
// }) {
//   const [name,   setName]   = useState(defaultName);
//   const [role,   setRole]   = useState("");
//   const [dept,   setDept]   = useState("");
//   const [expiry, setExpiry] = useState("");

//   const fields = [
//     { label: "Họ và tên *",                       value: name,   setter: setName,   placeholder: "NGUYỄN VĂN A",       type: "text",   required: true },
//     { label: "Chức vụ",                           value: role,   setter: setRole,   placeholder: "Kỹ sư, Quản lý...",  type: "text",   required: false },
//     { label: "Phòng ban",                         value: dept,   setter: setDept,   placeholder: "Kỹ thuật, Nhân sự...",type: "text",   required: false },
//     { label: "Hết hạn làm việc (để trống nếu vĩnh viễn)", value: expiry, setter: setExpiry, placeholder: "",                    type: "date",   required: false },
//   ];

//   return (
//     <div>
//       <div style={{ fontSize: "12px", color: "#4a6fa5", marginBottom: 14 }}>
//         Thông tin công việc và thời hạn làm việc
//       </div>

//       <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
//         {fields.map((f) => (
//           <div key={f.label}>
//             <label style={{ fontSize: "12px", color: "#4a6fa5", display: "block", marginBottom: 4 }}>
//               {f.label}
//             </label>
//             <input
//               type={f.type}
//               value={f.value}
//               onChange={(e) => f.setter(e.target.value)}
//               placeholder={f.placeholder}
//               style={{
//                 ...inputStyle,
//                 borderColor: f.required && f.value ? "rgba(0,255,136,0.3)" : "rgba(0,212,255,0.15)",
//               }}
//             />
//           </div>
//         ))}
//       </div>

//       {error && (
//         <motion.div
//           initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
//           style={{ marginBottom: 12, padding: "8px 12px", borderRadius: "8px", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", color: "#ff6b6b", fontSize: "12px", display: "flex", gap: 6, alignItems: "center" }}
//         >
//           <AlertTriangle size={12} /> {error}
//         </motion.div>
//       )}

//       <div style={{ display: "flex", gap: 10 }}>
//         <button
//           onClick={onBack}
//           disabled={submitting}
//           style={{ flex: 1, padding: "11px", borderRadius: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#7a95b8", cursor: submitting ? "not-allowed" : "pointer" }}
//         >
//           ← Quay lại
//         </button>
//         <button
//           onClick={() => onSubmit({ name, role, dept, expiry })}
//           disabled={!name.trim() || submitting}
//           style={{
//             flex: 2, padding: "11px", borderRadius: "10px",
//             background: !name.trim() || submitting ? "rgba(255,255,255,0.04)" : "#00ff88",
//             border: "none",
//             color: !name.trim() || submitting ? "#2d4060" : "#000",
//             fontWeight: 700,
//             cursor: !name.trim() || submitting ? "not-allowed" : "pointer",
//             display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
//           }}
//         >
//           {submitting ? (
//             <>
//               <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
//               Đang xử lý...
//             </>
//           ) : (
//             <>
//               <Check size={14} /> Hoàn tất Đăng ký
//             </>
//           )}
//         </button>
//       </div>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // Step 4 — Loading Screen
// // ═════════════════════════════════════════════════════════════════════════════
// function StepLoading() {
//   const [dot, setDot] = useState(0);
//   useEffect(() => {
//     const t = setInterval(() => setDot((d) => (d + 1) % 4), 400);
//     return () => clearInterval(t);
//   }, []);

//   return (
//     <div style={{ textAlign: "center", padding: "50px 0" }}>
//       <motion.div
//         animate={{ rotate: 360 }}
//         transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
//         style={{ display: "inline-block", marginBottom: 20 }}
//       >
//         <Shield size={52} color="#00d4ff" />
//       </motion.div>
//       <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "15px", marginBottom: 6 }}>
//         Đang lưu trữ dữ liệu{"...".slice(0, dot)}
//       </div>
//       <div style={{ color: "#4a6fa5", fontSize: "12px" }}>
//         Vui lòng không đóng cửa sổ này
//       </div>
//       {/* Progress bar giả */}
//       <div style={{ marginTop: 24, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.05)", overflow: "hidden", width: "60%", margin: "24px auto 0" }}>
//         <motion.div
//           animate={{ x: ["-100%", "200%"] }}
//           transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
//           style={{ height: "100%", width: "50%", background: "linear-gradient(90deg, transparent, #00d4ff, transparent)", borderRadius: 4 }}
//         />
//       </div>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // Main RegisterModal
// // ═════════════════════════════════════════════════════════════════════════════
// export function RegisterModal({ onClose, onSuccess }: Props) {
//   const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
//   const [cccdData, setCccdData] = useState<Partial<CCCDData>>({});
//   const [cccdFront, setCccdFront] = useState<File | null>(null);
//   const [cccdBack, setCccdBack] = useState<File | null>(null);
//   const [faceFiles, setFaceFiles] = useState<File[]>([]);
//   const [submitting, setSubmitting] = useState(false);
//   const [error, setError] = useState("");

//   const stepLabels = ["", "Thông tin CCCD", "Ảnh khuôn mặt", "Thông tin công việc", "Đang hoàn tất"];

//   const handleSubmit = async (info: { name: string; role: string; dept: string; expiry: string }) => {    
//     try {
//       setError("");
//       setSubmitting(true);
//       setStep(4);

//       const fd = new FormData();
//       fd.append("name",       info.name);
//       fd.append("role",       info.role);
//       fd.append("department", info.dept);
//       if (info.expiry) fd.append("work_expiry_date", info.expiry);
//       if (cccdFront)   fd.append("cccd_front", cccdFront);
//       if (cccdBack)    fd.append("cccd_back",  cccdBack);
//       fd.append("cccd_info", JSON.stringify(cccdData));
//       faceFiles.forEach((f) => fd.append("images", f));

//       await apiClient.registerFace(fd);
//       onSuccess();
//       onClose();
//     } catch (err: any) {
//       const msg = err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Đăng ký thất bại, vui lòng kiểm tra lại.";
//       setError(msg);
//       setStep(3);
//       setSubmitting(false);
//     }
//   };

//   // Chặn đóng modal khi đang submit
//   const handleClose = () => {
//     if (submitting) return;
//     onClose();
//   };

//   return (
//     <motion.div
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       exit={{ opacity: 0 }}
//       onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
//       style={{
//         position: "fixed", inset: 0,
//         background: "rgba(0,0,0,0.9)",
//         backdropFilter: "blur(15px)",
//         display: "flex", alignItems: "center", justifyContent: "center",
//         zIndex: 300, padding: 16,
//       }}
//     >
//       <motion.div
//         initial={{ scale: 0.9, y: 20 }}
//         animate={{ scale: 1, y: 0 }}
//         exit={{ scale: 0.9, y: 20 }}
//         style={{
//           width: "100%", maxWidth: 580,
//           maxHeight: "95vh", overflowY: "auto",
//           background: "#07101a",
//           border: "1px solid rgba(0,212,255,0.2)",
//           borderRadius: "24px",
//           padding: "24px",
//           scrollbarWidth: "none",
//         }}
//       >
//         {/* ── Header ──────────────────────────────────────────────────────── */}
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
//           <div>
//             <h2 style={{ fontSize: "16px", color: "#e2e8f0", margin: 0, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.05em" }}>
//               ĐĂNG KÝ NHÂN VIÊN MỚI
//             </h2>
//             <p style={{ fontSize: "11px", color: "#4a6fa5", margin: "2px 0 0" }}>
//               {step < 4 ? `Bước ${step}/3 — ${stepLabels[step]}` : stepLabels[4]}
//             </p>
//           </div>
//           {!submitting && (
//             <button
//               onClick={handleClose}
//               style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", cursor: "pointer", color: "#4a6fa5", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}
//             >
//               <X size={18} />
//             </button>
//           )}
//         </div>

//         {/* ── Step indicator ────────────────────────────────────────────── */}
//         {step < 4 && <StepIndicator current={step} />}

//         {/* ── Step content ──────────────────────────────────────────────── */}
//         <AnimatePresence mode="wait">
//           {step === 1 && (
//             <motion.div key="s1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
//               <StepCCCD
//                 onNext={(d, f, b) => {
//                   setCccdData(d);
//                   setCccdFront(f);
//                   setCccdBack(b);
//                   setStep(2);
//                 }}
//               />
//             </motion.div>
//           )}

//           {step === 2 && (
//             <motion.div key="s2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
//               <StepFace
//                 onNext={(f) => { setFaceFiles(f); setStep(3); }}
//                 onBack={() => setStep(1)}
//               />
//             </motion.div>
//           )}

//           {step === 3 && (
//             <motion.div key="s3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
//               <StepInfo
//                 defaultName={cccdData.full_name || ""}
//                 onSubmit={handleSubmit}
//                 onBack={() => setStep(2)}
//                 submitting={submitting}
//                 error={error}
//               />
//             </motion.div>
//           )}

//           {step === 4 && (
//             <motion.div key="s4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
//               <StepLoading />
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </motion.div>
//     </motion.div>
//   );
// }
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Upload, Shield, Camera, CreditCard,
  ChevronRight, Check, AlertTriangle, Info, RefreshCw, QrCode
} from "lucide-react";
import { apiClient } from "../services/api";

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

// ─── CCCD field definitions ───────────────────────────────────────────────────
interface CCCDData {
  id_number: string;
  full_name: string;
  dob: string;
  gender: string;
  nationality: string;
  hometown: string;
  address: string;
  expiry_date: string;
  issue_date: string;
  issued_by: string;
  special_features: string;
}

const CCCD_FIELDS: Array<{
  key: keyof CCCDData;
  label: string;
  placeholder: string;
  full?: boolean;
}> = [
  { key: "full_name",        label: "Họ và tên *",         placeholder: "NGUYỄN VĂN A",                    full: true },
  { key: "id_number",        label: "Số CCCD / CMND",      placeholder: "0XX XXX XXX XXX" },
  { key: "dob",              label: "Ngày sinh",            placeholder: "01/01/1990" },
  { key: "gender",           label: "Giới tính",            placeholder: "Nam / Nữ" },
  { key: "nationality",      label: "Quốc tịch",            placeholder: "Việt Nam" },
  { key: "hometown",         label: "Quê quán",             placeholder: "Tỉnh / Thành phố...",             full: true },
  { key: "address",          label: "Nơi thường trú",       placeholder: "Số nhà, đường, phường, quận, TP", full: true },
  { key: "expiry_date",      label: "Có giá trị đến",       placeholder: "01/01/2030" },
  { key: "issue_date",       label: "Ngày cấp",             placeholder: "01/01/2020" },
  { key: "issued_by",        label: "Nơi cấp",              placeholder: "Cục Cảnh sát QLHC...",            full: true },
  { key: "special_features", label: "Đặc điểm nhận dạng",  placeholder: "Sẹo, nốt ruồi...",                full: true },
];

// ─── Shared Styles ────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "9px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(0,212,255,0.15)",
  color: "#e2e8f0",
  fontSize: "12px",
  outline: "none",
  fontFamily: "'Space Grotesk', sans-serif",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  const steps = [
    { n: 1, label: "CCCD" },
    { n: 2, label: "Khuôn mặt" },
    { n: 3, label: "Công việc" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 }}>
      {steps.map((s, i) => (
        <div key={s.n} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: current > s.n
                ? "linear-gradient(135deg,#00ff88,#00d4ff)"
                : current === s.n
                  ? "linear-gradient(135deg,#00d4ff,#8b5cf6)"
                  : "rgba(255,255,255,0.05)",
              border: `2px solid ${current >= s.n ? "transparent" : "rgba(255,255,255,0.1)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", fontWeight: 700,
              color: current >= s.n ? "#000" : "#3a5070",
              transition: "all 0.3s",
            }}>
              {current > s.n ? <Check size={13} /> : s.n}
            </div>
            <span style={{ fontSize: "9px", color: current >= s.n ? "#7ab8d4" : "#2a4060", whiteSpace: "nowrap" }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 2, marginBottom: 14, marginLeft: 6, marginRight: 6,
              background: current > s.n
                ? "linear-gradient(90deg,#00ff88,#00d4ff)"
                : "rgba(255,255,255,0.06)",
              transition: "background 0.4s",
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 1 — CCCD Upload + OCR Scan
// ═════════════════════════════════════════════════════════════════════════════
function StepCCCD({
  onNext,
}: {
  onNext: (data: Partial<CCCDData>, front: File | null, back: File | null) => void;
}) {
  const [cccd, setCccd] = useState<Partial<CCCDData>>({ nationality: "Việt Nam" });
  const [frontImg, setFrontImg] = useState<string>();
  const [backImg, setBackImg] = useState<string>();
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  const [frontScanning, setFrontScanning] = useState(false);
  const [frontMsg, setFrontMsg] = useState("");
  const [frontStatus, setFrontStatus] = useState<"idle" | "ok" | "fail">("idle");

  const [backScanning, setBackScanning] = useState(false);
  const [backMsg, setBackMsg] = useState("");
  const [backStatus, setBackStatus] = useState<"idle" | "ok" | "fail">("idle");

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  // ── Mặt trước ──────────────────────────────────────────────────────────────
  const handleFront = async (file: File) => {
    setFrontFile(file);
    setFrontImg(URL.createObjectURL(file));
    setFrontScanning(true);
    setFrontMsg("AI đang phân tích mặt trước...");
    setFrontStatus("idle");

    try {
      const response = await apiClient.extractOCR(file, "front");
      if (response.success && response.data && Object.keys(response.data).length > 0) {
        setCccd((prev) => ({ ...prev, ...response.data }));
        setFrontStatus("ok");
        setFrontMsg("✓ Thành công!");
      } else {
        setFrontStatus("fail");
        setFrontMsg("Ảnh mờ hoặc sai mặt, hãy thử lại.");
      }
    } catch {
      setFrontStatus("fail");
      setFrontMsg("Lỗi kết nối AI.");
    } finally {
      setFrontScanning(false);
    }
  };

  // ── Mặt sau ────────────────────────────────────────────────────────────────
  const handleBack = async (file: File) => {
    setBackFile(file);
    setBackImg(URL.createObjectURL(file));
    setBackScanning(true);
    setBackMsg("AI đang quét mặt sau...");
    setBackStatus("idle");

    try {
      const response = await apiClient.extractOCR(file, "back");
      if (response.success && response.data) {
        const { issue_date, issued_by, special_features } = response.data;

        setCccd((prev) => ({
          ...prev,
          ...(issue_date       && { issue_date }),
          ...(issued_by        && { issued_by }),
          ...(special_features && { special_features }),
        }));

        const hasData = issue_date || issued_by || special_features;
        if (hasData) {
          setBackStatus("ok");
          setBackMsg("✓ Đã lấy dữ liệu mặt sau.");
        } else {
          setBackStatus("fail");
          setBackMsg("Không tìm thấy thông tin, kiểm tra ảnh lại.");
        }
      } else {
        setBackStatus("fail");
        setBackMsg("Phản hồi không hợp lệ từ server.");
      }
    } catch {
      setBackStatus("fail");
      setBackMsg("Lỗi khi quét mặt sau.");
    } finally {
      setBackScanning(false);
    }
  };

  const canNext = !!cccd.full_name?.trim();

  const getBoxStyle = (status: string, hasImg: boolean | undefined) => ({
    border: `2px dashed ${
      status === "ok"   ? "rgba(0,255,136,0.5)"  :
      status === "fail" ? "rgba(255,200,0,0.4)"  :
      hasImg            ? "rgba(0,212,255,0.4)"  :
                          "rgba(0,212,255,0.15)"
    }`,
    background: hasImg ? "transparent" : "rgba(0,212,255,0.03)",
  });

  const StatusBadge = ({
    status,
    scanning,
    color,
  }: {
    status: string;
    scanning: boolean;
    color: string;
  }) => (
    <div
      style={{
        position: "absolute", top: 4, right: 4,
        width: 18, height: 18, borderRadius: "50%",
        background:
          status === "ok"   ? "#00ff88" :
          status === "fail" ? "#ffc800" :
          color,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 8px ${status === "ok" ? "#00ff88" : status === "fail" ? "#ffc800" : color}`,
      }}
    >
      {status === "ok"   ? <Check size={10} color="#000" /> :
       status === "fail" ? <AlertTriangle size={9} color="#000" /> :
       scanning          ? <RefreshCw size={9} color="#fff" style={{ animation: "spin 1s linear infinite" }} /> :
                           null}
    </div>
  );

  return (
    <div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      <div style={{ fontSize: "12px", color: "#4a6fa5", marginBottom: 14 }}>
        Chụp CCCD — AI sẽ tự động bóc tách dữ liệu và điền vào form ⚡
      </div>

      {/* ── Hai ô upload ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {/* Mặt trước */}
        <div>
          <div style={{ fontSize: "11px", color: "#4a6fa5", marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}>
            <QrCode size={11} color="#00d4ff" /> Mặt trước
          </div>
          <div
            onClick={() => frontRef.current?.click()}
            style={{
              aspectRatio: "85.6/54", borderRadius: "10px", overflow: "hidden",
              cursor: "pointer", position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.3s", ...getBoxStyle(frontStatus, !!frontImg),
            }}
          >
            <input
              ref={frontRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleFront(e.target.files[0])}
            />
            {frontImg ? (
              <>
                <img src={frontImg} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="CCCD mặt trước" />
                {frontScanning && (
                  <motion.div
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ position: "absolute", left: 0, right: 0, height: 2, background: "#00d4ff", boxShadow: "0 0 8px #00d4ff" }}
                  />
                )}
                <StatusBadge status={frontStatus} scanning={frontScanning} color="rgba(0,212,255,0.8)" />
              </>
            ) : (
              <div style={{ textAlign: "center", pointerEvents: "none" }}>
                <QrCode size={22} color="#2a5060" />
                <div style={{ fontSize: "8px", color: "#2a5060", marginTop: 4 }}>Chọn mặt trước</div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 4, fontSize: "10px", minHeight: 14, color: frontStatus === "ok" ? "#00ff88" : frontStatus === "fail" ? "#ffc800" : "#00d4ff" }}>
            {frontMsg}
          </div>
        </div>

        {/* Mặt sau */}
        <div>
          <div style={{ fontSize: "11px", color: "#4a6fa5", marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}>
            <CreditCard size={11} color="#8b5cf6" /> Mặt sau
          </div>
          <div
            onClick={() => backRef.current?.click()}
            style={{
              aspectRatio: "85.6/54", borderRadius: "10px", overflow: "hidden",
              cursor: "pointer", position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.3s", ...getBoxStyle(backStatus, !!backImg),
            }}
          >
            <input
              ref={backRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleBack(e.target.files[0])}
            />
            {backImg ? (
              <>
                <img src={backImg} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="CCCD mặt sau" />
                {backScanning && (
                  <motion.div
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ position: "absolute", left: 0, right: 0, height: 2, background: "#8b5cf6", boxShadow: "0 0 8px #8b5cf6" }}
                  />
                )}
                <StatusBadge status={backStatus} scanning={backScanning} color="rgba(139,92,246,0.8)" />
              </>
            ) : (
              <div style={{ textAlign: "center", pointerEvents: "none" }}>
                <Upload size={20} color="#2a3050" />
                <div style={{ fontSize: "8px", color: "#2a3050", marginTop: 4 }}>Chọn mặt sau</div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 4, fontSize: "10px", minHeight: 14, color: backStatus === "ok" ? "#00ff88" : backStatus === "fail" ? "#ffc800" : "#8b5cf6" }}>
            {backMsg}
          </div>
        </div>
      </div>

      {/* ── Banner hướng dẫn nếu chưa scan được full ─────────────────────── */}
      {(frontStatus === "fail" || backStatus === "fail") && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 12, padding: "8px 12px", borderRadius: "8px", background: "rgba(255,200,0,0.06)", border: "1px solid rgba(255,200,0,0.2)", fontSize: "11px", color: "#ffc800", display: "flex", gap: 6, alignItems: "flex-start" }}
        >
          <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Một số thông tin chưa đọc được — hãy chụp ảnh rõ nét, đủ sáng và kiểm tra lại form bên dưới.</span>
        </motion.div>
      )}

      {/* ── Form kiểm tra thông tin ──────────────────────────────────────── */}
      <div style={{ background: "rgba(0,200,80,0.03)", border: "1px solid rgba(0,200,80,0.1)", borderRadius: "12px", padding: "14px", marginBottom: 16 }}>
        <div style={{ fontSize: "11px", color: "#00c840", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
          <Info size={11} /> Kiểm tra và bổ sung thông tin nếu cần
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {CCCD_FIELDS.map((f) => (
            <div key={f.key} style={{ gridColumn: f.full ? "1/-1" : "auto" }}>
              <label style={{ fontSize: "10px", color: "#4a8a5a", display: "block", marginBottom: 3 }}>
                {f.label}
              </label>
              <input
                value={cccd[f.key] || ""}
                onChange={(e) => setCccd((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{
                  ...inputStyle,
                  borderColor:
                    f.key === "full_name" && cccd.full_name
                      ? "rgba(0,255,136,0.3)"
                      : cccd[f.key]
                        ? "rgba(0,212,255,0.25)"
                        : "rgba(0,212,255,0.1)",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => onNext(cccd, frontFile, backFile)}
        disabled={!canNext}
        style={{
          width: "100%", padding: "12px", borderRadius: "12px",
          background: canNext ? "linear-gradient(135deg,#00c840,#00d4ff)" : "rgba(255,255,255,0.04)",
          border: "none",
          color: canNext ? "#fff" : "#2d4060",
          cursor: canNext ? "pointer" : "not-allowed",
          fontSize: "13px", fontWeight: 600,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          transition: "all 0.2s",
        }}
      >
        Tiếp theo — Hình ảnh khuôn mặt <ChevronRight size={15} />
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 2 — Face Capture (Webcam OR Upload)
// ═════════════════════════════════════════════════════════════════════════════
function StepFace({
  onNext,
  onBack,
}: {
  onNext: (files: File[]) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<"choose" | "webcam" | "upload">("choose");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camActive, setCamActive] = useState(false);
  const [camError, setCamError] = useState("");

  // Dọn dẹp stream khi unmount
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const startWebcam = async () => {
    setCamError("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setCamActive(true);
    } catch {
      setCamError("Không thể truy cập Camera. Hãy kiểm tra quyền trình duyệt.");
    }
  };

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamActive(false);
  };

  const snapPhoto = () => {
    if (!videoRef.current || !canvasRef.current || files.length >= 5) return;
    const c = canvasRef.current;
    c.width = 640;
    c.height = 480;
    const ctx = c.getContext("2d")!;
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, -640, 0, 640, 480);
    const url = c.toDataURL("image/jpeg", 0.9);
    c.toBlob((blob) => {
      const f = new File([blob!], `face_${Date.now()}.jpg`, { type: "image/jpeg" });
      setFiles((p) => [...p, f]);
      setPreviews((p) => [...p, url]);
    }, "image/jpeg", 0.9);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = Array.from(e.target.files || [])
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 5 - files.length);
    setFiles((p) => [...p, ...fs]);
    fs.forEach((f) => {
      const r = new FileReader();
      r.onload = (ev) => setPreviews((p) => [...p, ev.target?.result as string]);
      r.readAsDataURL(f);
    });
    // Reset input để chọn lại cùng file nếu cần
    e.target.value = "";
  };

  const removeFile = (i: number) => {
    setFiles((p) => p.filter((_, j) => j !== i));
    setPreviews((p) => p.filter((_, j) => j !== i));
  };

  // ── Màn hình chọn phương thức ──────────────────────────────────────────────
  if (mode === "choose") {
    return (
      <div>
        <div style={{ fontSize: "12px", color: "#4a6fa5", marginBottom: 16 }}>
          Cung cấp ít nhất 1 ảnh khuôn mặt để nhận diện (tối đa 5 ảnh)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {[
            { id: "webcam", emoji: "📷", title: "Chụp ảnh trực tiếp", sub: "Mở Webcam/Camera chụp ngay tại chỗ", color: "#00d4ff" },
            { id: "upload", emoji: "🖼️", title: "Tải ảnh có sẵn",    sub: "Upload file ảnh rõ nét từ thiết bị",  color: "#8b5cf6" },
          ].map((m) => (
            <motion.div
              key={m.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode(m.id as "webcam" | "upload")}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: "14px",
                background: `${m.color}06`, border: `1px solid ${m.color}18`,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "26px" }}>{m.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600 }}>{m.title}</div>
                <div style={{ fontSize: "11px", color: "#4a6fa5" }}>{m.sub}</div>
              </div>
              <ChevronRight size={16} color={m.color} />
            </motion.div>
          ))}
        </div>
        <button
          onClick={onBack}
          style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#7a95b8", fontSize: "12px", cursor: "pointer" }}
        >
          ← Quay lại bước trước
        </button>
      </div>
    );
  }

  // ── Webcam / Upload ────────────────────────────────────────────────────────
  return (
    <div>
      <div
        style={{
          position: "relative", borderRadius: "16px", overflow: "hidden",
          background: "#020408", aspectRatio: "4/3",
          border: "2px solid rgba(0,212,255,0.2)", marginBottom: 12,
        }}
      >
        {mode === "webcam" ? (
          <>
            <video
              ref={videoRef} autoPlay playsInline muted
              style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {!camActive ? (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                {camError && (
                  <div style={{ color: "#ffc800", fontSize: "11px", textAlign: "center", padding: "0 20px" }}>{camError}</div>
                )}
                <button
                  onClick={startWebcam}
                  style={{ padding: "12px 24px", borderRadius: "12px", background: "#00d4ff", border: "none", color: "#000", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Camera size={18} /> Bật Camera
                </button>
              </div>
            ) : (
              <>
                {/* Overlay góc camera */}
                {[
                  { top: 8, left: 8, borderTop: "2px solid #00d4ff", borderLeft: "2px solid #00d4ff" },
                  { top: 8, right: 8, borderTop: "2px solid #00d4ff", borderRight: "2px solid #00d4ff" },
                  { bottom: 8, left: 8, borderBottom: "2px solid #00d4ff", borderLeft: "2px solid #00d4ff" },
                  { bottom: 8, right: 8, borderBottom: "2px solid #00d4ff", borderRight: "2px solid #00d4ff" },
                ].map((s, i) => (
                  <div key={i} style={{ position: "absolute", width: 20, height: 20, ...s }} />
                ))}

                <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 10 }}>
                  <button
                    onClick={snapPhoto}
                    disabled={files.length >= 5}
                    style={{
                      padding: "10px 24px", borderRadius: "20px",
                      background: files.length < 5 ? "#00ff88" : "#333",
                      border: "none", fontWeight: 700, cursor: files.length < 5 ? "pointer" : "not-allowed",
                    }}
                  >
                    📸 Chụp ({files.length}/5)
                  </button>
                  <button
                    onClick={stopWebcam}
                    style={{ padding: "10px 16px", borderRadius: "20px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "#e2e8f0", cursor: "pointer" }}
                  >
                    Dừng
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 8 }}
          >
            <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
            <Upload size={32} color="#8b5cf6" />
            <div style={{ color: "#e2e8f0", fontSize: "14px" }}>Chọn ảnh khuôn mặt ({files.length}/5)</div>
            <div style={{ fontSize: "11px", color: "#4a6fa5" }}>Hỗ trợ JPG, PNG, WEBP</div>
          </div>
        )}
      </div>

      {/* Preview ảnh đã chọn */}
      {previews.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {previews.map((src, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ position: "relative", width: 56, height: 56, borderRadius: "8px", overflow: "hidden", border: "1px solid #00d4ff" }}
            >
              <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={`face-${i}`} />
              <button
                onClick={() => removeFile(i)}
                style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.7)", border: "none", cursor: "pointer", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
              >
                <X size={10} color="#ff6b6b" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => { stopWebcam(); setMode("choose"); }}
          style={{ flex: 1, padding: "10px", borderRadius: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#7a95b8", cursor: "pointer" }}
        >
          ← Chọn lại
        </button>
        <button
          onClick={() => onNext(files)}
          disabled={files.length === 0}
          style={{
            flex: 2, padding: "10px", borderRadius: "10px",
            background: files.length > 0 ? "#00d4ff" : "#1a2a3a",
            border: "none",
            color: files.length > 0 ? "#000" : "#4a6fa5",
            fontWeight: 700, cursor: files.length > 0 ? "pointer" : "not-allowed",
          }}
        >
          Tiếp theo →
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 3 — Thông tin công việc
// ═════════════════════════════════════════════════════════════════════════════
function StepInfo({
  defaultName,
  onSubmit,
  onBack,
  submitting,
  error,
}: {
  defaultName: string;
  onSubmit: (data: { name: string; role: string; dept: string; expiry: string }) => void;
  onBack: () => void;
  submitting: boolean;
  error: string;
}) {
  const [name,   setName]   = useState(defaultName);
  const [role,   setRole]   = useState("");
  const [dept,   setDept]   = useState("");
  const [expiry, setExpiry] = useState("");

  const fields = [
    { label: "Họ và tên *",                               value: name,   setter: setName,   placeholder: "NGUYỄN VĂN A",       type: "text",   required: true },
    { label: "Chức vụ",                                   value: role,   setter: setRole,   placeholder: "Kỹ sư, Quản lý...",  type: "text",   required: false },
    { label: "Phòng ban",                                 value: dept,   setter: setDept,   placeholder: "Kỹ thuật, Nhân sự...",type: "text",   required: false },
    { label: "Hết hạn làm việc (để trống nếu vĩnh viễn)", value: expiry, setter: setExpiry, placeholder: "",                    type: "date",   required: false },
  ];

  return (
    <div>
      <div style={{ fontSize: "12px", color: "#4a6fa5", marginBottom: 14 }}>
        Thông tin công việc và thời hạn làm việc
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {fields.map((f) => (
          <div key={f.label}>
            <label style={{ fontSize: "12px", color: "#4a6fa5", display: "block", marginBottom: 4 }}>
              {f.label}
            </label>
            <input
              type={f.type}
              value={f.value}
              onChange={(e) => f.setter(e.target.value)}
              placeholder={f.placeholder}
              style={{
                ...inputStyle,
                borderColor: f.required && f.value ? "rgba(0,255,136,0.3)" : "rgba(0,212,255,0.15)",
              }}
            />
          </div>
        ))}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 12, padding: "8px 12px", borderRadius: "8px", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", color: "#ff6b6b", fontSize: "12px", display: "flex", gap: 6, alignItems: "center" }}
        >
          <AlertTriangle size={12} /> {error}
        </motion.div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onBack}
          disabled={submitting}
          style={{ flex: 1, padding: "11px", borderRadius: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#7a95b8", cursor: submitting ? "not-allowed" : "pointer" }}
        >
          ← Quay lại
        </button>
        <button
          onClick={() => onSubmit({ name, role, dept, expiry })}
          disabled={!name.trim() || submitting}
          style={{
            flex: 2, padding: "11px", borderRadius: "10px",
            background: !name.trim() || submitting ? "rgba(255,255,255,0.04)" : "#00ff88",
            border: "none",
            color: !name.trim() || submitting ? "#2d4060" : "#000",
            fontWeight: 700,
            cursor: !name.trim() || submitting ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          {submitting ? (
            <>
              <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
              Đang xử lý...
            </>
          ) : (
            <>
              <Check size={14} /> Hoàn tất Đăng ký
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Step 4 — Loading Screen
// ═════════════════════════════════════════════════════════════════════════════
function StepLoading() {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDot((d) => (d + 1) % 4), 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "50px 0" }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        style={{ display: "inline-block", marginBottom: 20 }}
      >
        <Shield size={52} color="#00d4ff" />
      </motion.div>
      <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "15px", marginBottom: 6 }}>
        Đang lưu trữ dữ liệu{"...".slice(0, dot)}
      </div>
      <div style={{ color: "#4a6fa5", fontSize: "12px" }}>
        Vui lòng không đóng cửa sổ này
      </div>
      {/* Progress bar giả */}
      <div style={{ marginTop: 24, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.05)", overflow: "hidden", width: "60%", margin: "24px auto 0" }}>
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ height: "100%", width: "50%", background: "linear-gradient(90deg, transparent, #00d4ff, transparent)", borderRadius: 4 }}
        />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main RegisterModal
// ═════════════════════════════════════════════════════════════════════════════
export function RegisterModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [cccdData, setCccdData] = useState<Partial<CCCDData>>({});
  const [cccdFront, setCccdFront] = useState<File | null>(null);
  const [cccdBack, setCccdBack] = useState<File | null>(null);
  const [faceFiles, setFaceFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const stepLabels = ["", "Thông tin CCCD", "Ảnh khuôn mặt", "Thông tin công việc", "Đang hoàn tất"];

const handleSubmit = async (info: { name: string; role: string; dept: string; expiry: string }) => {    try {
      setError("");
      setSubmitting(true);
      setStep(4);

      const fd = new FormData();
      fd.append("name",       info.name);
      fd.append("role",       info.role);
      fd.append("department", info.dept);
      if (info.expiry) fd.append("work_expiry_date", info.expiry);
      if (cccdFront)   fd.append("cccd_front", cccdFront);
      if (cccdBack)    fd.append("cccd_back",  cccdBack);
      fd.append("cccd_info", JSON.stringify(cccdData));
      faceFiles.forEach((f) => fd.append("images", f));

      await apiClient.registerFace(fd);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Đăng ký thất bại, vui lòng kiểm tra lại.";
      setError(msg);
      setStep(3);
      setSubmitting(false);
    }
  };
  // Chặn đóng modal khi đang submit
  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.9)",
        backdropFilter: "blur(15px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 300, padding: 16,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        style={{
          width: "100%", maxWidth: 580,
          maxHeight: "95vh", overflowY: "auto",
          background: "#07101a",
          border: "1px solid rgba(0,212,255,0.2)",
          borderRadius: "24px",
          padding: "24px",
          scrollbarWidth: "none",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <h2 style={{ fontSize: "16px", color: "#e2e8f0", margin: 0, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.05em" }}>
              ĐĂNG KÝ NHÂN VIÊN MỚI
            </h2>
            <p style={{ fontSize: "11px", color: "#4a6fa5", margin: "2px 0 0" }}>
              {step < 4 ? `Bước ${step}/3 — ${stepLabels[step]}` : stepLabels[4]}
            </p>
          </div>
          {!submitting && (
            <button
              onClick={handleClose}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", cursor: "pointer", color: "#4a6fa5", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* ── Step indicator ────────────────────────────────────────────── */}
        {step < 4 && <StepIndicator current={step} />}

        {/* ── Step content ──────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
              <StepCCCD
                onNext={(d, f, b) => {
                  setCccdData(d);
                  setCccdFront(f);
                  setCccdBack(b);
                  setStep(2);
                }}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
              <StepFace
                onNext={(f) => { setFaceFiles(f); setStep(3); }}
                onBack={() => setStep(1)}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
              <StepInfo
                defaultName={cccdData.full_name || ""}
                onSubmit={handleSubmit}
                onBack={() => setStep(2)}
                submitting={submitting}
                error={error}
              />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <StepLoading />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}