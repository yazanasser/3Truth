import os
import io
import json
import urllib.request
from PIL import Image, ImageFilter

IMAGE_DETECT_URL = os.environ.get("IMAGE_DETECT_URL", "http://localhost:5003/api/analyze")

def request_detection(img_bytes, filename="test.jpg", retries=3, delay=1.0):
    # We send it as multipart/form-data
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = (
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"type\"\r\n\r\n"
        f"image\r\n"
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n"
        f"Content-Type: image/jpeg\r\n\r\n"
    ).encode('utf-8')
    body += img_bytes
    body += f"\r\n--{boundary}--\r\n".encode('utf-8')

    req = urllib.request.Request(IMAGE_DETECT_URL, data=body)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    
    last_error = None
    import time
    for _ in range(retries):
        try:
            resp = urllib.request.urlopen(req, timeout=10)
            return json.loads(resp.read())
        except Exception as exc:
            last_error = exc
            time.sleep(delay)
    raise RuntimeError(last_error)

def create_synthetic_image():
    # create a simple fake image that might look synthetic (smooth gradients)
    img = Image.new("RGB", (512, 512), color="black")
    pixels = img.load()
    for y in range(512):
        for x in range(512):
            pixels[x, y] = (int(x/2), int(y/2), 150)
    return img

def apply_transformations(img):
    transforms = {}
    
    # 1. Baseline
    b1 = io.BytesIO()
    img.save(b1, format="JPEG", quality=95)
    transforms["baseline"] = b1.getvalue()
    
    # 2. Strong JPEG Compression
    b2 = io.BytesIO()
    img.save(b2, format="JPEG", quality=30)
    transforms["jpeg_compression"] = b2.getvalue()
    
    # 3. Blur
    img_blur = img.filter(ImageFilter.GaussianBlur(radius=2))
    b3 = io.BytesIO()
    img_blur.save(b3, format="JPEG", quality=95)
    transforms["blur"] = b3.getvalue()
    
    # 4. Resize
    img_resize = img.resize((256, 256))
    b4 = io.BytesIO()
    img_resize.save(b4, format="JPEG", quality=95)
    transforms["resize"] = b4.getvalue()
    
    return transforms

def run_test():
    img = create_synthetic_image()
    transforms = apply_transformations(img)
    
    for name, img_bytes in transforms.items():
        print(f"\nRunning Image Robustness Test: {name}")
        try:
            res = request_detection(img_bytes)
            prob = res.get("ai_probability", 0.0)
            print(f"  AI Probability: {prob:.3f}")
            print(f"  Verdict: {res.get('prediction')}")
            if prob >= 0.50:
                print("  [PASS] Robustness threshold met.")
            else:
                print(f"  [FAIL] Probability {prob:.3f} is below 0.50.")
        except Exception as e:
            print(f"  [ERROR] {e}")

if __name__ == "__main__":
    run_test()
