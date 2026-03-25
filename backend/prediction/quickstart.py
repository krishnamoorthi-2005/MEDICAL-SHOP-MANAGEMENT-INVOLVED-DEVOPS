#!/usr/bin/env python3
"""
Quick Start: Convert → Train → Predict
Run this to test the entire prediction pipeline with your data
"""

import subprocess
import sys
import pathlib

BASE_DIR = pathlib.Path(__file__).resolve().parent

def run_command(cmd: list, description: str) -> bool:
    """Run a command and return True if successful"""
    print(f"\n{'='*60}")
    print(f"📍 {description}")
    print(f"{'='*60}")
    print(f"Command: {' '.join(cmd)}\n")
    
    try:
        result = subprocess.run(cmd, cwd=BASE_DIR, capture_output=False)
        if result.returncode == 0:
            print(f"✅ {description} - SUCCESS")
            return True
        else:
            print(f"❌ {description} - FAILED (exit code: {result.returncode})")
            return False
    except Exception as e:
        print(f"❌ {description} - ERROR: {e}")
        return False

def main():
    print("""
    🚀 PHARMACY PREDICTION SYSTEM - QUICK START
    ==========================================
    
    This script will:
    1. Convert your Excel data to training format
    2. Train ML models on the data
    3. Predict next month sales
    """)
    
    steps = [
        (
            ["python", "convert_excel_data.py", "pharmacy_sales_data.csv"],
            "STEP 1: Converting Excel data to training format"
        ),
        (
            ["python", "train.py"],
            "STEP 2: Training ML models"
        ),
        (
            ["python", "predict.py", "13"],
            "STEP 3: Predicting month 13 (next month)"
        ),
    ]
    
    completed = 0
    for cmd, description in steps:
        if run_command(cmd, description):
            completed += 1
        else:
            print(f"\n⚠️  Stopped at step {completed + 1}")
            sys.exit(1)
    
    print(f"\n{'='*60}")
    print(f"🎉 ALL STEPS COMPLETED SUCCESSFULLY!")
    print(f"{'='*60}")
    print(f"""
    ✅ Results:
    - training_data.csv: Created (for future use)
    - pharmacy_models.pkl: Trained (ready for predictions)
    - Predictions: Generated (month 13)
    
    📊 Next Steps:
    1. Check predictions in the JSON output above
    2. Integrate with dashboard via API
    3. Schedule monthly retraining
    
    📁 Files created:
    - training_data.csv
    - pharmacy_models.pkl
    """)

if __name__ == "__main__":
    main()
