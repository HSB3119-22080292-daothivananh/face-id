import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CameraOff,
  Play,
  Square,
  RefreshCw,
  Sun,
  Moon,
} from "lucide-react";
import { apiClient } from "../services/api";

type DetectionResult = {
  status: "success" | "unknown" | "expired";
  person?: { name: string; role: string; id?: string };
  confidence?: number;
  box?: { x: number; y: number; w: number; h: number };
};

function ScanLine() {
  return (
    <motion.div
      animate={{ top: ["0%", "100%", "0%"] }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        height: "2px",
        background: "linear-gradient(90deg, transparent, #00d4ff, transparent)",
        boxShadow: "0 0 20px #00d4ff",
        zIndex: 10,
        pointerEvents: "none",
      }}
    />
  );
}

// ─── Face Bounding Box ─────────────────────────────────────────────────────
function FaceBox({
  box,
  status,
  name,
  confidence,
}: {
  box: { x: number; y: number; w: number; h: number };
  status: string;
  name?: string;
  confidence?: number;
}) {
  const color = status === "success" ? "#00ff88" : status === "expired" ? "#ffc800" : "#ff2d55";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute",
        left: `${box.x}%`,
        top: `${box.y}%`,
        width: `${box.w}%`,
        height: `${box.h}%`,
        border: `2px solid ${color}`,
        boxShadow: `0 0 20px ${color}40, inset 0 0 20px ${color}10`,
        borderRadius: "4px",
        pointerEvents: "none",
      }}
    >
      {[
        { top: -2, left: -2, borderTop: `3px solid ${color}`, borderLeft: `3px solid ${color}` },
        { top: -2, right: -2, borderTop: `3px solid ${color}`, borderRight: `3px solid ${color}` },
        { bottom: -2, left: -2, borderBottom: `3px solid ${color}`, borderLeft: `3px solid ${color}` },
        { bottom: -2, right: -2, borderBottom: `3px solid ${color}`, borderRight: `3px solid ${color}` },
      ].map((c, i) => (
        <div key={i} style={{ position: "absolute", width: 12, height: 12, ...c }} />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#0d1520ee",
          border: `1px solid ${color}50`,
          borderRadius: "6px",
          padding: "4px 10px",
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "11px", color, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
          {name || "NGƯỜI LẠ"}
        </div>
        {confidence !== undefined && (
          <div style={{ fontSize: "10px", color: "#4a6fa5" }}>{confidence.toFixed(1)}%</div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export function LiveRecognition() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<Array<{ time: string; result: DetectionResult }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lightLevel, setLightLevel] = useState<"ok" | "dim" | "dark">("ok");
  const [isMobile, setIsMobile] = useState(false);

  // Check mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ─── CƠ CHẾ CHỐNG SPAM (TRACKING & COOLDOWN) ─────────────────────────────
  const [activeDetections, setActiveDetections] = useState<DetectionResult[]>([]);
  const attendanceBook = useRef<Map<string, number>>(new Map());
  const isProcessing = useRef(false);

  const captureAndRecognize = async (): Promise<void> => {
    if (!isStreaming || !videoRef.current || !canvasRef.current || isProcessing.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const captureWidth = 1280;
    const captureHeight = 720;
    
    canvas.width = captureWidth;
    canvas.height = captureHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, captureWidth, captureHeight);
    
    // --- Tính toán ánh sáng ---
    const sampleX = Math.floor(captureWidth / 4);
    const sampleY = Math.floor(captureHeight / 4);
    const sampleW = Math.floor(captureWidth / 2);
    const sampleH = Math.floor(captureHeight / 2);
    const sample = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);

    let totalBrightness = 0;
    for (let i = 0; i < sample.data.length; i += 4) {
      totalBrightness += sample.data[i] * 0.299 + sample.data[i + 1] * 0.587 + sample.data[i + 2] * 0.114;
    }
    const avgBrightness = totalBrightness / (sample.data.length / 4);
    if (avgBrightness < 40) setLightLevel("dark");
    else if (avgBrightness < 100) setLightLevel("dim");
    else setLightLevel("ok");

    if (avgBrightness < 100) {
      const brightnessBoost = Math.round(Math.min(60, (100 - avgBrightness) * 0.6));
      const contrastFactor = avgBrightness < 40 ? 1.5 : avgBrightness < 70 ? 1.35 : 1.2;
      ctx.filter = `brightness(${100 + brightnessBoost}%) contrast(${contrastFactor * 100}%)`;
      ctx.drawImage(video, 0, 0, captureWidth, captureHeight);
      ctx.filter = "none";
    }

    return new Promise((resolve) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) { resolve(); return; }
          try {
            isProcessing.current = true;
            setScanning(true);
            const res = await apiClient.recognize(blob);

            if (res.success && res.data.faces && res.data.faces.length > 0) {
              const now = Date.now();
              const currentFaces: DetectionResult[] = [];

              res.data.faces.forEach((face: any) => {
                const rawBox = face.bbox;
                const boxWidthPercent  = (rawBox.width  / captureWidth)  * 100;
                const boxHeightPercent = (rawBox.height / captureHeight) * 100;
                const xPercent         = (rawBox.x      / captureWidth)  * 100;
                const yPercent         = (rawBox.y      / captureHeight) * 100;
                const mirroredX        = 100 - (xPercent + boxWidthPercent);

                const newResult: DetectionResult = {
                  status: face.status,
                  person: face.status !== "unknown" ? { name: face.name, role: face.role, id: face.id } : undefined,
                  confidence: face.confidence,
                  box: { x: mirroredX, y: yPercent, w: boxWidthPercent, h: boxHeightPercent },
                };

                currentFaces.push(newResult);

                if (face.id && face.status === "success") {
                  if (!attendanceBook.current.has(face.id)) {
                    setHistory((prev) =>
                      [{ time: new Date().toLocaleTimeString("vi-VN", { hour12: false }), result: newResult }, ...prev].slice(0, 10)
                    );
                  }
                  attendanceBook.current.set(face.id, now);
                } else if (face.status === "unknown" || face.status === "expired") {
                     setHistory((prev) =>
                      [{ time: new Date().toLocaleTimeString("vi-VN", { hour12: false }), result: newResult }, ...prev].slice(0, 10)
                    );
                }
              });

              setActiveDetections(currentFaces);
            } else {
              setActiveDetections([]);
            }
          } catch (err) {
            console.error("Lỗi gửi ảnh lên Backend:", err);
          } finally {
            setScanning(false);
            isProcessing.current = false;
            resolve();
          }
        },
        "image/jpeg",
        0.85
      );
    });
  };

  // ─── Recognition Loop (sequential) ────────────────────────────────────────
  useEffect(() => {
    let isRunning = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const loop = async () => {
      if (!isRunning || !isStreaming) return;
      await captureAndRecognize();
      if (isRunning) {
        timeoutId = setTimeout(loop, 400);
      }
    };

    if (isStreaming) loop();

    return () => {
      isRunning = false;
      clearTimeout(timeoutId);
    };
  }, [isStreaming]);

  // ─── Reset Loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      attendanceBook.current.forEach((lastSeen, id) => {
        if (now - lastSeen > 3000) {
          attendanceBook.current.delete(id);
        }
      });
    }, 2000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // ─── Start Camera ─────────────────────────────────────────────────────────
    const startCamera = async () => {
    setIsLoading(true);
    setError(null);

    // 1. QUAN TRỌNG: Dừng stream cũ để giải phóng camera (tránh lỗi "Camera is in use")
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      // Cấu hình video
      const videoConstraints: any = {
        facingMode: "user", // Camera trước
        // Mobile giảm độ phân giải lý tưởng xuống để tương thích tốt hơn
        // Laptop giữ nguyên độ phân giải cao
        width: isMobile ? { ideal: 640, max: 1280 } : { ideal: 1280 },
        height: isMobile ? { ideal: 480, max: 720 } : { ideal: 720 },
        frameRate: isMobile ? { ideal: 15, max: 30 } : { ideal: 30 },
      };

      // 2. Chỉ dùng advanced constraints trên Desktop (Mobile thường gây lỗi hoặc bỏ qua)
      if (!isMobile) {
        videoConstraints.advanced = [
          { exposureMode: "continuous" },
          { whiteBalanceMode: "continuous" },
        ];
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // 3. Chờ metadata load xong rồi mới play (Quan trọng trên Safari iOS)
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => {
              setIsStreaming(true);
            })
            .catch((err) => {
              console.error("Lỗi play video:", err);
              setError("Không thể phát video.");
            });
        };
      }
    } catch (err: any) {
      console.error("Lỗi Camera chi tiết:", err); // Xem log console để debug
      
      // Hiển thị lỗi chi tiết hơn cho user
      if (err.name === 'NotAllowedError') {
        setError("Bạn chưa cấp quyền Camera. Vui lòng kiểm tra cài đặt trình duyệt.");
      } else if (err.name === 'NotFoundError') {
        setError("Không tìm thấy Camera nào trên thiết bị.");
      } else if (err.name === 'OverconstrainedError') {
        setError("Độ phân giải camera không được hỗ trợ. Thử dùng trình duyệt khác.");
      } else {
        setError("Lỗi mở Camera: " + (err.message || "Không xác định"));
      }
    } finally {
      setIsLoading(false);
    }
  };
  // ─── Stop Camera ──────────────────────────────────────────────────────────
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
    setActiveDetections([]);
    attendanceBook.current.clear();
    setScanning(false);
    setLightLevel("ok");
  };

  const mainDetection = activeDetections.length > 0 ? activeDetections[0] : null;

  return (
    <div style={{ 
      padding: isMobile ? "12px" : "24px", 
      height: "100%", 
      overflowY: "auto", 
      fontFamily: "'Space Grotesk', sans-serif",
      maxWidth: "100vw",
      overflowX: "hidden",
    }}>

      {/* Header */}
      <div style={{ marginBottom: isMobile ? "16px" : "20px" }}>
        <h1 style={{ 
          fontSize: isMobile ? "18px" : "22px", 
          fontWeight: 700, 
          color: "#e2e8f0", 
          fontFamily: "'Orbitron', monospace", 
          letterSpacing: "1px",
          margin: 0,
        }}>
          NHẬN DIỆN TRỰC TIẾP
        </h1>
        <p style={{ 
          fontSize: isMobile ? "11px" : "13px", 
          color: "#4a6fa5", 
          marginTop: 4,
          marginBottom: 0,
        }}>
          Mô hình: face_recognition · Chế độ: Nhận diện 1 Lần & Treo Box
        </p>
      </div>

      {/* Mobile: Stack vertically, Desktop: Side by side */}
      <div style={{ 
        display: "flex", 
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? "16px" : "20px",
      }}>

        {/* ═══ CAMERA BLOCK ═══════════════════════════════════════════════ */}
        <div style={{ flex: isMobile ? "none" : 1 }}>
          <div style={{
            position: "relative",
            borderRadius: isMobile ? "12px" : "16px",
            overflow: "hidden",
            background: "#080d14",
            border: `1px solid ${isStreaming ? "#00d4ff50" : "#ffffff10"}`,
            aspectRatio: isMobile ? "3/4" : "16/9",
            width: "100%",
          }}>
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <video
  ref={videoRef}
  autoPlay
  playsInline  // << BẮT BUỘC CHO iOS
  muted        // << BẮT BUỘC CHO MOBILE ĐỂ TỰ ĐỘNG PLAY
  style={{
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: isStreaming ? "block" : "none",
    transform: "scaleX(-1)",
  }}
/>

            {!isStreaming && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: isMobile ? 12 : 16,
                padding: "20px",
                textAlign: "center",
              }}>
                <CameraOff size={isMobile ? 40 : 48} color="#4a6fa5" />
                <div style={{ color: "#4a6fa5", fontSize: isMobile ? "14px" : "16px" }}>
                  Camera đang tắt
                </div>
              </div>
            )}

            {error && (
              <div style={{
                position: "absolute", 
                bottom: isMobile ? 8 : 12, 
                left: isMobile ? 8 : 12, 
                right: isMobile ? 8 : 12,
                background: "rgba(255,45,85,0.15)", 
                border: "1px solid rgba(255,45,85,0.3)",
                borderRadius: "8px", 
                padding: isMobile ? "6px 10px" : "8px 12px", 
                fontSize: isMobile ? "11px" : "12px", 
                color: "#ff2d55", 
                textAlign: "center",
              }}>
                {error}
              </div>
            )}

            <AnimatePresence>
              {isStreaming && lightLevel !== "ok" && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -8 }}
                  style={{
                    position: "absolute", 
                    top: isMobile ? 8 : 12, 
                    left: "50%", 
                    transform: "translateX(-50%)",
                    background: "rgba(255, 200, 0, 0.15)", 
                    border: "1px solid rgba(255, 200, 0, 0.4)",
                    borderRadius: "20px", 
                    padding: isMobile ? "3px 10px" : "4px 14px", 
                    fontSize: isMobile ? "10px" : "11px", 
                    color: "#ffc800",
                    display: "flex", 
                    alignItems: "center", 
                    gap: 6, 
                    zIndex: 20,
                    maxWidth: "90%",
                    textAlign: "center",
                  }}
                >
                  {lightLevel === "dark" ? <Moon size={isMobile ? 10 : 12} /> : <Sun size={isMobile ? 10 : 12} />}
                  <span style={{ flex: 1 }}>
                    {lightLevel === "dark" ? "Rất tối" : "Ánh sáng yếu"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {isStreaming && <ScanLine />}

            {/* Vẽ MỌI khuôn mặt phát hiện được */}
            <AnimatePresence>
              {isStreaming && activeDetections.map((det, idx) => (
                det.box && (
                  <FaceBox
                    key={idx}
                    box={det.box}
                    status={det.status}
                    name={det.person?.name}
                    confidence={det.confidence}
                  />
                )
              ))}
            </AnimatePresence>
          </div>

          <div style={{ 
            display: "flex", 
            gap: isMobile ? 8 : 12, 
            marginTop: isMobile ? 12 : 16,
          }}>
            {!isStreaming ? (
              <button
                onClick={startCamera} 
                disabled={isLoading}
                style={{
                  flex: 1, 
                  padding: isMobile ? "14px" : "12px", 
                  borderRadius: isMobile ? "10px" : "12px", 
                  background: "#00d4ff20",
                  border: "1px solid #00d4ff50", 
                  color: "#00d4ff", 
                  cursor: isLoading ? "not-allowed" : "pointer",
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  gap: 8, 
                  opacity: isLoading ? 0.7 : 1, 
                  fontSize: isMobile ? "15px" : "14px",
                  fontWeight: 600,
                  minHeight: isMobile ? "48px" : "auto",
                }}
              >
                <Play size={isMobile ? 20 : 18} /> 
                {isLoading ? "Đang khởi động..." : "Bật Camera"}
              </button>
            ) : (
              <button
                onClick={stopCamera}
                style={{
                  flex: 1, 
                  padding: isMobile ? "14px" : "12px", 
                  borderRadius: isMobile ? "10px" : "12px", 
                  background: "#ff2d5520",
                  border: "1px solid #ff2d5550", 
                  color: "#ff2d55", 
                  cursor: "pointer",
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  gap: 8, 
                  fontSize: isMobile ? "15px" : "14px",
                  fontWeight: 600,
                  minHeight: isMobile ? "48px" : "auto",
                }}
              >
                <Square size={isMobile ? 20 : 18} /> 
                Dừng Camera
              </button>
            )}
          </div>
        </div>

        {/* ═══ PANEL KẾT QUẢ ══════════════════════════════════════════════ */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: isMobile ? 12 : 16,
          width: "100%",
          maxWidth: isMobile ? "100%" : "340px",
        }}>

          <div style={{ 
            background: "#ffffff05", 
            border: "1px solid #ffffff10", 
            borderRadius: isMobile ? "12px" : "16px", 
            padding: isMobile ? "16px" : "20px",
          }}>
            <div style={{ 
              fontSize: isMobile ? "11px" : "12px", 
              color: "#4a6fa5", 
              marginBottom: isMobile ? 12 : 16,
              fontWeight: 600,
            }}>
              TRẠNG THÁI AI
            </div>

            {scanning && !mainDetection ? (
              <div style={{ textAlign: "center", color: "#00d4ff" }}>
                <RefreshCw 
                  size={isMobile ? 20 : 24} 
                  style={{ 
                    margin: "0 auto 8px", 
                    display: "block", 
                    animation: "spin 1s linear infinite" 
                  }} 
                />
                <div style={{ fontSize: isMobile ? "13px" : "14px" }}>Đang xử lý...</div>
              </div>
            ) : mainDetection ? (
              <div style={{ textAlign: "center" }}>
                <div style={{
                  display: "inline-block", 
                  padding: isMobile ? "2px 8px" : "2px 10px", 
                  borderRadius: "20px", 
                  fontSize: isMobile ? "9px" : "10px", 
                  fontWeight: 700, 
                  marginBottom: isMobile ? 8 : 8,
                  background: mainDetection.status === "success" ? "rgba(0,255,136,0.1)" : "rgba(255,45,85,0.1)",
                  color: mainDetection.status === "success" ? "#00ff88" : "#ff2d55",
                  border: `1px solid ${mainDetection.status === "success" ? "rgba(0,255,136,0.3)" : "rgba(255,45,85,0.3)"}`,
                }}>
                  {mainDetection.status === "success" ? "✓ NHẬN DIỆN THÀNH CÔNG" : "✗ KHÔNG XÁC ĐỊNH"}
                </div>
                <div style={{ 
                  fontSize: isMobile ? "16px" : "18px", 
                  color: mainDetection.status === "success" ? "#00ff88" : "#ff2d55", 
                  fontWeight: 700, 
                  marginBottom: 4,
                  wordBreak: "break-word",
                }}>
                  {mainDetection.person?.name || "NGƯỜI LẠ"}
                </div>
                {mainDetection.confidence !== undefined && (
                  <>
                    <div style={{ 
                      fontSize: isMobile ? "11px" : "12px", 
                      color: "#4a6fa5", 
                      marginBottom: isMobile ? 6 : 8 
                    }}>
                      Độ chính xác: {mainDetection.confidence.toFixed(1)}%
                    </div>
                    <div style={{ 
                      height: 4, 
                      borderRadius: "2px", 
                      background: "rgba(255,255,255,0.05)", 
                      overflow: "hidden" 
                    }}>
                      <div style={{
                        height: "100%", 
                        width: `${mainDetection.confidence}%`,
                        background: mainDetection.status === "success" 
                          ? "linear-gradient(90deg, #00ff88, #00d4ff)" 
                          : "linear-gradient(90deg, #ff2d55, #ff6b6b)",
                        borderRadius: "2px", 
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div style={{ 
                textAlign: "center", 
                color: "#2d3f55",
                fontSize: isMobile ? "13px" : "14px",
                padding: isMobile ? "20px 0" : 0,
              }}>
                {isStreaming ? "Đang chờ phát hiện..." : "Bật camera để bắt đầu"}
              </div>
            )}
          </div>

          {/* Lịch sử */}
          <div style={{ 
            flex: isMobile ? "none" : 1, 
            background: "#ffffff05", 
            border: "1px solid #ffffff10", 
            borderRadius: isMobile ? "12px" : "16px", 
            padding: isMobile ? "12px" : "16px", 
            overflowY: "auto", 
            maxHeight: isMobile ? "250px" : "320px",
          }}>
            <div style={{ 
              fontSize: isMobile ? "11px" : "12px", 
              color: "#4a6fa5", 
              marginBottom: isMobile ? 10 : 12,
              fontWeight: 600,
            }}>
              LỊCH SỬ ĐIỂM DANH (1 LẦN/NGƯỜI)
            </div>
            {history.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                color: "#2d3f55", 
                fontSize: isMobile ? "11px" : "12px", 
                paddingTop: isMobile ? 16 : 20 
              }}>
                Chưa có lịch sử
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 6 : 8 }}>
                {history.map((h, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center", 
                      padding: isMobile ? "6px 8px" : "8px 10px",
                      background: "#ffffff05", 
                      borderRadius: isMobile ? "6px" : "8px", 
                      fontSize: isMobile ? "11px" : "12px",
                      borderLeft: `2px solid ${h.result.status === "success" ? "#00ff88" : "#ff2d55"}`,
                    }}
                  >
                    <span style={{ 
                      color: h.result.status === "success" ? "#00ff88" : "#ff2d55", 
                      fontWeight: "bold",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {h.result.person?.name || "Người lạ"}
                    </span>
                    <span style={{ 
                      color: "#4a6fa5",
                      marginLeft: 8,
                      flexShrink: 0,
                    }}>
                      {h.time}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}