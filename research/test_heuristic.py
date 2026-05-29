"""Direct test of the heuristic engine without going through the server."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import logging
logging.basicConfig(level=logging.DEBUG)

from ml_models import TextDetectorModel

model = TextDetectorModel.__new__(TextDetectorModel)
model.model_dir = "models"

texts = {
    "KNOWN AI (buzzwords)": "In the rapidly evolving landscape of modern technology, leveraging synergistic paradigms is crucial. To delve into the myriad of possibilities, we must foster a holistic ecosystem that underscores pivotal transformative capabilities.",
    "KNOWN HUMAN": "I went to the store yesterday and bought some eggs. The cashier was kinda rude but whatever, I didn't really care. Got home, made an omelet, watched Netflix. Pretty chill day honestly.",
    "GPT NO BUZZWORDS": "Artificial intelligence has become an integral part of our daily lives. From virtual assistants to recommendation systems, these technologies are reshaping how we interact with the digital world. The implications for society are profound, as automation continues to transform industries and create new opportunities for innovation and growth.",
}

for label, text in texts.items():
    score = model.compute_heuristics(text)
    print(f"\n{'='*60}")
    print(f"TEST: {label}")
    print(f"  Heuristic Score: {score:.4f}")
    print(f"  Verdict: {'AI' if score >= 0.5 else 'HUMAN'}")
