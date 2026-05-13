import cv2

IMG_PATH = r'controllers\debug_back\05_card_final.jpg'

img = cv2.imread(IMG_PATH)
if img is None:
    print(f"Khong doc duoc: {IMG_PATH}")
    exit()

H, W = img.shape[:2]
print(f"Anh: {W}x{H}")

REGIONS_PCT = [
    (0.22, 0.31, 0.07, 0.63, "special_feat",  (0, 255, 0)),
    (0.31, 0.40, 0.07, 0.63, "issue_date",    (255, 0, 0)),
    (0.40, 0.50, 0.07, 0.63, "issued_by_r1",  (0, 0, 255)),
    (0.50, 0.59, 0.07, 0.63, "issued_by_r2",  (0, 165, 255)),
    (0.60, 0.70, 0.06, 0.98, "mrz_r1",        (255, 0, 255)),
    (0.70, 0.79, 0.06, 0.98, "mrz_r2",        (255, 0, 255)),
    (0.79, 0.88, 0.06, 0.98, "mrz_r3",        (255, 0, 255)),
]

scale = 2
out = cv2.resize(img, (W*scale, H*scale))

for (y0p, y1p, x0p, x1p, name, color) in REGIONS_PCT:
    x0 = int(W * x0p * scale)
    y0 = int(H * y0p * scale)
    x1 = int(W * x1p * scale)
    y1 = int(H * y1p * scale)
    cv2.rectangle(out, (x0, y0), (x1, y1), color, 2)
    cv2.putText(out, name, (x0+2, y0-4), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

cv2.imwrite(r'controllers\debug_back\regions_preview2.jpg', out)
print("Da luu: controllers\\debug_back\\regions_preview2.jpg")