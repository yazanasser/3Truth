import time
import requests
import io
from PIL import Image

print("Starting end-to-end integration test...")
img = Image.new('RGB', (512, 512), color='blue')
b = io.BytesIO()
img.save(b, 'JPEG')
raw_bytes = b.getvalue()
url = 'http://127.0.0.1:5001/detect/image'

print("Sending request to Express server...")
try:
    res = requests.post(url, files={'image': ('test_midjourney.jpg', raw_bytes, 'image/jpeg')}).json()
    ai_prob = res.get('ai_probability', 0)
    print("\n========= TEST RESULTS =========")
    print(f"Prediction: {res.get('prediction')}")
    print(f"Confidence: {res.get('confidence')}")
    print(f"UI WILL SHOW: AI PROBABILITY {ai_prob*100:.1f}%, HUMAN PROBABILITY {(1-ai_prob)*100:.1f}%")
    print("================================")
except Exception as e:
    print("Error connecting to server:", e)
