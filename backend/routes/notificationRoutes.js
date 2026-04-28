import express from 'express';
import authenticate from '../middleware/authMiddleware.js';
import { 
  sendStockWhatsApp, 
  getStockSnapshot, 
  getWhatsAppStatus, 
  getQRCodeImage,
  getWhatsAppQRCodeState,
  initializeWhatsAppClient,
  resetWhatsAppClient 
} from '../services/whatsappNotification.js';

const router = express.Router();
const setupPort = process.env.PORT || 5000;

// GET /api/notifications/status — get WhatsApp connection status (public)
router.get('/status', async (req, res) => {
  try {
    const status = getWhatsAppStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/notifications/qr/current — fetch current QR state without reinitializing
router.get('/qr/current', async (req, res) => {
  try {
    const state = getWhatsAppQRCodeState();
    res.json({ success: true, data: state });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/notifications/qr — show QR scanner page (initialization is single-shot)
router.get('/qr', async (req, res) => {
  try {
    const forceInit = req.query.force === '1' || req.query.force === 'true';
    const resetSession = req.query.reset === '1' || req.query.reset === 'true';

    // ONLY reinitialize if explicitly forced or reset is requested
    // Otherwise, let the existing initialization continue
    try {
      const status = getWhatsAppStatus();
      
      if (resetSession) {
        console.log('🔄 Reset requested by user');
        await resetWhatsAppClient();
        await initializeWhatsAppClient({ force: true, resetSession: false });
      } else if (forceInit) {
        console.log('🔄 Force init requested by user');
        await initializeWhatsAppClient({ force: true, resetSession: false });
      } else if (!status.initialized) {
        // Only initialize if client doesn't exist yet
        console.log('🚀 Starting WhatsApp client initialization');
        await initializeWhatsAppClient({ force: false, resetSession: false });
      } else {
        console.log('✓ WhatsApp client already initialized, skipping reinit');
      }
    } catch (initErr) {
      // If initialization fails, return error page
      console.error('WhatsApp init error:', initErr.message);
      return res.status(202).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>WhatsApp Setup - Error</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
            }
            .container {
              background: white;
              border-radius: 10px;
              padding: 40px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
              text-align: center;
              max-width: 500px;
            }
            h1 {
              color: #d32f2f;
              margin: 0 0 10px 0;
            }
            .error-message {
              background: #ffebee;
              color: #c62828;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: left;
            }
            .instructions {
              background: #f9f9f9;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: left;
            }
            .retry-button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 10px 20px;
              border-radius: 5px;
              text-decoration: none;
              margin-top: 20px;
              cursor: pointer;
              border: none;
              font-size: 16px;
            }
            .retry-button:hover {
              background: #764ba2;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚠️ WhatsApp Setup - Error</h1>
            
            <div class="error-message">
              <strong>Error:</strong> ${initErr.message}
            </div>
            
            <div class="instructions">
              <h3>Try these solutions:</h3>
              <ol>
                <li><strong>Restart the backend server:</strong>
                  <pre>RESTART_BACKEND.bat</pre>
                </li>
                <li><strong>Check if port ${setupPort} is available:</strong>
                  <pre>netstat -ano | findstr :${setupPort}</pre>
                </li>
                <li><strong>Install Chromium:</strong>
                  <pre>npm install --no-save puppeteer</pre>
                </li>
                <li><strong>Check Node.js version:</strong>
                  <pre>node --version</pre> (Should be 16+)
                </li>
              </ol>
            </div>
            
            <button class="retry-button" onclick="location.reload()">
              🔄 Try Again
            </button>
            
            <p style="font-size: 12px; color: #999; margin-top: 30px;">
              Auto-retrying in 5 seconds...
            </p>
          </div>
          
          <script>
            setTimeout(() => window.location.reload(), 5000);
          </script>
        </body>
        </html>
      `);
    }

    const qrImage = getQRCodeImage();
    
    if (!qrImage) {
      return res.status(202).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>WhatsApp QR Code Scanner</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
            }
            .container {
              background: white;
              border-radius: 10px;
              padding: 40px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
              text-align: center;
              max-width: 400px;
            }
            h1 {
              color: #333;
              margin: 0 0 10px 0;
            }
            .status {
              color: #666;
              font-size: 16px;
              margin: 20px 0;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #667eea;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .hint {
              font-size: 12px;
              color: #999;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📱 WhatsApp Scanner</h1>
            <div class="status">
              <div class="spinner"></div>
              <div><strong>Generating QR Code...</strong></div>
              <div class="hint">Please wait, this may take 30-60 seconds on first run</div>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                <div class="hint">👉 Keep this page open and scan when ready</div>
              </div>
              <div id="refreshHint" class="hint" style="margin-top: 10px;"></div>
            </div>
          </div>
          <script>
            const refreshHint = document.getElementById('refreshHint');

            async function pollQr() {
              try {
                const response = await fetch('/api/notifications/qr/current');
                const payload = await response.json();

                if (payload.data && payload.data.connected) {
                  document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;"><div style="background:white;padding:40px;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,0.3);"><h1 style="color:#4caf50;font-size:48px;margin:0;">✅</h1><h2 style="color:#333;margin:10px 0;">Connected!</h2><p style="color:#666;">WhatsApp is now authenticated. You can close this window.</p></div></div>';
                  return;
                }

                if (payload.data && payload.data.qrImage) {
                  // QR image is now available, reload page to display it
                  document.location.reload();
                  return;
                }

                if (refreshHint) {
                  refreshHint.textContent = 'Waiting for the QR image to be generated... (' + (Math.floor(Date.now() / 1000) % 60) + 's)';
                }
              } catch (error) {
                console.error('Poll error:', error);
                if (refreshHint) {
                  refreshHint.textContent = 'Still waiting. The client may still be starting up.';
                }
              }
            }

            pollQr();
            setInterval(pollQr, 3000);
          </script>
        </body>
        </html>
      `);
    }

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp QR Code Scanner</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
          }
          .container {
            background: white;
            border-radius: 10px;
            padding: 40px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            text-align: center;
            max-width: 500px;
          }
          h1 {
            color: #333;
            margin: 0 0 10px 0;
          }
          .subtitle {
            color: #666;
            font-size: 16px;
            margin-bottom: 30px;
          }
          .qr-container {
            margin: 30px 0;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
            border: 2px solid #667eea;
          }
          .qr-container img {
            max-width: 100%;
            height: auto;
            border: 2px solid #667eea;
            border-radius: 8px;
            background: white;
            padding: 10px;
          }
          .instructions {
            color: #666;
            font-size: 14px;
            margin: 20px 0;
            background: #f0f4ff;
            padding: 15px;
            border-radius: 8px;
          }
          .instructions ol {
            text-align: left;
            margin: 10px 0;
          }
          .instructions li {
            margin: 8px 0;
          }
          .status {
            margin-top: 20px;
            padding: 10px;
            border-radius: 5px;
            font-size: 14px;
          }
          .status.success {
            background: #d4edda;
            color: #155724;
          }
          .status.waiting {
            background: #fff3cd;
            color: #856404;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📱 WhatsApp QR Code Scanner</h1>
          <p class="subtitle">Scan this QR code with your phone to authenticate</p>
          
          <div class="qr-container">
            <img src="${qrImage}" alt="WhatsApp QR Code">
          </div>
          
          <div class="instructions">
            <strong>How to scan:</strong>
            <ol>
              <li>Open <strong>WhatsApp</strong> on your phone</li>
              <li>Tap <strong>Settings</strong> → <strong>Linked Devices</strong> → <strong>Link a Device</strong></li>
              <li>Point your phone camera at the QR code above</li>
              <li>Wait for confirmation ✅</li>
            </ol>
          </div>
          
          <div class="status waiting">
            ⏳ <strong>Waiting for scan...</strong><br>
            <small>The QR code will expire in 2-3 minutes. Refresh this page for a new QR code.</small>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
            <p>🔄 Auto-checking connection status every 10 seconds...</p>
          </div>
        </div>
        
        <script>
          async function checkStatus() {
            try {
              const response = await fetch('/api/notifications/status');
              const data = await response.json();
              if (data.data && data.data.connected) {
                document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;"><div style="background:white;padding:40px;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,0.3);"><h1 style="color:#4caf50;font-size:48px;margin:0;">✅</h1><h2 style="color:#333;margin:10px 0;">Connected!</h2><p style="color:#666;">WhatsApp is now authenticated. You can close this window.</p></div></div>';
              }
            } catch (e) {
              console.log('Status check error:', e);
            }
          }
          
          // Check status every 10 seconds
          setInterval(checkStatus, 10000);
          checkStatus(); // Check immediately
          
          // Also refresh page every 3 minutes to get fresh QR code if not connected
          setTimeout(() => window.location.reload(), 180000);
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('QR endpoint error:', err);
    res.status(500).send(`
      <html>
      <head>
        <style>
          body { font-family: Arial; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; }
          h1 { color: #d32f2f; }
          code { background: #f5f5f5; padding: 10px; display: block; margin: 10px 0; border-left: 3px solid #d32f2f; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ Error</h1>
          <p><strong>Error Message:</strong></p>
          <code>${err.message}</code>
          <p><strong>Troubleshooting:</strong></p>
          <ol>
            <li>Restart the backend server: RESTART_BACKEND.bat</li>
            <li>Check the terminal for detailed error messages</li>
            <li>Make sure MongoDB is running</li>
            <li>Try again in a few seconds</li>
          </ol>
          <button onclick="location.reload()" style="background:#667eea;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;font-size:16px;">
            🔄 Try Again
          </button>
        </div>
      </body>
      </html>
    `);
  }
});

// GET /api/notifications/stock-preview — preview what will be sent (requires auth)
router.get('/stock-preview', authenticate, async (req, res) => {
  try {
    const snapshot = await getStockSnapshot();
    if (!snapshot) return res.json({ success: true, data: null, message: 'No medicines found' });
    res.json({ success: true, data: snapshot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/notifications/send-whatsapp — manually trigger WhatsApp (requires auth)
router.post('/send-whatsapp', authenticate, async (req, res) => {
  try {
    const result = await sendStockWhatsApp();
    res.json({ success: true, message: 'WhatsApp message sent successfully', data: result });
  } catch (err) {
    console.error('WhatsApp send error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
