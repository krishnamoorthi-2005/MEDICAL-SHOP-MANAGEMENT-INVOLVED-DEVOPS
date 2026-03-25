"""
Convert Excel/CSV pharmacy sales data into training format for ML models
Input format (Wide): Product | Jan | Feb | ... | Dec | Total Sales
Output format (Long): medicineId | medicineName | month | quantity
"""

import pandas as pd
import pathlib
import sys
from typing import List

BASE_DIR = pathlib.Path(__file__).resolve().parent

# Month mapping
MONTHS = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
}

def convert_excel_to_training_format(input_file: str, output_file: str = "training_data.csv") -> None:
    """
    Convert Excel sales data to training format (wide to long)
    
    Input: Product | Jan | Feb | Mar | ... | Dec | Total Sales
    Output: medicineId | medicineName | month | quantity
    
    Args:
        input_file: Path to input CSV/Excel file
        output_file: Path to output training CSV file
    """
    
    # Read the input data
    print(f"📖 Reading data from {input_file}...")
    try:
        df = pd.read_csv(input_file) if input_file.endswith('.csv') else pd.read_excel(input_file)
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        raise
    
    print(f"✅ Loaded {len(df)} products")
    print(f"   Columns: {list(df.columns)}")
    
    # Get the product column (first column)
    product_col = df.columns[0]
    print(f"   Product column: {product_col}")
    
    # Prepare output data
    training_data = []
    medicine_id = 1
    
    for idx, row in df.iterrows():
        product_name = str(row[product_col]).strip()
        
        # Extract monthly sales (iterate through MONTHS dict)
        for month_name, month_num in MONTHS.items():
            if month_name in df.columns:
                quantity = row[month_name]
                
                # Skip invalid/missing values
                if pd.isna(quantity):
                    continue
                
                try:
                    quantity = int(float(quantity))  # Convert to int, handle float decimals
                    if quantity < 0:  # Skip negative values
                        continue
                except (ValueError, TypeError):
                    continue
                
                training_data.append({
                    'medicineId': medicine_id,
                    'medicineName': product_name,
                    'month': month_num,
                    'quantity': quantity
                })
        
        medicine_id += 1
    
    if not training_data:
        print("❌ No valid data found! Check CSV format.")
        print("   Expected columns: Product, Jan, Feb, Mar, ..., Dec")
        return None
    
    # Create DataFrame and save
    output_df = pd.DataFrame(training_data)
    output_path = BASE_DIR / output_file
    output_df.to_csv(output_path, index=False)
    
    print(f"\n✅ Conversion complete!")
    print(f"   Total records: {len(output_df)}")
    print(f"   Products: {output_df['medicineId'].nunique()}")
    print(f"   Months per product: {len(output_df) // output_df['medicineId'].nunique()}")
    print(f"   Saved to: {output_path}")
    print(f"\n📊 Sample data (first 15 rows):")
    print(output_df.head(15).to_string())
    print(f"\n📊 Data summary:")
    print(f"   Min quantity: {output_df['quantity'].min()}")
    print(f"   Max quantity: {output_df['quantity'].max()}")
    print(f"   Avg quantity: {output_df['quantity'].mean():.2f}")
    
    return output_path


if __name__ == "__main__":
    # Support both direct execution and command-line argument
    if len(sys.argv) > 1:
        # Called with file path argument from controller
        input_file = sys.argv[1]
        convert_excel_to_training_format(input_file, "training_data.csv")
    else:
        # Default: look for pharmacy_sales_data.csv or pharmacy_sales_data.xlsx in same directory
        default_files = [
            BASE_DIR / "pharmacy_sales_data.csv",
            BASE_DIR / "pharmacy_sales_data.xlsx",
        ]
        
        for file_path in default_files:
            if file_path.exists():
                convert_excel_to_training_format(str(file_path), "training_data.csv")
                break
        else:
            print("❌ No input file found. Usage: python convert_excel_data.py <file_path>")
            sys.exit(1)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    else:
        input_file = str(BASE_DIR / "pharmacy_sales_data.csv")
    
    convert_excel_to_training_format(input_file)
