import PrescriptionRequest from '../models/PrescriptionRequest.js';
import path from 'path';
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';

/* ── OCR helper: extract text then delete image ────────── */
async function extractTextAndDeleteImage(filename) {
  const imgPath = path.join(process.cwd(), 'uploads', filename);
  const processedImgPath = path.join(process.cwd(), 'uploads', `processed_${filename}`);
  
  try {
    // Preprocess image for better OCR accuracy on handwritten text
    // - Grayscale: Simplifies processing
    // - Higher contrast: Makes text darker and background lighter
    // - Sharpen: Enhances text edges for better recognition
    await sharp(imgPath)
      .greyscale()
      .normalize()           // Enhance contrast
      .sharpen({ sigma: 2 }) // Enhance text edges
      .toFile(processedImgPath);

    console.log('[OCR] Image preprocessed successfully');

    // Initialize worker with the local language file to avoid remote downloads.
    const worker = await createWorker('eng', 1, {
      langPath: process.cwd(),
    });

    // Handwritten prescriptions usually work better with a single-block layout.
    await worker.setParameters({
      tessedit_pageseg_mode: 6,
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    });

    const { data: { text, confidence } } = await worker.recognize(processedImgPath);

    await worker.terminate();

    console.log(`[OCR] Text extracted - Confidence: ${confidence}%`);
    console.log(`[OCR] Extracted text (first 100 chars): ${text.substring(0, 100)}`);

    // Clean up processed image
    if (fs.existsSync(processedImgPath)) fs.unlinkSync(processedImgPath);
    
    // Clean up original image
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

    // Return extracted text with preprocessing applied
    return { 
      text: text.trim(), 
      status: 'done',
      confidence 
    };
  } catch (ocrErr) {
    console.error('[OCR] Failed:', ocrErr.message);
    console.error('[OCR] Stack:', ocrErr.stack);
    
    // Clean up both images if they exist
    if (fs.existsSync(processedImgPath)) fs.unlinkSync(processedImgPath);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

    return { 
      text: '', 
      status: 'failed',
      error: ocrErr.message 
    };
  }
}

/* ── GET /api/prescriptions — Admin: list all ──────────── */
export const listPrescriptions = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { patientName: { $regex: search, $options: 'i' } },
        { patientPhone: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await PrescriptionRequest.countDocuments(query);
    const pending = await PrescriptionRequest.countDocuments({ status: 'pending' });
    const requests = await PrescriptionRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, requests, total, pending });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── GET /api/prescriptions/pending-count — Badge count ── */
export const getPendingCount = async (req, res) => {
  try {
    const count = await PrescriptionRequest.countDocuments({ status: { $in: ['pending', 'under_review'] } });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── POST /api/prescriptions — Public: patient submits ─── */
export const createPrescription = async (req, res) => {
  try {
    const { patientName, patientPhone, patientEmail, medicines, doctorName, doctorPhone } = req.body;

    if (!patientName || !patientPhone) {
      return res.status(400).json({ success: false, message: 'Patient name and phone are required' });
    }

    const uploadedFilename = req.file ? req.file.filename : null;

    if (!uploadedFilename) {
      return res.status(400).json({ success: false, message: 'Prescription image is required' });
    }

    let parsedMedicines = medicines;
    if (typeof medicines === 'string') {
      try { parsedMedicines = JSON.parse(medicines); } catch { parsedMedicines = []; }
    }

    if (!parsedMedicines || !Array.isArray(parsedMedicines)) {
      parsedMedicines = [];
    }

    // Run OCR and delete image immediately — no image stored in DB
    const { text: extractedText, status: ocrStatus, confidence, error } = await extractTextAndDeleteImage(uploadedFilename);

    // Log OCR results for debugging
    if (ocrStatus === 'failed') {
      console.warn(`⚠️  OCR extraction failed for prescription: ${error}`);
    } else {
      console.log(`✅ OCR extraction successful: ${extractedText.length} characters extracted`);
    }

    const request = new PrescriptionRequest({
      patientName,
      patientPhone,
      patientEmail: patientEmail || '',
      medicines: parsedMedicines,
      prescriptionImage: null,       // image is not kept
      extractedText,
      ocrStatus,
      doctorName: doctorName || '',
      doctorPhone: doctorPhone || '',
    });

    await request.save();
    
    // Include extraction quality info in response
    res.status(201).json({ 
      success: true, 
      request, 
      message: 'Prescription request submitted. Admin will review shortly.',
      ocrDetails: {
        status: ocrStatus,
        textLength: extractedText.length,
        confidence: confidence || 'N/A',
        qualityNote: extractedText.length === 0 ? '⚠️ No text extracted - please review manually' : '✅ Text extracted successfully'
      }
    });
  } catch (err) {
    console.error('❌ Prescription submission error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── PATCH /api/prescriptions/:id/status — Admin review ── */
export const updateStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'collected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const request = await PrescriptionRequest.findByIdAndUpdate(
      req.params.id,
      {
        status,
        adminNotes: adminNotes || '',
        reviewedBy: req.user?.email || 'admin',
        reviewedAt: new Date(),
        notificationSent: ['approved', 'rejected'].includes(status),
      },
      { new: true }
    );

    if (!request) return res.status(404).json({ success: false, message: 'Prescription request not found' });
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── GET /api/prescriptions/my/:phone — Patient: their requests ── */
export const getMyPrescriptions = async (req, res) => {
  try {
    const searchParam = req.params.phone;
    // Search by either phone or email
    const requests = await PrescriptionRequest.find({
      $or: [
        { patientPhone: searchParam },
        { patientEmail: searchParam }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ── DELETE /api/prescriptions/:id — Admin: delete ──────── */
export const deletePrescription = async (req, res) => {
  try {
    const pr = await PrescriptionRequest.findById(req.params.id);
    if (!pr) return res.status(404).json({ success: false, message: 'Not found' });

    // Clean up image file if it somehow still exists
    if (pr.prescriptionImage) {
      const imgPath = path.join(process.cwd(), 'uploads', pr.prescriptionImage);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await pr.deleteOne();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
