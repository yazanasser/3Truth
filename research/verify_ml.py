import torch  # type: ignore
import sys
import os

# Ensure the local path is included in system search
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from ml_models import (
        CustomAttentionTextClassifier,
        DualStreamImageDetector,
        SpatioTemporalVideoDetector
    )
    print("[SUCCESS] Successfully imported all upgraded PyTorch neural architectures from ml_models.py")
except ImportError as e:
    print(f"[FATAL] Import failed: {e}")
    sys.exit(1)

def run_diagnostics():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[DEVICE] Executing diagnostics on device: {device}")
    
    # =========================================================================
    #  1. TEXT CLASSIFIER DIAGNOSTIC
    # =========================================================================
    print("\n--- 1. Testing Text Multi-Head Attention Classifier ---")
    vocab_size = 30000
    batch_size = 2
    seq_len = 256
    
    # Initialize model
    text_model = CustomAttentionTextClassifier(vocab_size=vocab_size).to(device)
    text_model.eval()
    
    # Mock inputs
    dummy_text_tensor = torch.randint(0, vocab_size, (batch_size, seq_len)).to(device)
    
    try:
        with torch.no_grad():
            output = text_model(dummy_text_tensor)
        print(f"[TEXT] Input tensor shape:  {list(dummy_text_tensor.shape)}")
        print(f"[TEXT] Output logits shape: {list(output.shape)}")
        assert output.shape == (batch_size, 1), "Text output dimensions mismatch!"
        print("[TEXT] Text Forward Pass: SUCCESS")
    except Exception as e:
        print(f"[TEXT] Text Forward Pass: FAILED. Error: {e}")
        sys.exit(1)

    # =========================================================================
    #  2. IMAGE DUAL-STREAM CLASSIFIER DIAGNOSTIC
    # =========================================================================
    print("\n--- 2. Testing Image Dual-Stream Spatial-Spectral Classifier ---")
    
    # Initialize model (without loading pre-trained weights for fast offline verification)
    image_model = DualStreamImageDetector(pretrained=False).to(device)
    image_model.eval()
    
    # Mock inputs (Spatial = 3x224x224, Spectral = 1x32x32)
    dummy_spatial_img = torch.randn(batch_size, 3, 224, 224).to(device)
    dummy_spectral_img = torch.randn(batch_size, 1, 32, 32).to(device)
    
    try:
        with torch.no_grad():
            output = image_model(dummy_spatial_img, dummy_spectral_img)
        print(f"[IMAGE] Input spatial shape:  {list(dummy_spatial_img.shape)}")
        print(f"[IMAGE] Input spectral shape: {list(dummy_spectral_img.shape)}")
        print(f"[IMAGE] Output logits shape:  {list(output.shape)}")
        assert output.shape == (batch_size, 1), "Image output dimensions mismatch!"
        print("[IMAGE] Image Forward Pass: SUCCESS")
    except Exception as e:
        print(f"[IMAGE] Image Forward Pass: FAILED. Error: {e}")
        sys.exit(1)

    # =========================================================================
    #  3. VIDEO SPATIO-TEMPORAL CLASSIFIER DIAGNOSTIC
    # =========================================================================
    print("\n--- 3. Testing Video Spatio-Temporal Temporal-Attention Classifier ---")
    
    # Initialize model
    video_model = SpatioTemporalVideoDetector(dual_stream_backbone=image_model).to(device)
    video_model.eval()
    
    # Mock inputs (Sequence of 8 frames)
    seq_frames = 8
    dummy_spatial_vid = torch.randn(batch_size, seq_frames, 3, 224, 224).to(device)
    dummy_spectral_vid = torch.randn(batch_size, seq_frames, 1, 32, 32).to(device)
    
    try:
        with torch.no_grad():
            output = video_model(dummy_spatial_vid, dummy_spectral_vid)
        print(f"[VIDEO] Input spatial seq:  {list(dummy_spatial_vid.shape)}")
        print(f"[VIDEO] Input spectral seq: {list(dummy_spectral_vid.shape)}")
        print(f"[VIDEO] Output logits shape: {list(output.shape)}")
        assert output.shape == (batch_size, 1), "Video output dimensions mismatch!"
        print("[VIDEO] Video Forward Pass: SUCCESS")
    except Exception as e:
        print(f"[VIDEO] Video Forward Pass: FAILED. Error: {e}")
        sys.exit(1)

    print("\n=========================================================================")
    print("[DIAGNOSTIC REPORT] All deep learning models passed shape and dimensional checks!")
    print("=========================================================================")

if __name__ == "__main__":
    run_diagnostics()
