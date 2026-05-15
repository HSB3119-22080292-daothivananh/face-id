import cv2
import numpy as np
import imutils
from PIL import Image, ImageEnhance
from scipy.ndimage import interpolation as inter

def sharpen(img: np.ndarray, factor: float):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    img_pil = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    enhancer = ImageEnhance.Sharpness(img_pil).enhance(factor)
    if gray.std() < 30:
        enhancer = ImageEnhance.Contrast(enhancer).enhance(factor)
    
    # Trả lại format BGR cho OpenCV
    return cv2.cvtColor(np.array(enhancer), cv2.COLOR_RGB2BGR)

# Create a dummy image
img = np.zeros((100, 100, 3), dtype=np.uint8)
res = sharpen(img, 100)
print("Result is None:", res is None)
if res is not None:
    print("Result shape:", res.shape)
