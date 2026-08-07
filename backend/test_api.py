import sys
import os
from PIL import Image

sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
from ml_server import run_image_detection

image_path = sys.argv[1]
with open(image_path, "rb") as f:
    raw_bytes = f.read()

img_pil = Image.open(image_path).convert("RGB")
size = os.path.getsize(image_path)

res = run_image_detection(img_pil, size, "test.png", raw_bytes)
print(f"Prediction: {res['prediction']}")
print(f"Confidence: {res['uncertainty']}")
