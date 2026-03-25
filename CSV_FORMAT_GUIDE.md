# 📊 Prediction Bot - CSV Format Guide

## ✅ Supported CSV Formats

Your prediction system now supports **3 CSV format options**:

### **Format 1: Wide Format (RECOMMENDED)** ⭐
**Best for:** Monthly sales data with 12 columns (one per month)

**Columns Required:**
```
Product, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec, Total Sales
```

**Example:**
```
Product,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec,Total Sales
Paracetamol 500mg,152,485,398,275,368,412,425,380,410,390,420,485,4800
Ibuprofen 400mg,98,220,310,185,220,265,280,240,310,220,250,280,3078
Amoxicillin 250mg,45,120,135,98,112,145,176,140,168,145,160,175,1419
ORS Sachet,310,425,520,485,510,580,615,545,620,560,600,685,6655
```

**How it works:**
- System automatically detects this format
- Converts from wide (horizontal months) to long (vertical rows)
- One product per row, with monthly columns
- Automatically generates medicineId (1, 2, 3, ...)

### **Format 2: Long Format (Traditional)**
**Best for:** Systems already using long format

**Columns Required:**
```
medicineId, medicineName, month, quantity
```

**Example:**
```
medicineId,medicineName,month,quantity
1,Paracetamol 500mg,1,152
1,Paracetamol 500mg,2,485
1,Paracetamol 500mg,3,398
2,Ibuprofen 400mg,1,98
2,Ibuprofen 400mg,2,220
```

**How it works:**
- Used directly without conversion
- Each medicine has 12 rows (one per month 1-12)
- medicineId: Unique medicine identifier (1, 2, 3, ...)
- month: 1-12 (January to December)
- quantity: Sales quantity for that month

### **Format 3: Aggregated Format**
**Best for:** Systems with monthly averages

**Columns Required:**
```
MedicineName, Category, AvgMonthlySales
```

**Example:**
```
MedicineName,Category,AvgMonthlySales
Paracetamol 500mg,Tablet,400
Ibuprofen 400mg,Tablet,256
Amoxicillin 250mg,Capsule,118
```

**Note:** Requires conversion script to generate historical data patterns

---

## 🚀 How to Fix the Error

If you see this error:
```
Invalid CSV format. Found columns: Product, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec, Total Sales
```

**Solution:** You're using the Wide Format, which is now fully supported! 

✅ **Just upload your file** - the system will automatically detect and convert it.

---

## 📋 Checklist Before Uploading

- [ ] File is in CSV format (.csv)
- [ ] Uses ONE of the 3 formats above
- [ ] Product names are in the first column
- [ ] No empty rows or missing data
- [ ] Month columns use: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec
- [ ] Quantity values are numbers (not text)

---

## 🔧 Step-by-Step Upload Process

1. **Prepare your CSV file** with one of the supported formats
2. **Go to:** Settings → AI Prediction Dataset
3. **Click:** "Upload CSV File"
4. **Select:** Your pharmacy sales CSV
5. **Wait:** System will:
   - Detect the format automatically
   - Convert if needed (wide → long)
   - Train the AI model
   - Generate predictions
6. **Done!** Your predictions are ready

---

## 📊 Example: Using Your 36 Medicines

If you want to generate predictions for your imported medicines:

**Create a CSV file with sales data:**

```
Product,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec
Paracetamol 500mg,250,280,320,290,310,350,380,340,360,330,320,290
Ibuprofen 400mg,300,320,340,350,360,380,400,380,390,360,340,320
Amoxicillin 250mg,180,190,210,200,220,240,260,240,250,220,200,180
...
```

Then upload it to train the AI with your actual sales data.

---

## ❓ FAQ

**Q: Can I use Excel (.xlsx) files?**
A: Yes! The system detects and handles both .csv and .xlsx formats.

**Q: What if my data has different column names?**
A: The system looks for pattern matching:
- For wide format: Looks for Jan-Dec columns
- For long format: Must have exact column names
- For aggregated: Must have exact column names

**Q: Can I use data for just 6 months?**
A: Recommended minimum is 12 months for accurate predictions. With less data, predictions will be less reliable.

**Q: What happens to my old data when I upload new data?**
A: The new dataset trains the model completely. Previous models are replaced.

---

## ✨ Benefits of Each Format

| Format | Pros | Cons |
|--------|------|------|
| **Wide** | Easy to create in Excel, Human-readable, Compact | Needs conversion |
| **Long** | Direct to training, No conversion needed | More rows, Less readable |
| **Aggregated** | Simplified data | Loses historical patterns |

**Recommendation:** Use **Wide Format** - it's the easiest and most intuitive! 🎯

---

## 🛠️ Troubleshooting

**Error: "Failed to convert wide format"**
- Check that month columns are named: Jan, Feb, Mar, etc.
- Ensure no extra spaces in column names
- Verify no special characters in product names

**Error: "Training data not found after upload"**
- File upload failed due to network issue
- Try uploading again
- Check file size (max 10MB recommended)

**Error: "Python library missing"**
- Required: pandas, numpy, scikit-learn
- Run: `pip install pandas numpy scikit-learn`

---

For more help, contact your pharmacy manager or system administrator! 💊
