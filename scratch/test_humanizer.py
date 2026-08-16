import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend', 'src'))
from ml_models import TextDetectorModel

print("Loading model...")
model = TextDetectorModel()

print("Testing humanized text (high perplexity, extreme burstiness)")
# Example of highly bursty humanized text:
text = "The sunset was amazing. It painted the entire sky with vibrant and breathtaking colors that stretched as far as the eye could see. Wow. I was truly amazed. The intricate tapestry of light intertwined with the slowly encroaching darkness, creating a symphony of shadows and brilliance. Beautiful."

print("Perplexity:", model.compute_perplexity(text))
print("Heuristics:", model.compute_heuristics(text))
print("Final Prob:", model.predict(text))
