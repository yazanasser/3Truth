import os, sys, json
sys.path.append(os.path.abspath('backend/src'))
from ml_server import run_image_detection
from PIL import Image

path = r'C:\Users\LENOVO\.gemini\antigravity-ide\brain\f584b9e1-eccd-4708-8a01-c1af065adfd1\.user_uploaded\media_1786777523270.jpg'
if not os.path.exists(path):
    print("File not found")
    sys.exit(1)

img = Image.open(path).convert('RGB')
size = os.path.getsize(path)
with open(path, 'rb') as f:
    raw = f.read()

res = run_image_detection(img, size, 'media_1786777523270.jpg', raw)
print(json.dumps(res, indent=2))
