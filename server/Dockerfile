# Sử dụng Python 3.10
FROM python:3.10-slim

ENV TZ=Asia/Ho_Chi_Minh \
    APP_TIMEZONE=Asia/Ho_Chi_Minh \
    DB_TIME_ZONE=+07:00

# Cài đặt thư viện hệ thống cho OpenCV và Compiler C++ cho Insightface
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Cấu hình User cho Hugging Face
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Cài đặt thư viện Python
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ code vào máy chủ
COPY --chown=user . .

# Mở cổng 7860 theo yêu cầu của Hugging Face
EXPOSE 7860

# Khởi động server API
CMD ["uvicorn", "controllers.main:app", "--host", "0.0.0.0", "--port", "7860"]
