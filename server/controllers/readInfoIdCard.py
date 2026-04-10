import cv2
import time
import re
from PIL import Image
from DetecInfoBoxes.GetBoxes import Detect
from util import correct_skew
from config import opt

get_dictionary = Detect(opt)

class ReadInfo:
    def __init__(self, imgsz, stride, device, half, model, names, ocr_predictor):
        self.imgsz = imgsz
        self.stride = stride
        self.device = device
        self.half = half
        self.model = model
        self.names = names
        self.opt = opt
        self.ocrPredictor = ocr_predictor

    @staticmethod
    def get_the_most_confident_bbox(page_boxes: dict):
        for key in page_boxes:
            value = page_boxes.get(key)
            if value:
                value = sorted(value, key=lambda item: item[4])
                page_boxes.update({key: [value[-1]]})
        return page_boxes

    @staticmethod
    def arrange_info(infos: list):
        sorted_infos = sorted(infos, key=lambda item: item[1])
        return sorted_infos

    def ocr_info(self, img, info: list):
        x_min = info[0] - int(int(info[2]) / 2)
        y_min = info[1] - int(int(info[3]) / 2)
        w = info[2]
        h = info[3]

        crop_img = img[max(0, y_min):y_min + h, max(0, x_min):x_min + w]
        crop_img_rgb = cv2.cvtColor(crop_img, cv2.COLOR_BGR2RGB)
        image_pill = Image.fromarray(crop_img_rgb)
        text = self.ocrPredictor.predict(image_pill)
        return text

    def get_all_info(self, img_path):
        """
        Đọc MẶT TRƯỚC CCCD sử dụng YOLO cắt ô + VietOCR đọc chữ.
        """
        st = time.time()
        img = cv2.imread(img_path)
        
        if img is None:
            return {}

        img = correct_skew(img)

        page_boxes = get_dictionary.prediction(img, self.imgsz, self.stride, self.device, self.half, self.model, self.names)
        page_boxes = get_dictionary.dict_processing(page_boxes)
        
        print("\n--- [YOLO - MẶT TRƯỚC] TỌA ĐỘ CÁC Ô TÌM THẤY ---")
        for key, val in page_boxes.items():
            if val:
                print(f" > {key}: {len(val)} ô")

        fields = ["id", "full_name", "date_of_birth", "sex", "nationality", "place_of_origin", "place_of_residence", "date_of_expiry"]

        user_info_dict = {}
        
        print("\n--- [VietOCR - MẶT TRƯỚC] KẾT QUẢ DỊCH CHỮ ---")
        
        for field in fields:
            infos = page_boxes.get(field)
            if infos:
                if len(infos) != 1:
                    infos = self.arrange_info(infos)
                    all_text = ''
                    for info in infos:
                        text = self.ocr_info(img, info)
                        all_text += text + ' '
                else:
                    all_text = self.ocr_info(img, infos[0])
                
                extracted_str = all_text.strip()
                user_info_dict.update({field: extracted_str})
                print(f" [*] {field.upper():<20}: {extracted_str}")
            else:
                user_info_dict.update({field: ''})
                print(f" [!] {field.upper():<20}: (Không tìm thấy ô)")

        print("----------------------------------\n")
        print(f'[ReadInfo] Total Process Time: {time.time() - st:.2f}s')
        return user_info_dict


    # ══════════════════════════════════════════════════════════════════
    # MẶT SAU: KHÔNG DÙNG YOLO (VÌ CHƯA CÓ MODEL), DÙNG VIETOCR QUÉT FULL
    # ══════════════════════════════════════════════════════════════════
    def get_back_info(self, img_path):
        """
        Đọc MẶT SAU CCCD: Đẩy toàn bộ ảnh vào VietOCR, sau đó dùng Regex
        và từ khóa để lọc ra thông tin thay vì dùng YOLO cắt ô.
        """
        st = time.time()
        img = cv2.imread(img_path)

        if img is None:
            return {}

        # Xoay ảnh cho thẳng
        img = correct_skew(img)
        
        print("\n--- [VietOCR - MẶT SAU (Quét toàn ảnh)] KẾT QUẢ DỊCH CHỮ ---")
        
        # Chuyển thẳng toàn bộ ảnh sang RGB và đẩy vào VietOCR
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        full_text = self.ocrPredictor.predict(Image.fromarray(img_rgb))
        full_text_upper = full_text.upper()
        
        result = {
            "issue_date": "",
            "issued_by": "",
            "special_features": ""
        }

        # 1. Tìm Ngày Cấp (Issue Date) bằng Regex
        # Tìm chuỗi có dạng dd/mm/yyyy, có thể bị lỗi khoảng trắng hoặc dấu gạch nối
        date_match = re.search(r'(\d{2}[\s/\-\.]+\d{2}[\s/\-\.]+\d{4})', full_text)
        if date_match:
            result["issue_date"] = re.sub(r'[\s\-\.]+', '/', date_match.group(1))

        # 2. Tìm Nơi Cấp (Issued By) bằng Từ khóa
        # Lấy từ các chức danh người ký trở về sau
        keywords = ["CỤC TRƯỞNG", "GIÁM ĐỐC", "NƠI CẤP"]
        for kw in keywords:
            idx = full_text_upper.find(kw)
            if idx != -1:
                # Cắt chuỗi từ khóa đó trở về cuối
                result["issued_by"] = full_text[idx:].strip()
                break

        # 3. Tìm Đặc điểm nhận dạng (Special Features)
        # Nằm giữa cụm từ "nhận dạng" và cụm "Ngày, tháng, năm" hoặc con dấu
        feat_match = re.search(r'(ĐẶC ĐIỂM NHẬN DẠNG|NHẬN DẠNG)[:\s]*(.*?)(?=NGÀY|CỤC|GIÁM|DẤU|$)', full_text_upper, re.DOTALL)
        if feat_match:
            # Dùng vị trí match ở text thường để giữ nguyên chữ hoa/chữ thường
            start_idx = feat_match.start(2)
            end_idx = feat_match.end(2)
            extracted_feat = full_text[start_idx:end_idx].strip().replace('\n', ' ')
            # Lọc bỏ các ký tự rác nếu có
            result["special_features"] = extracted_feat

        # Log kết quả ra terminal
        print(f" [*] ISSUE_DATE      : {result['issue_date'] if result['issue_date'] else '(Không tìm thấy)'}")
        print(f" [*] ISSUED_BY       : {result['issued_by'] if result['issued_by'] else '(Không tìm thấy)'}")
        print(f" [*] SPECIAL_FEATURES: {result['special_features'] if result['special_features'] else '(Không tìm thấy)'}")
        print("----------------------------------\n")
        print(f'[ReadInfo - Back] Total Process Time: {time.time() - st:.2f}s')
        
        return result