# 🎯 Prediction Bot - Setup & Usage Guide

## ✅ What's Been Set Up

Your prediction system is now ready with:

1. **convert_excel_data.py** - Converts your Excel/CSV format to training format
2. **train.py** - Trains ML models on your data
3. **predict.py** - Predicts next month sales (updated to use month 13)
4. **pharmacy_sales_data.csv** - Your data (100 products × 12 months)
5. **PREDICTION_GUIDE.md** - Complete documentation
6. **quickstart.py** - One-click entire pipeline

---

## 🚀 Quick Start (All-in-One)

**Fastest way to test everything:**

```bash
cd backend/prediction
python quickstart.py
```

This will automatically:
- ✅ Convert your Excel data
- ✅ Train models
- ✅ Predict month 13
- ✅ Show results

---

## 📋 Manual Step-by-Step

### Step 1: Convert Your Data
```bash
cd backend/prediction
python convert_excel_data.py pharmacy_sales_data.csv
```

**Output:**
✅ training_data.csv created
📊 Shows: 100 products × 12 months = 1200 training records

### Step 2: Train Models
```bash
python train.py
```

**Output:**
✅ pharmacy_models.pkl created
📈 Shows Training accuracy (R² scores)
🎯 Models ready for prediction

### Step 3: Predict Next Month
```bash
python predict.py 13
```

**Output:**
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

## 🔧 Your Data Details

**Products Covered**: 100 medicines/products
**Data Points**: 1,200 (100 products × 12 months)
**Prediction Target**: Month 13 (next month after December)

**Sample Products:**
- Paracetamol 500mg
- Ibuprofen 400mg
- Amoxicillin 250mg
- Diabetes medicines
- Heart medicines
- Vitamins & supplements
- Medical devices & supplies

---

## 📊 What Gets Predicted

For each product:
- **Predicted Demand**: Next month sales quantity
- **Confidence**: Accuracy level (0.0-1.0)
- **Medicine ID & Name**: Product identifier

---

## 🎨 Integration with Dashboard

**API Endpoint** (already available):
```
GET /api/predictions/forecast
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "medicineId": "1",
      "medicineName": "Paracetamol 500mg",
      "predictedDemand": 285
    },
    ...
  ]
}
```

---

## 🔄 Monthly Workflow

**Every month:**
1. Update `pharmacy_sales_data.csv` with new month data
2. Run `python quickstart.py` to retrain
3. Predictions auto-update
4. Dashboard shows latest forecast

---

## ⚡ Important Notes

✅ **All Models Use Same Algorithm**: Random Forest Regressor
✅ **No Errors Expected**: Data has been validated
✅ **No Config Needed**: Everything is auto-configured
✅ **Ready to Deploy**: Can call from backend API immediately

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Training data not found" | Run `convert_excel_data.py` first |
| "Model not found" | Run `train.py` first |
| Predictions are 0 | Check data has numeric values (not text) |
| Out of memory | Your data is small; this shouldn't happen |

---

## 🚀 Next Steps

1. **Test Now**: Run `python quickstart.py`
2. **See Results**: Check JSON output
3. **Deploy**: Integrate with dashboard
4. **Monitor**: Check predictions monthly
5. **Retrain**: Update data quarterly

---

## 📞 Key Commands Reference

```bash
# Convert Excel to training format
python convert_excel_data.py pharmacy_sales_data.csv

# Train models
python train.py

# Predict month 13
python predict.py 13

# Predict specific month (1-12)
python predict.py 5  # May prediction

# One-click all
python quickstart.py
```

---

## ✨ System Ready!

Your prediction bot is now configured for:
- ✅ 100 pharmacy products
- ✅ 12 months historical data
- ✅ Monthly demand forecasting
- ✅ Dashboard integration
- ✅ Automatic retraining

**No changes needed - ready to use!** 🎉
