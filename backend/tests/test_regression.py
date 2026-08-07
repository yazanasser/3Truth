from ml_server import run_text_detection

def test_regression_text_detection_basic():
    # Provide a simple string to ensure the whole pipeline (legacy + advanced + fusion) runs end-to-end
    result = run_text_detection("This is a simple regression test string that the system should parse correctly.")
    
    assert "error" not in result
    
    # Verify the new 7-key output schema is present
    expected_keys = {"classification", "ai_probability", "confidence", "evidence_strength", "signals", "contradictions", "warnings"}
    assert set(result.keys()) == expected_keys
    
    # Ensure classification is one of the strictly allowed values
    assert result["classification"] in ["HUMAN", "AI"]
    
    # Ensure signals were successfully aggregated
    assert len(result["signals"]) > 0
