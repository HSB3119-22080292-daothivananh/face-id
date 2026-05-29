const API_URL = (
  ((import.meta as any).env.VITE_API_URL as string) || "https://vananhcs-face-id.hf.space"
).replace(/\/+$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RecognitionFace {
  id: string | null;
  name: string;
  status: "success" | "unknown" | "expired";
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  attendance_message?: string;
}

export interface RecognitionResponse {
  success: boolean;
  data: {
    detected: boolean;
    faces: RecognitionFace[];
    processTime?: number;
    model?: string;
    ramCount?: number;
  };
}

export interface Person {
  id: string;
  name: string;
  role: string;
  department: string;
  status: "active" | "inactive";
  work_expiry_date: string | null;
  img_url: string | null;
  img_path: string | null;
  registered_at: string | null;
  updated_at: string | null;
  registered: string | null;
  img: string | null;
  embeddings: number;
  recognitions: number;
  citizen_id_record_id: string | null;
  front_img_path: string | null;
  back_img_path: string | null;
  cccd_front_img: string | null;
  cccd_back_img: string | null;
  id_number: string | null;
  full_name: string | null;
  dob: string | null;
  gender: string | null;
  nationality: string | null;
  hometown: string | null;
  address: string | null;
  expiry_date: string | null;
  issue_date: string | null;
  special_features: string | null;
  citizen_created_at: string | null;
  citizen_updated_at: string | null;
  is_expired: boolean;
}

export interface ActivityLogEntry {
  id: string;
  name: string;
  time: string;
  date: string;
  status: "success" | "unknown" | "error";
  confidence: number;
  camera: string;
  img: string | null;
  action: "Vào" | "Ra" | "Từ chối" | "Lỗi";
}

export interface MemoryStatus {
  loaded: boolean;
  ramCount: number;
  message: string;
}

export interface EmployeeProfile {
  person_id: string;
  name: string;
  role: string;
  department: string;
  username: string;
  email?: string;
}

export interface AdminProfile {
  admin_id: string;
  name: string;
  username: string;
}

export type AuthRole = "admin" | "employee";

export interface AuthSession {
  success: boolean;
  role: AuthRole;
  token: string;
  user: AdminProfile | EmployeeProfile;
  expires_at: string;
}

export interface EmployeeNotification {
  id: string;
  title: string;
  message: string;
  status: "unread" | "read";
  time: string;
  date: string;
  day_key?: string;
  attendance_time: string;
  created_at: string;
  read_at: string | null;
  camera?: string | null;
  action?: string | null;
  confidence?: number | null;
  recognition_status?: string | null;
}

export interface EmployeeLoginResponse {
  success: boolean;
  token: string;
  employee: EmployeeProfile;
  expires_at: string;
}

export interface RegisteredAccountInfo {
  person_id: string;
  name: string;
  username: string;
  email: string;
  temporary_password: string;
  login_link: string;
  reset_link: string;
  reset_expires_at: string;
  email_sent: boolean;
}

export interface RegisterFaceResponse {
  success: boolean;
  message: string;
  img_url?: string;
  ramCount?: number;
  account?: RegisteredAccountInfo;
}

export interface AdminEmployeeAccount {
  person_id: string;
  name: string;
  role: string;
  department: string;
  status: "active" | "inactive";
  work_expiry_date: string | null;
  username: string | null;
  email: string | null;
  id_number: string | null;
  last_login_at: string | null;
  last_attendance_time: string | null;
  unread: number;
  must_change_password: boolean;
}

async function readJsonResponse(response: Response, fallbackMessage: string) {
  const text = await response.text();
  let result: any = {};

  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(response.ok ? "Phản hồi server không đúng định dạng JSON" : fallbackMessage);
    }
  }

  if (!response.ok || result.success === false) {
    throw new Error(result.error || result.detail || fallbackMessage);
  }

  return result;
}

// ─── API Client ───────────────────────────────────────────────────────────────
export const apiClient = {
  /**
   * 1. Nhận diện khuôn mặt
   * Backend chỉ dùng RAM → phản hồi rất nhanh
   */
  async recognize(imageData: Blob): Promise<RecognitionResponse> {
    const formData = new FormData();
    formData.append("image", imageData, "capture.jpg");

    const response = await fetch(`${API_URL}/api/face/recognize`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Recognition request failed");
    return response.json();
  },

  /**
   * 2. Đăng ký khuôn mặt mới
   * Backend: lưu DB + cập nhật RAM ngay → bật cam là nhận ra liền
   */
  async registerFace(data: FormData): Promise<RegisterFaceResponse> {
    const token = localStorage.getItem("face-id.auth.token");
    const response = await fetch(`${API_URL}/api/face/register`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: data,
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Registration failed");
    }
    return result;
  },

  /**
   * 3. Lấy danh sách đã đăng ký
   */
  async getPersons(): Promise<Person[]> {
    const response = await fetch(`${API_URL}/api/face/persons?include_images=false`);
    const result = await readJsonResponse(response, "Fetch persons failed");
    return (result.data ?? []).map((person: Person) => ({
      ...person,
      img_url: null,
      img: null,
      cccd_front_img: null,
      cccd_back_img: null,
    }));
  },

  async getPersonDetail(personId: string): Promise<Person> {
    const response = await fetch(`${API_URL}/api/face/persons/${personId}`);
    const result = await readJsonResponse(response, "Khong the tai chi tiet nguoi dung");
    return result.data;
  },

  /**
   * 4. Cập nhật thông tin người dùng
   * Backend: ghi DB + đồng bộ tên trên RAM ngay
   */
  async updatePerson(
    personId: string,
    data: { name: string; role: string; department: string }
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/api/face/persons/${personId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Update failed");
    }
    return result;
  },

  /**
   * 5. Xóa người dùng
   * Backend: xóa DB + xóa khỏi RAM ngay → cam không nhận ra nữa
   */
  async deletePerson(personId: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/face/persons/${personId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Delete failed");
  },

  /**
   * 6. Lịch sử nhận diện
   */
  async getActivityLog(): Promise<ActivityLogEntry[]> {
    const response = await fetch(`${API_URL}/api/face/logs`);
    if (!response.ok) throw new Error("Fetch logs failed");
    const result = await response.json();
    return result.data;
  },

  /**
   * 7. Thống kê
   */
  async getStatistics(): Promise<{
    hourlyData: Array<{ time: string; recognized: number; denied: number; unknown: number }>;
    weeklyData: Array<{ day: string; value: number }>;
  }> {
    const response = await fetch(`${API_URL}/api/face/statistics`);
    if (!response.ok) throw new Error("Fetch stats failed");
    const result = await response.json();
    const hourlyData = (result.data?.hourlyData ?? []).map((item: any) => ({
      time: item.time,
      recognized: item["nhận_diện"] ?? item["nháº­n_diá»‡n"] ?? 0,
      denied: item["từ_chối"] ?? item["tá»«_chá»‘i"] ?? 0,
      unknown: item["lạ"] ?? item["láº¡"] ?? 0,
    }));

    return {
      hourlyData,
      weeklyData: result.data?.weeklyData ?? [],
    };
  },

  /**
   * 8. Trạng thái RAM (debug / dashboard)
   * Hiển thị số khuôn mặt đang trên RAM, sẵn sàng nhận diện
   */
  async getMemoryStatus(): Promise<MemoryStatus> {
    const response = await fetch(`${API_URL}/api/face/memory-status`);
    if (!response.ok) throw new Error("Fetch memory status failed");
    const result = await response.json();
    return result;
  },

  /**
   * 9. Reload RAM thủ công
   * Dùng khi admin can thiệp DB trực tiếp và cần sync lại
   */
  async reloadMemory(): Promise<{ ramCount: number; message: string }> {
    const response = await fetch(`${API_URL}/api/face/reload-memory`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Reload memory failed");
    return response.json();
  },

  /**
   * 10. OCR (Đọc thẻ CCCD)
   * ĐÃ SỬA LỖI DÙNG LOCALHOST
   */
  extractOCR: async (file: File, side: "front" | "back") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("side", side);

    // VÁ LỖI CỐT LÕI: Sử dụng API_URL thay vì localhost
    const res = await fetch(`${API_URL}/api/face/ocr`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Lỗi gọi API OCR");
    return res.json(); 
  },

  async login(identifier: string, password: string): Promise<AuthSession> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || result.detail || "Đăng nhập thất bại");
    }
    return result;
  },

  async faceLogin(imageData: Blob): Promise<AuthSession> {
    const formData = new FormData();
    formData.append("image", imageData, "face-login.jpg");

    const response = await fetch(`${API_URL}/api/auth/face-login`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || result.detail || "Đăng nhập FaceID thất bại");
    }
    return result;
  },

  async getMe(token: string): Promise<{ role: AuthRole; user: AdminProfile | EmployeeProfile }> {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || result.detail || "Phiên đăng nhập đã hết hạn");
    }
    return { role: result.role, user: result.user };
  },

  async resetPassword(token: string, currentPassword: string, password: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, current_password: currentPassword, password }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || result.detail || "Khong the doi mat khau");
    }
  },

  async loginEmployee(identifier: string, password: string): Promise<EmployeeLoginResponse> {
    const response = await fetch(`${API_URL}/api/employee/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || result.detail || "Đăng nhập thất bại");
    }
    return result;
  },

  async getEmployeeNotifications(token: string): Promise<{ data: EmployeeNotification[]; unread: number }> {
    const response = await fetch(`${API_URL}/api/employee/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await readJsonResponse(response, "Không thể tải thông báo");
    return { data: result.data ?? [], unread: result.unread ?? 0 };
  },

  async getEmployeeAttendance(
    token: string,
    year: number,
    month: number
  ): Promise<{ data: EmployeeNotification[]; year: number; month: number }> {
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    const response = await fetch(`${API_URL}/api/employee/attendance?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await readJsonResponse(response, "Không thể tải lịch điểm danh");
    return { data: result.data ?? [], year: result.year, month: result.month };
  },

  async markEmployeeNotificationsRead(token: string, notificationIds?: string[]): Promise<void> {
    const response = await fetch(`${API_URL}/api/employee/notifications/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ notification_ids: notificationIds ?? null }),
    });
    await readJsonResponse(response, "Không thể cập nhật thông báo");
  },

  async getAdminEmployees(token: string): Promise<AdminEmployeeAccount[]> {
    const response = await fetch(`${API_URL}/api/admin/employees`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await readJsonResponse(response, "Không thể tải danh sách nhân viên");
    return result.data ?? [];
  },

  async getAdminEmployeeNotifications(
    token: string,
    personId: string
  ): Promise<{ data: EmployeeNotification[]; unread: number }> {
    const response = await fetch(`${API_URL}/api/admin/employees/${personId}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await readJsonResponse(response, "Không thể tải thông báo nhân viên");
    return { data: result.data ?? [], unread: result.unread ?? 0 };
  },

  async getAdminEmployeeAttendance(
    token: string,
    personId: string,
    year: number,
    month: number
  ): Promise<{ data: EmployeeNotification[]; year: number; month: number }> {
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    const response = await fetch(`${API_URL}/api/admin/employees/${personId}/attendance?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await readJsonResponse(response, "Không thể tải lịch điểm danh nhân viên");
    return { data: result.data ?? [], year: result.year, month: result.month };
  }
};
