import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import http from 'http';
import https from 'https';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Trust proxy - needed for Vercel
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(compression());

// Backend URL - Set via environment variable or default
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3004';
console.log(`[API Proxy] Configured to proxy to: ${BACKEND_URL}`);

// Proxy function to forward requests to backend
async function proxyRequest(req, res, path) {
  const url = `${BACKEND_URL}${path}`;
  const method = req.method;
  
  try {
    // Get the appropriate http/https module based on URL
    const protocol = url.startsWith('https') ? https : http;
    
    const options = {
      method,
      headers: {
        ...req.headers,
        'host': new URL(BACKEND_URL).hostname,
      },
    };
    
    // Remove hop-by-hop headers
    delete options.headers['connection'];
    delete options.headers['transfer-encoding'];
    delete options.headers['content-length'];
    
    const backendReq = protocol.request(url, options, (backendRes) => {
      // Forward response headers
      res.writeHead(backendRes.statusCode, backendRes.headers);
      backendRes.pipe(res);
    });
    
    backendReq.on('error', (error) => {
      console.error(`[Proxy Error] Failed to connect to backend: ${error.message}`);
      res.status(502).json({
        error: 'BAD_GATEWAY',
        message: 'Backend server unavailable',
        details: error.message,
        backend: BACKEND_URL
      });
    });
    
    // Forward request body if exists
    if (req.body && Object.keys(req.body).length > 0) {
      backendReq.write(JSON.stringify(req.body));
    }
    
    backendReq.end();
  } catch (error) {
    console.error(`[Proxy Error]`, error);
    res.status(502).json({
      error: 'BAD_GATEWAY',
      message: 'Proxy request failed',
      details: error.message
    });
  }
}

// Health check endpoint that tests backend connectivity
app.get('/api/health', async (req, res) => {
  try {
    const protocol = BACKEND_URL.startsWith('https') ? https : http;
    const url = new URL(`${BACKEND_URL}/api/health`);
    
    const request = protocol.get(url, (backendRes) => {
      let data = '';
      backendRes.on('data', chunk => data += chunk);
      backendRes.on('end', () => {
        try {
          const backendHealth = JSON.parse(data);
          res.status(200).json({
            ...backendHealth,
            proxy: 'vercel',
            backendStatus: 'connected',
            proxyVersion: '1.0.0'
          });
        } catch (e) {
          res.status(200).json({
            status: 'ok',
            message: 'Proxy is operational',
            backend: 'connected to ' + BACKEND_URL,
            timestamp: new Date().toISOString()
          });
        }
      });
    });
    
    request.on('error', (error) => {
      console.error('[Health Check] Backend unavailable:', error.message);
      res.status(503).json({
        status: 'error',
        message: 'Backend server unavailable',
        backend: BACKEND_URL,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });
    
    request.setTimeout(5000, () => {
      request.destroy();
      res.status(504).json({
        status: 'timeout',
        message: 'Backend health check timed out',
        backend: BACKEND_URL
      });
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Proxy all /api/* requests to the backend
app.all('/api/*', (req, res) => {
  const path = req.path; // e.g., /api/medicines, /api/auth/login
  proxyRequest(req, res, path);
});

// Root endpoint info
app.get('/', (req, res) => {
  res.json({
    message: 'Pharmacy Management System - Vercel API Proxy',
    version: '1.0.0',
    backend: BACKEND_URL,
    status: 'ready',
    documentation: 'All /api/* requests are proxied to the backend server'
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Endpoint ${req.path}not found`,
    method: req.method,
    hint: 'API routes should be under /api/*',
    backend: BACKEND_URL
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;
