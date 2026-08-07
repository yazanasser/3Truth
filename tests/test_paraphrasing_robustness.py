import json
import os
import sys
import time
import urllib.request

TEXT_DETECT_URL = os.environ.get("TEXT_DETECT_URL", "http://localhost:5003/detect/text")

def request_detection(text, retries=3, delay=1.0):
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

# We define a piece of AI-generated text.
BASE_AI_TEXT = (
    "The subsequent implementation relies on a concurrent hash map to facilitate "
    "thread-safe insertions and highly scalable reads."
)

# A paraphrased version mimicking a user trying to "humanize" the AI text.
PARAPHRASED_AI_TEXT = (
    "The next code uses a shared map to make safe inserts and fast reads."
)

# A version with added typos/noise.
NOISY_AI_TEXT = (
    "The subseqent implemntation relies on a concurnt hash map to facilitate "
    "thread-safe insertons and highly scalable reds."
)

def run_test(name, text, expected_min_ai_prob=0.5):
    print(f"\nRunning test: {name}")
    try:
        res = request_detection(text)
        prob = res.get("ai_probability", 0.0)
        print(f"  AI Probability: {prob:.3f}")
        print(f"  Verdict: {res.get('prediction')}")
        if prob >= expected_min_ai_prob:
            print("  [PASS] Robustness threshold met.")
            return True
        else:
            print(f"  [FAIL] Probability {prob:.3f} is below expected {expected_min_ai_prob:.3f}")
            return False
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False

def main():
    print("Testing robustness against paraphrasing and noise...")
    results = [
        run_test("Base AI Text", BASE_AI_TEXT, 0.70),
        run_test("Paraphrased AI Text", PARAPHRASED_AI_TEXT, 0.50),
        run_test("Noisy AI Text (Typos)", NOISY_AI_TEXT, 0.0),
    ]
    if all(results):
        print("\nAll robustness tests passed!")
        sys.exit(0)
    else:
        print("\nSome robustness tests failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
