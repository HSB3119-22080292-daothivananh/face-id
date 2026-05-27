import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Navigate, Outlet, useNavigate } from "react-router";
import { Camera, CameraOff, KeyRound, Loader2, LogIn, RefreshCw, ScanFace, UserRound } from "lucide-react";
import { apiClient, type AuthRole, type AuthSession, type AdminProfile, type EmployeeProfile } from "../services/api";

export const AUTH_TOKEN_KEY = "face-id.auth.token";
export const AUTH_ROLE_KEY = "face-id.auth.role";
export const AUTH_USER_KEY = "face-id.auth.user";

export type StoredAuth = {
  token: string;
  role: AuthRole;
  user: AdminProfile | EmployeeProfile;
};

export function getStoredAuth(): StoredAuth | null {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const role = localStorage.getItem(AUTH_ROLE_KEY) as AuthRole | null;
  const rawUser = localStorage.getItem(AUTH_USER_KEY);
  if (!token || !role || !rawUser) return null;
  if (role !== "admin" && role !== "employee") return null;

  try {
    return { token, role, user: JSON.parse(rawUser) };
  } catch {
    clearStoredAuth();
    return null;
  }
}

export function storeAuth(session: AuthSession) {
  localStorage.setItem(AUTH_TOKEN_KEY, session.token);
  localStorage.setItem(AUTH_ROLE_KEY, session.role);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_ROLE_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem("face-id.employee.token");
  localStorage.removeItem("face-id.employee.profile");
}

function AuthFallback() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--app-muted)" }}>
      Đang kiểm tra phiên đăng nhập...
    </div>
  );
}

function useVerifiedAuth() {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<StoredAuth | null>(null);

  useEffect(() => {
    const stored = getStoredAuth();
    if (!stored) {
      setAuth(null);
      setLoading(false);
      return;
    }

    apiClient
      .getMe(stored.token)
      .then((session) => {
        const verified = { token: stored.token, role: session.role, user: session.user };
        localStorage.setItem(AUTH_ROLE_KEY, verified.role);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(verified.user));
        setAuth(verified);
      })
      .catch(() => {
        clearStoredAuth();
        setAuth(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { loading, auth };
}

export function AdminRoute() {
  const { loading, auth } = useVerifiedAuth();
  if (loading) return <AuthFallback />;
  if (!auth) return <Navigate to="/login" replace />;
  if (auth.role === "employee") return <Navigate to="/employee" replace />;
  return <Outlet />;
}

export function EmployeeRoute() {
  const { loading, auth } = useVerifiedAuth();
  if (loading) return <AuthFallback />;
  if (!auth) return <Navigate to="/login" replace />;
  if (auth.role === "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}

export function LoginScreen() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "face">("password");
  const [loading, setLoading] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) {
      setChecking(false);
      return;
    }

    apiClient
      .getMe(auth.token)
      .then((session) => {
        localStorage.setItem(AUTH_ROLE_KEY, session.role);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
        navigate(session.role === "admin" ? "/" : "/employee", { replace: true });
      })
      .catch(() => {
        clearStoredAuth();
        setChecking(false);
      });
  }, [navigate]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
  };

  const startCamera = async () => {
    setCameraError("");
    setError("");
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 540 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (err: any) {
      setCameraError(err?.name === "NotAllowedError" ? "Bạn chưa cấp quyền camera." : "Không thể mở camera.");
      setCameraOn(false);
    }
  };

  useEffect(() => {
    if (mode === "face") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      if (mode === "face") stopCamera();
    };
  }, [mode]);

  useEffect(() => () => stopCamera(), []);

  const captureFaceBlob = () =>
    new Promise<Blob>((resolve, reject) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        reject(new Error("Camera chưa sẵn sàng"));
        return;
      }

      const width = video.videoWidth || 720;
      const height = video.videoHeight || 540;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Không thể chụp ảnh từ camera"));
        return;
      }

      ctx.drawImage(video, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Không thể tạo ảnh FaceID"));
      }, "image/jpeg", 0.86);
    });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== "password") return;
    setLoading(true);
    setError("");
    try {
      const session = await apiClient.login(identifier.trim(), password);
      storeAuth(session);
      navigate(session.role === "admin" ? "/" : "/employee", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleFaceLogin = async () => {
    setFaceLoading(true);
    setError("");
    setCameraError("");
    try {
      const blob = await captureFaceBlob();
      const session = await apiClient.faceLogin(blob);
      storeAuth(session);
      stopCamera();
      navigate(session.role === "admin" ? "/" : "/employee", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập FaceID thất bại");
    } finally {
      setFaceLoading(false);
    }
  };

  if (checking) return <AuthFallback />;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        placeItems: "center",
        padding: 20,
        background: "var(--app-bg)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "min(100%, 420px)",
          borderRadius: 8,
          background: "var(--app-surface)",
          border: "1px solid var(--app-border)",
          boxShadow: "var(--app-shadow-lg)",
          padding: 24,
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
              background: "var(--app-accent-subtle)",
              color: "var(--app-accent)",
            }}
          >
            <ScanFace size={24} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Đăng nhập Face ID</div>
            <div style={{ fontSize: 13, color: "var(--app-muted)" }}>Admin vào quản lý, nhân viên vào điểm danh</div>
          </div>
        </div>

        <div style={modeSwitchStyle}>
          <button
            type="button"
            onClick={() => setMode("password")}
            style={{ ...modeButtonStyle, ...(mode === "password" ? modeButtonActiveStyle : {}) }}
          >
            <KeyRound size={16} />
            Mật khẩu
          </button>
          <button
            type="button"
            onClick={() => setMode("face")}
            style={{ ...modeButtonStyle, ...(mode === "face" ? modeButtonActiveStyle : {}) }}
          >
            <ScanFace size={16} />
            FaceID
          </button>
        </div>

        {mode === "password" ? (
          <>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "var(--app-muted)" }}>Tài khoản</span>
              <div style={{ position: "relative" }}>
                <UserRound size={17} style={{ position: "absolute", left: 12, top: 12, color: "var(--app-muted)" }} />
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="admin hoặc số CCCD"
                  autoComplete="username"
                  style={inputStyle}
                />
              </div>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "var(--app-muted)" }}>Mật khẩu</span>
              <div style={{ position: "relative" }}>
                <KeyRound size={17} style={{ position: "absolute", left: 12, top: 12, color: "var(--app-muted)" }} />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="Mật khẩu"
                  autoComplete="current-password"
                  style={inputStyle}
                />
              </div>
            </label>
          </>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={cameraBoxStyle}>
              <canvas ref={canvasRef} style={{ display: "none" }} />
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: cameraOn ? "block" : "none",
                  transform: "scaleX(-1)",
                }}
              />
              {!cameraOn && (
                <div style={cameraEmptyStyle}>
                  <CameraOff size={34} />
                  <div>{cameraError || "Camera chưa bật"}</div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" onClick={startCamera} disabled={faceLoading} style={secondaryButtonStyle}>
                <Camera size={16} />
                Bật lại camera
              </button>
              <button type="button" onClick={handleFaceLogin} disabled={!cameraOn || faceLoading} style={primaryButtonStyle}>
                {faceLoading ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <ScanFace size={16} />}
                Quét FaceID
              </button>
            </div>
          </div>
        )}

        {error && <div style={{ color: "var(--app-danger)", fontSize: 13, lineHeight: 1.5 }}>{error}</div>}

        {mode === "password" && (
          <button disabled={loading} style={primaryButtonStyle}>
            {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <LogIn size={18} />}
            Đăng nhập
          </button>
        )}
      </form>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  height: 42,
  padding: "0 12px 0 40px",
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  background: "var(--app-bg-subtle)",
  color: "var(--app-text)",
};

const modeSwitchStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  padding: 4,
  borderRadius: 8,
  background: "var(--app-bg-subtle)",
  border: "1px solid var(--app-border)",
};

const modeButtonStyle: CSSProperties = {
  height: 38,
  border: "none",
  borderRadius: 6,
  background: "transparent",
  color: "var(--app-muted)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  cursor: "pointer",
  fontWeight: 800,
};

const modeButtonActiveStyle: CSSProperties = {
  background: "var(--app-surface)",
  color: "var(--app-accent)",
  boxShadow: "var(--app-shadow-xs)",
};

const cameraBoxStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "4 / 3",
  overflow: "hidden",
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  background: "#0f172a",
};

const cameraEmptyStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: 10,
  color: "var(--app-placeholder)",
  fontSize: 13,
  textAlign: "center",
  padding: 18,
};

const primaryButtonStyle: CSSProperties = {
  height: 44,
  border: "none",
  borderRadius: 8,
  background: "var(--app-accent)",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  fontWeight: 800,
};

const secondaryButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: "var(--app-bg-subtle)",
  color: "var(--app-text)",
  border: "1px solid var(--app-border)",
};
