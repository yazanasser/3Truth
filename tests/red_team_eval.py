import os
import json
import urllib.request
import numpy as np

TEXT_API = os.environ.get("TEXT_API", "http://localhost:5003/detect/text")

def call_text_api(text):
    data = json.dumps({"text": text}).encode("utf-8")
    req = urllib.request.Request(TEXT_API, data=data, headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return json.loads(resp.read())
    except Exception as e:
        print(f"API Error: {e}")
        return None

def calc_metrics(y_true, y_prob, y_pred):
    from sklearn.metrics import roc_auc_score, f1_score
    try:
        auc = roc_auc_score(y_true, y_prob)
    except ValueError:
        auc = 0.5
    f1 = f1_score(y_true, y_pred)
    
    # Expected Calibration Error (ECE)
    bins = 10
    bin_limits = np.linspace(0, 1, bins + 1)
    ece = 0.0
    for i in range(bins):
        bin_lower = bin_limits[i]
        bin_upper = bin_limits[i+1]
        mask = (y_prob >= bin_lower) & (y_prob < bin_upper)
        if i == bins - 1:
            mask = (y_prob >= bin_lower) & (y_prob <= bin_upper)
        
        if np.sum(mask) > 0:
            bin_pos = np.mean(y_true[mask])
            bin_conf = np.mean(y_prob[mask])
            ece += np.sum(mask) / len(y_prob) * np.abs(bin_pos - bin_conf)
            
    return auc, f1, ece

def run_red_team_eval():
    print("--- Red Team Adversarial Evaluation (Text) ---")
    
    hard_positives = [
        "In this comprehensive analysis, we will delve into the multifaceted dimensions of modern macroeconomic theory.",
        "The subsequent implementation relies on a concurrent hash map to facilitate thread-safe insertions and highly scalable reads.",
        "Furthermore, it is imperative to elucidate the intrinsic correlation between cognitive behavioral strategies and long-term neuroplasticity."
    ]
    
    hard_negatives = [
        "So basically I went to the store today and they didn't even have the thing I wanted which is super annoying tbh.",
        "i think its crazy how fast time flies when u are just chilling with ur friends on a weekend.",
        "Yo, did u see that new movie? it was kinda mid but the popcorn was fire so i guess it balances out lol."
    ]
    
    degraded_positives = [
        "In this big analysis, we're gonna look into the many sides of new economic theory.",
        "The next code uses a shared map to make safe inserts and fast reads.",
        "Also, it's very important to explain the link between thinking strategies and brain changes."
    ]
    
    y_true = np.array([1, 1, 1, 0, 0, 0, 1, 1, 1])
    y_prob = []
    y_pred = []
    
    all_texts = hard_positives + hard_negatives + degraded_positives
    
    print(f"Sending {len(all_texts)} samples to API...")
    for idx, text in enumerate(all_texts):
        res = call_text_api(text)
        if res:
            prob = res.get("ai_probability", 0.5)
            pred = 1 if res.get("prediction") == "AI Generated" else 0
            print(f"Text [{text[:20]}...] -> prob: {prob:.4f}, pred: {res.get('prediction')} (label: {pred})")
            y_prob.append(prob)
            y_pred.append(pred)
        else:
            y_prob.append(0.5)
            y_pred.append(0)
            
    y_prob = np.array(y_prob)
    y_pred = np.array(y_pred)
    
    try:
        import sklearn
        auc, f1, ece = calc_metrics(y_true, y_prob, y_pred)
        print(f"\nResults:")
        print(f"ROC AUC: {auc:.4f}")
        print(f"F1 Score: {f1:.4f}")
        print(f"ECE (Calibration): {ece:.4f}")
        
        if ece < 0.15:
            print("[PASS] Calibration ECE is acceptable (< 0.15)")
        else:
            print(f"[FAIL] Calibration ECE is too high ({ece:.4f})")
    except ImportError:
        print("scikit-learn not installed. Cannot calculate advanced metrics.")

if __name__ == "__main__":
    run_red_team_eval()
