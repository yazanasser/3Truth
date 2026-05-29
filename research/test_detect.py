"""Quick test to see what the ML server actually returns for known AI text."""
import urllib.request
import json

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

def test(label, text):
    data = json.dumps({"text": text}).encode("utf-8")
    req = urllib.request.Request(
        "http://localhost:5002/detect/text",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        result = json.loads(resp.read())
        print(f"\n{'='*60}")
        print(f"TEST: {label}")
        print(f"  Prediction:     {result.get('prediction')}")
        print(f"  AI Probability: {result.get('ai_probability')}")
        print(f"  Confidence:     {result.get('confidence')}")
        print(f"  Word Count:     {result.get('word_count')}")
        if result.get('features'):
            for k, v in result['features'].items():
                print(f"  {k}: {v}")
    except Exception as e:
        print(f"\nERROR testing '{label}': {e}")

test("KNOWN AI TEXT (buzzwords)", AI_TEXT)
test("KNOWN HUMAN TEXT", HUMAN_TEXT)
test("GPT-STYLE NO BUZZWORDS", GPT_NO_BUZZWORDS)
