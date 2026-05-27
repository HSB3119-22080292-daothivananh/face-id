import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Navigate, Outlet, useNavigate } from "react-router";
import { KeyRound, Loader2, LogIn, ScanFace, UserRound } from "lucide-react";
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
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
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

        {error && <div style={{ color: "var(--app-danger)", fontSize: 13, lineHeight: 1.5 }}>{error}</div>}

        <button
          disabled={loading}
          style={{
            height: 44,
            border: "none",
            borderRadius: 8,
            background: "var(--app-accent)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 800,
          }}
        >
          {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <LogIn size={18} />}
          Đăng nhập
        </button>
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
