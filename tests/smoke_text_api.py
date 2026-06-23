"""Quick test to see what the ML server actually returns for known AI text."""
import json
import os
import sys
import time
import urllib.request

TEXT_DETECT_URL = os.environ.get("TEXT_DETECT_URL", "http://localhost:5003/detect/text")

AI_TEXT = (
    "In the rapidly evolving landscape of modern technology, leveraging synergistic "
    "paradigms is crucial. To delve into the myriad of possibilities, we must foster "
    "a holistic ecosystem that underscores pivotal transformative capabilities."
)

HUMAN_TEXT = (
    "I went to the store yesterday and bought some eggs. The cashier was kinda rude "
    "but whatever, I didn't really care. Got home, made an omelet, watched Netflix. "
    "Pretty chill day honestly."
)

GPT_NO_BUZZWORDS = (
    "Artificial intelligence has become an integral part of our daily lives. From "
    "virtual assistants to recommendation systems, these technologies are reshaping "
    "how we interact with the digital world. The implications for society are profound, "
    "as automation continues to transform industries and create new opportunities "
    "for innovation and growth."
)

ARABIC_AI = (
    "في المشهد المتطور باستمرار للتكنولوجيا الحديثة، يعتبر تعزيز النماذج التآزرية أمراً بالغ الأهمية. "
    "للخوض في عدد لا يحصى من الاحتمالات، يجب علينا تعزيز نظام بيئي شامل يؤكد على القدرات التحويلية المحورية."
)

def request_detection(text, retries=8, delay=1.0):
    data = json.dumps({"text": text}).encode("utf-8")
    req = urllib.request.Request(TEXT_DETECT_URL, data=data, headers={"Content-Type": "application/json"})
    last_error = None
    for _ in range(retries):
        try:
            resp = urllib.request.urlopen(req, timeout=10)
            return json.loads(resp.read())
        except Exception as exc:
            last_error = exc
            time.sleep(delay)
    raise RuntimeError(last_error)

def test(label, text):
    try:
        result = request_detection(text)
        print(f"\n{'='*60}")
        print(f"TEST: {label}")
        print(f"  Prediction:     {result.get('prediction')}")
        print(f"  AI Probability: {result.get('ai_probability')}")
        print(f"  Confidence:     {result.get('confidence')}")
        print(f"  Word Count:     {result.get('word_count')}")
        print(f"  Language:       {result.get('language')}")
        if result.get('features'):
            for k, v in result['features'].items():
                print(f"  {k}: {v}")
    except Exception as e:
        print(f"\nERROR testing '{label}': {e}")
        return False
    return True

def main():
    results = [
        test("KNOWN AI TEXT (buzzwords)", AI_TEXT),
        test("KNOWN HUMAN TEXT", HUMAN_TEXT),
        test("GPT-STYLE NO BUZZWORDS", GPT_NO_BUZZWORDS),
        test("ARABIC AI TEXT", ARABIC_AI)
    ]
    if not all(results):
        sys.exit(1)

if __name__ == "__main__":
    main()
