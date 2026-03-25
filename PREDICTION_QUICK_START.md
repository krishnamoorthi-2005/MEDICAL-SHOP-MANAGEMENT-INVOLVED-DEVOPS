# 🤖 Prediction Bot - Quick Start Guide

## ✨ What's Fixed

The **CSV conversion bug has been fixed!** The system now supports all 3 CSV formats:

1. **Wide Format** (Product | Jan-Dec) ← Most common
2. **Long Format** (medicineId | medicineName | month | quantity)
3. **Aggregated Format** (MedicineName | Category | AvgMonthlySales)

---

## 🚀 How to Use the Prediction Bot

### **Step 1: Prepare Your Sales Data**
Create a CSV file with 12 months of sales data. **Use the wide format - it's the easiest!**

**Format:**
```
Product,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec,Total Sales
Medicine1,100,120,150,140,160,...
Medicine2,200,210,220,230,240,...
```

**Or download the sample:** `SAMPLE_SALES_DATA.csv`

### **Step 2: Upload in Frontend**
1. **Path:** Settings → AI Prediction Dataset
2. **Button:** "Upload CSV File"
3. **Select:** Your sales data file
4. **Wait:** System auto-converts and trains

### **Step 3: Generate Predictions**
1. **Path:** Inventory → Predictions
2. **Select:** Month (1-12)
3. **View:** AI predictions for that month

**Prediction includes:**
- 📊 Predicted demand
- 📈 Demand trend
- 🎯 Confidence score
- 📦 Stock levels
- 🔄 Reorder recommendations

---

## 📋 CSV Format Details

### Format 1: Wide (RECOMMENDED) ⭐

```
Product,Jan,Feb,Mar,...,Dec,Total Sales
Paracetamol,250,280,320,...,290,4018
Ibuprofen,300,320,340,...,320,4430
```

**Advantages:**
- ✅ Easy to create in Excel
- ✅ Human readable
- ✅ Compact layout
- ✅ Most intuitive

**System detects by:**
- First column = Product name
- Contains month columns: Jan-Dec
- Automatically converts to long format

### Format 2: Long

```
medicineId,medicineName,month,quantity
1,Paracetamol,1,250
1,Paracetamol,2,280
1,Paracetamol,3,320
2,Ibuprofen,1,300
2,Ibuprofen,2,320
```

**When to use:**
- Already have long-format data
- Want to skip conversion step

### Format 3: Aggregated

```
MedicineName,Category,AvgMonthlySales
Paracetamol,Tablet,400
Ibuprofen,Tablet,256
```

**Note:** System derives historical patterns

---

## 🎯 Common Issues & Solutions

### ❌ "Invalid CSV format. Found columns: Product, Jan, Feb, Mar..."

**Problem:** You're using wide format (correct!)
**Solution:** Just upload - system handles it automatically now ✅

### ❌ "Missing required columns"

**Check:**
- Column names exactly match: Jan, Feb, Mar, Apr, etc.
- First column is product name
- No trailing spaces in column names
- No special characters

### ❌ "Failed to convert wide format"

**Try:**
1. Open CSV in Excel
2. Check all month columns exist (Jan-Dec)
3. Re-save as CSV
4. Upload again

### ❌ "Python library missing"

**Run:**
```bash
pip install pandas numpy scikit-learn
```

---

## 📊 For Your 36 Medicines

We've included a sample file with all your imported medicines:

**File:** `SAMPLE_SALES_DATA.csv`

**To use:**
1. Download the sample file
2. Update with your ACTUAL sales data
3. Upload to the prediction system
4. Get forecasts for all 36 medicines!

---

## 🔍 Sample Output

When you request a prediction:

```json
{
  "medicineId": "507f1f77bcf86cd799439011",
  "medicineName": "Paracetamol 500mg",
  "predictedDemand": 350,
  "confidence": 0.85,
  "previousSales": 320,
  "currentStock": 250,
  "minStockLevel": 80,
  "maxStockLevel": 400,
  "trend": "upward",
  "recommendation": "Reorder 100 units"
}
```

---

## 🚦 Workflow Summary

```
1. Prepare CSV
   ↓
2. Upload to Settings → AI Prediction Dataset
   ↓
3. System auto-detects format
   ↓
4. Converts (if needed)
   ↓
5. Trains AI model
   ↓
6. Ready for predictions!
   ↓
7. Select month in Inventory → Predictions
   ↓
8. View AI forecasts & reorder suggestions
```

---

## 💡 Pro Tips

1. **Always include 12 months** of data for accuracy
2. **Update monthly** for best predictions
3. **Use wide format** - it's the fastest
4. **Check for outliers** - huge spikes affect predictions
5. **Monitor confidence score** - high = more reliable

---

## 📞 Support

For help:
1. Check `CSV_FORMAT_GUIDE.md` (detailed documentation)
2. Use `SAMPLE_SALES_DATA.csv` as template
3. Verify your CSV matches formats exactly
4. Check Python dependencies are installed

---

## 🎓 Understanding Predictions

**Confidence Score:**
- 0.0-0.3: Low (use with caution)
- 0.3-0.7: Medium (reasonable)
- 0.7-1.0: High (very reliable) ⭐

**Trend:**
- 📈 Upward: Increasing demand
- 📉 Downward: Decreasing demand
- ➡️ Stable: Consistent demand

**Recommendation:**
- 🔴 Critical: Stock running low
- 🟡 Warning: Use soon
- 🟢 Safe: Stock adequate

---

**Happy predicting!** 🎯💊
