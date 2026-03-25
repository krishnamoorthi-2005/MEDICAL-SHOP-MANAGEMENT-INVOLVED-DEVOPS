# 🤖 Pharmacy Sales Prediction System

## Overview
This system uses **Machine Learning (Random Forest)** to predict pharmacy product sales for next month based on historical monthly data.

---

## 📊 Dataset Format

### Your Excel Data Format (Input):
```
Product                | Jan | Feb | Mar | ... | Dec | Total Sales
Paracetamol 500mg     | 152 | 485 | 398 | ... | 380 | 2907
Ibuprofen 400mg       | 137 | 422 | 149 | ... | 343 | 3561
...
```

### Training Format (Output):
```csv
medicineId, medicineName, month, quantity
1,          Paracetamol 500mg, 1,     152
1,          Paracetamol 500mg, 2,     485
1,          Paracetamol 500mg, 3,     398
...
```

---

## 🚀 Step-by-Step Usage

### Step 1: Prepare Your Data
Create a CSV file with your Excel data:
- **File**: `pharmacy_sales_data.csv`
- **Location**: `backend/prediction/`
- **Format**: Product name in first column, then Jan-Dec columns

### Step 2: Convert Data to Training Format
```bash
cd backend/prediction

# Convert your Excel data to training format
python convert_excel_data.py pharmacy_sales_data.csv
```

**Output**: `training_data.csv` (ready for training)

### Step 3: Train the Model
```bash
python train.py
```

**Output**:
- ✅ `pharmacy_models.pkl` - Trained models for all products
- 📊 Console shows training stats and accuracy (R² score)
- 🎯 Models are now ready for predictions

### Step 4: Predict Next Month Sales
```bash
# Predict month 13 (next month after December)
python predict.py 13
```

**Output**: JSON with predictions for all products
```json
[
  {
    "medicineId": "1",
    "medicineName": "Paracetamol 500mg",
    "predictedDemand": 285,
    "confidence": 0.87
  },
  ...
]
```

---

## 📁 Files in This Directory

| File | Purpose |
|------|---------|
| `train.py` | Train ML models on historical data |
| `predict.py` | Predict future sales |
| `convert_excel_data.py` | **[NEW]** Convert your Excel format to training format |
| `convert_inventory_data.py` | Extract data from MongoDB |
| `extract_from_mongo.py` | Pull historical data from database |
| `training_data.csv` | Historical sales data (input for training) |
| `pharmacy_models.pkl` | Trained models (output from train.py) |
| `requirements.txt` | Python dependencies |

---

## 🔧 Configuration

### Supported Months:
- **1-12**: Historical months (Jan-Dec)
- **13**: Next month prediction
- **Custom**: Pass any month number to `predict.py`

### Model Type:
- **Algorithm**: Random Forest Regressor
- **Features**: Monthly number (1-12)
- **Target**: Sales quantity
- **Split Ratio**: 80% train, 20% validation

---

## 🎯 Example Workflow

```bash
# 1. Prepare data
cp my_pharma_sales.csv backend/prediction/pharmacy_sales_data.csv

# 2. Convert to training format
cd backend/prediction
python convert_excel_data.py pharmacy_sales_data.csv

# 3. Train models (takes 1-2 seconds)
python train.py

# 4. Predict next month (January if current data is Dec)
python predict.py 13

# Output: JSON predictions for all ~80 products
```

---

## 📈 Example Predictions

**Input (Historical 12 months)**:
- Jan: 152, Feb: 485, Mar: 398, Apr: 320, May: 156, Jun: 121
- Jul: 238, Aug: 70, Sep: 152, Oct: 171, Nov: 264, Dec: 380

**Prediction (Month 13)**:
- **Predicted Next Month**: 265 units
- **Confidence**: 0.82 (82%)

---

## ⚠️ Requirements

Install dependencies:
```bash
pip install pandas scikit-learn joblib openpyxl
```

Or from requirements.txt:
```bash
pip install -r requirements.txt
```

---

## 🐛 Troubleshooting

### Error: "Training data not found"
**Solution**: Run `convert_excel_data.py` first to generate `training_data.csv`

### Error: "MODEL_NOT_FOUND"
**Solution**: Run `train.py` first to generate `pharmacy_models.pkl`

### Predictions seem off
**Solution**: 
1. Verify data format is correct
2. Check for missing/invalid values in Excel
3. Ensure you have at least 3 months of data per product
4. Re-run train.py with fresh data

---

## 🚀 Integration with Backend

The prediction system is called from backend API:
```
GET /api/predictions/forecast
```

Returns:
```json
{
  "success": true,
  "data": [
    { "medicineId": "1", "medicineName": "Product", "predictedDemand": 250 },
    ...
  ]
}
```

---

## 📊 Performance Metrics

After training, check the console for:
- **R² Score**: Measures accuracy (0.0-1.0, higher is better)
- **RMSE**: Average prediction error
- **Samples**: Number of data points per product

---

## 💡 Tips for Better Predictions

1. **More Data**: Provide 12+ months of history
2. **Consistency**: Ensure data is in same units (e.g., all in units, not quantities)
3. **No Outliers**: Remove anomalous months if possible
4. **Regular Updates**: Retrain monthly with new data for accuracy

---

## 📝 Next Steps

1. ✅ Prepare your `pharmacy_sales_data.csv`
2. ✅ Run `python convert_excel_data.py`
3. ✅ Run `python train.py`
4. ✅ Run `python predict.py 13` to see predictions
5. ✅ Integrate API with frontend dashboard

**Need help?** Check the individual script docstrings or error messages!
