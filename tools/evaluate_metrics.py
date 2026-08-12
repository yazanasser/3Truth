import os
import sys
import json
import random
import hashlib
from collections import defaultdict
from sklearn.metrics import roc_auc_score, average_precision_score, confusion_matrix, accuracy_score, f1_score

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend/src')))
from ml_server import run_text_detection

def main():
    print("="*60)
    print("PHASE 15: DATASET AUDIT & GENERALIZATION EVALUATION")
    print("="*60)
    
    # 1. Audit Dataset Availability
    print("\n[1] Auditing Datasets...")
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data'))
    train_path = os.path.join(data_dir, 'train.jsonl')
    
    if not os.path.exists(train_path):
        print(f"ERROR: Text dataset not found at {train_path}")
        return
        
    print("Found Arabic Text dataset: data/train.jsonl")
    print("WARNING: Image, Video, and Audio datasets are UNAVAILABLE. Cannot evaluate ORIGINAL->COMPRESSED or ORIGINAL->SCREENSHOT generalizations.\n")
    
    # 2. Parse and Audit Text Dataset
    print("[2] Parsing train.jsonl...")
    records = []
    with open(train_path, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip(): continue
            records.append(json.loads(line))
            
    print(f"Loaded {len(records)} records.")
    
    # Check duplicates and leakage
    seen_hashes = set()
    duplicates = 0
    generator_counts = defaultdict(int)
    domain_counts = defaultdict(int)
    
    for r in records:
        text = r.get("text", "")
        h = hashlib.md5(text.encode('utf-8')).hexdigest()
        if h in seen_hashes:
            duplicates += 1
        seen_hashes.add(h)
        
        gen = r.get("generator", "human")
        generator_counts[gen] += 1
        
        domain = r.get("domain", "unknown")
        domain_counts[domain] += 1
        
    print(f"Duplicates found: {duplicates}")
    print(f"Generator Bias: {dict(generator_counts)}")
    print(f"Domain Bias: {dict(domain_counts)}\n")
    
    # 3. Create Generalization Splits
    print("[3] Stratifying Generalization Splits...")
    
    # We need:
    # - KNOWN -> KNOWN (Train/Test on same generator/domain)
    # - KNOWN -> UNSEEN GENERATOR (e.g., Llama/OpenAI vs Jais/Allam)
    # - KNOWN -> UNSEEN DOMAIN (e.g., social_media_reviews vs academic_abstracts)
    
    # Filter valid AI and Human pairs
    humans = [r for r in records if r.get("label") == 0]
    ais = [r for r in records if r.get("label") == 1]
    
    # We'll sample for speedy evaluation (e.g., 200 records per split)
    random.seed(42)
    
    splits = {
        "KNOWN_TO_KNOWN": {
            "ai": [r for r in ais if r.get("generator") in ["openai", "llama"] and r.get("domain") == "social_media_reviews"],
            "human": [r for r in humans if r.get("domain") == "social_media_reviews"]
        },
        "UNSEEN_GENERATOR": {
            "ai": [r for r in ais if r.get("generator") in ["jais", "allam"]],
            "human": [r for r in humans]
        },
        "UNSEEN_DOMAIN": {
            "ai": [r for r in ais if r.get("domain") == "academic_abstracts"],
            "human": [r for r in humans if r.get("domain") == "academic_abstracts"]
        }
    }
    
    # 4. Run Evaluation
    for split_name, split_data in splits.items():
        print(f"\n--- Evaluating Split: {split_name} ---")
        
        # Sample 50 AI and 50 Human to keep runtime under ~60 seconds total
        sample_ai = random.sample(split_data["ai"], min(50, len(split_data["ai"])))
        sample_human = random.sample(split_data["human"], min(50, len(split_data["human"])))
        
        eval_set = sample_ai + sample_human
        y_true = [1 if r.get("label") == 1 else 0 for r in eval_set]
        y_scores = []
        y_pred = []
        
        print(f"Running calibrated fusion engine on {len(eval_set)} records...")
        
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            for i, r in enumerate(eval_set):
                try:
                    res = run_text_detection(r["text"], "ar")
                    prob = res.get("probability", res.get("ai_probability", 0.5))
                    cls = res.get("classification", "Human")
                    
                    y_scores.append(prob)
                    y_pred.append(1 if cls == "AI Generated" else 0)
                except Exception as e:
                    print(f"Error on record {i}: {e}")
                    y_scores.append(0.5)
                    y_pred.append(0)
                
        # Calculate Metrics
        roc_auc = roc_auc_score(y_true, y_scores)
        pr_auc = average_precision_score(y_true, y_scores)
        f1 = f1_score(y_true, y_pred)
        cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
        tn, fp, fn, tp = cm.ravel()
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0
        
        # Calibration Error (Expected Calibration Error simplified for binary)
        # Sum of absolute differences between score and true label
        ece = sum(abs(y - p) for y, p in zip(y_true, y_scores)) / len(y_true)
        
        print(f"ROC-AUC  : {roc_auc:.4f}")
        print(f"PR-AUC   : {pr_auc:.4f}")
        print(f"F1 Score : {f1:.4f}")
        print(f"FPR      : {fpr:.4f}")
        print(f"FNR      : {fnr:.4f}")
        print(f"Cal-Err  : {ece:.4f}")
        print(f"Confusion Matrix (TN, FP, FN, TP): {tn, fp, fn, tp}")
        
    print("\nEvaluation Complete.")

if __name__ == "__main__":
    main()
