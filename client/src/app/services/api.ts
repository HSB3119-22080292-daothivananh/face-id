const API_URL =
  ((import.meta as any).env.VITE_API_URL as string) || "https://vananhcs-face-id.hf.space";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RecognitionFace {
  id: string | null;
  name: string;
  status: "success" | "unknown";
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
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
  registered: string | null;
  img: string | null;
  embeddings: number;
  recognitions: number;
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

// ─── API Client ───────────────────────────────────────────────────────────────
export const apiClient = {
  /**
   * 1. Nhận diện khuôn mặt
   *    Backend chỉ dùng RAM → phản hồi rất nhanh
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
   *    Backend: lưu DB + cập nhật RAM ngay → bật cam là nhận ra liền
   */
  async registerFace(data: FormData): Promise<{ success: boolean; message: string; ramCount?: number }> {
    const response = await fetch(`${API_URL}/api/face/register`, {
      method: "POST",
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
    const response = await fetch(`${API_URL}/api/face/persons`);
    if (!response.ok) throw new Error("Fetch persons failed");
    const result = await response.json();
    return result.data;
  },

  /**
   * 4. Cập nhật thông tin người dùng
   *    Backend: ghi DB + đồng bộ tên trên RAM ngay
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
   *    Backend: xóa DB + xóa khỏi RAM ngay → cam không nhận ra nữa
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
    hourlyData: Array<{ time: string; nhận_diện: number; từ_chối: number; lạ: number }>;
    weeklyData: Array<{ day: string; value: number }>;
  }> {
    const response = await fetch(`${API_URL}/api/face/statistics`);
    if (!response.ok) throw new Error("Fetch stats failed");
    const result = await response.json();
    return result.data;
  },

  /**
   * 8. Trạng thái RAM (debug / dashboard)
   *    Hiển thị số khuôn mặt đang trên RAM, sẵn sàng nhận diện
   */
  async getMemoryStatus(): Promise<MemoryStatus> {
    const response = await fetch(`${API_URL}/api/face/memory-status`);
    if (!response.ok) throw new Error("Fetch memory status failed");
    const result = await response.json();
    return result;
  },

  /**
   * 9. Reload RAM thủ công
   *    Dùng khi admin can thiệp DB trực tiếp và cần sync lại
   */
  async reloadMemory(): Promise<{ ramCount: number; message: string }> {
    const response = await fetch(`${API_URL}/api/face/reload-memory`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Reload memory failed");
    return response.json();
  },

  extractOCR: async (file: File, side: "front" | "back") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("side", side);

    const res = await fetch("http://localhost:3001/api/face/ocr", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Lỗi gọi API OCR");
    return res.json(); // Trả về { success: true, data: { name, id, dob... } }
  }

  
};