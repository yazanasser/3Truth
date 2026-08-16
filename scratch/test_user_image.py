import sys
import os
import json
from PIL import Image

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend', 'src'))
from image_detector import AdvancedImageOrchestrator

def test_image(image_path):
    print(f"Testing image: {image_path}")
    orchestrator = AdvancedImageOrchestrator()
    
    with open(image_path, "rb") as f:
        raw_bytes = f.read()
    
    img_pil = Image.open(image_path).convert("RGB")
    
    ctx = {"filename_hit": False}
    result = orchestrator.analyze(img_pil, raw_bytes, ctx)
    print("Final result:")
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    import glob
    # Find the most recent image in the brain directory
    images = glob.glob(r"C:\Users\LENOVO\.gemini\antigravity-ide\brain\f584b9e1-eccd-4708-8a01-c1af065adfd1\*.jpg")
    images += glob.glob(r"C:\Users\LENOVO\.gemini\antigravity-ide\brain\f584b9e1-eccd-4708-8a01-c1af065adfd1\*.png")
    if images:
        latest_image = max(images, key=os.path.getctime)
        test_image(latest_image)
    else:
        print("No image found.")
