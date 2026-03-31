import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Upload, Shield, Camera, CreditCard,
  ChevronRight, Check, User,
  Hash, Scan
} from "lucide-react";
import { apiClient } from "../services/api"; // Đảm bảo đường dẫn tới file api là đúng

// XÓA BỎ DÒNG IMPORT RegisterModal GÂY LỖI:
// import { RegisterModal } from "../services/RegisterModal";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CCCDInfo {
  name: string;
  dob: string;
  gender: string;
  nationality: string;
  hometown: string;
  address: string;
  id_number: string;
  issue_date: string;
  expiry_date: string;
}

type RegisterMethod = "cccd" | "photo" | "webcam";

// ─── CCCD Card Preview ────────────────────────────────────────────────────────
function CCCDCardFront({ img, info }: { img?: string; info: Partial<CCCDInfo> }) {
  return (
    <div style={{
      width: "100%",
      aspectRatio: "85.6/54",
      borderRadius: "12px",
      background: "linear-gradient(135deg, #1a2a1a 0%, #0d1f0d 40%, #1a2a1a 100%)",
      border: "1px solid rgba(0,200,80,0.3)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {/* Background pattern */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, rgba(0,180,60,0.03) 0px, rgba(0,180,60,0.03) 1px, transparent 1px, transparent 8px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,200,80,0.08) 0%, transparent 70%)" }} />

      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px 6px", borderBottom: "1px solid rgba(0,200,80,0.15)" }}>
        <div style={{ width: 20, height: 20, borderRadius: "4px", background: "linear-gradient(135deg, #c8102e, #da291c)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 10, height: 10, background: "#ffd700", clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" }} />
        </div>
        <div>
          <div style={{ fontSize: "6px", color: "#a8c8a8", letterSpacing: "1px", lineHeight: 1 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div style={{ fontSize: "7.5px", color: "#00e060", fontWeight: 700, letterSpacing: "0.5px" }}>CĂN CƯỚC CÔNG DÂN</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: "5.5px", color: "#4a8a5a" }}>CITIZEN IDENTITY CARD</div>
          <div style={{ fontSize: "7px", color: "#00b840", fontWeight: 600 }}>CHIP-BASED</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "8px 12px" }}>
        {/* Photo */}
        <div style={{ width: 52, height: 62, borderRadius: "6px", overflow: "hidden", border: "1.5px solid rgba(0,200,80,0.4)", background: "#0a150a", flexShrink: 0, position: "relative" }}>
          {img ? (
            <img src={img} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <User size={18} color="#2a5a2a" />
              <div style={{ fontSize: "5px", color: "#2a5a2a", textAlign: "center" }}>ẢNH</div>
            </div>
          )}
          {/* Chip */}
          <div style={{ position: "absolute", bottom: 3, right: 3, width: 12, height: 9, borderRadius: "2px", background: "linear-gradient(135deg, #c8a000, #ffd700)", border: "0.5px solid #a08000" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", padding: "1.5px" }}>
              {[0,1,2,3].map(i => <div key={i} style={{ background: "#c8a000", borderRadius: "0.5px" }} />)}
            </div>
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          <div>
            <div style={{ fontSize: "5px", color: "#4a8a5a", letterSpacing: "0.5px" }}>SỐ / No.</div>
            <div style={{ fontSize: "9px", color: "#00e060", fontWeight: 700, letterSpacing: "2px" }}>
              {info.id_number || "_ _ _ _ _ _ _ _ _ _ _"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "5px", color: "#4a8a5a" }}>HỌ, CHỮ ĐỆM VÀ TÊN / Full name</div>
            <div style={{ fontSize: "8px", color: "#e8f5e8", fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase" }}>
              {info.name || "─────────────────"}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            <div>
              <div style={{ fontSize: "5px", color: "#4a8a5a" }}>NGÀY SINH / DOB</div>
              <div style={{ fontSize: "7px", color: "#c8e8c8" }}>{info.dob || "── /── /────"}</div>
            </div>
            <div>
              <div style={{ fontSize: "5px", color: "#4a8a5a" }}>GIỚI TÍNH / Sex</div>
              <div style={{ fontSize: "7px", color: "#c8e8c8" }}>{info.gender || "──────"}</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "5px", color: "#4a8a5a" }}>QUÊ QUÁN / Place of origin</div>
            <div style={{ fontSize: "6.5px", color: "#c8e8c8", lineHeight: 1.3 }}>{info.hometown || "─────────────────────"}</div>
          </div>
          <div>
            <div style={{ fontSize: "5px", color: "#4a8a5a" }}>NGÀY HẾT HẠN / Expiry date</div>
            <div style={{ fontSize: "7px", color: "#00e060", fontWeight: 600 }}>{info.expiry_date || "──/──/────"}</div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: "linear-gradient(90deg, #c8102e 0%, #c8102e 33%, #ffd700 33%, #ffd700 66%, #0077c0 66%)" }} />
    </div>
  );
}

function CCCDCardBack({ img }: { img?: string }) {
  return (
    <div style={{
      width: "100%",
      aspectRatio: "85.6/54",
      borderRadius: "12px",
      background: "linear-gradient(135deg, #0d1520 0%, #0a1218 100%)",
      border: "1px solid rgba(0,212,255,0.2)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, rgba(0,212,255,0.02) 0px, rgba(0,212,255,0.02) 1px, transparent 1px, transparent 8px)" }} />

      {/* Magnetic stripe */}
      <div style={{ position: "absolute", top: 10, left: 0, right: 0, height: 14, background: "linear-gradient(180deg, #1a1a1a, #0a0a0a)" }} />

      {/* QR area */}
      <div style={{ position: "absolute", bottom: 10, right: 12, width: 36, height: 36, border: "1px solid rgba(0,212,255,0.3)", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,212,255,0.05)" }}>
        {img ? (
          <img src={img} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "3px" }} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "1.5px", padding: "4px" }}>
            {Array.from({length: 25}).map((_, i) => (
              <div key={i} style={{ width: "100%", aspectRatio: "1", background: Math.random() > 0.5 ? "rgba(0,212,255,0.6)" : "transparent", borderRadius: "0.5px" }} />
            ))}
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 16, left: 12, right: 60 }}>
        <div style={{ fontSize: "5px", color: "#2a4a6a", marginBottom: 2, fontFamily: "'JetBrains Mono', monospace" }}>MÃ VẠCH / BARCODE</div>
        <div style={{ display: "flex", gap: "1px", height: 14 }}>
          {Array.from({length: 60}).map((_, i) => (
            <div key={i} style={{ flex: 1, background: Math.random() > 0.4 ? "rgba(0,212,255,0.7)" : "transparent" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Scan Zone ────────────────────────────────────────────────────────────────
function ScanZone({
  label, sublabel, side, img, onFile, scanning
}: {
  label: string; sublabel: string; side: "front" | "back";
  img?: string; onFile: (f: File) => void; scanning: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: "11px", color: "#4a6fa5", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <CreditCard size={12} />
        {label}
      </div>

      <div
        onClick={() => ref.current?.click()}
        style={{
          position: "relative", cursor: "pointer", borderRadius: "12px",
          border: `2px dashed ${img ? "rgba(0,255,136,0.4)" : "rgba(0,212,255,0.25)"}`,
          background: img ? "rgba(0,255,136,0.03)" : "rgba(0,212,255,0.02)",
          overflow: "hidden", transition: "all 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = img ? "rgba(0,255,136,0.6)" : "rgba(0,212,255,0.5)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = img ? "rgba(0,255,136,0.4)" : "rgba(0,212,255,0.25)")}
      >
        <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />

        {/* Scan animation overlay */}
        {scanning && (
          <motion.div
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ position: "absolute", left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, #00d4ff, transparent)", boxShadow: "0 0 12px #00d4ff", zIndex: 10, pointerEvents: "none" }}
          />
        )}

        {img ? (
          side === "front"
            ? <CCCDCardFront img={img} info={{}} />
            : <CCCDCardBack img={img} />
        ) : (
          <div style={{ padding: "24px 16px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "12px", background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
              {scanning ? <Scan size={22} color="#00d4ff" /> : <CreditCard size={22} color="#4a6fa5" />}
            </div>
            <div style={{ fontSize: "12px", color: "#7a95b8", fontWeight: 600, marginBottom: 4 }}>{sublabel}</div>
            <div style={{ fontSize: "10px", color: "#2d4060" }}>Click để chọn ảnh</div>
          </div>
        )}

        {img && (
          <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,255,136,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={12} color="#000" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Webcam Capture ───────────────────────────────────────────────────────────
function WebcamCapture({ onCapture }: { onCapture: (files: File[]) => void }) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const [active,   setActive]   = useState(false);
  const [captured, setCaptured] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  const startCam = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
    streamRef.current = stream;
    if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    setActive(true);
  };

  const stopCam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setActive(false);
  };

  const snap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 640; canvas.height = 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const newList = [...captured, dataUrl];
    setCaptured(newList);

    // Convert to files for parent
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `webcam_${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(newList.map((_, i) => i === newList.length - 1 ? file : new File([], `placeholder_${i}`)));
    }, "image/jpeg", 0.9);
  };

  const autoSnap = () => {
    let c = 3;
    setCountdown(c);
    const t = setInterval(() => {
      c--;
      if (c > 0) { setCountdown(c); }
      else { clearInterval(t); setCountdown(null); snap(); }
    }, 1000);
  };

  return (
    <div>
      <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", background: "#050a0f", border: "1px solid rgba(0,212,255,0.15)", aspectRatio: "4/3" }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: active ? "block" : "none", transform: "scaleX(-1)" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {!active && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera size={24} color="#4a6fa5" />
            </div>
            <div style={{ fontSize: "13px", color: "#4a6fa5" }}>Camera chưa bật</div>
          </div>
        )}

        {/* Countdown overlay */}
        {countdown !== null && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
            <motion.div
              key={countdown}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ fontSize: "80px", color: "#00d4ff", fontFamily: "'Orbitron', monospace", fontWeight: 700 }}
            >
              {countdown}
            </motion.div>
          </div>
        )}

        {/* Scan line when active */}
        {active && (
          <motion.div
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            style={{ position: "absolute", left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, #00d4ff, transparent)", boxShadow: "0 0 10px #00d4ff", pointerEvents: "none" }}
          />
        )}

        {/* Face guide */}
        {active && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 140, height: 170, border: "2px solid rgba(0,212,255,0.4)", borderRadius: "70px 70px 50px 50px", boxShadow: "0 0 20px rgba(0,212,255,0.2)" }}>
            {[{top:-2,left:-2,borderTop:"2px solid #00d4ff",borderLeft:"2px solid #00d4ff"},{top:-2,right:-2,borderTop:"2px solid #00d4ff",borderRight:"2px solid #00d4ff"},{bottom:-2,left:-2,borderBottom:"2px solid #00d4ff",borderLeft:"2px solid #00d4ff"},{bottom:-2,right:-2,borderBottom:"2px solid #00d4ff",borderRight:"2px solid #00d4ff"}].map((c,i) => (
              <div key={i} style={{ position: "absolute", width: 16, height: 16, ...c }} />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        {!active ? (
          <button onClick={startCam} style={{ flex: 1, padding: "10px", borderRadius: "10px", background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff", cursor: "pointer", fontSize: "13px", fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Camera size={16} /> Bật Camera
          </button>
        ) : (
          <>
            <button onClick={snap} disabled={captured.length >= 5} style={{ flex: 2, padding: "10px", borderRadius: "10px", background: captured.length >= 5 ? "rgba(255,255,255,0.03)" : "rgba(0,255,136,0.1)", border: `1px solid ${captured.length >= 5 ? "rgba(255,255,255,0.06)" : "rgba(0,255,136,0.3)"}`, color: captured.length >= 5 ? "#2d4060" : "#00ff88", cursor: captured.length >= 5 ? "not-allowed" : "pointer", fontSize: "13px", fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              📸 Chụp ({captured.length}/5)
            </button>
            <button onClick={autoSnap} disabled={captured.length >= 5 || countdown !== null} style={{ flex: 1, padding: "10px", borderRadius: "10px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", color: "#8b5cf6", cursor: "pointer", fontSize: "13px", fontFamily: "'Space Grotesk', sans-serif" }}>
              3s
            </button>
            <button onClick={stopCam} style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.2)", color: "#ff2d55", cursor: "pointer" }}>
              ✕
            </button>
          </>
        )}
      </div>

      {/* Captured previews */}
      {captured.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {captured.map((src, i) => (
            <div key={i} style={{ position: "relative", width: 52, height: 52, borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(0,255,136,0.3)" }}>
              <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", top: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "#00ff88", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={8} color="#000" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main RegisterModal ───────────────────────────────────────────────────────
export interface RegisterModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function RegisterModal({ onClose, onSuccess }: RegisterModalProps) {
  const [method,   setMethod]   = useState<RegisterMethod | null>(null);
  const [step,     setStep]     = useState(1);

  // CCCD state
  const [cccdFrontImg, setCccdFrontImg] = useState<string>();
  const [cccdBackImg,  setCccdBackImg]  = useState<string>();
  const [cccdFrontFile, setCccdFrontFile] = useState<File>();
  const [scanning, setScanning] = useState(false);
  const [cccdInfo, setCccdInfo] = useState<Partial<CCCDInfo>>({});

  // Photo state
  const [photoFiles, setPhotoFiles]     = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Webcam state
  const [webcamFiles, setWebcamFiles] = useState<File[]>([]);

  // Form info
  const [name,  setName]  = useState("");
  const [role,  setRole]  = useState("");
  const [dept,  setDept]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCCCDFile = (side: "front" | "back", file: File) => {
    const url = URL.createObjectURL(file);
    if (side === "front") {
      setCccdFrontImg(url);
      setCccdFrontFile(file);
      setScanning(true);
      // Simulate OCR extraction after 1.5s
      setTimeout(() => {
        setScanning(false);
        // In production: call OCR API here
        // For now: populate empty fields for user to fill
      }, 1500);
    } else {
      setCccdBackImg(url);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
    if (files.length + photoFiles.length > 5) { setError("Tối đa 5 ảnh"); return; }
    setPhotoFiles(prev => [...prev, ...files]);
    files.forEach(f => {
      const r = new FileReader();
      r.onload = ev => setPhotoPreviews(prev => [...prev, ev.target?.result as string]);
      r.readAsDataURL(f);
    });
  };

  const removePhoto = (i: number) => {
    setPhotoFiles(prev => prev.filter((_, idx) => idx !== i));
    setPhotoPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  // Final submit
  const handleSubmit = async () => {
    if (!name.trim()) { setError("Vui lòng nhập họ tên"); return; }

    let filesToSend: File[] = [];
    if (method === "cccd" && cccdFrontFile) filesToSend = [cccdFrontFile];
    else if (method === "photo") filesToSend = photoFiles;
    else if (method === "webcam") filesToSend = webcamFiles.filter(f => f.size > 0);

    if (filesToSend.length === 0) { setError("Cần ít nhất 1 ảnh khuôn mặt"); return; }

    try {
      setLoading(true);
      setError("");
      setStep(4);
      const fd = new FormData();
      fd.append("name", name);
      fd.append("role", role);
      fd.append("department", dept);
      filesToSend.forEach(f => fd.append("images", f));
      await apiClient.registerFace(fd);
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi đăng ký");
      setStep(3);
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}
      onClick={loading ? undefined : onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", background: "#08111a", border: "1px solid rgba(0,212,255,0.2)", borderRadius: "20px", boxShadow: "0 0 80px rgba(0,212,255,0.1)", fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {/* Header */}
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid rgba(0,212,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#08111a", zIndex: 10, borderRadius: "20px 20px 0 0" }}>
          <div>
            <h2 style={{ fontSize: "15px", color: "#e2e8f0", fontFamily: "'Orbitron', monospace", margin: 0 }}>ĐĂNG KÝ NHÂN VIÊN</h2>
            <p style={{ fontSize: "11px", color: "#4a6fa5", marginTop: 3, margin: 0 }}>
              {method === null ? "Chọn phương thức đăng ký" : method === "cccd" ? "Quét CCCD" : method === "photo" ? "Tải ảnh lên" : "Quay video / Chụp ảnh"}
            </p>
          </div>
          {!loading && <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#4a6fa5", padding: 4 }}><X size={20} /></button>}
        </div>

        <div style={{ padding: "20px 24px 24px" }}>

          {/* ── Step 0: Method selection ── */}
          {method === null && (
            <div>
              <div style={{ fontSize: "13px", color: "#7a95b8", marginBottom: 16 }}>Chọn cách lấy thông tin nhân viên:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { id: "cccd" as const, icon: "🪪", title: "Quét CCCD / CMND", sub: "Chụp 2 mặt căn cước — tự động điền thông tin", color: "#00e060" },
                  { id: "photo" as const, icon: "🖼️", title: "Tải ảnh khuôn mặt", sub: "Upload ảnh chân dung từ máy tính", color: "#00d4ff" },
                  { id: "webcam" as const, icon: "📹", title: "Chụp qua Webcam", sub: "Dùng camera trực tiếp để chụp nhiều góc", color: "#8b5cf6" },
                ].map(m => (
                  <motion.div
                    key={m.id}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setMethod(m.id); setStep(m.id === "cccd" ? 1 : m.id === "photo" ? 2 : 2); }}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: "14px", background: `${m.color}06`, border: `1px solid ${m.color}20`, cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${m.color}50`; (e.currentTarget as HTMLDivElement).style.background = `${m.color}10`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${m.color}20`; (e.currentTarget as HTMLDivElement).style.background = `${m.color}06`; }}
                  >
                    <div style={{ fontSize: "28px", flexShrink: 0 }}>{m.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600 }}>{m.title}</div>
                      <div style={{ fontSize: "11px", color: "#4a6fa5", marginTop: 2 }}>{m.sub}</div>
                    </div>
                    <ChevronRight size={16} color={m.color} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── CCCD Step 1: Scan front + back ── */}
          {method === "cccd" && step === 1 && (
            <div>
              <div style={{ fontSize: "12px", color: "#4a6fa5", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <Scan size={12} /> Đặt CCCD vào khung và chụp ảnh rõ ràng, đủ sáng
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <ScanZone label="Mặt trước" sublabel="Chụp mặt có ảnh" side="front" img={cccdFrontImg} onFile={f => handleCCCDFile("front", f)} scanning={scanning} />
                <ScanZone label="Mặt sau" sublabel="Chụp mặt có mã QR" side="back" img={cccdBackImg} onFile={f => handleCCCDFile("back", f)} scanning={false} />
              </div>

              {/* CCCD info form - fill after scan */}
              <div style={{ background: "rgba(0,200,80,0.04)", border: "1px solid rgba(0,200,80,0.12)", borderRadius: "12px", padding: "14px" }}>
                <div style={{ fontSize: "11px", color: "#00c840", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Hash size={11} /> Thông tin từ CCCD (kiểm tra và chỉnh sửa nếu cần)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Họ và tên", key: "name" as const, full: true },
                    { label: "Ngày sinh", key: "dob" as const },
                    { label: "Giới tính", key: "gender" as const },
                    { label: "Số CCCD", key: "id_number" as const },
                    { label: "Quê quán", key: "hometown" as const, full: true },
                  ].map(f => (
                    <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : "auto" }}>
                      <label style={{ fontSize: "10px", color: "#4a8a5a", display: "block", marginBottom: 4 }}>{f.label}</label>
                      <input
                        value={cccdInfo[f.key] || ""}
                        onChange={e => setCccdInfo(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={`Nhập ${f.label.toLowerCase()}...`}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", background: "rgba(0,200,80,0.04)", border: "1px solid rgba(0,200,80,0.15)", color: "#e2e8f0", fontSize: "12px", outline: "none", fontFamily: "'Space Grotesk', sans-serif", boxSizing: "border-box" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button onClick={() => setMethod(null)} style={{ flex: 1, padding: "11px", borderRadius: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#7a95b8", cursor: "pointer", fontSize: "13px", fontFamily: "'Space Grotesk', sans-serif" }}>← Quay lại</button>
                <button
                  onClick={() => { if (cccdInfo.name) setName(cccdInfo.name); setStep(3); }}
                  disabled={!cccdFrontImg}
                  style={{ flex: 2, padding: "11px", borderRadius: "10px", background: cccdFrontImg ? "linear-gradient(135deg, #00c840, #00d4ff)" : "rgba(255,255,255,0.04)", border: "none", color: cccdFrontImg ? "#fff" : "#2d4060", cursor: cccdFrontImg ? "pointer" : "not-allowed", fontSize: "13px", fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
                  Tiếp theo →
                </button>
              </div>
            </div>
          )}

          {/* ── Photo Step 2: Upload ── */}
          {method === "photo" && step === 2 && (
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: "28px", borderRadius: "14px", border: "2px dashed rgba(0,212,255,0.3)", background: "rgba(0,212,255,0.02)", cursor: "pointer", textAlign: "center", marginBottom: 14, transition: "all 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,212,255,0.6)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,212,255,0.3)"; }}
              >
                <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handlePhotoSelect} style={{ display: "none" }} />
                <Upload size={28} color="#4a6fa5" style={{ marginBottom: 10 }} />
                <div style={{ fontSize: "13px", color: "#7a95b8", fontWeight: 600, marginBottom: 4 }}>Kéo ảnh hoặc click để chọn</div>
                <div style={{ fontSize: "11px", color: "#2d4060" }}>Tối đa 5 ảnh · JPG, PNG · Nên chụp nhiều góc</div>
              </div>

              {photoPreviews.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 14 }}>
                  {photoPreviews.map((src, i) => (
                    <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(0,212,255,0.2)" }}>
                      <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button onClick={() => removePhoto(i)} style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <X size={10} color="#ff6b6b" />
                      </button>
                    </div>
                  ))}
                  {photoPreviews.length < 5 && (
                    <div onClick={() => fileInputRef.current?.click()} style={{ aspectRatio: "1", borderRadius: "10px", border: "1px dashed rgba(0,212,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <span style={{ fontSize: "20px", color: "#2d4060" }}>+</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setMethod(null)} style={{ flex: 1, padding: "11px", borderRadius: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#7a95b8", cursor: "pointer", fontSize: "13px", fontFamily: "'Space Grotesk', sans-serif" }}>← Quay lại</button>
                <button onClick={() => setStep(3)} disabled={photoFiles.length === 0} style={{ flex: 2, padding: "11px", borderRadius: "10px", background: photoFiles.length > 0 ? "linear-gradient(135deg, #00d4ff, #8b5cf6)" : "rgba(255,255,255,0.04)", border: "none", color: photoFiles.length > 0 ? "#fff" : "#2d4060", cursor: photoFiles.length > 0 ? "pointer" : "not-allowed", fontSize: "13px", fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
                  Tiếp theo →
                </button>
              </div>
            </div>
          )}

          {/* ── Webcam Step 2 ── */}
          {method === "webcam" && step === 2 && (
            <div>
              <WebcamCapture onCapture={files => setWebcamFiles(files)} />
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button onClick={() => setMethod(null)} style={{ flex: 1, padding: "11px", borderRadius: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#7a95b8", cursor: "pointer", fontSize: "13px", fontFamily: "'Space Grotesk', sans-serif" }}>← Quay lại</button>
                <button onClick={() => setStep(3)} disabled={webcamFiles.filter(f => f.size > 0).length === 0} style={{ flex: 2, padding: "11px", borderRadius: "10px", background: webcamFiles.filter(f=>f.size>0).length > 0 ? "linear-gradient(135deg, #8b5cf6, #00d4ff)" : "rgba(255,255,255,0.04)", border: "none", color: webcamFiles.filter(f=>f.size>0).length > 0 ? "#fff" : "#2d4060", cursor: webcamFiles.filter(f=>f.size>0).length > 0 ? "pointer" : "not-allowed", fontSize: "13px", fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
                  Tiếp theo →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Info form ── */}
          {step === 3 && (
            <div>
              <div style={{ fontSize: "12px", color: "#4a6fa5", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <User size={12} /> Xác nhận thông tin nhân viên
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Họ và tên *", value: name, onChange: setName, placeholder: "Nguyễn Văn A" },
                  { label: "Chức vụ", value: role, onChange: setRole, placeholder: "Kỹ sư phần mềm..." },
                  { label: "Phòng ban", value: dept, onChange: setDept, placeholder: "Kỹ thuật / Marketing..." },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: "12px", color: "#4a6fa5", display: "block", marginBottom: 6 }}>{f.label}</label>
                    <input value={f.value} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,212,255,0.15)", color: "#e2e8f0", fontSize: "14px", outline: "none", fontFamily: "'Space Grotesk', sans-serif", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ marginTop: 12, padding: "10px", borderRadius: "8px", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", color: "#ff6b6b", fontSize: "12px", textAlign: "center" }}>{error}</div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button onClick={() => setStep(method === "cccd" ? 1 : 2)} style={{ flex: 1, padding: "11px", borderRadius: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#7a95b8", cursor: "pointer", fontSize: "13px", fontFamily: "'Space Grotesk', sans-serif" }}>← Quay lại</button>
                <button onClick={handleSubmit} style={{ flex: 2, padding: "11px", borderRadius: "10px", background: "linear-gradient(135deg, #00d4ff, #8b5cf6)", border: "none", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Shield size={15} /> Đăng ký ngay
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Processing ── */}
          {step === 4 && (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", marginBottom: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #00d4ff, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Shield size={30} color="#fff" />
                </div>
              </motion.div>
              <div style={{ fontSize: "15px", color: "#e2e8f0", fontWeight: 600, marginBottom: 6 }}>Đang tạo Face Embedding...</div>
              <div style={{ fontSize: "12px", color: "#4a6fa5", marginBottom: 20 }}>AI đang mã hóa đặc trưng khuôn mặt</div>
              <div style={{ padding: "3px", borderRadius: "20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,212,255,0.15)" }}>
                <motion.div animate={{ width: ["0%", "95%"] }} transition={{ duration: 2.5, ease: "easeOut" }} style={{ height: 8, borderRadius: "20px", background: "linear-gradient(90deg, #00d4ff, #8b5cf6)" }} />
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </motion.div>
  );
}