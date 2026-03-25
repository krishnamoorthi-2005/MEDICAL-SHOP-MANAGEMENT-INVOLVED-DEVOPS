import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import StockLedger from '../models/StockLedger.js';
import Medicine from '../models/Medicine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to detect available Python command (Windows compatibility)
const getPythonCommand = () => {
  const pythonCommands = ['python', 'python3', 'py'];
  
  for (const cmd of pythonCommands) {
    try {
      require('child_process').execSync(`${cmd} --version`, { stdio: 'ignore' });
      return cmd;
    } catch (e) {
      // Try next command
    }
  }
  
  return 'python'; // Fallback to default
};

export const getMonthlyDemandPrediction = async (req, res) => {
  try {
    const month = Number.parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const useMultiAgent = req.query.multiAgent !== 'false'; // Default to multi-agent system

    const cwd = path.join(__dirname, '..', 'prediction');
    
    // Choose prediction system
    let scriptPath, modelPath;
    if (useMultiAgent) {
      scriptPath = path.join(cwd, 'predict_multiagent.py');
      modelPath = path.join(cwd, 'training_data.csv'); // Multi-agent uses CSV directly
    } else {
      scriptPath = path.join(cwd, 'predict.py');
      modelPath = path.join(cwd, 'pharmacy_models.pkl'); // Original ML model
    }

    if (!fs.existsSync(modelPath)) {
      const errorMsg = useMultiAgent
        ? 'Training dataset not found. Upload a sales dataset in Settings → AI Prediction Dataset.'
        : 'AI model not trained yet. Upload a 1-year sales dataset in Settings → AI Prediction Dataset, or ask your administrator to run the training scripts.';
      
      return res.status(400).json({
        success: false,
        message: errorMsg,
      });
    }

    const pythonCmd = getPythonCommand();
    const command = `${pythonCmd} "${scriptPath}" ${month}`;

    exec(command, { 
      cwd,
      shell: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    }, async (error, stdout, stderr) => {
      if (error) {
        console.error('Prediction script error:', error, stderr);
        return res.status(500).json({
          success: false,
          message: 'Failed to run prediction script. Ensure Python and required libraries are installed and models are trained.',
        });
      }

      const raw = String(stdout).trim();
      if (!raw) {
        return res.status(500).json({ success: false, message: 'Prediction script returned empty output' });
      }

      let predictions;
      try {
        predictions = JSON.parse(raw);
      } catch (parseErr) {
        console.error('Failed to parse prediction output:', raw, parseErr);
        return res.status(500).json({ success: false, message: 'Invalid prediction output from model' });
      }

      if (!Array.isArray(predictions) || predictions.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // Filter out medicines with zero or negative predicted demand
      const nonZeroPredictions = predictions.filter(
        (p) => Number(p.predictedDemand || 0) > 0
      );

      if (nonZeroPredictions.length === 0) {
        return res.json({ success: true, data: [] });
      }

      console.log(`🔮 Python predictions:`, nonZeroPredictions.map(p => ({ 
        id: p.medicineId, 
        name: p.medicineName, 
        demand: p.predictedDemand 
      })));

      // Look up medicines by name to get real MongoDB ObjectIds
      const medicineNames = nonZeroPredictions
        .map(p => p.medicineName)
        .filter(name => typeof name === 'string' && name.trim().length > 0);

      console.log(`🔍 Looking up medicines by names:`, medicineNames);

      // Find medicines in database by name (case-insensitive)
      const medicines = await Medicine.find(
        { 
          name: { $in: medicineNames.map(n => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) }
        },
        { _id: 1, name: 1, manufacturerId: 1 }
      ).lean();

      console.log(`✅ Found ${medicines.length} medicines in database:`, medicines.map(m => ({ id: m._id, name: m.name })));

      // Create mapping from prediction medicine name to actual MongoDB medicine
      const medicineMapByName = new Map();
      for (const med of medicines) {
        medicineMapByName.set(med.name.toLowerCase(), med);
      }

      // Also keep by ID for backward compatibility
      const medicineMap = new Map(
        medicines.map((m) => [String(m._id), m])
      );

      const validObjectIds = medicines.map(m => m._id);

      let stockByMedicine = new Map();
      let salesByMedicine = new Map();
      let trainingSalesByMedicine = new Map();
      if (validObjectIds.length > 0) {
        const stockAgg = await StockLedger.aggregate([
          { $match: { medicineId: { $in: validObjectIds } } },
          {
            $group: {
              _id: '$medicineId',
              currentStock: { $sum: '$quantity' },
            },
          },
        ]);

        console.log(`📊 Stock aggregation for ${validObjectIds.length} medicines:`, 
          stockAgg.map(s => ({ id: String(s._id), stock: s.currentStock })));

        stockByMedicine = new Map(
          stockAgg.map((row) => [String(row._id), row.currentStock || 0])
        );

        // Calculate sales for the same month in the previous year
        const currentYear = new Date().getFullYear();
        const previousYear = currentYear - 1;
        
        // Create date range for the selected month in previous year
        const startDate = new Date(previousYear, month - 1, 1); // First day of month in previous year
        const endDate = new Date(previousYear, month, 0, 23, 59, 59, 999); // Last day of month in previous year

        const salesAgg = await StockLedger.aggregate([
          {
            $match: {
              medicineId: { $in: validObjectIds },
              type: { $in: ['SALE', 'SALE_OUT'] },
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: '$medicineId',
              totalSoldLastYear: {
                $sum: {
                  $cond: [
                    { $lt: ['$quantity', 0] },
                    { $multiply: ['$quantity', -1] },
                    '$quantity',
                  ],
                },
              },
            },
          },
        ]);

        salesByMedicine = new Map(
          salesAgg.map((row) => [String(row._id), row.totalSoldLastYear || 0])
        );

        console.log(`📈 Previous year sales for ${salesAgg.length} medicines:`,
          salesAgg.map(s => ({ id: String(s._id), sales: s.totalSoldLastYear })));
      }

      // Fallback: if a medicine doesn't exist in Mongo (e.g. demo dataset medicines),
      // derive its previous year same month sales directly from training_data.csv
      try {
        const trainingPath = path.join(__dirname, '..', 'prediction', 'training_data.csv');
        if (fs.existsSync(trainingPath)) {
          const csvRaw = await fs.promises.readFile(trainingPath, 'utf8');
          const lines = csvRaw.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length > 1) {
            const header = lines.shift();
            const columns = header.split(',');
            const idIndex = columns.indexOf('medicineId') !== -1
              ? columns.indexOf('medicineId')
              : columns.indexOf('medicineName');
            const qtyIndex = columns.indexOf('quantity');
            const monthIndex = columns.indexOf('month');

            if (idIndex !== -1 && qtyIndex !== -1 && monthIndex !== -1) {
              const totals = new Map();
              for (const line of lines) {
                const parts = line.split(',');
                if (parts.length <= Math.max(idIndex, qtyIndex, monthIndex)) continue;
                const id = parts[idIndex]?.trim();
                const qty = Number(parts[qtyIndex]);
                const csvMonth = Number(parts[monthIndex]);
                // Only sum quantities for the selected month
                if (!id || Number.isNaN(qty) || csvMonth !== month) continue;
                totals.set(id, (totals.get(id) || 0) + Math.max(0, qty));
              }
              trainingSalesByMedicine = totals;
            }
          }
        }
      } catch (csvErr) {
        console.error('Failed to read training_data.csv for previous sales fallback:', csvErr);
      }

      // Enrich with medicine names/manufacturers and map stock correctly
      const result = nonZeroPredictions.map((p) => {
        // Find the actual medicine by name
        const actualMedicine = medicineMapByName.get(p.medicineName?.toLowerCase());
        
        let currentStock = 0;
        let medicineId = p.medicineId; // Default to CSV ID
        let manufacturerId = null;
        
        if (actualMedicine) {
          // Use the real MongoDB ID to get stock
          medicineId = String(actualMedicine._id);
          currentStock = Number(stockByMedicine.get(medicineId) || 0);
          manufacturerId = actualMedicine.manufacturerId;
        }
        
        const ledgerPrev = Number(salesByMedicine.get(medicineId) || 0);
        const trainingPrev = Number(trainingSalesByMedicine.get(p.medicineId) || 0);
        const previousSales = ledgerPrev > 0 ? ledgerPrev : trainingPrev;
        const predictedDemand = Number(p.predictedDemand || 0);
        const rawRecommended = predictedDemand - currentStock;
        // Add a small safety buffer (at least +1, 5% extra) when recommending purchases
        let recommendedPurchase = 0;
        if (rawRecommended > 0) {
          const buffer = Math.max(1, Math.round(rawRecommended * 0.05));
          recommendedPurchase = Math.round(rawRecommended + buffer);
        }

        const confidence = typeof p.confidence === 'number' ? p.confidence : null;

        console.log(`📦 Result for ${p.medicineName}:`, {
          csvId: p.medicineId,
          mongoId: medicineId,
          foundInDb: !!actualMedicine,
          stockFromMap: stockByMedicine.get(medicineId),
          currentStock,
          predictedDemand,
          recommendedPurchase
        });

        return {
          medicineId,
          month,
          predictedDemand,
          currentStock,
          previousSales,
          recommendedPurchase,
          medicineName: p.medicineName || 'Unknown',
          manufacturerId,
          confidence,
        };
      });

      // Add month name for frontend display
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[month - 1] || '';
      const previousYear = new Date().getFullYear() - 1;

      return res.json({ 
        success: true, 
        data: result,
        metadata: {
          month,
          monthName,
          previousYear
        }
      });
    });
  } catch (err) {
    console.error('getMonthlyDemandPrediction error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate prediction' });
  }
};

export const exportPredictionsCsv = async (req, res) => {
  try {
    // Reuse JSON prediction logic to avoid duplicating business rules
    const { data } = await new Promise((resolve, reject) => {
      // Fake a minimal req/res pair by calling getMonthlyDemandPrediction
      const fakeReq = { ...req };
      const collector = {
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          if (this.statusCode && this.statusCode >= 400) {
            reject(new Error(payload?.message || 'Failed to generate predictions'));
          } else {
            resolve(payload || { data: [] });
          }
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      getMonthlyDemandPrediction(fakeReq, collector);
    });

    const predictions = Array.isArray(data) ? data : [];

    if (!predictions.length) {
      return res.status(200).attachment('purchase_predictions.csv').send('medicineName,currentStock,predictedDemand,recommendedPurchase,confidence\n');
    }

    const rows = predictions.map((p) => ({
      medicineName: p.medicineName || 'Unknown',
      currentStock: p.currentStock ?? 0,
      previousSales: p.previousSales ?? 0,
      predictedDemand: p.predictedDemand ?? 0,
      recommendedPurchase: p.recommendedPurchase ?? 0,
      confidence: typeof p.confidence === 'number' ? `${Math.round(p.confidence * 100)}%` : '',
    }));

    const header = 'medicineName,currentStock,previousSales,predictedDemand,recommendedPurchase,confidence';
    const lines = rows.map((r) =>
      [r.medicineName, r.currentStock, r.previousSales, r.predictedDemand, r.recommendedPurchase, r.confidence]
        .map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v))
        .join(',')
    );
    const csv = [header, ...lines].join('\n');

    res.header('Content-Type', 'text/csv');
    res.attachment('purchase_predictions.csv');
    return res.send(csv);
  } catch (err) {
    console.error('exportPredictionsCsv error:', err);
    return res.status(500).json({ success: false, message: 'Failed to export predictions CSV' });
  }
};

export const downloadTrainingDataset = async (req, res) => {
  try {
    const datasetPath = path.join(__dirname, '..', 'prediction', 'training_data.csv');

    if (!fs.existsSync(datasetPath)) {
      return res.status(404).json({
        success: false,
        message:
          'Training dataset not found on server. Please run extract_from_mongo.py to generate dataset.csv first.',
      });
    }

    res.header('Content-Type', 'text/csv');
    res.attachment('pharmacy_sales_dataset_last12months.csv');
    const stream = fs.createReadStream(datasetPath);
    stream.on('error', (err) => {
      console.error('downloadTrainingDataset stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to read training dataset file' });
      }
    });
    stream.pipe(res);
  } catch (err) {
    console.error('downloadTrainingDataset error:', err);
    return res.status(500).json({ success: false, message: 'Failed to download training dataset' });
  }
};

export const uploadTrainingDataset = async (req, res) => {
  try {
    const file = req.file;
    const predictionDir = path.join(__dirname, '..', 'prediction');
    const targetPath = path.join(predictionDir, 'training_data.csv');
    const converterScript = path.join(predictionDir, 'convert_inventory_data.py');

    if (!file || !file.path) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required. Please upload a dataset file.',
      });
    }

    // Ensure prediction directory exists
    if (!fs.existsSync(predictionDir)) {
      fs.mkdirSync(predictionDir, { recursive: true });
    }

    // Read and validate the CSV format BEFORE saving
    const uploadedContent = await fs.promises.readFile(file.path, 'utf-8');
    const firstLine = uploadedContent.split('\n')[0].trim();
    const headers = firstLine.split(',').map(h => h.trim());

    // Check if it's already in the correct format
    const requiredCols = ['medicineId', 'medicineName', 'month', 'quantity'];
    const hasCorrectFormat = requiredCols.every(col => headers.includes(col));

    // Check if it's in the aggregated format (needs conversion)
    const aggregatedCols = ['MedicineName', 'Category', 'AvgMonthlySales'];
    const isAggregatedFormat = aggregatedCols.every(col => headers.includes(col));

    // Check if it's in wide format (Product | Jan-Dec | Total Sales)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const hasWideFormat = monthNames.some(month => headers.includes(month));
    const firstColName = headers[0] || '';
    const isWideFormat = hasWideFormat && (
      firstColName.toLowerCase() === 'product' ||
      firstColName.toLowerCase() === 'medicine name' ||
      firstColName.toLowerCase() === 'medicinename' ||
      firstColName.toLowerCase() === 'medicine'
    );

    if (hasCorrectFormat) {
      // Good! Save directly
      await fs.promises.rename(file.path, targetPath).catch(async () => {
        const data = await fs.promises.readFile(file.path);
        await fs.promises.writeFile(targetPath, data);
        await fs.promises.unlink(file.path).catch(() => {});
      });
    } else if (isWideFormat) {
      // Auto-convert wide format (Product | Jan-Dec) to long format
      console.log('📊 Detected wide format (Product | Jan-Dec). Auto-converting...');
      
      // Save uploaded file for conversion
      const tempPath = path.join(predictionDir, 'temp_sales_data.csv');
      await fs.promises.rename(file.path, tempPath).catch(async () => {
        const data = await fs.promises.readFile(file.path);
        await fs.promises.writeFile(tempPath, data);
        await fs.promises.unlink(file.path).catch(() => {});
      });

      // Run convert_excel_data.py script
      const pythonCmd = getPythonCommand();
      const convertExcelScript = path.join(predictionDir, 'convert_excel_data.py');
      
      if (!fs.existsSync(convertExcelScript)) {
        await fs.promises.unlink(tempPath).catch(() => {});
        return res.status(500).json({
          success: false,
          message: 'Conversion script not found. Please contact administrator.',
        });
      }

      const convertCommand = `${pythonCmd} "${convertExcelScript}" "${tempPath}"`;
      
      try {
        await new Promise((resolve, reject) => {
          exec(convertCommand, { 
            cwd: predictionDir,
            shell: true,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
            timeout: 30000
          }, (error, stdout, stderr) => {
            if (error) {
              console.error('Wide format conversion error:', stderr);
              reject(new Error('Failed to convert wide format: ' + (stderr || error.message)));
            } else {
              console.log('Wide format conversion output:', stdout);
              resolve();
            }
          });
        });
        
        // Clean up temp file
        await fs.promises.unlink(tempPath).catch(() => {});
      } catch (conversionError) {
        await fs.promises.unlink(tempPath).catch(() => {});
        return res.status(400).json({
          success: false,
          message: 'CSV format conversion failed. Ensure your CSV has columns: Product (or MedicineName), Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec',
          details: conversionError.message
        });
      }
    } else if (isAggregatedFormat) {
      // Auto-convert aggregated format to historical format
      console.log('Detected aggregated format. Auto-converting...');
      
      // Save uploaded file to a temp location for conversion
      const tempPath = path.join(predictionDir, '..', '..', 'train_data set', 'medical_inventory.csv');
      const tempDir = path.dirname(tempPath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      await fs.promises.rename(file.path, tempPath).catch(async () => {
        const data = await fs.promises.readFile(file.path);
        await fs.promises.writeFile(tempPath, data);
        await fs.promises.unlink(file.path).catch(() => {});
      });

      // Run converter script if it exists
      if (fs.existsSync(converterScript)) {
        const pythonCmd = getPythonCommand();
        const convertCommand = `${pythonCmd} "${converterScript}"`;
        
        try {
          await new Promise((resolve, reject) => {
            exec(convertCommand, { 
              cwd: predictionDir,
              shell: true,
              env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
            }, (error, stdout, stderr) => {
              if (error) {
                console.error('Conversion error:', stderr);
                reject(new Error('Failed to convert aggregated data: ' + stderr));
              } else {
                console.log('Conversion output:', stdout);
                resolve();
              }
            });
          });
        } catch (conversionError) {
          return res.status(400).json({
            success: false,
            message: 'CSV format conversion failed. Please ensure you have historical month-by-month sales data.',
            details: conversionError.message
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Your CSV appears to be aggregated data (AvgMonthlySales). Please provide historical month-by-month sales data with columns: medicineId, medicineName, month, quantity',
        });
      }
    } else {
      // Wrong format - reject with helpful message
      await fs.promises.unlink(file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        message: `❌ Invalid CSV format detected.\n\n📋 Found columns: ${headers.join(', ')}\n\n✅ Supported formats:\n1. Wide format: Product | Jan | Feb | ... | Dec | Total Sales\n2. Long format: medicineId | medicineName | month | quantity\n\nPlease upload a file with one of these formats.`,
      });
    }

    const trainScriptPath = path.join(predictionDir, 'train.py');
    const trainMultiAgentPath = path.join(predictionDir, 'train_multiagent.py');

    // Prefer multi-agent training if available, fallback to traditional ML
    const useMultiAgent = fs.existsSync(trainMultiAgentPath);
    const trainScript = useMultiAgent ? trainMultiAgentPath : trainScriptPath;

    if (!fs.existsSync(trainScript)) {
      return res.status(500).json({
        success: false,
        message: 'Training script not found on server. Please contact your administrator.',
      });
    }

    const pythonCmd = getPythonCommand();
    const command = `${pythonCmd} "${trainScript}"`;

    exec(command, { 
      cwd: predictionDir,
      shell: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    }, (error, stdout, stderr) => {
      if (error) {
        console.error('Training script error:', error);
        console.error('stderr:', stderr);
        console.error('stdout:', stdout);
        
        // Parse the actual error from Python output
        let errorMessage = 'Dataset validation failed.';
        const output = String(stderr || stdout || '');
        
        // Check for specific errors
        if (output.includes('Missing required columns')) {
          const match = output.match(/Missing required columns: ({[^}]+})/);
          if (match) {
            errorMessage = `Invalid CSV format. ${match[0]}. Required: medicineId, medicineName, month, quantity`;
          } else {
            errorMessage = 'Invalid CSV format. Missing required columns: medicineId, medicineName, month, quantity';
          }
        } else if (output.includes('No such file or directory') || output.includes('Training data not found')) {
          errorMessage = 'Training data file not found after upload. Please try again.';
        } else if (output.includes('ModuleNotFoundError') || output.includes('No module named')) {
          const module = output.match(/No module named '([^']+)'/)?.[1] || 'required library';
          errorMessage = `Python library missing: ${module}. Run: pip install ${module}`;
        } else if (output.includes('pandas')) {
          errorMessage = 'Python pandas library issue. Run: pip install pandas';
        } else if (output) {
          // Show the actual Python error
          const lines = output.split('\n').filter(l => l.trim() && !l.includes('Traceback'));
          if (lines.length > 0) {
            errorMessage = lines[lines.length - 1].replace(/\[ERROR\]/g, '').trim();
          }
        }
        
        return res.status(500).json({
          success: false,
          message: errorMessage,
          details: output.substring(0, 500), // Limit details length
        });
      }

      console.log('Training script output:', stdout);
      const systemType = useMultiAgent ? 'Multi-Agent AI' : 'ML';
      return res.json({
        success: true,
        message:
          `Dataset uploaded and ${systemType} model prepared successfully. You can now generate intelligent seasonal predictions.`,
      });
    });
  } catch (err) {
    console.error('uploadTrainingDataset error:', err);
    return res.status(500).json({ success: false, message: 'Failed to upload training dataset' });
  }
};

export default {
  getMonthlyDemandPrediction,
  exportPredictionsCsv,
  downloadTrainingDataset,
  uploadTrainingDataset,
};
