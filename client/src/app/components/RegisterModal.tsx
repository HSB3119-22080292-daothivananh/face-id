// /**
//  * RegisterModal.tsx  — 3 bước đăng ký hoàn chỉnh
//  *
//  * Step 1: Tải ảnh CCCD mặt trước + mặt sau → hiện thông tin vào form
//  * Step 2: Quay video liveness HOẶC upload 5 ảnh góc mặt
//  * Step 3: Điền thông tin nhân viên + ngày hết hạn làm việc
//  */

// import { useState, useRef, useEffect } from "react";
// import { motion, AnimatePresence } from "motion/react";
// import {
//   X, Upload, Shield, Camera, CreditCard, QrCode,
//   ChevronRight, Check, User, RefreshCw, Calendar,
//   AlertTriangle, Info,
// } from "lucide-react";
// import { apiClient } from "../services/api";

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
//   special_features: string;
// }

// const CCCD_FIELDS: Array<{ key: keyof CCCDData; label: string; placeholder: string; full?: boolean }> = [
//   { key: "full_name",        label: "Họ và tên",          placeholder: "NGUYỄN VĂN A",                      full: true },
//   { key: "id_number",        label: "Số CCCD / CMND",     placeholder: "0XX XXX XXX XXX" },
//   { key: "dob",              label: "Ngày sinh",           placeholder: "01/01/1990" },
//   { key: "gender",           label: "Giới tính",           placeholder: "Nam / Nữ" },
//   { key: "nationality",      label: "Quốc tịch",           placeholder: "Việt Nam" },
//   { key: "hometown",         label: "Quê quán",            placeholder: "Tỉnh / Thành phố...",               full: true },
//   { key: "address",          label: "Nơi thường trú",      placeholder: "Số nhà, đường, phường, quận, TP", full: true },
//   { key: "expiry_date",      label: "Có giá trị đến",      placeholder: "01/01/2030" },
//   { key: "issue_date",       label: "Ngày cấp",            placeholder: "01/01/2020" },
//   { key: "special_features", label: "Đặc điểm nhận dạng", placeholder: "Sẹo, nốt ruồi...",                  full: true },
// ];

// // ─── QR parser ────────────────────────────────────────────────────────────────
// function parseCCCDQR(raw: string): Partial<CCCDData> | null {
//   const p = raw.split("|");
//   // Format mới: id|version|name|dob|gender|address|issue_date
//   if (p.length >= 6) {
//     return {
//       id_number:  p[0]?.trim(),
//       full_name:  p[2]?.trim(),
//       dob:        p[3]?.trim(),
//       gender:     p[4]?.trim(),
//       address:    p[5]?.trim(),
//       issue_date: p[6]?.trim() || "",
//     };
//   }
//   if (p.length >= 2) return { id_number: p[0]?.trim(), full_name: p[1]?.trim() };
//   return null;
// }

// async function decodeQR(file: File): Promise<string | null> {
//   return new Promise(resolve => {
//     const img = new Image();
//     img.onload = () => {
//       const c = document.createElement("canvas");
//       c.width = img.width; c.height = img.height;
//       const ctx = c.getContext("2d")!;
//       ctx.drawImage(img, 0, 0);
//       if ("BarcodeDetector" in window) {
//         const det = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
//         det.detect(c).then((r: any[]) => resolve(r[0]?.rawValue ?? null)).catch(() => resolve(null));
//       } else {
//         import("jsqr").then(({ default: jsQR }) => {
//           const d = ctx.getImageData(0, 0, c.width, c.height);
//           resolve(jsQR(d.data, d.width, d.height)?.data ?? null);
//         }).catch(() => resolve(null));
//       }
//     };
//     img.onerror = () => resolve(null);
//     img.src = URL.createObjectURL(file);
//   });
// }

// // ─── Liveness steps ───────────────────────────────────────────────────────────
// const STEPS = [
//   { icon: "😐", label: "Nhìn thẳng",    arrow: null,    ms: 2000 },
//   { icon: "👈", label: "Quay trái",      arrow: "left",  ms: 2500 },
//   { icon: "👉", label: "Quay phải",      arrow: "right", ms: 2500 },
//   { icon: "☝️", label: "Nhìn lên",       arrow: "up",    ms: 2000 },
//   { icon: "😉", label: "Chớp mắt",       arrow: null,    ms: 2000 },
//   { icon: "😊", label: "Mỉm cười",       arrow: null,    ms: 2000 },
// ] as const;

// // ═════════════════════════════════════════════════════════════════════════════
// // STEP 1 — CCCD Scanner
// // ═════════════════════════════════════════════════════════════════════════════
// function StepCCCD({ onNext }: { onNext: (data: Partial<CCCDData>, front: File | null, back: File | null) => void }) {
//   const [cccd,    setCccd]    = useState<Partial<CCCDData>>({ nationality: "Việt Nam" });
//   const [frontImg, setFrontImg] = useState<string>();
//   const [backImg,  setBackImg]  = useState<string>();
//   const [frontFile, setFrontFile] = useState<File | null>(null);
//   const [backFile,  setBackFile]  = useState<File | null>(null);
//   const [scanning,  setScanning]  = useState(false);
//   const [qrOk,      setQrOk]      = useState<boolean | null>(null);
//   const frontRef = useRef<HTMLInputElement>(null);
//   const backRef  = useRef<HTMLInputElement>(null);

//   const handleFront = (f: File) => {
//     setFrontFile(f);
//     setFrontImg(URL.createObjectURL(f));
//   };

//   const handleBack = async (f: File) => {
//     setBackFile(f);
//     setBackImg(URL.createObjectURL(f));
//     setScanning(true); setQrOk(null);
//     const raw = await decodeQR(f);
//     setScanning(false);
//     if (raw) {
//       const parsed = parseCCCDQR(raw);
//       if (parsed) { setCccd(p => ({ ...p, ...parsed })); setQrOk(true); return; }
//     }
//     setQrOk(false);
//   };

//   const inputStyle: React.CSSProperties = {
//     width: "100%", padding: "9px 12px", borderRadius: "9px",
//     background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,212,255,0.15)",
//     color: "#e2e8f0", fontSize: "12px", outline: "none",
//     fontFamily: "'Space Grotesk',sans-serif", boxSizing: "border-box",
//   };

//   const canNext = !!frontImg && !!cccd.full_name?.trim();

//   return (
//     <div>
//       <div style={{ fontSize:"12px", color:"#4a6fa5", marginBottom:14 }}>
//         Tải ảnh 2 mặt CCCD — QR mặt sau sẽ tự động điền thông tin
//       </div>

//       {/* Card upload row */}
//       <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
//         {/* Front */}
//         <div>
//           <div style={{ fontSize:"11px", color:"#4a6fa5", marginBottom:5, display:"flex", alignItems:"center", gap:4 }}>
//             <CreditCard size={11}/> Mặt trước
//           </div>
//           <div onClick={() => frontRef.current?.click()}
//             style={{ aspectRatio:"85.6/54", borderRadius:"10px", overflow:"hidden",
//               border:`2px dashed ${frontImg?"rgba(0,200,80,0.5)":"rgba(0,200,80,0.2)"}`,
//               background:`${frontImg?"transparent":"rgba(0,200,80,0.03)"}`,
//               cursor:"pointer", position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
//             <input ref={frontRef} type="file" accept="image/*" style={{ display:"none" }}
//               onChange={e => e.target.files?.[0] && handleFront(e.target.files[0])} />
//             {frontImg
//               ? <img src={frontImg} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
//               : <div style={{ textAlign:"center" }}>
//                   <Upload size={18} color="#2a5a3a" style={{ marginBottom:3 }}/>
//                   <div style={{ fontSize:"8px", color:"#2a5a3a" }}>Chọn ảnh</div>
//                 </div>
//             }
//             {frontImg && <div style={{ position:"absolute", top:4, right:4, width:18, height:18, borderRadius:"50%", background:"#00ff88", display:"flex", alignItems:"center", justifyContent:"center" }}><Check size={10} color="#000"/></div>}
//           </div>
//         </div>

//         {/* Back */}
//         <div>
//           <div style={{ fontSize:"11px", color:"#4a6fa5", marginBottom:5, display:"flex", alignItems:"center", gap:4 }}>
//             <QrCode size={11}/> Mặt sau (có QR)
//           </div>
//           <div onClick={() => backRef.current?.click()}
//             style={{ aspectRatio:"85.6/54", borderRadius:"10px", overflow:"hidden",
//               border:`2px dashed ${backImg?(qrOk===true?"rgba(0,255,136,0.5)":qrOk===false?"rgba(255,200,0,0.4)":"rgba(0,212,255,0.3)"):"rgba(0,212,255,0.2)"}`,
//               background:"rgba(0,212,255,0.02)", cursor:"pointer", position:"relative",
//               display:"flex", alignItems:"center", justifyContent:"center" }}>
//             <input ref={backRef} type="file" accept="image/*" style={{ display:"none" }}
//               onChange={e => e.target.files?.[0] && handleBack(e.target.files[0])} />
//             {backImg
//               ? <>
//                   <img src={backImg} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
//                   {scanning && (
//                     <motion.div animate={{ top:["0%","100%","0%"] }} transition={{ duration:1.5, repeat:Infinity }}
//                       style={{ position:"absolute", left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,#00d4ff,transparent)", boxShadow:"0 0 8px #00d4ff", pointerEvents:"none" }}/>
//                   )}
//                   <div style={{ position:"absolute", top:4, right:4, width:18, height:18, borderRadius:"50%", background:qrOk===true?"#00ff88":qrOk===false?"#ffc800":"rgba(0,212,255,0.8)", display:"flex", alignItems:"center", justifyContent:"center" }}>
//                     {qrOk===true?<Check size={10} color="#000"/>:qrOk===false?<span style={{fontSize:"10px"}}>!</span>:<RefreshCw size={9} color="#fff"/>}
//                   </div>
//                 </>
//               : <div style={{ textAlign:"center" }}>
//                   <QrCode size={18} color="#2a4060" style={{ marginBottom:3 }}/>
//                   <div style={{ fontSize:"8px", color:"#2a4060" }}>Tự động quét QR</div>
//                 </div>
//             }
//           </div>
//           {qrOk===true && <div style={{ fontSize:"10px", color:"#00ff88", textAlign:"center", marginTop:3 }}>✓ Đọc QR thành công</div>}
//           {qrOk===false && <div style={{ fontSize:"10px", color:"#ffc800", textAlign:"center", marginTop:3 }}>⚠ Điền thông tin tay bên dưới</div>}
//         </div>
//       </div>

//       {/* Info form */}
//       <div style={{ background:"rgba(0,200,80,0.03)", border:"1px solid rgba(0,200,80,0.1)", borderRadius:"12px", padding:"14px", marginBottom:16 }}>
//         <div style={{ fontSize:"11px", color:"#00c840", marginBottom:12, display:"flex", alignItems:"center", gap:5 }}>
//           <Info size={11}/> Thông tin căn cước — kiểm tra và bổ sung nếu cần
//         </div>
//         <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
//           {CCCD_FIELDS.map(f => (
//             <div key={f.key} style={{ gridColumn: f.full ? "1/-1" : "auto" }}>
//               <label style={{ fontSize:"10px", color:"#4a8a5a", display:"block", marginBottom:3 }}>{f.label}</label>
//               <input
//                 value={cccd[f.key] || ""}
//                 onChange={e => setCccd(p => ({ ...p, [f.key]: e.target.value }))}
//                 placeholder={f.placeholder}
//                 style={inputStyle}
//               />
//             </div>
//           ))}
//         </div>
//       </div>

//       <button onClick={() => onNext(cccd, frontFile, backFile)} disabled={!canNext}
//         style={{ width:"100%", padding:"12px", borderRadius:"12px",
//           background: canNext ? "linear-gradient(135deg,#00c840,#00d4ff)" : "rgba(255,255,255,0.04)",
//           border:"none", color: canNext ? "#fff" : "#2d4060",
//           cursor: canNext ? "pointer" : "not-allowed",
//           fontSize:"13px", fontWeight:600, fontFamily:"'Space Grotesk',sans-serif",
//           display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
//         Tiếp theo — Chụp ảnh khuôn mặt <ChevronRight size={15}/>
//       </button>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // STEP 2 — Face Capture (Liveness video OR upload 5 photos)
// // ═════════════════════════════════════════════════════════════════════════════
// function StepFace({ onNext, onBack }: { onNext: (files: File[]) => void; onBack: () => void }) {
//   const [mode, setMode] = useState<"choose"|"liveness"|"upload">("choose");
//   const [files, setFiles] = useState<File[]>([]);
//   const [previews, setPreviews] = useState<string[]>([]);
//   const fileRef = useRef<HTMLInputElement>(null);

//   // Liveness state
//   const videoRef  = useRef<HTMLVideoElement>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const timerRef  = useRef<ReturnType<typeof setTimeout>>();
//   const running   = useRef(false);
//   const liveFiles = useRef<File[]>([]);

//   const [livePhase,    setLivePhase]    = useState<"intro"|"active"|"done">("intro");
//   const [liveStepIdx,  setLiveStepIdx]  = useState(0);
//   const [liveProgress, setLiveProgress] = useState(0);
//   const [liveCaptures, setLiveCaptures] = useState<string[]>([]);

//   useEffect(() => () => {
//     running.current = false;
//     clearTimeout(timerRef.current);
//     streamRef.current?.getTracks().forEach(t => t.stop());
//   }, []);

//   // ── Liveness logic ──
//   const snapFrame = (): Promise<void> => new Promise(resolve => {
//     if (!videoRef.current || !canvasRef.current) return resolve();
//     const v = videoRef.current, c = canvasRef.current;
//     c.width = 640; c.height = 480;
//     const ctx = c.getContext("2d")!;
//     ctx.save(); ctx.scale(-1,1); ctx.drawImage(v,-640,0,640,480); ctx.restore();
//     const url = c.toDataURL("image/jpeg", 0.88);
//     c.toBlob(blob => {
//       const f = new File([blob!], `live_${Date.now()}.jpg`, { type:"image/jpeg" });
//       liveFiles.current = [...liveFiles.current, f];
//       setLiveCaptures(p => [...p, url]);
//       resolve();
//     }, "image/jpeg", 0.88);
//   });

//   const runLiveStep = (idx: number) => {
//     if (!running.current || idx >= STEPS.length) return;
//     setLiveStepIdx(idx); setLiveProgress(0);
//     const start = Date.now();
//     const tick = () => {
//       if (!running.current) return;
//       const pct = Math.min(100, ((Date.now()-start)/STEPS[idx].ms)*100);
//       setLiveProgress(pct);
//       if (pct < 100) { timerRef.current = setTimeout(tick, 30); }
//       else snapFrame().then(() => {
//         const next = idx + 1;
//         if (next < STEPS.length) runLiveStep(next);
//         else { running.current = false; setLivePhase("done"); }
//       });
//     };
//     timerRef.current = setTimeout(tick, 30);
//   };

//   const startLiveness = async () => {
//     running.current = true; liveFiles.current = [];
//     const s = await navigator.mediaDevices.getUserMedia({ video:{ width:640, height:480, facingMode:"user" } });
//     streamRef.current = s;
//     if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
//     setLivePhase("active"); setLiveCaptures([]);
//     runLiveStep(0);
//   };

//   const stopLiveness = () => {
//     running.current = false; clearTimeout(timerRef.current);
//     streamRef.current?.getTracks().forEach(t => t.stop());
//     setLivePhase("intro"); setLiveCaptures([]);
//   };

//   const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const fs = Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/")).slice(0, 5-files.length);
//     setFiles(p=>[...p,...fs]);
//     fs.forEach(f=>{const r=new FileReader();r.onload=ev=>setPreviews(p=>[...p,ev.target?.result as string]);r.readAsDataURL(f);});
//   };

//   const cur = STEPS[liveStepIdx];

//   // ── Choose mode ──
//   if (mode === "choose") return (
//     <div>
//       <div style={{ fontSize:"12px", color:"#4a6fa5", marginBottom:16 }}>
//         Chọn cách thu thập ảnh khuôn mặt để nhận diện
//       </div>
//       <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
//         {[
//           { id:"liveness", emoji:"🔐", title:"Quay video liveness", sub:"Giống đăng ký ngân hàng — nhìn trái · phải · lên · chớp mắt · mỉm cười (6 góc tự động)", color:"#00d4ff" },
//           { id:"upload",   emoji:"🖼️", title:"Tải 5 ảnh lên",      sub:"Upload 5 ảnh khuôn mặt từ các góc độ khác nhau",                                             color:"#8b5cf6" },
//         ].map(m=>(
//           <motion.div key={m.id} whileHover={{x:4}} whileTap={{scale:0.98}}
//             onClick={()=>setMode(m.id as any)}
//             style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px",
//               borderRadius:"14px", background:`${m.color}06`, border:`1px solid ${m.color}18`,
//               cursor:"pointer", transition:"all 0.2s" }}
//             onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background=`${m.color}10`;(e.currentTarget as HTMLDivElement).style.borderColor=`${m.color}40`;}}
//             onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background=`${m.color}06`;(e.currentTarget as HTMLDivElement).style.borderColor=`${m.color}18`;}}
//           >
//             <span style={{ fontSize:"26px",flexShrink:0 }}>{m.emoji}</span>
//             <div style={{ flex:1 }}>
//               <div style={{ fontSize:"14px",color:"#e2e8f0",fontWeight:600 }}>{m.title}</div>
//               <div style={{ fontSize:"11px",color:"#4a6fa5",marginTop:2,lineHeight:1.4 }}>{m.sub}</div>
//             </div>
//             <ChevronRight size={16} color={m.color}/>
//           </motion.div>
//         ))}
//       </div>
//       <button onClick={onBack} style={{ width:"100%",padding:"10px",borderRadius:"10px",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",color:"#7a95b8",cursor:"pointer",fontSize:"12px",fontFamily:"'Space Grotesk',sans-serif" }}>← Quay lại</button>
//     </div>
//   );

//   // ── Liveness mode ──
//   if (mode === "liveness") return (
//     <div>
//       {livePhase === "intro" && (
//         <div style={{ textAlign:"center" }}>
//           <div style={{ width:68,height:68,borderRadius:"50%",background:"linear-gradient(135deg,rgba(0,212,255,0.12),rgba(139,92,246,0.12))",border:"2px solid rgba(0,212,255,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px" }}>
//             <Camera size={30} color="#00d4ff"/>
//           </div>
//           <div style={{ fontSize:"15px",color:"#e2e8f0",fontWeight:600,marginBottom:8 }}>Xác thực khuôn mặt</div>
//           <div style={{ display:"flex",justifyContent:"center",gap:8,marginBottom:20,flexWrap:"wrap" }}>
//             {STEPS.map((s,i)=>(
//               <div key={i} style={{ padding:"8px 10px",borderRadius:"10px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",textAlign:"center",minWidth:62 }}>
//                 <div style={{ fontSize:"20px",marginBottom:3 }}>{s.icon}</div>
//                 <div style={{ fontSize:"9px",color:"#4a6fa5",lineHeight:1.2 }}>{s.label}</div>
//               </div>
//             ))}
//           </div>
//           <button onClick={startLiveness} style={{ width:"100%",padding:"12px",borderRadius:"12px",background:"linear-gradient(135deg,#00d4ff,#8b5cf6)",border:"none",color:"#fff",fontSize:"14px",fontWeight:600,cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
//             <Camera size={18}/> Bắt đầu xác thực
//           </button>
//         </div>
//       )}

//       {livePhase === "active" && (
//         <div style={{ position:"relative",borderRadius:"16px",overflow:"hidden",background:"#020408",aspectRatio:"4/3",border:"2px solid rgba(0,212,255,0.2)" }}>
//           <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%",height:"100%",objectFit:"cover",transform:"scaleX(-1)" }}/>
//           <canvas ref={canvasRef} style={{ display:"none" }}/>
//           <div style={{ position:"absolute",inset:0,background:"radial-gradient(ellipse 55% 65% at center,transparent 40%,rgba(0,0,0,0.65) 100%)",pointerEvents:"none" }}/>
//           <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-55%)",width:"40%",height:"60%",border:"2px solid rgba(0,212,255,0.6)",borderRadius:"50%",boxShadow:"0 0 0 9999px rgba(0,0,0,0.35),0 0 24px rgba(0,212,255,0.3)",pointerEvents:"none" }}/>
//           {cur?.arrow && (
//             <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)" }}>
//               <motion.div animate={{ x:cur.arrow==="left"?[-10,0,-10]:cur.arrow==="right"?[10,0,10]:0, y:cur.arrow==="up"?[-10,0,-10]:0 }} transition={{ duration:0.7,repeat:Infinity }}>
//                 <span style={{ fontSize:"36px",filter:"drop-shadow(0 0 8px #00d4ff)" }}>
//                   {cur.arrow==="left"?"👈":cur.arrow==="right"?"👉":"☝️"}
//                 </span>
//               </motion.div>
//             </div>
//           )}
//           <div style={{ position:"absolute",bottom:0,left:0,right:0,padding:"12px 14px 10px",background:"linear-gradient(to top,rgba(0,0,0,0.92) 0%,transparent 100%)" }}>
//             <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
//               <motion.span key={liveStepIdx} initial={{scale:1.5,opacity:0}} animate={{scale:1,opacity:1}} style={{ fontSize:"22px" }}>{cur?.icon}</motion.span>
//               <div style={{ flex:1 }}>
//                 <div style={{ fontSize:"10px",color:"#4a6fa5" }}>Bước {liveStepIdx+1}/{STEPS.length}</div>
//                 <motion.div key={`l${liveStepIdx}`} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} style={{ fontSize:"14px",color:"#e2e8f0",fontWeight:700 }}>{cur?.label}</motion.div>
//               </div>
//               <button onClick={stopLiveness} style={{ padding:"4px 10px",borderRadius:"7px",background:"rgba(255,45,85,0.15)",border:"1px solid rgba(255,45,85,0.3)",color:"#ff2d55",cursor:"pointer",fontSize:"11px",fontFamily:"'Space Grotesk',sans-serif" }}>Hủy</button>
//             </div>
//             <div style={{ height:4,borderRadius:"2px",background:"rgba(255,255,255,0.1)",overflow:"hidden" }}>
//               <div style={{ height:"100%",width:`${liveProgress}%`,background:"linear-gradient(90deg,#00d4ff,#8b5cf6)",transition:"width 0.03s" }}/>
//             </div>
//             <div style={{ display:"flex",gap:5,marginTop:6,justifyContent:"center" }}>
//               {STEPS.map((_,i)=>(
//                 <div key={i} style={{ width:i===liveStepIdx?18:6,height:6,borderRadius:"3px",background:i<liveStepIdx?"#00ff88":i===liveStepIdx?"#00d4ff":"rgba(255,255,255,0.12)",transition:"all 0.3s",boxShadow:i===liveStepIdx?"0 0 8px #00d4ff":"none" }}/>
//               ))}
//             </div>
//           </div>
//         </div>
//       )}

//       {livePhase === "done" && (
//         <div style={{ textAlign:"center" }}>
//           <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",stiffness:280,damping:20}}
//             style={{ width:68,height:68,borderRadius:"50%",background:"rgba(0,255,136,0.12)",border:"2px solid #00ff88",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
//             <Check size={30} color="#00ff88"/>
//           </motion.div>
//           <div style={{ fontSize:"15px",color:"#00ff88",fontWeight:700,marginBottom:5 }}>Liveness thành công!</div>
//           <div style={{ display:"flex",gap:5,justifyContent:"center",flexWrap:"wrap",marginBottom:14 }}>
//             {liveCaptures.map((s,i)=>(
//               <div key={i} style={{ position:"relative",width:50,height:50,borderRadius:"8px",overflow:"hidden",border:"1px solid rgba(0,255,136,0.3)" }}>
//                 <img src={s} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
//                 <div style={{ position:"absolute",bottom:1,right:1,background:"rgba(0,0,0,0.7)",borderRadius:"3px",padding:"1px 2px",fontSize:"9px" }}>{STEPS[i]?.icon}</div>
//               </div>
//             ))}
//           </div>
//           <div style={{ display:"flex",gap:8 }}>
//             <button onClick={()=>{setLivePhase("intro");setLiveCaptures([]);liveFiles.current=[];}}
//               style={{ flex:1,padding:"9px",borderRadius:"10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#7a95b8",cursor:"pointer",fontSize:"12px",fontFamily:"'Space Grotesk',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:5 }}>
//               <RefreshCw size={12}/> Chụp lại
//             </button>
//             <button onClick={()=>onNext(liveFiles.current)}
//               style={{ flex:2,padding:"9px",borderRadius:"10px",background:"linear-gradient(135deg,#00d4ff,#8b5cf6)",border:"none",color:"#fff",cursor:"pointer",fontSize:"13px",fontWeight:600,fontFamily:"'Space Grotesk',sans-serif" }}>
//               Tiếp theo →
//             </button>
//           </div>
//         </div>
//       )}

//       {livePhase !== "active" && (
//         <button onClick={()=>setMode("choose")} style={{ width:"100%",marginTop:10,padding:"8px",borderRadius:"10px",background:"transparent",border:"1px solid rgba(255,255,255,0.06)",color:"#4a6fa5",cursor:"pointer",fontSize:"11px",fontFamily:"'Space Grotesk',sans-serif" }}>← Chọn lại phương thức</button>
//       )}
//     </div>
//   );

//   // ── Upload mode ──
//   return (
//     <div>
//       <div style={{ fontSize:"12px",color:"#4a6fa5",marginBottom:12 }}>
//         Tải lên 5 ảnh khuôn mặt từ các góc: thẳng, trái, phải, lên, nghiêng
//       </div>
//       <div onClick={()=>fileRef.current?.click()}
//         style={{ padding:"24px",borderRadius:"14px",border:`2px dashed ${files.length>=5?"rgba(0,255,136,0.4)":"rgba(139,92,246,0.3)"}`,background:"rgba(139,92,246,0.02)",cursor:"pointer",textAlign:"center",marginBottom:12 }}
//         onMouseEnter={e=>(e.currentTarget.style.borderColor="rgba(139,92,246,0.6)")}
//         onMouseLeave={e=>(e.currentTarget.style.borderColor=files.length>=5?"rgba(0,255,136,0.4)":"rgba(139,92,246,0.3)")}
//       >
//         <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleUpload} style={{ display:"none" }}/>
//         <Upload size={24} color="#4a6fa5" style={{ marginBottom:8 }}/>
//         <div style={{ fontSize:"12px",color:"#7a95b8",fontWeight:600 }}>Chọn tối đa 5 ảnh ({files.length}/5)</div>
//         <div style={{ fontSize:"10px",color:"#2d4060",marginTop:3 }}>Mỗi ảnh 1 góc mặt khác nhau</div>
//       </div>
//       {previews.length>0 && (
//         <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:12 }}>
//           {previews.map((src,i)=>(
//             <div key={i} style={{ position:"relative",aspectRatio:"1",borderRadius:"8px",overflow:"hidden",border:"1px solid rgba(139,92,246,0.3)" }}>
//               <img src={src} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
//               <button onClick={()=>{setFiles(f=>f.filter((_,j)=>j!==i));setPreviews(p=>p.filter((_,j)=>j!==i));}}
//                 style={{ position:"absolute",top:2,right:2,width:16,height:16,borderRadius:"50%",background:"rgba(0,0,0,0.8)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
//                 <X size={9} color="#ff6b6b"/>
//               </button>
//             </div>
//           ))}
//           {files.length<5 && <div onClick={()=>fileRef.current?.click()} style={{ aspectRatio:"1",borderRadius:"8px",border:"1px dashed rgba(139,92,246,0.2)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}><span style={{ fontSize:"18px",color:"#2d4060" }}>+</span></div>}
//         </div>
//       )}
//       <div style={{ display:"flex",gap:8 }}>
//         <button onClick={()=>setMode("choose")} style={{ flex:1,padding:"10px",borderRadius:"10px",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",color:"#7a95b8",cursor:"pointer",fontSize:"12px",fontFamily:"'Space Grotesk',sans-serif" }}>← Quay lại</button>
//         <button onClick={()=>onNext(files)} disabled={files.length===0}
//           style={{ flex:2,padding:"10px",borderRadius:"10px",background:files.length>0?"linear-gradient(135deg,#8b5cf6,#00d4ff)":"rgba(255,255,255,0.04)",border:"none",color:files.length>0?"#fff":"#2d4060",cursor:files.length>0?"pointer":"not-allowed",fontSize:"13px",fontWeight:600,fontFamily:"'Space Grotesk',sans-serif" }}>
//           Tiếp theo →
//         </button>
//       </div>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // STEP 3 — Employee info + work expiry
// // ═════════════════════════════════════════════════════════════════════════════
// function StepInfo({
//   defaultName, onSubmit, onBack, submitting, error,
// }: {
//   defaultName: string;
//   onSubmit: (data: { name:string; role:string; dept:string; expiry:string }) => void;
//   onBack: () => void;
//   submitting: boolean;
//   error: string;
// }) {
//   const [name,   setName]   = useState(defaultName);
//   const [role,   setRole]   = useState("");
//   const [dept,   setDept]   = useState("");
//   const [expiry, setExpiry] = useState("");  // YYYY-MM-DD

//   const inputStyle: React.CSSProperties = {
//     width:"100%", padding:"10px 14px", borderRadius:"10px",
//     background:"rgba(255,255,255,0.03)", border:"1px solid rgba(0,212,255,0.15)",
//     color:"#e2e8f0", fontSize:"14px", outline:"none",
//     fontFamily:"'Space Grotesk',sans-serif", boxSizing:"border-box",
//   };

//   const expiryWarning = expiry && new Date(expiry) < new Date();

//   return (
//     <div>
//       <div style={{ fontSize:"12px",color:"#4a6fa5",marginBottom:14 }}>Thông tin công việc — chức vụ và thời hạn làm việc</div>
//       <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
//         {[
//           { label:"Họ và tên *", v:name, set:setName, ph:"Nguyễn Văn A" },
//           { label:"Chức vụ / Vị trí", v:role, set:setRole, ph:"Kỹ sư, Nhân viên, Quản lý..." },
//           { label:"Phòng ban", v:dept, set:setDept, ph:"Kỹ thuật / Marketing / Nhân sự..." },
//         ].map(f=>(
//           <div key={f.label}>
//             <label style={{ fontSize:"12px",color:"#4a6fa5",display:"block",marginBottom:6 }}>{f.label}</label>
//             <input value={f.v} onChange={e=>f.set(e.target.value)} placeholder={f.ph} style={inputStyle}/>
//           </div>
//         ))}

//         {/* Work expiry date */}
//         <div>
//           <label style={{ fontSize:"12px",color:"#4a6fa5",display:"block",marginBottom:6 }}>
//             Thời hạn làm việc
//             <span style={{ fontSize:"10px",color:"#2d4060",marginLeft:8 }}>(để trống = không giới hạn)</span>
//           </label>
//           <div style={{ position:"relative" }}>
//             <input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)}
//               style={{ ...inputStyle, paddingRight:36 }}/>
//             <Calendar size={14} color="#4a6fa5" style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none" }}/>
//           </div>
//           {expiry && (
//             <div style={{ marginTop:6,padding:"8px 10px",borderRadius:"8px",
//               background:expiryWarning?"rgba(255,45,85,0.08)":"rgba(0,212,255,0.05)",
//               border:`1px solid ${expiryWarning?"rgba(255,45,85,0.2)":"rgba(0,212,255,0.15)"}`,
//               fontSize:"11px",color:expiryWarning?"#ff6b6b":"#00d4ff",
//               display:"flex",alignItems:"center",gap:6 }}>
//               {expiryWarning
//                 ? <><AlertTriangle size={12}/> Ngày đã qua — nhân viên sẽ không được nhận diện</>
//                 : <><Check size={12}/> Hết hạn vào {new Date(expiry).toLocaleDateString("vi-VN")} — sau ngày này khuôn mặt sẽ bị từ chối</>
//               }
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Expiry explanation */}
//       <div style={{ marginTop:12,padding:"10px 12px",borderRadius:"10px",background:"rgba(255,200,0,0.04)",border:"1px solid rgba(255,200,0,0.12)",fontSize:"11px",color:"#7a6520",lineHeight:1.5 }}>
//         ⏱ Khi đến ngày hết hạn, hệ thống sẽ tự động từ chối nhận diện khuôn mặt của nhân viên này mà không cần xóa dữ liệu.
//       </div>

//       {error && <div style={{ marginTop:10,padding:"9px",borderRadius:"8px",background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.3)",color:"#ff6b6b",fontSize:"12px",textAlign:"center" }}>{error}</div>}

//       <div style={{ display:"flex",gap:10,marginTop:18 }}>
//         <button onClick={onBack} style={{ flex:1,padding:"11px",borderRadius:"10px",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",color:"#7a95b8",cursor:"pointer",fontSize:"13px",fontFamily:"'Space Grotesk',sans-serif" }}>← Quay lại</button>
//         <button onClick={()=>onSubmit({name,role,dept,expiry})} disabled={!name.trim()||submitting}
//           style={{ flex:2,padding:"11px",borderRadius:"10px",background:name.trim()?"linear-gradient(135deg,#00d4ff,#8b5cf6)":"rgba(255,255,255,0.04)",border:"none",color:name.trim()?"#fff":"#2d4060",cursor:name.trim()?"pointer":"not-allowed",fontSize:"14px",fontWeight:600,fontFamily:"'Space Grotesk',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:6,opacity:submitting?0.7:1 }}>
//           <Shield size={15}/> {submitting?"Đang đăng ký...":"Đăng ký nhân viên"}
//         </button>
//       </div>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // Main RegisterModal
// // ═════════════════════════════════════════════════════════════════════════════
// interface Props { onClose: ()=>void; onSuccess: ()=>void; }

// export function RegisterModal({ onClose, onSuccess }: Props) {
//   const [step,       setStep]       = useState<1|2|3|4>(1);
//   const [cccdData,   setCccdData]   = useState<Partial<CCCDData>>({});
//   const [cccdFront,  setCccdFront]  = useState<File|null>(null);
//   const [cccdBack,   setCccdBack]   = useState<File|null>(null);
//   const [faceFiles,  setFaceFiles]  = useState<File[]>([]);
//   const [submitting, setSubmitting] = useState(false);
//   const [error,      setError]      = useState("");

//   const handleCCCDNext = (data: Partial<CCCDData>, front: File|null, back: File|null) => {
//     setCccdData(data); setCccdFront(front); setCccdBack(back);
//     setStep(2);
//   };

//   const handleFaceNext = (files: File[]) => {
//     setFaceFiles(files); setStep(3);
//   };

//   const handleSubmit = async ({ name, role, dept, expiry }: { name:string; role:string; dept:string; expiry:string }) => {
//     if (faceFiles.length === 0) { setError("Cần ít nhất 1 ảnh khuôn mặt"); return; }
//     try {
//       setSubmitting(true); setError(""); setStep(4);
//       const fd = new FormData();
//       fd.append("name", name);
//       fd.append("role", role);
//       fd.append("department", dept);
//       if (expiry) fd.append("work_expiry_date", expiry);

//       // CCCD images
//       if (cccdFront) fd.append("cccd_front", cccdFront);
//       if (cccdBack)  fd.append("cccd_back",  cccdBack);

//       // CCCD info as JSON
//       fd.append("cccd_info", JSON.stringify(cccdData));

//       // Face images
//       faceFiles.forEach(f => fd.append("images", f));

//       await apiClient.registerFace(fd);
//       setTimeout(() => { onSuccess(); onClose(); }, 1200);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Lỗi đăng ký");
//       setStep(3); setSubmitting(false);
//     }
//   };

//   const STEP_LABELS = ["", "Thông tin CCCD", "Ảnh khuôn mặt", "Thông tin công việc", "Đang xử lý"];
//   const progress = step <= 3 ? ((step-1)/3)*100 : 100;

//   return (
//     <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
//       style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(18px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16 }}
//       onClick={submitting?undefined:onClose}
//     >
//       <motion.div initial={{scale:0.92,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.9,opacity:0}}
//         onClick={e=>e.stopPropagation()}
//         style={{ width:"100%",maxWidth:580,maxHeight:"93vh",overflowY:"auto",background:"#07101a",border:"1px solid rgba(0,212,255,0.18)",borderRadius:"22px",boxShadow:"0 0 100px rgba(0,212,255,0.07),0 24px 80px rgba(0,0,0,0.7)",fontFamily:"'Space Grotesk',sans-serif" }}
//       >
//         {/* Header */}
//         <div style={{ padding:"18px 22px 14px",borderBottom:"1px solid rgba(0,212,255,0.08)",position:"sticky",top:0,background:"#07101a",zIndex:10,borderRadius:"22px 22px 0 0" }}>
//           <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
//             <div>
//               <h2 style={{ fontSize:"14px",color:"#e2e8f0",fontFamily:"'Orbitron',monospace",margin:0,letterSpacing:"1px" }}>ĐĂNG KÝ NHÂN VIÊN</h2>
//               <p style={{ fontSize:"11px",color:"#4a6fa5",margin:"2px 0 0" }}>{step<=3?STEP_LABELS[step]:STEP_LABELS[4]}</p>
//             </div>
//             {!submitting && <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"#4a6fa5",padding:4 }}><X size={20}/></button>}
//           </div>

//           {/* Step indicator */}
//           <div style={{ display:"flex",gap:6,marginBottom:8 }}>
//             {[1,2,3].map(s=>(
//               <div key={s} style={{ flex:1,display:"flex",alignItems:"center",gap:6 }}>
//                 <div style={{ width:22,height:22,borderRadius:"50%",background:step>s?"#00ff88":step===s?"#00d4ff":"rgba(255,255,255,0.06)",border:`1px solid ${step>s?"#00ff88":step===s?"#00d4ff":"rgba(255,255,255,0.1)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",color:step>=s?"#000":"#4a6fa5",fontWeight:700,flexShrink:0,transition:"all 0.3s" }}>
//                   {step>s?<Check size={12}/>:s}
//                 </div>
//                 <div style={{ flex:1,height:2,borderRadius:"1px",background:step>s?"rgba(0,255,136,0.4)":step===s?"rgba(0,212,255,0.3)":"rgba(255,255,255,0.06)",transition:"all 0.3s" }}/>
//               </div>
//             ))}
//             <div style={{ width:22,height:22,borderRadius:"50%",background:step>3?"#00ff88":"rgba(255,255,255,0.06)",border:`1px solid ${step>3?"#00ff88":"rgba(255,255,255,0.1)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",color:step>3?"#000":"#4a6fa5",fontWeight:700,transition:"all 0.3s" }}>
//               {step>3?<Check size={12}/>:3}
//             </div>
//           </div>

//           {/* Step labels */}
//           <div style={{ display:"flex",justifyContent:"space-between" }}>
//             {["CCCD","Ảnh mặt","Công việc"].map((l,i)=>(
//               <div key={l} style={{ fontSize:"9px",color:step===i+1?"#00d4ff":step>i+1?"#00ff88":"#2d4060",fontWeight:step===i+1?600:400,transition:"all 0.3s",flex:1,textAlign:i===0?"left":i===2?"right":"center" }}>{l}</div>
//             ))}
//           </div>
//         </div>

//         <div style={{ padding:"20px 22px 24px" }}>
//           <AnimatePresence mode="wait">
//             {step===1 && <motion.div key="s1" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}><StepCCCD onNext={handleCCCDNext}/></motion.div>}
//             {step===2 && <motion.div key="s2" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}><StepFace onNext={handleFaceNext} onBack={()=>setStep(1)}/></motion.div>}
//             {step===3 && <motion.div key="s3" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}><StepInfo defaultName={cccdData.full_name||""} onSubmit={handleSubmit} onBack={()=>setStep(2)} submitting={submitting} error={error}/></motion.div>}
//             {step===4 && (
//               <motion.div key="s4" initial={{opacity:0}} animate={{opacity:1}} style={{ textAlign:"center",padding:"28px 0" }}>
//                 <motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}} style={{ display:"inline-block",marginBottom:16 }}>
//                   <div style={{ width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,#00d4ff,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center" }}>
//                     <Shield size={30} color="#fff"/>
//                   </div>
//                 </motion.div>
//                 <div style={{ fontSize:"15px",color:"#e2e8f0",fontWeight:600,marginBottom:6 }}>Đang đăng ký...</div>
//                 <div style={{ fontSize:"12px",color:"#4a6fa5",marginBottom:20 }}>Lưu thông tin CCCD + tạo Face Embedding từ {faceFiles.length} ảnh</div>
//                 <div style={{ padding:"3px",borderRadius:"20px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,212,255,0.15)" }}>
//                   <motion.div animate={{width:["0%","95%"]}} transition={{duration:3,ease:"easeOut"}} style={{ height:8,borderRadius:"20px",background:"linear-gradient(90deg,#00d4ff,#8b5cf6)" }}/>
//                 </div>
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </div>
//       </motion.div>
//     </motion.div>
//   );
// }

/**
 * RegisterModal.tsx  — 3 bước đăng ký (Phiên bản Đơn giản & Ổn định)
 *
 * Step 1: Tải ảnh CCCD mặt trước + mặt sau & Điền tay thông tin
 * Step 2: Chụp Webcam (từ 1-5 tấm) HOẶC Upload ảnh khuôn mặt (từ 1-5 tấm)
 * Step 3: Điền thông tin công việc + ngày hết hạn làm việc
 */

// import { useState, useRef, useEffect } from "react";
// import { motion, AnimatePresence } from "motion/react";
// import {
//   X, Upload, Shield, Camera, CreditCard,
//   ChevronRight, Check, User, Calendar, AlertTriangle, Info, RefreshCw
// } from "lucide-react";
// import { apiClient } from "../services/api";

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
//   special_features: string;
// }

// const CCCD_FIELDS: Array<{ key: keyof CCCDData; label: string; placeholder: string; full?: boolean }> = [
//   { key: "full_name",        label: "Họ và tên *",        placeholder: "NGUYỄN VĂN A",                      full: true },
//   { key: "id_number",        label: "Số CCCD / CMND",     placeholder: "0XX XXX XXX XXX" },
//   { key: "dob",              label: "Ngày sinh",          placeholder: "01/01/1990" },
//   { key: "gender",           label: "Giới tính",          placeholder: "Nam / Nữ" },
//   { key: "nationality",      label: "Quốc tịch",          placeholder: "Việt Nam" },
//   { key: "hometown",         label: "Quê quán",           placeholder: "Tỉnh / Thành phố...",               full: true },
//   { key: "address",          label: "Nơi thường trú",     placeholder: "Số nhà, đường, phường, quận, TP", full: true },
//   { key: "expiry_date",      label: "Có giá trị đến",     placeholder: "01/01/2030" },
//   { key: "issue_date",       label: "Ngày cấp",           placeholder: "01/01/2020" },
//   { key: "special_features", label: "Đặc điểm nhận dạng", placeholder: "Sẹo, nốt ruồi...",                  full: true },
// ];

// const inputStyle: React.CSSProperties = {
//   width: "100%", padding: "9px 12px", borderRadius: "9px",
//   background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,212,255,0.15)",
//   color: "#e2e8f0", fontSize: "12px", outline: "none",
//   fontFamily: "'Space Grotesk',sans-serif", boxSizing: "border-box",
// };

// // ═════════════════════════════════════════════════════════════════════════════
// // STEP 1 — CCCD Upload & Auto OCR
// // ═════════════════════════════════════════════════════════════════════════════
// function StepCCCD({ onNext }: { onNext: (data: Partial<CCCDData>, front: File | null, back: File | null) => void }) {
//   const [cccd, setCccd] = useState<Partial<CCCDData>>({ nationality: "Việt Nam" });
  
//   const [frontImg, setFrontImg] = useState<string>();
//   const [backImg,  setBackImg]  = useState<string>();
//   const [frontFile, setFrontFile] = useState<File | null>(null);
//   const [backFile,  setBackFile]  = useState<File | null>(null);
  
//   const [isExtracting, setIsExtracting] = useState(false);
//   const [extractMsg, setExtractMsg] = useState("");

//   const frontRef = useRef<HTMLInputElement>(null);
//   const backRef  = useRef<HTMLInputElement>(null);

//   // Hàm xử lý chung khi upload ảnh (gọi API OCR Local PaddleOCR)
// const handleUploadCard = async (file: File, side: "front" | "back") => {
//   if (side === "front") {
//     setFrontFile(file);
//     setFrontImg(URL.createObjectURL(file));
//   } else {
//     setBackFile(file);
//     setBackImg(URL.createObjectURL(file));
//   }

//   setIsExtracting(true);
//   setExtractMsg("Đang đọc thông tin...");

//   try {
//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("side", side);

//     // ← Dùng PaddleOCR local, không cần API key, không quota
//     const resp = await fetch("http://localhost:3001/api/face/ocr", {
//       method: "POST",
//       body: formData,
//     });

//     const json = await resp.json();
//     if (!json.success) throw new Error(json.error);

//     const ocrData = json.data;

//     if (side === "front") {
//       setCccd(prev => ({
//         ...prev,
//         full_name:   ocrData.name    || prev.full_name,
//         id_number:   ocrData.id      || prev.id_number,
//         dob:         ocrData.dob     || prev.dob,
//         gender:      ocrData.sex     || prev.gender,
//         hometown:    ocrData.home    || prev.hometown,
//         address:     ocrData.address || prev.address,
//         expiry_date: ocrData.expiry  || prev.expiry_date,
//       }));
//     } else {
//       setCccd(prev => ({
//         ...prev,
//         issue_date:       ocrData.issue_date || prev.issue_date,
//         special_features: ocrData.features   || prev.special_features,
//       }));
//     }

//     setExtractMsg("✓ Đọc xong!");
//   } catch (err) {
//     console.error("Lỗi OCR:", err);
//     setExtractMsg("Không đọc được, vui lòng nhập tay.");
//   } finally {
//     setTimeout(() => setIsExtracting(false), 1500);
//   }
// };


//   const canNext = !!cccd.full_name?.trim(); // Chỉ bắt buộc nhập Tên để đi tiếp

//   return (
//     <div>
//       <div style={{ fontSize:"12px", color:"#4a6fa5", marginBottom:14 }}>
//         Tải ảnh 2 mặt CCCD, AI sẽ tự động đọc chữ và điền thông tin (Nên chụp rõ nét)
//       </div>

//       {/* Card upload row */}
//       <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
//         {/* Front */}
//         <div>
//           <div style={{ fontSize:"11px", color:"#4a6fa5", marginBottom:5, display:"flex", alignItems:"center", gap:4 }}>
//             <CreditCard size={11}/> Mặt trước
//           </div>
//           <div onClick={() => frontRef.current?.click()}
//             style={{ aspectRatio:"85.6/54", borderRadius:"10px", overflow:"hidden", border:`2px dashed ${frontImg?"rgba(0,200,80,0.5)":"rgba(0,212,255,0.2)"}`, background:`${frontImg?"transparent":"rgba(0,212,255,0.03)"}`, cursor:"pointer", position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
//             <input ref={frontRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => e.target.files?.[0] && handleUploadCard(e.target.files[0], "front")} />
//             {frontImg ? <img src={frontImg} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <div style={{ textAlign:"center" }}><Upload size={18} color="#2a5a3a" style={{ marginBottom:3 }}/><div style={{ fontSize:"8px", color:"#2a5a3a" }}>Chọn ảnh</div></div>}
//             {frontImg && <div style={{ position:"absolute", top:4, right:4, width:18, height:18, borderRadius:"50%", background:"#00ff88", display:"flex", alignItems:"center", justifyContent:"center" }}><Check size={10} color="#000"/></div>}
//           </div>
//         </div>

//         {/* Back */}
//         <div>
//           <div style={{ fontSize:"11px", color:"#4a6fa5", marginBottom:5, display:"flex", alignItems:"center", gap:4 }}>
//             <CreditCard size={11}/> Mặt sau
//           </div>
//           <div onClick={() => backRef.current?.click()}
//             style={{ aspectRatio:"85.6/54", borderRadius:"10px", overflow:"hidden", border:`2px dashed ${backImg?"rgba(0,200,80,0.5)":"rgba(0,212,255,0.2)"}`, background:"rgba(0,212,255,0.02)", cursor:"pointer", position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
//             <input ref={backRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => e.target.files?.[0] && handleUploadCard(e.target.files[0], "back")} />
//             {backImg ? <img src={backImg} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <div style={{ textAlign:"center" }}><Upload size={18} color="#2a4060" style={{ marginBottom:3 }}/><div style={{ fontSize:"8px", color:"#2a4060" }}>Chọn ảnh</div></div>}
//             {backImg && <div style={{ position:"absolute", top:4, right:4, width:18, height:18, borderRadius:"50%", background:"#00ff88", display:"flex", alignItems:"center", justifyContent:"center" }}><Check size={10} color="#000"/></div>}
//           </div>
//         </div>
//       </div>

//       {/* Thông báo tiến trình quét OCR */}
//       <AnimatePresence>
//         {isExtracting && (
//           <motion.div initial={{ opacity: 0, height: 0, marginBottom: 0 }} animate={{ opacity: 1, height: "auto", marginBottom: 12 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} style={{ overflow: "hidden" }}>
//             <div style={{ padding:"8px", borderRadius:"8px", background:"rgba(0,212,255,0.1)", border:"1px solid rgba(0,212,255,0.3)", display:"flex", alignItems:"center", gap:8 }}>
//               <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><RefreshCw size={14} color="#00d4ff"/></motion.div>
//               <span style={{ fontSize:"11px", color:"#00d4ff" }}>{extractMsg}</span>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Info form */}
//       <div style={{ background:"rgba(0,200,80,0.03)", border:"1px solid rgba(0,200,80,0.1)", borderRadius:"12px", padding:"14px", marginBottom:16 }}>
//         <div style={{ fontSize:"11px", color:"#00c840", marginBottom:12, display:"flex", alignItems:"center", gap:5 }}>
//           <Info size={11}/> Nhập thông tin căn cước
//         </div>
//         <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
//           {CCCD_FIELDS.map(f => (
//             <div key={f.key} style={{ gridColumn: f.full ? "1/-1" : "auto" }}>
//               <label style={{ fontSize:"10px", color:"#4a8a5a", display:"block", marginBottom:3 }}>{f.label}</label>
//               <input
//                 value={cccd[f.key] || ""}
//                 onChange={e => setCccd(p => ({ ...p, [f.key]: e.target.value }))}
//                 placeholder={f.placeholder}
//                 style={inputStyle}
//               />
//             </div>
//           ))}
//         </div>
//       </div>

//       <button onClick={() => onNext(cccd, frontFile, backFile)} disabled={!canNext}
//         style={{ width:"100%", padding:"12px", borderRadius:"12px", background: canNext ? "linear-gradient(135deg,#00c840,#00d4ff)" : "rgba(255,255,255,0.04)", border:"none", color: canNext ? "#fff" : "#2d4060", cursor: canNext ? "pointer" : "not-allowed", fontSize:"13px", fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
//         Tiếp theo — Hình ảnh khuôn mặt <ChevronRight size={15}/>
//       </button>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // STEP 2 — Face Capture (Webcam Snap OR Upload 1-5 photos)
// // ═════════════════════════════════════════════════════════════════════════════
// function StepFace({ onNext, onBack }: { onNext: (files: File[]) => void; onBack: () => void }) {
//   const [mode, setMode] = useState<"choose"|"webcam"|"upload">("choose");
//   const [files, setFiles] = useState<File[]>([]);
//   const [previews, setPreviews] = useState<string[]>([]);
//   const fileRef = useRef<HTMLInputElement>(null);

//   // Webcam state
//   const videoRef  = useRef<HTMLVideoElement>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const [camActive, setCamActive] = useState(false);

//   useEffect(() => () => {
//     streamRef.current?.getTracks().forEach(t => t.stop());
//   }, []);

//   // ── Webcam Logic ──
//   const startWebcam = async () => {
//     try {
//       const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
//       streamRef.current = s;
//       if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
//       setCamActive(true);
//     } catch (err) {
//       alert("Không thể truy cập Camera. Vui lòng kiểm tra quyền hoặc dùng chức năng Upload.");
//     }
//   };

//   const stopWebcam = () => {
//     streamRef.current?.getTracks().forEach(t => t.stop());
//     setCamActive(false);
//   };

//   const snapPhoto = () => {
//     if (!videoRef.current || !canvasRef.current) return;
//     const v = videoRef.current, c = canvasRef.current;
//     c.width = 640; c.height = 480;
//     const ctx = c.getContext("2d")!;
//     ctx.save(); ctx.scale(-1,1); ctx.drawImage(v, -640, 0, 640, 480); ctx.restore(); // Lật gương ảnh
//     const url = c.toDataURL("image/jpeg", 0.88);
//     c.toBlob(blob => {
//       const f = new File([blob!], `face_${Date.now()}.jpg`, { type: "image/jpeg" });
//       setFiles(p => [...p, f]);
//       setPreviews(p => [...p, url]);
//     }, "image/jpeg", 0.88);
//   };

//   // ── Upload Logic ──
//   const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const fs = Array.from(e.target.files||[]).filter(f=>f.type.startsWith("image/")).slice(0, 5-files.length);
//     setFiles(p => [...p,...fs]);
//     fs.forEach(f => {
//       const r = new FileReader();
//       r.onload = ev => setPreviews(p => [...p, ev.target?.result as string]);
//       r.readAsDataURL(f);
//     });
//   };

//   const removePhoto = (index: number) => {
//     setFiles(p => p.filter((_, i) => i !== index));
//     setPreviews(p => p.filter((_, i) => i !== index));
//   };

//   // ── Render: Choose Mode ──
//   if (mode === "choose") return (
//     <div>
//       <div style={{ fontSize:"12px", color:"#4a6fa5", marginBottom:16 }}>
//         Cung cấp ít nhất 1 ảnh khuôn mặt để hệ thống nhận diện (tối đa 5 ảnh)
//       </div>
//       <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
//         {[
//           { id:"webcam", emoji:"📷", title:"Chụp ảnh trực tiếp", sub:"Mở Webcam/Camera chụp nhanh tại chỗ", color:"#00d4ff" },
//           { id:"upload", emoji:"🖼️", title:"Tải ảnh có sẵn",     sub:"Upload file ảnh rõ nét từ thiết bị", color:"#8b5cf6" },
//         ].map(m=>(
//           <motion.div key={m.id} whileHover={{x:4}} whileTap={{scale:0.98}} onClick={()=>setMode(m.id as any)}
//             style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:"14px", background:`${m.color}06`, border:`1px solid ${m.color}18`, cursor:"pointer", transition:"all 0.2s" }}
//             onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background=`${m.color}10`;(e.currentTarget as HTMLDivElement).style.borderColor=`${m.color}40`;}}
//             onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background=`${m.color}06`;(e.currentTarget as HTMLDivElement).style.borderColor=`${m.color}18`;}}
//           >
//             <span style={{ fontSize:"26px",flexShrink:0 }}>{m.emoji}</span>
//             <div style={{ flex:1 }}>
//               <div style={{ fontSize:"14px",color:"#e2e8f0",fontWeight:600 }}>{m.title}</div>
//               <div style={{ fontSize:"11px",color:"#4a6fa5",marginTop:2,lineHeight:1.4 }}>{m.sub}</div>
//             </div>
//             <ChevronRight size={16} color={m.color}/>
//           </motion.div>
//         ))}
//       </div>
//       <button onClick={onBack} style={{ width:"100%",padding:"10px",borderRadius:"10px",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",color:"#7a95b8",cursor:"pointer",fontSize:"12px",fontFamily:"'Space Grotesk',sans-serif" }}>← Quay lại bước trước</button>
//     </div>
//   );

//   // ── Render: Webcam Mode ──
//   if (mode === "webcam") return (
//     <div>
//       <div style={{ position:"relative", borderRadius:"16px", overflow:"hidden", background:"#020408", aspectRatio:"4/3", border:"2px solid rgba(0,212,255,0.2)", marginBottom: 12 }}>
//         <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%",height:"100%",objectFit:"cover",transform:"scaleX(-1)", display: camActive ? "block" : "none" }}/>
//         <canvas ref={canvasRef} style={{ display:"none" }}/>
        
//         {!camActive && (
//            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10 }}>
//              <button onClick={startWebcam} style={{ padding:"12px 24px", borderRadius:"12px", background:"linear-gradient(135deg,#00d4ff,#8b5cf6)", border:"none", color:"#fff", fontSize:"14px", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
//                <Camera size={18}/> Bật Camera
//              </button>
//            </div>
//         )}

//         {camActive && (
//           <>
//             <div style={{ position:"absolute",inset:0,background:"radial-gradient(ellipse 50% 65% at center,transparent 40%,rgba(0,0,0,0.65) 100%)",pointerEvents:"none" }}/>
//             <div style={{ position:"absolute",bottom:14,left:0,right:0,display:"flex",justifyContent:"center",gap:10 }}>
//               <button onClick={snapPhoto} disabled={files.length >= 5} style={{ padding:"10px 24px", borderRadius:"20px", background: files.length < 5 ? "#00ff88" : "rgba(255,255,255,0.2)", border:"none", color:"#000", fontWeight:700, cursor: files.length < 5 ? "pointer" : "not-allowed" }}>
//                 📸 Chụp ảnh ({files.length}/5)
//               </button>
//             </div>
//           </>
//         )}
//       </div>

//       {previews.length > 0 && (
//         <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
//           {previews.map((src, i) => (
//             <div key={i} style={{ position:"relative", width:56, height:56, borderRadius:"8px", overflow:"hidden", border:"1px solid rgba(0,212,255,0.4)" }}>
//               <img src={src} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
//               <button onClick={()=>removePhoto(i)} style={{ position:"absolute",top:2,right:2,width:16,height:16,borderRadius:"50%",background:"rgba(0,0,0,0.8)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}><X size={10} color="#ff6b6b"/></button>
//             </div>
//           ))}
//         </div>
//       )}

//       <div style={{ display:"flex", gap:8 }}>
//         <button onClick={()=>{stopWebcam(); setMode("choose");}} style={{ flex:1,padding:"10px",borderRadius:"10px",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",color:"#7a95b8",cursor:"pointer",fontSize:"12px" }}>← Chọn lại</button>
//         <button onClick={()=>{stopWebcam(); onNext(files);}} disabled={files.length===0}
//           style={{ flex:2,padding:"10px",borderRadius:"10px",background:files.length>0?"linear-gradient(135deg,#00d4ff,#8b5cf6)":"rgba(255,255,255,0.04)",border:"none",color:files.length>0?"#fff":"#2d4060",cursor:files.length>0?"pointer":"not-allowed",fontSize:"13px",fontWeight:600 }}>
//           Tiếp theo →
//         </button>
//       </div>
//     </div>
//   );

//   // ── Render: Upload Mode ──
//   return (
//     <div>
//       <div style={{ fontSize:"12px",color:"#4a6fa5",marginBottom:12 }}>
//         Tải lên từ 1 đến 5 ảnh khuôn mặt (nên chọn nhiều góc độ để nhận diện tốt hơn)
//       </div>
//       <div onClick={()=>fileRef.current?.click()}
//         style={{ padding:"24px",borderRadius:"14px",border:`2px dashed ${files.length>=1?"rgba(0,255,136,0.4)":"rgba(139,92,246,0.3)"}`,background:"rgba(139,92,246,0.02)",cursor:"pointer",textAlign:"center",marginBottom:12 }}
//         onMouseEnter={e=>(e.currentTarget.style.borderColor="rgba(139,92,246,0.6)")}
//         onMouseLeave={e=>(e.currentTarget.style.borderColor=files.length>=1?"rgba(0,255,136,0.4)":"rgba(139,92,246,0.3)")}
//       >
//         <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleUpload} style={{ display:"none" }}/>
//         <Upload size={24} color="#4a6fa5" style={{ marginBottom:8 }}/>
//         <div style={{ fontSize:"12px",color:"#7a95b8",fontWeight:600 }}>Chọn ảnh ({files.length}/5)</div>
//       </div>
      
//       {previews.length > 0 && (
//         <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:12 }}>
//           {previews.map((src,i)=>(
//             <div key={i} style={{ position:"relative",aspectRatio:"1",borderRadius:"8px",overflow:"hidden",border:"1px solid rgba(139,92,246,0.3)" }}>
//               <img src={src} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
//               <button onClick={()=>removePhoto(i)} style={{ position:"absolute",top:2,right:2,width:16,height:16,borderRadius:"50%",background:"rgba(0,0,0,0.8)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}><X size={9} color="#ff6b6b"/></button>
//             </div>
//           ))}
//           {files.length < 5 && <div onClick={()=>fileRef.current?.click()} style={{ aspectRatio:"1",borderRadius:"8px",border:"1px dashed rgba(139,92,246,0.2)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}><span style={{ fontSize:"18px",color:"#2d4060" }}>+</span></div>}
//         </div>
//       )}

//       <div style={{ display:"flex",gap:8 }}>
//         <button onClick={()=>setMode("choose")} style={{ flex:1,padding:"10px",borderRadius:"10px",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",color:"#7a95b8",cursor:"pointer",fontSize:"12px" }}>← Chọn lại</button>
//         <button onClick={()=>onNext(files)} disabled={files.length===0}
//           style={{ flex:2,padding:"10px",borderRadius:"10px",background:files.length>0?"linear-gradient(135deg,#8b5cf6,#00d4ff)":"rgba(255,255,255,0.04)",border:"none",color:files.length>0?"#fff":"#2d4060",cursor:files.length>0?"pointer":"not-allowed",fontSize:"13px",fontWeight:600 }}>
//           Tiếp theo →
//         </button>
//       </div>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // STEP 3 — Employee info + work expiry
// // ═════════════════════════════════════════════════════════════════════════════
// function StepInfo({
//   defaultName, onSubmit, onBack, submitting, error,
// }: {
//   defaultName: string; onSubmit: (data: { name:string; role:string; dept:string; expiry:string }) => void;
//   onBack: () => void; submitting: boolean; error: string;
// }) {
//   const [name,   setName]   = useState(defaultName);
//   const [role,   setRole]   = useState("");
//   const [dept,   setDept]   = useState("");
//   const [expiry, setExpiry] = useState("");

//   const expiryWarning = expiry && new Date(expiry) < new Date();

//   return (
//     <div>
//       <div style={{ fontSize:"12px",color:"#4a6fa5",marginBottom:14 }}>Thông tin công việc — chức vụ và thời hạn làm việc</div>
//       <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
//         {[
//           { label:"Họ và tên *", v:name, set:setName, ph:"Nguyễn Văn A" },
//           { label:"Chức vụ / Vị trí", v:role, set:setRole, ph:"Kỹ sư, Nhân viên, Quản lý..." },
//           { label:"Phòng ban", v:dept, set:setDept, ph:"Kỹ thuật / Marketing / Nhân sự..." },
//         ].map(f=>(
//           <div key={f.label}>
//             <label style={{ fontSize:"12px",color:"#4a6fa5",display:"block",marginBottom:6 }}>{f.label}</label>
//             <input value={f.v} onChange={e=>f.set(e.target.value)} placeholder={f.ph} style={inputStyle}/>
//           </div>
//         ))}

//         <div>
//           <label style={{ fontSize:"12px",color:"#4a6fa5",display:"block",marginBottom:6 }}>
//             Thời hạn làm việc <span style={{ fontSize:"10px",color:"#2d4060",marginLeft:8 }}>(để trống = không giới hạn)</span>
//           </label>
//           <div style={{ position:"relative" }}>
//             <input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)} style={{ ...inputStyle, paddingRight:36 }}/>
//             <Calendar size={14} color="#4a6fa5" style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none" }}/>
//           </div>
//           {expiry && (
//             <div style={{ marginTop:6,padding:"8px 10px",borderRadius:"8px", background:expiryWarning?"rgba(255,45,85,0.08)":"rgba(0,212,255,0.05)", border:`1px solid ${expiryWarning?"rgba(255,45,85,0.2)":"rgba(0,212,255,0.15)"}`, fontSize:"11px",color:expiryWarning?"#ff6b6b":"#00d4ff", display:"flex",alignItems:"center",gap:6 }}>
//               {expiryWarning ? <><AlertTriangle size={12}/> Ngày đã qua — nhân viên sẽ không được nhận diện</> : <><Check size={12}/> Hết hạn vào {new Date(expiry).toLocaleDateString("vi-VN")}</>}
//             </div>
//           )}
//         </div>
//       </div>

//       {error && <div style={{ marginTop:10,padding:"9px",borderRadius:"8px",background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.3)",color:"#ff6b6b",fontSize:"12px",textAlign:"center" }}>{error}</div>}

//       <div style={{ display:"flex",gap:10,marginTop:18 }}>
//         <button onClick={onBack} style={{ flex:1,padding:"11px",borderRadius:"10px",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",color:"#7a95b8",cursor:"pointer",fontSize:"13px" }}>← Quay lại</button>
//         <button onClick={()=>onSubmit({name,role,dept,expiry})} disabled={!name.trim()||submitting}
//           style={{ flex:2,padding:"11px",borderRadius:"10px",background:name.trim()?"linear-gradient(135deg,#00d4ff,#8b5cf6)":"rgba(255,255,255,0.04)",border:"none",color:name.trim()?"#fff":"#2d4060",cursor:name.trim()?"pointer":"not-allowed",fontSize:"14px",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6,opacity:submitting?0.7:1 }}>
//           <Shield size={15}/> {submitting?"Đang đăng ký...":"Hoàn tất Đăng ký"}
//         </button>
//       </div>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // Main RegisterModal
// // ═════════════════════════════════════════════════════════════════════════════
// interface Props { onClose: ()=>void; onSuccess: ()=>void; }

// export function RegisterModal({ onClose, onSuccess }: Props) {
//   const [step,       setStep]       = useState<1|2|3|4>(1);
//   const [cccdData,   setCccdData]   = useState<Partial<CCCDData>>({});
//   const [cccdFront,  setCccdFront]  = useState<File|null>(null);
//   const [cccdBack,   setCccdBack]   = useState<File|null>(null);
//   const [faceFiles,  setFaceFiles]  = useState<File[]>([]);
//   const [submitting, setSubmitting] = useState(false);
//   const [error,      setError]      = useState("");

//   const handleCCCDNext = (data: Partial<CCCDData>, front: File|null, back: File|null) => {
//     setCccdData(data); setCccdFront(front); setCccdBack(back);
//     setStep(2);
//   };

//   const handleFaceNext = (files: File[]) => {
//     setFaceFiles(files); setStep(3);
//   };

//   const handleSubmit = async ({ name, role, dept, expiry }: { name:string; role:string; dept:string; expiry:string }) => {
//     if (faceFiles.length === 0) { setError("Cần ít nhất 1 ảnh khuôn mặt"); return; }
//     try {
//       setSubmitting(true); setError(""); setStep(4);
//       const fd = new FormData();
//       fd.append("name", name);
//       fd.append("role", role);
//       fd.append("department", dept);
//       if (expiry) fd.append("work_expiry_date", expiry);

//       // CCCD images
//       if (cccdFront) fd.append("cccd_front", cccdFront);
//       if (cccdBack)  fd.append("cccd_back",  cccdBack);

//       // CCCD info as JSON
//       fd.append("cccd_info", JSON.stringify(cccdData));

//       // Face images
//       faceFiles.forEach(f => fd.append("images", f));

//       await apiClient.registerFace(fd);
//       setTimeout(() => { onSuccess(); onClose(); }, 1200);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Lỗi đăng ký");
//       setStep(3); setSubmitting(false);
//     }
//   };

//   const STEP_LABELS = ["", "Thông tin & CCCD", "Ảnh khuôn mặt", "Thông tin công việc", "Đang xử lý"];

//   return (
//     <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
//       style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(18px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16 }}
//       onClick={submitting?undefined:onClose}
//     >
//       <motion.div initial={{scale:0.92,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.9,opacity:0}}
//         onClick={e=>e.stopPropagation()}
//         style={{ width:"100%",maxWidth:580,maxHeight:"93vh",overflowY:"auto",background:"#07101a",border:"1px solid rgba(0,212,255,0.18)",borderRadius:"22px",boxShadow:"0 0 100px rgba(0,212,255,0.07)",fontFamily:"'Space Grotesk',sans-serif" }}
//       >
//         <div style={{ padding:"18px 22px 14px",borderBottom:"1px solid rgba(0,212,255,0.08)",position:"sticky",top:0,background:"#07101a",zIndex:10,borderRadius:"22px 22px 0 0" }}>
//           <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
//             <div>
//               <h2 style={{ fontSize:"14px",color:"#e2e8f0",margin:0,letterSpacing:"1px" }}>ĐĂNG KÝ NHÂN VIÊN</h2>
//               <p style={{ fontSize:"11px",color:"#4a6fa5",margin:"2px 0 0" }}>{step<=3?STEP_LABELS[step]:STEP_LABELS[4]}</p>
//             </div>
//             {!submitting && <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"#4a6fa5",padding:4 }}><X size={20}/></button>}
//           </div>

//           <div style={{ display:"flex",gap:6,marginBottom:8 }}>
//             {[1,2,3].map(s=>(
//               <div key={s} style={{ flex:1,display:"flex",alignItems:"center",gap:6 }}>
//                 <div style={{ width:22,height:22,borderRadius:"50%",background:step>s?"#00ff88":step===s?"#00d4ff":"rgba(255,255,255,0.06)",border:`1px solid ${step>s?"#00ff88":step===s?"#00d4ff":"rgba(255,255,255,0.1)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",color:step>=s?"#000":"#4a6fa5",fontWeight:700,flexShrink:0 }}>
//                   {step>s?<Check size={12}/>:s}
//                 </div>
//                 <div style={{ flex:1,height:2,borderRadius:"1px",background:step>s?"rgba(0,255,136,0.4)":step===s?"rgba(0,212,255,0.3)":"rgba(255,255,255,0.06)" }}/>
//               </div>
//             ))}
//             <div style={{ width:22,height:22,borderRadius:"50%",background:step>3?"#00ff88":"rgba(255,255,255,0.06)",border:`1px solid ${step>3?"#00ff88":"rgba(255,255,255,0.1)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",color:step>3?"#000":"#4a6fa5",fontWeight:700 }}>
//               {step>3?<Check size={12}/>:3}
//             </div>
//           </div>
//           <div style={{ display:"flex",justifyContent:"space-between" }}>
//             {["CCCD & Form","Khuôn mặt","Công việc"].map((l,i)=>(
//               <div key={l} style={{ fontSize:"9px",color:step===i+1?"#00d4ff":step>i+1?"#00ff88":"#2d4060",fontWeight:step===i+1?600:400,flex:1,textAlign:i===0?"left":i===2?"right":"center" }}>{l}</div>
//             ))}
//           </div>
//         </div>

//         <div style={{ padding:"20px 22px 24px" }}>
//           <AnimatePresence mode="wait">
//             {step===1 && <motion.div key="s1" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}><StepCCCD onNext={handleCCCDNext}/></motion.div>}
//             {step===2 && <motion.div key="s2" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}><StepFace onNext={handleFaceNext} onBack={()=>setStep(1)}/></motion.div>}
//             {step===3 && <motion.div key="s3" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}><StepInfo defaultName={cccdData.full_name||""} onSubmit={handleSubmit} onBack={()=>setStep(2)} submitting={submitting} error={error}/></motion.div>}
//             {step===4 && (
//               <motion.div key="s4" initial={{opacity:0}} animate={{opacity:1}} style={{ textAlign:"center",padding:"28px 0" }}>
//                 <motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}} style={{ display:"inline-block",marginBottom:16 }}>
//                   <div style={{ width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,#00d4ff,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center" }}><Shield size={30} color="#fff"/></div>
//                 </motion.div>
//                 <div style={{ fontSize:"15px",color:"#e2e8f0",fontWeight:600,marginBottom:6 }}>Đang đăng ký...</div>
//                 <div style={{ fontSize:"12px",color:"#4a6fa5",marginBottom:20 }}>Tạo Face Embedding từ {faceFiles.length} ảnh</div>
//                 <div style={{ padding:"3px",borderRadius:"20px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,212,255,0.15)" }}>
//                   <motion.div animate={{width:["0%","95%"]}} transition={{duration:3,ease:"easeOut"}} style={{ height:8,borderRadius:"20px",background:"linear-gradient(90deg,#00d4ff,#8b5cf6)" }}/>
//                 </div>
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </div>
//       </motion.div>
//     </motion.div>
//   );
// }

// import { useState, useRef, useEffect } from "react";
// import { motion, AnimatePresence } from "motion/react";
// import {
//   X, Upload, Shield, Camera, CreditCard,
//   ChevronRight, Check, Calendar, AlertTriangle, Info, RefreshCw, QrCode
// } from "lucide-react";
// import { apiClient } from "../services/api";

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
//   special_features: string;
// }

// const CCCD_FIELDS: Array<{ key: keyof CCCDData; label: string; placeholder: string; full?: boolean }> = [
//   { key: "full_name",        label: "Họ và tên *",         placeholder: "NGUYỄN VĂN A",                     full: true },
//   { key: "id_number",        label: "Số CCCD / CMND",      placeholder: "0XX XXX XXX XXX" },
//   { key: "dob",              label: "Ngày sinh",            placeholder: "01/01/1990" },
//   { key: "gender",           label: "Giới tính",            placeholder: "Nam / Nữ" },
//   { key: "nationality",      label: "Quốc tịch",            placeholder: "Việt Nam" },
//   { key: "hometown",         label: "Quê quán",             placeholder: "Tỉnh / Thành phố...",              full: true },
//   { key: "address",          label: "Nơi thường trú",       placeholder: "Số nhà, đường, phường, quận, TP",  full: true },
//   { key: "expiry_date",      label: "Có giá trị đến",       placeholder: "01/01/2030" },
//   { key: "issue_date",       label: "Ngày cấp",             placeholder: "01/01/2020" },
//   { key: "special_features", label: "Đặc điểm nhận dạng",  placeholder: "Sẹo, nốt ruồi...",                 full: true },
// ];

// const inputStyle: React.CSSProperties = {
//   width: "100%", padding: "9px 12px", borderRadius: "9px",
//   background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,212,255,0.15)",
//   color: "#e2e8f0", fontSize: "12px", outline: "none",
//   fontFamily: "'Space Grotesk',sans-serif", boxSizing: "border-box",
// };

// // ═════════════════════════════════════════════════════════════════════════════
// // STEP 1 — CCCD Upload + OCR Scan
// // ═════════════════════════════════════════════════════════════════════════════
// function StepCCCD({ onNext }: { onNext: (data: Partial<CCCDData>, front: File | null, back: File | null) => void }) {
//   const [cccd,      setCccd]      = useState<Partial<CCCDData>>({ nationality: "Việt Nam" });
//   const [frontImg,  setFrontImg]  = useState<string>();
//   const [backImg,   setBackImg]   = useState<string>();
//   const [frontFile, setFrontFile] = useState<File | null>(null);
//   const [backFile,  setBackFile]  = useState<File | null>(null);
//   const [scanning,  setScanning]  = useState(false);
//   const [scanMsg,   setScanMsg]   = useState("");
//   const [qrStatus,  setQrStatus]  = useState<"idle" | "ok" | "fail">("idle");

//   const frontRef = useRef<HTMLInputElement>(null);
//   const backRef  = useRef<HTMLInputElement>(null);

//   // Mặt trước → Gửi API OCR
//   const handleFront = async (file: File) => {
//     setFrontFile(file);
//     setFrontImg(URL.createObjectURL(file));
//     setScanning(true);
//     setScanMsg("AI đang phân tích mặt trước CCCD...");
//     setQrStatus("idle");

//     try {
//       const response = await apiClient.extractOCR(file, "front");

//       if (response.success && response.data && Object.keys(response.data).length > 0) {
//         // Dữ liệu từ Backend giờ đã chuẩn 100% với tên biến của React
//         setCccd(prev => ({ ...prev, ...response.data }));
//         setQrStatus("ok");
//         setScanMsg("✓ Phân tích AI thành công! Vui lòng kiểm tra lại.");
//       } else {
//         setQrStatus("fail");
//         setScanMsg("Ảnh quá mờ hoặc không có dữ liệu.");
//       }
//     } catch (error) {
//       console.error("Lỗi quét ảnh:", error);
//       setQrStatus("fail");
//       setScanMsg("Lỗi kết nối máy chủ AI. Vui lòng nhập tay.");
//     } finally {
//       setScanning(false);
//     }
//   };

// // Mặt sau → Gửi API OCR lấy ngày cấp
//   const handleBack = async (file: File) => {
//     setBackFile(file);
//     setBackImg(URL.createObjectURL(file));
//     setScanning(true);
//     setScanMsg("AI đang quét ngày cấp mặt sau...");

//     try {
//       const response = await apiClient.extractOCR(file, "back");
      
//       // KIỂM TRA: Nếu API trả về thành công và CÓ ngày cấp
//       if (response.success && response.data && response.data.issue_date) {
        
//         // 1. Nhét ngày cấp vào biến State cccd để giao diện nó hiện lên ô input
//         setCccd(prev => ({ ...prev, issue_date: response.data.issue_date }));
        
//         // 2. (Quan trọng) Cho viền khung quét mặt sau chuyển màu xanh để báo hiệu
//         setScanMsg("✓ Đã quét được ngày cấp.");
        
//         // (Tuỳ chọn: Nếu bạn muốn nó dùng chung biến trạng thái qrStatus như mặt trước)
//         // setQrStatus("ok");
//       } else {
//         setScanMsg("Ảnh mặt sau mờ, không tìm thấy ngày cấp.");
//       }
//     } catch (error) {
//       console.error("Lỗi quét mặt sau:", error);
//       setScanMsg("Lỗi khi quét mặt sau.");
//     } finally {
//       setScanning(false);
//     }
//   };

//   const canNext = !!cccd.full_name?.trim();

//   const scanBorderColor = qrStatus === "ok"
//     ? "rgba(0,255,136,0.5)"
//     : qrStatus === "fail"
//     ? "rgba(255,200,0,0.4)"
//     : frontImg
//     ? "rgba(0,212,255,0.4)"
//     : "rgba(0,212,255,0.2)";

//   const scanMsgColor = qrStatus === "ok" ? "#00ff88" : qrStatus === "fail" ? "#ffc800" : "#00d4ff";

//   return (
//     <div>
//       <div style={{ fontSize:"12px", color:"#4a6fa5", marginBottom:14 }}>
//         Chụp mặt <b style={{color:"#00d4ff"}}>trước</b> CCCD — AI sẽ tự động đọc chữ và điền thông tin ngay lập tức ⚡
//       </div>

//       {/* Upload row */}
//       <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
//         {/* Mặt trước */}
//         <div>
//           <div style={{ fontSize:"11px", color:"#4a6fa5", marginBottom:5, display:"flex", alignItems:"center", gap:4 }}>
//             <QrCode size={11} color="#00d4ff"/> Mặt trước
//           </div>
//           <div onClick={() => frontRef.current?.click()}
//             style={{
//               aspectRatio:"85.6/54", borderRadius:"10px", overflow:"hidden",
//               border:`2px dashed ${scanBorderColor}`,
//               background: frontImg ? "transparent" : "rgba(0,212,255,0.03)",
//               cursor:"pointer", position:"relative",
//               display:"flex", alignItems:"center", justifyContent:"center",
//               transition:"border-color 0.3s",
//             }}>
//             <input ref={frontRef} type="file" accept="image/*" style={{ display:"none" }}
//               onChange={e => e.target.files?.[0] && handleFront(e.target.files[0])} />
//             {frontImg
//               ? <>
//                   <img src={frontImg} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
//                   {scanning && (
//                     <motion.div
//                       animate={{ top: ["0%", "100%", "0%"] }}
//                       transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
//                       style={{
//                         position:"absolute", left:0, right:0, height:2,
//                         background:"linear-gradient(90deg,transparent,#00d4ff,transparent)",
//                         boxShadow:"0 0 8px #00d4ff", pointerEvents:"none",
//                       }}
//                     />
//                   )}
//                   <div style={{
//                     position:"absolute", top:4, right:4, width:18, height:18,
//                     borderRadius:"50%",
//                     background: qrStatus==="ok" ? "#00ff88" : qrStatus==="fail" ? "#ffc800" : "rgba(0,212,255,0.8)",
//                     display:"flex", alignItems:"center", justifyContent:"center",
//                   }}>
//                     {qrStatus==="ok"
//                       ? <Check size={10} color="#000"/>
//                       : qrStatus==="fail"
//                       ? <span style={{fontSize:"10px",color:"#000",fontWeight:700}}>!</span>
//                       : <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}}>
//                           <RefreshCw size={9} color="#fff"/>
//                         </motion.div>
//                     }
//                   </div>
//                 </>
//               : <div style={{ textAlign:"center" }}>
//                   <QrCode size={20} color="#2a5060" style={{ marginBottom:4 }}/>
//                   <div style={{ fontSize:"8px", color:"#2a5060" }}>Chọn ảnh mặt trước</div>
//                 </div>
//             }
//           </div>
//           {(qrStatus !== "idle" || scanning) && (
//             <div style={{ marginTop:4, fontSize:"10px", color:scanMsgColor, display:"flex", alignItems:"center", gap:4 }}>
//               {scanning && <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}}><RefreshCw size={10}/></motion.div>}
//               {scanMsg}
//             </div>
//           )}
//         </div>

//         {/* Mặt sau */}
//         <div>
//           <div style={{ fontSize:"11px", color:"#4a6fa5", marginBottom:5, display:"flex", alignItems:"center", gap:4 }}>
//             <CreditCard size={11}/> Mặt sau (tùy chọn)
//           </div>
//           <div onClick={() => backRef.current?.click()}
//             style={{
//               aspectRatio:"85.6/54", borderRadius:"10px", overflow:"hidden",
//               border:`2px dashed ${backImg ? "rgba(0,200,80,0.5)" : "rgba(255,255,255,0.08)"}`,
//               background:"rgba(255,255,255,0.01)", cursor:"pointer", position:"relative",
//               display:"flex", alignItems:"center", justifyContent:"center",
//             }}>
//             <input ref={backRef} type="file" accept="image/*" style={{ display:"none" }}
//               onChange={e => e.target.files?.[0] && handleBack(e.target.files[0])} />
//             {backImg
//               ? <>
//                   <img src={backImg} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
//                   <div style={{ position:"absolute", top:4, right:4, width:18, height:18, borderRadius:"50%", background:"#00ff88", display:"flex", alignItems:"center", justifyContent:"center" }}>
//                     <Check size={10} color="#000"/>
//                   </div>
//                 </>
//               : <div style={{ textAlign:"center" }}>
//                   <Upload size={18} color="#2a3040" style={{ marginBottom:3 }}/>
//                   <div style={{ fontSize:"8px", color:"#2a3040" }}>Chọn ảnh mặt sau</div>
//                 </div>
//             }
//           </div>
//         </div>
//       </div>

//       {!frontImg && (
//         <div style={{ marginBottom:12, padding:"10px 12px", borderRadius:"10px", background:"rgba(0,212,255,0.04)", border:"1px solid rgba(0,212,255,0.12)", fontSize:"11px", color:"#4a6fa5", display:"flex", alignItems:"flex-start", gap:8 }}>
//           <span style={{fontSize:"16px"}}>💡</span>
//           <div>
//             Chụp rõ thẻ CCCD. Hệ thống AI OCR sẽ tự động quét chữ trên ảnh và trích xuất dữ liệu, kể cả khi ảnh mờ.
//           </div>
//         </div>
//       )}

//       {/* Form thông tin */}
//       <div style={{ background:"rgba(0,200,80,0.03)", border:"1px solid rgba(0,200,80,0.1)", borderRadius:"12px", padding:"14px", marginBottom:16 }}>
//         <div style={{ fontSize:"11px", color:"#00c840", marginBottom:12, display:"flex", alignItems:"center", gap:5 }}>
//           <Info size={11}/> Kiểm tra và bổ sung thông tin nếu cần
//         </div>
//         <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
//           {CCCD_FIELDS.map(f => (
//             <div key={f.key} style={{ gridColumn: f.full ? "1/-1" : "auto" }}>
//               <label style={{ fontSize:"10px", color:"#4a8a5a", display:"block", marginBottom:3 }}>{f.label}</label>
//               <input
//                 value={cccd[f.key] || ""}
//                 onChange={e => setCccd(p => ({ ...p, [f.key]: e.target.value }))}
//                 placeholder={f.placeholder}
//                 style={{
//                   ...inputStyle,
//                   borderColor: f.key === "full_name" && cccd.full_name ? "rgba(0,255,136,0.3)" : "rgba(0,212,255,0.15)",
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
//           width:"100%", padding:"12px", borderRadius:"12px",
//           background: canNext ? "linear-gradient(135deg,#00c840,#00d4ff)" : "rgba(255,255,255,0.04)",
//           border:"none", color: canNext ? "#fff" : "#2d4060",
//           cursor: canNext ? "pointer" : "not-allowed",
//           fontSize:"13px", fontWeight:600, fontFamily:"'Space Grotesk',sans-serif",
//           display:"flex", alignItems:"center", justifyContent:"center", gap:6,
//         }}>
//         Tiếp theo — Hình ảnh khuôn mặt <ChevronRight size={15}/>
//       </button>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // STEP 2 — Face Capture (Webcam OR Upload)
// // ═════════════════════════════════════════════════════════════════════════════
// function StepFace({ onNext, onBack }: { onNext: (files: File[]) => void; onBack: () => void }) {
//   const [mode,     setMode]     = useState<"choose"|"webcam"|"upload">("choose");
//   const [files,    setFiles]    = useState<File[]>([]);
//   const [previews, setPreviews] = useState<string[]>([]);
//   const fileRef   = useRef<HTMLInputElement>(null);
//   const videoRef  = useRef<HTMLVideoElement>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const [camActive, setCamActive] = useState(false);

//   useEffect(() => () => {
//     streamRef.current?.getTracks().forEach(t => t.stop());
//   }, []);

//   const startWebcam = async () => {
//     try {
//       const s = await navigator.mediaDevices.getUserMedia({ video: { width:640, height:480, facingMode:"user" } });
//       streamRef.current = s;
//       if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
//       setCamActive(true);
//     } catch {
//       alert("Không thể truy cập Camera. Hãy kiểm tra quyền trình duyệt hoặc dùng Upload.");
//     }
//   };

//   const stopWebcam = () => {
//     streamRef.current?.getTracks().forEach(t => t.stop());
//     setCamActive(false);
//   };

//   const snapPhoto = () => {
//     if (!videoRef.current || !canvasRef.current || files.length >= 5) return;
//     const v = videoRef.current, c = canvasRef.current;
//     c.width = 640; c.height = 480;
//     const ctx = c.getContext("2d")!;
//     ctx.save(); ctx.scale(-1, 1); ctx.drawImage(v, -640, 0, 640, 480); ctx.restore();
//     const url = c.toDataURL("image/jpeg", 0.88);
//     c.toBlob(blob => {
//       const f = new File([blob!], `face_${Date.now()}.jpg`, { type:"image/jpeg" });
//       setFiles(p => [...p, f]);
//       setPreviews(p => [...p, url]);
//     }, "image/jpeg", 0.88);
//   };

//   const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const fs = Array.from(e.target.files || [])
//       .filter(f => f.type.startsWith("image/"))
//       .slice(0, 5 - files.length);
//     setFiles(p => [...p, ...fs]);
//     fs.forEach(f => {
//       const r = new FileReader();
//       r.onload = ev => setPreviews(p => [...p, ev.target?.result as string]);
//       r.readAsDataURL(f);
//     });
//   };

//   const removePhoto = (i: number) => {
//     setFiles(p => p.filter((_, j) => j !== i));
//     setPreviews(p => p.filter((_, j) => j !== i));
//   };

//   // ── Choose ──
//   if (mode === "choose") return (
//     <div>
//       <div style={{ fontSize:"12px", color:"#4a6fa5", marginBottom:16 }}>
//         Cung cấp ít nhất 1 ảnh khuôn mặt để nhận diện (tối đa 5 ảnh)
//       </div>
//       <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
//         {[
//           { id:"webcam", emoji:"📷", title:"Chụp ảnh trực tiếp", sub:"Mở Webcam/Camera chụp ngay tại chỗ", color:"#00d4ff" },
//           { id:"upload", emoji:"🖼️", title:"Tải ảnh có sẵn",     sub:"Upload file ảnh rõ nét từ thiết bị",  color:"#8b5cf6" },
//         ].map(m => (
//           <motion.div key={m.id} whileHover={{x:4}} whileTap={{scale:0.98}}
//             onClick={() => setMode(m.id as any)}
//             style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:"14px", background:`${m.color}06`, border:`1px solid ${m.color}18`, cursor:"pointer" }}
//             onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `${m.color}12`; (e.currentTarget as HTMLDivElement).style.borderColor = `${m.color}40`; }}
//             onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = `${m.color}06`; (e.currentTarget as HTMLDivElement).style.borderColor = `${m.color}18`; }}
//           >
//             <span style={{ fontSize:"26px", flexShrink:0 }}>{m.emoji}</span>
//             <div style={{ flex:1 }}>
//               <div style={{ fontSize:"14px", color:"#e2e8f0", fontWeight:600 }}>{m.title}</div>
//               <div style={{ fontSize:"11px", color:"#4a6fa5", marginTop:2, lineHeight:1.4 }}>{m.sub}</div>
//             </div>
//             <ChevronRight size={16} color={m.color}/>
//           </motion.div>
//         ))}
//       </div>
//       <button onClick={onBack} style={{ width:"100%", padding:"10px", borderRadius:"10px", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", color:"#7a95b8", cursor:"pointer", fontSize:"12px", fontFamily:"'Space Grotesk',sans-serif" }}>
//         ← Quay lại bước trước
//       </button>
//     </div>
//   );

//   // ── Webcam ──
//   if (mode === "webcam") return (
//     <div>
//       <div style={{ position:"relative", borderRadius:"16px", overflow:"hidden", background:"#020408", aspectRatio:"4/3", border:"2px solid rgba(0,212,255,0.2)", marginBottom:12 }}>
//         <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)", display: camActive ? "block" : "none" }}/>
//         <canvas ref={canvasRef} style={{ display:"none" }}/>
//         {!camActive && (
//           <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
//             <button onClick={startWebcam} style={{ padding:"12px 24px", borderRadius:"12px", background:"linear-gradient(135deg,#00d4ff,#8b5cf6)", border:"none", color:"#fff", fontSize:"14px", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
//               <Camera size={18}/> Bật Camera
//             </button>
//           </div>
//         )}
//         {camActive && (
//           <>
//             <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 50% 65% at center,transparent 40%,rgba(0,0,0,0.65) 100%)", pointerEvents:"none" }}/>
//             <div style={{ position:"absolute", bottom:14, left:0, right:0, display:"flex", justifyContent:"center" }}>
//               <button onClick={snapPhoto} disabled={files.length >= 5}
//                 style={{ padding:"10px 28px", borderRadius:"20px", background: files.length < 5 ? "#00ff88" : "rgba(255,255,255,0.2)", border:"none", color:"#000", fontWeight:700, cursor: files.length < 5 ? "pointer" : "not-allowed", fontSize:"14px" }}>
//                 📸 Chụp ({files.length}/5)
//               </button>
//             </div>
//           </>
//         )}
//       </div>
//       {previews.length > 0 && (
//         <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
//           {previews.map((src, i) => (
//             <div key={i} style={{ position:"relative", width:56, height:56, borderRadius:"8px", overflow:"hidden", border:"1px solid rgba(0,212,255,0.4)" }}>
//               <img src={src} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
//               <button onClick={() => removePhoto(i)} style={{ position:"absolute", top:2, right:2, width:16, height:16, borderRadius:"50%", background:"rgba(0,0,0,0.8)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
//                 <X size={10} color="#ff6b6b"/>
//               </button>
//             </div>
//           ))}
//         </div>
//       )}
//       <div style={{ display:"flex", gap:8 }}>
//         <button onClick={() => { stopWebcam(); setMode("choose"); }} style={{ flex:1, padding:"10px", borderRadius:"10px", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", color:"#7a95b8", cursor:"pointer", fontSize:"12px" }}>← Chọn lại</button>
//         <button onClick={() => { stopWebcam(); onNext(files); }} disabled={files.length === 0}
//           style={{ flex:2, padding:"10px", borderRadius:"10px", background: files.length > 0 ? "linear-gradient(135deg,#00d4ff,#8b5cf6)" : "rgba(255,255,255,0.04)", border:"none", color: files.length > 0 ? "#fff" : "#2d4060", cursor: files.length > 0 ? "pointer" : "not-allowed", fontSize:"13px", fontWeight:600 }}>
//           Tiếp theo →
//         </button>
//       </div>
//     </div>
//   );

//   // ── Upload ──
//   return (
//     <div>
//       <div style={{ fontSize:"12px", color:"#4a6fa5", marginBottom:12 }}>
//         Tải lên 1–5 ảnh khuôn mặt (nhiều góc → nhận diện chính xác hơn)
//       </div>
//       <div onClick={() => fileRef.current?.click()}
//         style={{ padding:"24px", borderRadius:"14px", border:`2px dashed ${files.length >= 1 ? "rgba(0,255,136,0.4)" : "rgba(139,92,246,0.3)"}`, background:"rgba(139,92,246,0.02)", cursor:"pointer", textAlign:"center", marginBottom:12 }}
//         onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.6)")}
//         onMouseLeave={e => (e.currentTarget.style.borderColor = files.length >= 1 ? "rgba(0,255,136,0.4)" : "rgba(139,92,246,0.3)")}
//       >
//         <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleUpload} style={{ display:"none" }}/>
//         <Upload size={24} color="#4a6fa5" style={{ marginBottom:8 }}/>
//         <div style={{ fontSize:"12px", color:"#7a95b8", fontWeight:600 }}>Chọn ảnh ({files.length}/5)</div>
//         <div style={{ fontSize:"10px", color:"#2d4060", marginTop:3 }}>Mỗi ảnh 1 góc mặt khác nhau</div>
//       </div>
//       {previews.length > 0 && (
//         <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6, marginBottom:12 }}>
//           {previews.map((src, i) => (
//             <div key={i} style={{ position:"relative", aspectRatio:"1", borderRadius:"8px", overflow:"hidden", border:"1px solid rgba(139,92,246,0.3)" }}>
//               <img src={src} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
//               <button onClick={() => removePhoto(i)} style={{ position:"absolute", top:2, right:2, width:16, height:16, borderRadius:"50%", background:"rgba(0,0,0,0.8)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
//                 <X size={9} color="#ff6b6b"/>
//               </button>
//             </div>
//           ))}
//           {files.length < 5 && (
//             <div onClick={() => fileRef.current?.click()} style={{ aspectRatio:"1", borderRadius:"8px", border:"1px dashed rgba(139,92,246,0.2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
//               <span style={{ fontSize:"18px", color:"#2d4060" }}>+</span>
//             </div>
//           )}
//         </div>
//       )}
//       <div style={{ display:"flex", gap:8 }}>
//         <button onClick={() => setMode("choose")} style={{ flex:1, padding:"10px", borderRadius:"10px", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", color:"#7a95b8", cursor:"pointer", fontSize:"12px" }}>← Chọn lại</button>
//         <button onClick={() => onNext(files)} disabled={files.length === 0}
//           style={{ flex:2, padding:"10px", borderRadius:"10px", background: files.length > 0 ? "linear-gradient(135deg,#8b5cf6,#00d4ff)" : "rgba(255,255,255,0.04)", border:"none", color: files.length > 0 ? "#fff" : "#2d4060", cursor: files.length > 0 ? "pointer" : "not-allowed", fontSize:"13px", fontWeight:600 }}>
//           Tiếp theo →
//         </button>
//       </div>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // STEP 3 — Thông tin công việc
// // ═════════════════════════════════════════════════════════════════════════════
// function StepInfo({ defaultName, onSubmit, onBack, submitting, error }: {
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

//   const expiryWarning = expiry && new Date(expiry) < new Date();

//   return (
//     <div>
//       <div style={{ fontSize:"12px", color:"#4a6fa5", marginBottom:14 }}>
//         Thông tin công việc — chức vụ và thời hạn làm việc
//       </div>
//       <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
//         {[
//           { label:"Họ và tên *",      v:name, set:setName, ph:"Nguyễn Văn A" },
//           { label:"Chức vụ / Vị trí", v:role, set:setRole, ph:"Kỹ sư, Nhân viên, Quản lý..." },
//           { label:"Phòng ban",         v:dept, set:setDept, ph:"Kỹ thuật / Marketing / Nhân sự..." },
//         ].map(f => (
//           <div key={f.label}>
//             <label style={{ fontSize:"12px", color:"#4a6fa5", display:"block", marginBottom:6 }}>{f.label}</label>
//             <input value={f.v} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={inputStyle}/>
//           </div>
//         ))}

//         <div>
//           <label style={{ fontSize:"12px", color:"#4a6fa5", display:"block", marginBottom:6 }}>
//             Thời hạn làm việc
//             <span style={{ fontSize:"10px", color:"#2d4060", marginLeft:8 }}>(để trống = không giới hạn)</span>
//           </label>
//           <div style={{ position:"relative" }}>
//             <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} style={{ ...inputStyle, paddingRight:36 }}/>
//             <Calendar size={14} color="#4a6fa5" style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}/>
//           </div>
//           {expiry && (
//             <div style={{ marginTop:6, padding:"8px 10px", borderRadius:"8px", background: expiryWarning ? "rgba(255,45,85,0.08)" : "rgba(0,212,255,0.05)", border:`1px solid ${expiryWarning ? "rgba(255,45,85,0.2)" : "rgba(0,212,255,0.15)"}`, fontSize:"11px", color: expiryWarning ? "#ff6b6b" : "#00d4ff", display:"flex", alignItems:"center", gap:6 }}>
//               {expiryWarning
//                 ? <><AlertTriangle size={12}/> Ngày đã qua — nhân viên sẽ không được nhận diện</>
//                 : <><Check size={12}/> Hết hạn vào {new Date(expiry).toLocaleDateString("vi-VN")}</>
//               }
//             </div>
//           )}
//         </div>
//       </div>

//       {error && (
//         <div style={{ marginTop:10, padding:"9px", borderRadius:"8px", background:"rgba(255,107,107,0.08)", border:"1px solid rgba(255,107,107,0.3)", color:"#ff6b6b", fontSize:"12px", textAlign:"center" }}>
//           {error}
//         </div>
//       )}

//       <div style={{ display:"flex", gap:10, marginTop:18 }}>
//         <button onClick={onBack} style={{ flex:1, padding:"11px", borderRadius:"10px", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", color:"#7a95b8", cursor:"pointer", fontSize:"13px" }}>
//           ← Quay lại
//         </button>
//         <button onClick={() => onSubmit({ name, role, dept, expiry })} disabled={!name.trim() || submitting}
//           style={{ flex:2, padding:"11px", borderRadius:"10px", background: name.trim() ? "linear-gradient(135deg,#00d4ff,#8b5cf6)" : "rgba(255,255,255,0.04)", border:"none", color: name.trim() ? "#fff" : "#2d4060", cursor: name.trim() ? "pointer" : "not-allowed", fontSize:"14px", fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:6, opacity: submitting ? 0.7 : 1 }}>
//           <Shield size={15}/> {submitting ? "Đang đăng ký..." : "Hoàn tất Đăng ký"}
//         </button>
//       </div>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // Main RegisterModal
// // ═════════════════════════════════════════════════════════════════════════════
// interface Props { onClose: () => void; onSuccess: () => void; }

// export function RegisterModal({ onClose, onSuccess }: Props) {
//   const [step,       setStep]       = useState<1|2|3|4>(1);
//   const [cccdData,   setCccdData]   = useState<Partial<CCCDData>>({});
//   const [cccdFront,  setCccdFront]  = useState<File | null>(null);
//   const [cccdBack,   setCccdBack]   = useState<File | null>(null);
//   const [faceFiles,  setFaceFiles]  = useState<File[]>([]);
//   const [submitting, setSubmitting] = useState(false);
//   const [error,      setError]      = useState("");

//   const handleCCCDNext = (data: Partial<CCCDData>, front: File | null, back: File | null) => {
//     setCccdData(data); setCccdFront(front); setCccdBack(back);
//     setStep(2);
//   };

//   const handleFaceNext = (files: File[]) => {
//     setFaceFiles(files); setStep(3);
//   };

//   const handleSubmit = async ({ name, role, dept, expiry }: { name: string; role: string; dept: string; expiry: string }) => {
//     if (faceFiles.length === 0) { setError("Cần ít nhất 1 ảnh khuôn mặt"); return; }
//     try {
//       setSubmitting(true); setError(""); setStep(4);
//       const fd = new FormData();
//       fd.append("name", name);
//       fd.append("role", role);
//       fd.append("department", dept);
//       if (expiry) fd.append("work_expiry_date", expiry);
//       if (cccdFront) fd.append("cccd_front", cccdFront);
//       if (cccdBack)  fd.append("cccd_back",  cccdBack);
//       fd.append("cccd_info", JSON.stringify(cccdData));
//       faceFiles.forEach(f => fd.append("images", f));

//       await apiClient.registerFace(fd);
//       setTimeout(() => { onSuccess(); onClose(); }, 1200);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Lỗi đăng ký");
//       setStep(3); setSubmitting(false);
//     }
//   };

//   const STEP_LABELS = ["", "Thông tin & CCCD", "Ảnh khuôn mặt", "Thông tin công việc", "Đang xử lý"];

//   return (
//     <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
//       style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", backdropFilter:"blur(18px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:16 }}
//       onClick={submitting ? undefined : onClose}
//     >
//       <motion.div initial={{scale:0.92,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.9,opacity:0}}
//         onClick={e => e.stopPropagation()}
//         style={{ width:"100%", maxWidth:580, maxHeight:"93vh", overflowY:"auto", background:"#07101a", border:"1px solid rgba(0,212,255,0.18)", borderRadius:"22px", boxShadow:"0 0 100px rgba(0,212,255,0.07)", fontFamily:"'Space Grotesk',sans-serif" }}
//       >
//         {/* Header */}
//         <div style={{ padding:"18px 22px 14px", borderBottom:"1px solid rgba(0,212,255,0.08)", position:"sticky", top:0, background:"#07101a", zIndex:10, borderRadius:"22px 22px 0 0" }}>
//           <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
//             <div>
//               <h2 style={{ fontSize:"14px", color:"#e2e8f0", margin:0, letterSpacing:"1px" }}>ĐĂNG KÝ NHÂN VIÊN</h2>
//               <p style={{ fontSize:"11px", color:"#4a6fa5", margin:"2px 0 0" }}>
//                 {step <= 3 ? STEP_LABELS[step] : STEP_LABELS[4]}
//               </p>
//             </div>
//             {!submitting && (
//               <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#4a6fa5", padding:4 }}>
//                 <X size={20}/>
//               </button>
//             )}
//           </div>

//           {/* Step indicator */}
//           <div style={{ display:"flex", gap:6, marginBottom:8 }}>
//             {[1,2,3].map(s => (
//               <div key={s} style={{ flex:1, display:"flex", alignItems:"center", gap:6 }}>
//                 <div style={{
//                   width:22, height:22, borderRadius:"50%",
//                   background: step > s ? "#00ff88" : step === s ? "#00d4ff" : "rgba(255,255,255,0.06)",
//                   border:`1px solid ${step > s ? "#00ff88" : step === s ? "#00d4ff" : "rgba(255,255,255,0.1)"}`,
//                   display:"flex", alignItems:"center", justifyContent:"center",
//                   fontSize:"10px", color: step >= s ? "#000" : "#4a6fa5", fontWeight:700, flexShrink:0,
//                   transition:"all 0.3s",
//                 }}>
//                   {step > s ? <Check size={12}/> : s}
//                 </div>
//                 <div style={{ flex:1, height:2, borderRadius:"1px", background: step > s ? "rgba(0,255,136,0.4)" : step === s ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.06)", transition:"all 0.3s" }}/>
//               </div>
//             ))}
//             <div style={{
//               width:22, height:22, borderRadius:"50%",
//               background: step > 3 ? "#00ff88" : "rgba(255,255,255,0.06)",
//               border:`1px solid ${step > 3 ? "#00ff88" : "rgba(255,255,255,0.1)"}`,
//               display:"flex", alignItems:"center", justifyContent:"center",
//               fontSize:"10px", color: step > 3 ? "#000" : "#4a6fa5", fontWeight:700,
//             }}>
//               {step > 3 ? <Check size={12}/> : 3}
//             </div>
//           </div>

//           <div style={{ display:"flex", justifyContent:"space-between" }}>
//             {["CCCD & AI OCR", "Khuôn mặt", "Công việc"].map((l, i) => (
//               <div key={l} style={{ fontSize:"9px", color: step === i+1 ? "#00d4ff" : step > i+1 ? "#00ff88" : "#2d4060", fontWeight: step === i+1 ? 600 : 400, flex:1, textAlign: i === 0 ? "left" : i === 2 ? "right" : "center" }}>
//                 {l}
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Content */}
//         <div style={{ padding:"20px 22px 24px" }}>
//           <AnimatePresence mode="wait">
//             {step === 1 && (
//               <motion.div key="s1" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
//                 <StepCCCD onNext={handleCCCDNext}/>
//               </motion.div>
//             )}
//             {step === 2 && (
//               <motion.div key="s2" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
//                 <StepFace onNext={handleFaceNext} onBack={() => setStep(1)}/>
//               </motion.div>
//             )}
//             {step === 3 && (
//               <motion.div key="s3" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
//                 <StepInfo defaultName={cccdData.full_name || ""} onSubmit={handleSubmit} onBack={() => setStep(2)} submitting={submitting} error={error}/>
//               </motion.div>
//             )}
//             {step === 4 && (
//               <motion.div key="s4" initial={{opacity:0}} animate={{opacity:1}} style={{ textAlign:"center", padding:"28px 0" }}>
//                 <motion.div animate={{rotate:360}} transition={{duration:1.5, repeat:Infinity, ease:"linear"}} style={{ display:"inline-block", marginBottom:16 }}>
//                   <div style={{ width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,#00d4ff,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
//                     <Shield size={30} color="#fff"/>
//                   </div>
//                 </motion.div>
//                 <div style={{ fontSize:"15px", color:"#e2e8f0", fontWeight:600, marginBottom:6 }}>Đang đăng ký...</div>
//                 <div style={{ fontSize:"12px", color:"#4a6fa5", marginBottom:20 }}>
//                   Tạo Face Embedding từ {faceFiles.length} ảnh
//                 </div>
//                 <div style={{ padding:"3px", borderRadius:"20px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(0,212,255,0.15)" }}>
//                   <motion.div animate={{width:["0%","95%"]}} transition={{duration:3, ease:"easeOut"}} style={{ height:8, borderRadius:"20px", background:"linear-gradient(90deg,#00d4ff,#8b5cf6)" }}/>
//                 </div>
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </div>
//       </motion.div>
//     </motion.div>
//   );
// }

// import { useState, useRef, useEffect } from "react";
// import { motion, AnimatePresence } from "motion/react";
// import {
//   X, Upload, Shield, Camera, CreditCard,
//   ChevronRight, Check, Calendar, AlertTriangle, Info, RefreshCw, QrCode
// } from "lucide-react";
// import { apiClient } from "../services/api";

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
//   special_features: string;
// }

// const CCCD_FIELDS: Array<{ key: keyof CCCDData; label: string; placeholder: string; full?: boolean }> = [
//   { key: "full_name",        label: "Họ và tên *",         placeholder: "NGUYỄN VĂN A",                     full: true },
//   { key: "id_number",        label: "Số CCCD / CMND",      placeholder: "0XX XXX XXX XXX" },
//   { key: "dob",              label: "Ngày sinh",            placeholder: "01/01/1990" },
//   { key: "gender",           label: "Giới tính",            placeholder: "Nam / Nữ" },
//   { key: "nationality",      label: "Quốc tịch",            placeholder: "Việt Nam" },
//   { key: "hometown",         label: "Quê quán",             placeholder: "Tỉnh / Thành phố...",              full: true },
//   { key: "address",          label: "Nơi thường trú",       placeholder: "Số nhà, đường, phường, quận, TP",  full: true },
//   { key: "expiry_date",      label: "Có giá trị đến",       placeholder: "01/01/2030" },
//   { key: "issue_date",       label: "Ngày cấp",             placeholder: "01/01/2020" },
//   { key: "special_features", label: "Đặc điểm nhận dạng",  placeholder: "Sẹo, nốt ruồi...",                 full: true },
// ];

// const inputStyle: React.CSSProperties = {
//   width: "100%", padding: "9px 12px", borderRadius: "9px",
//   background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,212,255,0.15)",
//   color: "#e2e8f0", fontSize: "12px", outline: "none",
//   fontFamily: "'Space Grotesk',sans-serif", boxSizing: "border-box",
// };

// // ═════════════════════════════════════════════════════════════════════════════
// // STEP 1 — CCCD Upload + OCR Scan
// // ═════════════════════════════════════════════════════════════════════════════
// function StepCCCD({ onNext }: { onNext: (data: Partial<CCCDData>, front: File | null, back: File | null) => void }) {
//   const [cccd,      setCccd]      = useState<Partial<CCCDData>>({ nationality: "Việt Nam" });
//   const [frontImg,  setFrontImg]  = useState<string>();
//   const [backImg,   setBackImg]   = useState<string>();
//   const [frontFile, setFrontFile] = useState<File | null>(null);
//   const [backFile,  setBackFile]  = useState<File | null>(null);

//   // TÁCH RIÊNG TRẠNG THÁI MẶT TRƯỚC
//   const [frontScanning, setFrontScanning] = useState(false);
//   const [frontMsg,      setFrontMsg]      = useState("");
//   const [frontStatus,   setFrontStatus]   = useState<"idle" | "ok" | "fail">("idle");

//   // TÁCH RIÊNG TRẠNG THÁI MẶT SAU
//   const [backScanning,  setBackScanning]  = useState(false);
//   const [backMsg,       setBackMsg]       = useState("");
//   const [backStatus,    setBackStatus]    = useState<"idle" | "ok" | "fail">("idle");

//   const frontRef = useRef<HTMLInputElement>(null);
//   const backRef  = useRef<HTMLInputElement>(null);

//   // Mặt trước → Gửi API OCR
//   const handleFront = async (file: File) => {
//     setFrontFile(file);
//     setFrontImg(URL.createObjectURL(file));
//     setFrontScanning(true);
//     setFrontMsg("AI đang phân tích mặt trước...");
//     setFrontStatus("idle");

//     try {
//       const response = await apiClient.extractOCR(file, "front");

//       if (response.success && response.data && Object.keys(response.data).length > 0) {
//         setCccd(prev => ({ ...prev, ...response.data }));
//         setFrontStatus("ok");
//         setFrontMsg("✓ Quét mặt trước thành công!");
//       } else {
//         setFrontStatus("fail");
//         setFrontMsg("Ảnh mờ hoặc không có dữ liệu.");
//       }
//     } catch (error) {
//       console.error("Lỗi quét ảnh trước:", error);
//       setFrontStatus("fail");
//       setFrontMsg("Lỗi máy chủ AI. Vui lòng nhập tay.");
//     } finally {
//       setFrontScanning(false);
//     }
//   };

//   // Mặt sau → Gửi API OCR lấy ngày cấp
//   const handleBack = async (file: File) => {
//     setBackFile(file);
//     setBackImg(URL.createObjectURL(file));
//     setBackScanning(true);
//     setBackMsg("AI đang phân tích mặt sau...");
//     setBackStatus("idle");

//     try {
//       const response = await apiClient.extractOCR(file, "back");
      
//       if (response.success && response.data) {
//         const { issue_date, special_features } = response.data;
//         setCccd(prev => ({ 
//           ...prev, 
//           issue_date: issue_date || prev.issue_date,
//           special_features: special_features || prev.special_features 
//         }));

//         if (issue_date || special_features) {
//           setBackStatus("ok");
//           setBackMsg("✓ Quét mặt sau thành công.");
//         } else {
//           setBackStatus("fail");
//           setBackMsg("Ảnh mờ, hãy tự nhập tay.");
//         }
//       } else {
//         setBackStatus("fail");
//         setBackMsg("Không tìm thấy thông tin.");
//       }
//     } catch (error) {
//       console.error("Lỗi quét mặt sau:", error);
//       setBackStatus("fail");
//       setBackMsg("Lỗi khi quét mặt sau.");
//     } finally {
//       setBackScanning(false);
//     }
//   };

//   const canNext = !!cccd.full_name?.trim();

//   // CSS Động cho mặt trước
//   const frontBorderColor = frontStatus === "ok" ? "rgba(0,255,136,0.5)" : frontStatus === "fail" ? "rgba(255,200,0,0.4)" : frontImg ? "rgba(0,212,255,0.4)" : "rgba(0,212,255,0.2)";
//   const frontMsgColor = frontStatus === "ok" ? "#00ff88" : frontStatus === "fail" ? "#ffc800" : "#00d4ff";

//   // CSS Động cho mặt sau
//   const backBorderColor = backStatus === "ok" ? "rgba(0,255,136,0.5)" : backStatus === "fail" ? "rgba(255,200,0,0.4)" : backImg ? "rgba(0,212,255,0.4)" : "rgba(255,255,255,0.08)";
//   const backMsgColor = backStatus === "ok" ? "#00ff88" : backStatus === "fail" ? "#ffc800" : "#00d4ff";

//   return (
//     <div>
//       <div style={{ fontSize:"12px", color:"#4a6fa5", marginBottom:14 }}>
//         Chụp <b style={{color:"#00d4ff"}}>CCCD</b> — AI sẽ tự động đọc chữ và điền thông tin ngay lập tức ⚡
//       </div>

//       {/* Upload row */}
//       <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        
//         {/* 1. MẶT TRƯỚC */}
//         <div>
//           <div style={{ fontSize:"11px", color:"#4a6fa5", marginBottom:5, display:"flex", alignItems:"center", gap:4 }}>
//             <QrCode size={11} color="#00d4ff"/> Mặt trước
//           </div>
//           <div onClick={() => frontRef.current?.click()}
//             style={{
//               aspectRatio:"85.6/54", borderRadius:"10px", overflow:"hidden",
//               border:`2px dashed ${frontBorderColor}`,
//               background: frontImg ? "transparent" : "rgba(0,212,255,0.03)",
//               cursor:"pointer", position:"relative",
//               display:"flex", alignItems:"center", justifyContent:"center",
//               transition:"border-color 0.3s",
//             }}>
//             <input ref={frontRef} type="file" accept="image/*" style={{ display:"none" }}
//               onChange={e => e.target.files?.[0] && handleFront(e.target.files[0])} />
//             {frontImg
//               ? <>
//                   <img src={frontImg} style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
//                   {frontScanning && (
//                     <motion.div
//                       animate={{ top: ["0%", "100%", "0%"] }}
//                       transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
//                       style={{ position:"absolute", left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,#00d4ff,transparent)", boxShadow:"0 0 8px #00d4ff", pointerEvents:"none" }}
//                     />
//                   )}
//                   <div style={{
//                     position:"absolute", top:4, right:4, width:18, height:18, borderRadius:"50%",
//                     background: frontStatus==="ok" ? "#00ff88" : frontStatus==="fail" ? "#ffc800" : "rgba(0,212,255,0.8)",
//                     display:"flex", alignItems:"center", justifyContent:"center",
//                   }}>
//                     {frontStatus==="ok" ? <Check size={10} color="#000"/> : frontStatus==="fail" ? <span style={{fontSize:"10px",color:"#000",fontWeight:700}}>!</span> : <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}}><RefreshCw size={9} color="#fff"/></motion.div>}
//                   </div>
//                 </>
//               : <div style={{ textAlign:"center" }}>
//                   <QrCode size={20} color="#2a5060" style={{ marginBottom:4 }}/>
//                   <div style={{ fontSize:"8px", color:"#2a5060" }}>Chọn mặt trước</div>
//                 </div>
//             }
//           </div>
//           {(frontStatus !== "idle" || frontScanning) && (
//             <div style={{ marginTop:4, fontSize:"10px", color:frontMsgColor, display:"flex", alignItems:"center", gap:4 }}>
//               {frontScanning && <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}}><RefreshCw size={10}/></motion.div>}
//               {frontMsg}
//             </div>
//           )}
//         </div>

//         {/* 2. MẶT SAU */}
//         <div>
//           <div style={{ fontSize:"11px", color:"#4a6fa5", marginBottom:5, display:"flex", alignItems:"center", gap:4 }}>
//             <CreditCard size={11}/> Mặt sau (tùy chọn)
//           </div>
//           <div onClick={() => backRef.current?.click()}
//             style={{
//               aspectRatio:"85.6/54", borderRadius:"10px", overflow:"hidden",
//               border:`2px dashed ${backBorderColor}`,
//               background:"rgba(255,255,255,0.01)", cursor:"pointer", position:"relative",
//               display:"flex", alignItems:"center", justifyContent:"center",
//               transition:"border-color 0.3s",
//             }}>
//             <input ref={backRef} type="file" accept="image/*" style={{ display:"none" }}
//               onChange={e => e.target.files?.[0] && handleBack(e.target.files[0])} />
//             {backImg
//               ? <>
//                   <img src={backImg} style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
//                   {backScanning && (
//                     <motion.div
//                       animate={{ top: ["0%", "100%", "0%"] }}
//                       transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
//                       style={{ position:"absolute", left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,#00d4ff,transparent)", boxShadow:"0 0 8px #00d4ff", pointerEvents:"none" }}
//                     />
//                   )}
//                   <div style={{
//                     position:"absolute", top:4, right:4, width:18, height:18, borderRadius:"50%",
//                     background: backStatus==="ok" ? "#00ff88" : backStatus==="fail" ? "#ffc800" : "rgba(0,212,255,0.8)",
//                     display:"flex", alignItems:"center", justifyContent:"center",
//                   }}>
//                     {backStatus==="ok" ? <Check size={10} color="#000"/> : backStatus==="fail" ? <span style={{fontSize:"10px",color:"#000",fontWeight:700}}>!</span> : <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}}><RefreshCw size={9} color="#fff"/></motion.div>}
//                   </div>
//                 </>
//               : <div style={{ textAlign:"center" }}>
//                   <Upload size={18} color="#2a3040" style={{ marginBottom:3 }}/>
//                   <div style={{ fontSize:"8px", color:"#2a3040" }}>Chọn mặt sau</div>
//                 </div>
//             }
//           </div>
//           {(backStatus !== "idle" || backScanning) && (
//             <div style={{ marginTop:4, fontSize:"10px", color:backMsgColor, display:"flex", alignItems:"center", gap:4 }}>
//               {backScanning && <motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}}><RefreshCw size={10}/></motion.div>}
//               {backMsg}
//             </div>
//           )}
//         </div>

//       </div>

//       {!frontImg && (
//         <div style={{ marginBottom:12, padding:"10px 12px", borderRadius:"10px", background:"rgba(0,212,255,0.04)", border:"1px solid rgba(0,212,255,0.12)", fontSize:"11px", color:"#4a6fa5", display:"flex", alignItems:"flex-start", gap:8 }}>
//           <span style={{fontSize:"16px"}}>💡</span>
//           <div>
//             Chụp rõ thẻ CCCD. Hệ thống AI OCR sẽ tự động quét chữ trên ảnh và trích xuất dữ liệu, kể cả khi ảnh mờ.
//           </div>
//         </div>
//       )}

//       {/* Form thông tin */}
//       <div style={{ background:"rgba(0,200,80,0.03)", border:"1px solid rgba(0,200,80,0.1)", borderRadius:"12px", padding:"14px", marginBottom:16 }}>
//         <div style={{ fontSize:"11px", color:"#00c840", marginBottom:12, display:"flex", alignItems:"center", gap:5 }}>
//           <Info size={11}/> Kiểm tra và bổ sung thông tin nếu cần
//         </div>
//         <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
//           {CCCD_FIELDS.map(f => (
//             <div key={f.key} style={{ gridColumn: f.full ? "1/-1" : "auto" }}>
//               <label style={{ fontSize:"10px", color:"#4a8a5a", display:"block", marginBottom:3 }}>{f.label}</label>
//               <input
//                 value={cccd[f.key] || ""}
//                 onChange={e => setCccd(p => ({ ...p, [f.key]: e.target.value }))}
//                 placeholder={f.placeholder}
//                 style={{
//                   ...inputStyle,
//                   borderColor: f.key === "full_name" && cccd.full_name ? "rgba(0,255,136,0.3)" : "rgba(0,212,255,0.15)",
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
//           width:"100%", padding:"12px", borderRadius:"12px",
//           background: canNext ? "linear-gradient(135deg,#00c840,#00d4ff)" : "rgba(255,255,255,0.04)",
//           border:"none", color: canNext ? "#fff" : "#2d4060",
//           cursor: canNext ? "pointer" : "not-allowed",
//           fontSize:"13px", fontWeight:600, fontFamily:"'Space Grotesk',sans-serif",
//           display:"flex", alignItems:"center", justifyContent:"center", gap:6,
//         }}>
//         Tiếp theo — Hình ảnh khuôn mặt <ChevronRight size={15}/>
//       </button>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // STEP 2 — Face Capture (Webcam OR Upload)
// // ═════════════════════════════════════════════════════════════════════════════
// function StepFace({ onNext, onBack }: { onNext: (files: File[]) => void; onBack: () => void }) {
//   const [mode,     setMode]     = useState<"choose"|"webcam"|"upload">("choose");
//   const [files,    setFiles]    = useState<File[]>([]);
//   const [previews, setPreviews] = useState<string[]>([]);
//   const fileRef   = useRef<HTMLInputElement>(null);
//   const videoRef  = useRef<HTMLVideoElement>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const streamRef = useRef<MediaStream | null>(null);
//   const [camActive, setCamActive] = useState(false);

//   useEffect(() => () => {
//     streamRef.current?.getTracks().forEach(t => t.stop());
//   }, []);

//   const startWebcam = async () => {
//     try {
//       const s = await navigator.mediaDevices.getUserMedia({ video: { width:640, height:480, facingMode:"user" } });
//       streamRef.current = s;
//       if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
//       setCamActive(true);
//     } catch {
//       alert("Không thể truy cập Camera. Hãy kiểm tra quyền trình duyệt hoặc dùng Upload.");
//     }
//   };

//   const stopWebcam = () => {
//     streamRef.current?.getTracks().forEach(t => t.stop());
//     setCamActive(false);
//   };

//   const snapPhoto = () => {
//     if (!videoRef.current || !canvasRef.current || files.length >= 5) return;
//     const v = videoRef.current, c = canvasRef.current;
//     c.width = 640; c.height = 480;
//     const ctx = c.getContext("2d")!;
//     ctx.save(); ctx.scale(-1, 1); ctx.drawImage(v, -640, 0, 640, 480); ctx.restore();
//     const url = c.toDataURL("image/jpeg", 0.88);
//     c.toBlob(blob => {
//       const f = new File([blob!], `face_${Date.now()}.jpg`, { type:"image/jpeg" });
//       setFiles(p => [...p, f]);
//       setPreviews(p => [...p, url]);
//     }, "image/jpeg", 0.88);
//   };

//   const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const fs = Array.from(e.target.files || [])
//       .filter(f => f.type.startsWith("image/"))
//       .slice(0, 5 - files.length);
//     setFiles(p => [...p, ...fs]);
//     fs.forEach(f => {
//       const r = new FileReader();
//       r.onload = ev => setPreviews(p => [...p, ev.target?.result as string]);
//       r.readAsDataURL(f);
//     });
//   };

//   const removePhoto = (i: number) => {
//     setFiles(p => p.filter((_, j) => j !== i));
//     setPreviews(p => p.filter((_, j) => j !== i));
//   };

//   // ── Choose ──
//   if (mode === "choose") return (
//     <div>
//       <div style={{ fontSize:"12px", color:"#4a6fa5", marginBottom:16 }}>
//         Cung cấp ít nhất 1 ảnh khuôn mặt để nhận diện (tối đa 5 ảnh)
//       </div>
//       <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
//         {[
//           { id:"webcam", emoji:"📷", title:"Chụp ảnh trực tiếp", sub:"Mở Webcam/Camera chụp ngay tại chỗ", color:"#00d4ff" },
//           { id:"upload", emoji:"🖼️", title:"Tải ảnh có sẵn",     sub:"Upload file ảnh rõ nét từ thiết bị",  color:"#8b5cf6" },
//         ].map(m => (
//           <motion.div key={m.id} whileHover={{x:4}} whileTap={{scale:0.98}}
//             onClick={() => setMode(m.id as any)}
//             style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:"14px", background:`${m.color}06`, border:`1px solid ${m.color}18`, cursor:"pointer" }}
//             onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `${m.color}12`; (e.currentTarget as HTMLDivElement).style.borderColor = `${m.color}40`; }}
//             onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = `${m.color}06`; (e.currentTarget as HTMLDivElement).style.borderColor = `${m.color}18`; }}
//           >
//             <span style={{ fontSize:"26px", flexShrink:0 }}>{m.emoji}</span>
//             <div style={{ flex:1 }}>
//               <div style={{ fontSize:"14px", color:"#e2e8f0", fontWeight:600 }}>{m.title}</div>
//               <div style={{ fontSize:"11px", color:"#4a6fa5", marginTop:2, lineHeight:1.4 }}>{m.sub}</div>
//             </div>
//             <ChevronRight size={16} color={m.color}/>
//           </motion.div>
//         ))}
//       </div>
//       <button onClick={onBack} style={{ width:"100%", padding:"10px", borderRadius:"10px", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", color:"#7a95b8", cursor:"pointer", fontSize:"12px", fontFamily:"'Space Grotesk',sans-serif" }}>
//         ← Quay lại bước trước
//       </button>
//     </div>
//   );

//   // ── Webcam ──
//   if (mode === "webcam") return (
//     <div>
//       <div style={{ position:"relative", borderRadius:"16px", overflow:"hidden", background:"#020408", aspectRatio:"4/3", border:"2px solid rgba(0,212,255,0.2)", marginBottom:12 }}>
//         <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)", display: camActive ? "block" : "none" }}/>
//         <canvas ref={canvasRef} style={{ display:"none" }}/>
//         {!camActive && (
//           <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
//             <button onClick={startWebcam} style={{ padding:"12px 24px", borderRadius:"12px", background:"linear-gradient(135deg,#00d4ff,#8b5cf6)", border:"none", color:"#fff", fontSize:"14px", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
//               <Camera size={18}/> Bật Camera
//             </button>
//           </div>
//         )}
//         {camActive && (
//           <>
//             <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 50% 65% at center,transparent 40%,rgba(0,0,0,0.65) 100%)", pointerEvents:"none" }}/>
//             <div style={{ position:"absolute", bottom:14, left:0, right:0, display:"flex", justifyContent:"center" }}>
//               <button onClick={snapPhoto} disabled={files.length >= 5}
//                 style={{ padding:"10px 28px", borderRadius:"20px", background: files.length < 5 ? "#00ff88" : "rgba(255,255,255,0.2)", border:"none", color:"#000", fontWeight:700, cursor: files.length < 5 ? "pointer" : "not-allowed", fontSize:"14px" }}>
//                 📸 Chụp ({files.length}/5)
//               </button>
//             </div>
//           </>
//         )}
//       </div>
//       {previews.length > 0 && (
//         <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
//           {previews.map((src, i) => (
//             <div key={i} style={{ position:"relative", width:56, height:56, borderRadius:"8px", overflow:"hidden", border:"1px solid rgba(0,212,255,0.4)" }}>
//               <img src={src} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
//               <button onClick={() => removePhoto(i)} style={{ position:"absolute", top:2, right:2, width:16, height:16, borderRadius:"50%", background:"rgba(0,0,0,0.8)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
//                 <X size={10} color="#ff6b6b"/>
//               </button>
//             </div>
//           ))}
//         </div>
//       )}
//       <div style={{ display:"flex", gap:8 }}>
//         <button onClick={() => { stopWebcam(); setMode("choose"); }} style={{ flex:1, padding:"10px", borderRadius:"10px", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", color:"#7a95b8", cursor:"pointer", fontSize:"12px" }}>← Chọn lại</button>
//         <button onClick={() => { stopWebcam(); onNext(files); }} disabled={files.length === 0}
//           style={{ flex:2, padding:"10px", borderRadius:"10px", background: files.length > 0 ? "linear-gradient(135deg,#00d4ff,#8b5cf6)" : "rgba(255,255,255,0.04)", border:"none", color: files.length > 0 ? "#fff" : "#2d4060", cursor: files.length > 0 ? "pointer" : "not-allowed", fontSize:"13px", fontWeight:600 }}>
//           Tiếp theo →
//         </button>
//       </div>
//     </div>
//   );

//   // ── Upload ──
//   return (
//     <div>
//       <div style={{ fontSize:"12px", color:"#4a6fa5", marginBottom:12 }}>
//         Tải lên 1–5 ảnh khuôn mặt (nhiều góc → nhận diện chính xác hơn)
//       </div>
//       <div onClick={() => fileRef.current?.click()}
//         style={{ padding:"24px", borderRadius:"14px", border:`2px dashed ${files.length >= 1 ? "rgba(0,255,136,0.4)" : "rgba(139,92,246,0.3)"}`, background:"rgba(139,92,246,0.02)", cursor:"pointer", textAlign:"center", marginBottom:12 }}
//         onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.6)")}
//         onMouseLeave={e => (e.currentTarget.style.borderColor = files.length >= 1 ? "rgba(0,255,136,0.4)" : "rgba(139,92,246,0.3)")}
//       >
//         <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleUpload} style={{ display:"none" }}/>
//         <Upload size={24} color="#4a6fa5" style={{ marginBottom:8 }}/>
//         <div style={{ fontSize:"12px", color:"#7a95b8", fontWeight:600 }}>Chọn ảnh ({files.length}/5)</div>
//         <div style={{ fontSize:"10px", color:"#2d4060", marginTop:3 }}>Mỗi ảnh 1 góc mặt khác nhau</div>
//       </div>
//       {previews.length > 0 && (
//         <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6, marginBottom:12 }}>
//           {previews.map((src, i) => (
//             <div key={i} style={{ position:"relative", aspectRatio:"1", borderRadius:"8px", overflow:"hidden", border:"1px solid rgba(139,92,246,0.3)" }}>
//               <img src={src} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
//               <button onClick={() => removePhoto(i)} style={{ position:"absolute", top:2, right:2, width:16, height:16, borderRadius:"50%", background:"rgba(0,0,0,0.8)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
//                 <X size={9} color="#ff6b6b"/>
//               </button>
//             </div>
//           ))}
//           {files.length < 5 && (
//             <div onClick={() => fileRef.current?.click()} style={{ aspectRatio:"1", borderRadius:"8px", border:"1px dashed rgba(139,92,246,0.2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
//               <span style={{ fontSize:"18px", color:"#2d4060" }}>+</span>
//             </div>
//           )}
//         </div>
//       )}
//       <div style={{ display:"flex", gap:8 }}>
//         <button onClick={() => setMode("choose")} style={{ flex:1, padding:"10px", borderRadius:"10px", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", color:"#7a95b8", cursor:"pointer", fontSize:"12px" }}>← Chọn lại</button>
//         <button onClick={() => onNext(files)} disabled={files.length === 0}
//           style={{ flex:2, padding:"10px", borderRadius:"10px", background: files.length > 0 ? "linear-gradient(135deg,#8b5cf6,#00d4ff)" : "rgba(255,255,255,0.04)", border:"none", color: files.length > 0 ? "#fff" : "#2d4060", cursor: files.length > 0 ? "pointer" : "not-allowed", fontSize:"13px", fontWeight:600 }}>
//           Tiếp theo →
//         </button>
//       </div>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // STEP 3 — Thông tin công việc
// // ═════════════════════════════════════════════════════════════════════════════
// function StepInfo({ defaultName, onSubmit, onBack, submitting, error }: {
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

//   const expiryWarning = expiry && new Date(expiry) < new Date();

//   return (
//     <div>
//       <div style={{ fontSize:"12px", color:"#4a6fa5", marginBottom:14 }}>
//         Thông tin công việc — chức vụ và thời hạn làm việc
//       </div>
//       <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
//         {[
//           { label:"Họ và tên *",      v:name, set:setName, ph:"Nguyễn Văn A" },
//           { label:"Chức vụ / Vị trí", v:role, set:setRole, ph:"Kỹ sư, Nhân viên, Quản lý..." },
//           { label:"Phòng ban",         v:dept, set:setDept, ph:"Kỹ thuật / Marketing / Nhân sự..." },
//         ].map(f => (
//           <div key={f.label}>
//             <label style={{ fontSize:"12px", color:"#4a6fa5", display:"block", marginBottom:6 }}>{f.label}</label>
//             <input value={f.v} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={inputStyle}/>
//           </div>
//         ))}

//         <div>
//           <label style={{ fontSize:"12px", color:"#4a6fa5", display:"block", marginBottom:6 }}>
//             Thời hạn làm việc
//             <span style={{ fontSize:"10px", color:"#2d4060", marginLeft:8 }}>(để trống = không giới hạn)</span>
//           </label>
//           <div style={{ position:"relative" }}>
//             <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} style={{ ...inputStyle, paddingRight:36 }}/>
//             <Calendar size={14} color="#4a6fa5" style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}/>
//           </div>
//           {expiry && (
//             <div style={{ marginTop:6, padding:"8px 10px", borderRadius:"8px", background: expiryWarning ? "rgba(255,45,85,0.08)" : "rgba(0,212,255,0.05)", border:`1px solid ${expiryWarning ? "rgba(255,45,85,0.2)" : "rgba(0,212,255,0.15)"}`, fontSize:"11px", color: expiryWarning ? "#ff6b6b" : "#00d4ff", display:"flex", alignItems:"center", gap:6 }}>
//               {expiryWarning
//                 ? <><AlertTriangle size={12}/> Ngày đã qua — nhân viên sẽ không được nhận diện</>
//                 : <><Check size={12}/> Hết hạn vào {new Date(expiry).toLocaleDateString("vi-VN")}</>
//               }
//             </div>
//           )}
//         </div>
//       </div>

//       {error && (
//         <div style={{ marginTop:10, padding:"9px", borderRadius:"8px", background:"rgba(255,107,107,0.08)", border:"1px solid rgba(255,107,107,0.3)", color:"#ff6b6b", fontSize:"12px", textAlign:"center" }}>
//           {error}
//         </div>
//       )}

//       <div style={{ display:"flex", gap:10, marginTop:18 }}>
//         <button onClick={onBack} style={{ flex:1, padding:"11px", borderRadius:"10px", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", color:"#7a95b8", cursor:"pointer", fontSize:"13px" }}>
//           ← Quay lại
//         </button>
//         <button onClick={() => onSubmit({ name, role, dept, expiry })} disabled={!name.trim() || submitting}
//           style={{ flex:2, padding:"11px", borderRadius:"10px", background: name.trim() ? "linear-gradient(135deg,#00d4ff,#8b5cf6)" : "rgba(255,255,255,0.04)", border:"none", color: name.trim() ? "#fff" : "#2d4060", cursor: name.trim() ? "pointer" : "not-allowed", fontSize:"14px", fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:6, opacity: submitting ? 0.7 : 1 }}>
//           <Shield size={15}/> {submitting ? "Đang đăng ký..." : "Hoàn tất Đăng ký"}
//         </button>
//       </div>
//     </div>
//   );
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // Main RegisterModal
// // ═════════════════════════════════════════════════════════════════════════════
// interface Props { onClose: () => void; onSuccess: () => void; }

// export function RegisterModal({ onClose, onSuccess }: Props) {
//   const [step,       setStep]       = useState<1|2|3|4>(1);
//   const [cccdData,   setCccdData]   = useState<Partial<CCCDData>>({});
//   const [cccdFront,  setCccdFront]  = useState<File | null>(null);
//   const [cccdBack,   setCccdBack]   = useState<File | null>(null);
//   const [faceFiles,  setFaceFiles]  = useState<File[]>([]);
//   const [submitting, setSubmitting] = useState(false);
//   const [error,      setError]      = useState("");

//   const handleCCCDNext = (data: Partial<CCCDData>, front: File | null, back: File | null) => {
//     setCccdData(data); setCccdFront(front); setCccdBack(back);
//     setStep(2);
//   };

//   const handleFaceNext = (files: File[]) => {
//     setFaceFiles(files); setStep(3);
//   };

//   const handleSubmit = async ({ name, role, dept, expiry }: { name: string; role: string; dept: string; expiry: string }) => {
//     if (faceFiles.length === 0) { setError("Cần ít nhất 1 ảnh khuôn mặt"); return; }
//     try {
//       setSubmitting(true); setError(""); setStep(4);
//       const fd = new FormData();
//       fd.append("name", name);
//       fd.append("role", role);
//       fd.append("department", dept);
//       if (expiry) fd.append("work_expiry_date", expiry);
//       if (cccdFront) fd.append("cccd_front", cccdFront);
//       if (cccdBack)  fd.append("cccd_back",  cccdBack);
//       fd.append("cccd_info", JSON.stringify(cccdData));
//       faceFiles.forEach(f => fd.append("images", f));

//       await apiClient.registerFace(fd);
//       setTimeout(() => { onSuccess(); onClose(); }, 1200);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Lỗi đăng ký");
//       setStep(3); setSubmitting(false);
//     }
//   };

//   const STEP_LABELS = ["", "Thông tin & CCCD", "Ảnh khuôn mặt", "Thông tin công việc", "Đang xử lý"];

//   return (
//     <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
//       style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", backdropFilter:"blur(18px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:16 }}
//       onClick={submitting ? undefined : onClose}
//     >
//       <motion.div initial={{scale:0.92,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.9,opacity:0}}
//         onClick={e => e.stopPropagation()}
//         style={{ width:"100%", maxWidth:580, maxHeight:"93vh", overflowY:"auto", background:"#07101a", border:"1px solid rgba(0,212,255,0.18)", borderRadius:"22px", boxShadow:"0 0 100px rgba(0,212,255,0.07)", fontFamily:"'Space Grotesk',sans-serif" }}
//       >
//         {/* Header */}
//         <div style={{ padding:"18px 22px 14px", borderBottom:"1px solid rgba(0,212,255,0.08)", position:"sticky", top:0, background:"#07101a", zIndex:10, borderRadius:"22px 22px 0 0" }}>
//           <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
//             <div>
//               <h2 style={{ fontSize:"14px", color:"#e2e8f0", margin:0, letterSpacing:"1px" }}>ĐĂNG KÝ NHÂN VIÊN</h2>
//               <p style={{ fontSize:"11px", color:"#4a6fa5", margin:"2px 0 0" }}>
//                 {step <= 3 ? STEP_LABELS[step] : STEP_LABELS[4]}
//               </p>
//             </div>
//             {!submitting && (
//               <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#4a6fa5", padding:4 }}>
//                 <X size={20}/>
//               </button>
//             )}
//           </div>

//           {/* Step indicator */}
//           <div style={{ display:"flex", gap:6, marginBottom:8 }}>
//             {[1,2,3].map(s => (
//               <div key={s} style={{ flex:1, display:"flex", alignItems:"center", gap:6 }}>
//                 <div style={{
//                   width:22, height:22, borderRadius:"50%",
//                   background: step > s ? "#00ff88" : step === s ? "#00d4ff" : "rgba(255,255,255,0.06)",
//                   border:`1px solid ${step > s ? "#00ff88" : step === s ? "#00d4ff" : "rgba(255,255,255,0.1)"}`,
//                   display:"flex", alignItems:"center", justifyContent:"center",
//                   fontSize:"10px", color: step >= s ? "#000" : "#4a6fa5", fontWeight:700, flexShrink:0,
//                   transition:"all 0.3s",
//                 }}>
//                   {step > s ? <Check size={12}/> : s}
//                 </div>
//                 <div style={{ flex:1, height:2, borderRadius:"1px", background: step > s ? "rgba(0,255,136,0.4)" : step === s ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.06)", transition:"all 0.3s" }}/>
//               </div>
//             ))}
//             <div style={{
//               width:22, height:22, borderRadius:"50%",
//               background: step > 3 ? "#00ff88" : "rgba(255,255,255,0.06)",
//               border:`1px solid ${step > 3 ? "#00ff88" : "rgba(255,255,255,0.1)"}`,
//               display:"flex", alignItems:"center", justifyContent:"center",
//               fontSize:"10px", color: step > 3 ? "#000" : "#4a6fa5", fontWeight:700,
//             }}>
//               {step > 3 ? <Check size={12}/> : 3}
//             </div>
//           </div>

//           <div style={{ display:"flex", justifyContent:"space-between" }}>
//             {["CCCD & AI OCR", "Khuôn mặt", "Công việc"].map((l, i) => (
//               <div key={l} style={{ fontSize:"9px", color: step === i+1 ? "#00d4ff" : step > i+1 ? "#00ff88" : "#2d4060", fontWeight: step === i+1 ? 600 : 400, flex:1, textAlign: i === 0 ? "left" : i === 2 ? "right" : "center" }}>
//                 {l}
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Content */}
//         <div style={{ padding:"20px 22px 24px" }}>
//           <AnimatePresence mode="wait">
//             {step === 1 && (
//               <motion.div key="s1" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
//                 <StepCCCD onNext={handleCCCDNext}/>
//               </motion.div>
//             )}
//             {step === 2 && (
//               <motion.div key="s2" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
//                 <StepFace onNext={handleFaceNext} onBack={() => setStep(1)}/>
//               </motion.div>
//             )}
//             {step === 3 && (
//               <motion.div key="s3" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
//                 <StepInfo defaultName={cccdData.full_name || ""} onSubmit={handleSubmit} onBack={() => setStep(2)} submitting={submitting} error={error}/>
//               </motion.div>
//             )}
//             {step === 4 && (
//               <motion.div key="s4" initial={{opacity:0}} animate={{opacity:1}} style={{ textAlign:"center", padding:"28px 0" }}>
//                 <motion.div animate={{rotate:360}} transition={{duration:1.5, repeat:Infinity, ease:"linear"}} style={{ display:"inline-block", marginBottom:16 }}>
//                   <div style={{ width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg,#00d4ff,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
//                     <Shield size={30} color="#fff"/>
//                   </div>
//                 </motion.div>
//                 <div style={{ fontSize:"15px", color:"#e2e8f0", fontWeight:600, marginBottom:6 }}>Đang đăng ký...</div>
//                 <div style={{ fontSize:"12px", color:"#4a6fa5", marginBottom:20 }}>
//                   Tạo Face Embedding từ {faceFiles.length} ảnh
//                 </div>
//                 <div style={{ padding:"3px", borderRadius:"20px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(0,212,255,0.15)" }}>
//                   <motion.div animate={{width:["0%","95%"]}} transition={{duration:3, ease:"easeOut"}} style={{ height:8, borderRadius:"20px", background:"linear-gradient(90deg,#00d4ff,#8b5cf6)" }}/>
//                 </div>
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </div>
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

  const handleSubmit = async (info: { name: string; role: string; dept: string; expiry: string }) => {
    try {
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
      const msg = err?.response?.data?.detail || err?.message || "Đăng ký thất bại, vui lòng thử lại.";
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