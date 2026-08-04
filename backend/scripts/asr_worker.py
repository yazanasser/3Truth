import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from production_detectors import transcribe_arabic_speech_local


def main():
    try:
        result = transcribe_arabic_speech_local(sys.argv[1], float(sys.argv[2]))
        print(json.dumps(result, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False))
        raise


if __name__ == "__main__":
    main()
