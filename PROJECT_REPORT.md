# Medical Shop Management System — DevOps Project Report

**Project:** Medical Shop Management System  
**Stack:** Node.js · Express · MongoDB · React · Docker · Kubernetes · AWS EKS · Terraform · Jenkins · Prometheus · Grafana  

---

## 1. Project Overview

A full-stack pharmacy management system with a complete DevOps pipeline. The application manages medicines, sales, purchases, stock, customers, and generates operational reports. It is containerized with Docker, deployed on AWS EKS via Terraform, and monitored with Prometheus and Grafana.

---

## 2. Application Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  React SPA  │────▶│  Express Backend │────▶│  MongoDB    │
│  (Nginx)    │     │  Node.js v20     │     │  (K8s Pod)  │
└─────────────┘     └──────────────────┘     └─────────────┘
       │                     │
       └──── AWS EKS ────────┘
              (Kubernetes)
```

---

## 3. Backend — Entry Point & Server Setup

**File:** `backend/server.js`

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import helmet from 'helmet';
import connectDB from './config/database.js';
import authenticate from './middleware/authMiddleware.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Gzip compression — reduces response size by ~70%
app.use(compression());

// Rate limiting — prevent abuse under load
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,                  // 500 requests per IP per window
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,                   // Strict limit on login/signup
});

app.use(globalLimiter);
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '2mb' }));

// Connect to MongoDB
await connectDB();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected API routes
app.use('/api/auth',      authLimiter, authRoutes);
app.use('/api/sales',     authenticate, saleRoutes);
app.use('/api/purchases', authenticate, purchaseRoutes);
app.use('/api/reports',   authenticate, reportsRoutes);
app.use('/api/medicines', medicineRoutes);

// Global error handler
app.use((err, req, res, next) => {
  res.status(500).json({ success: false, message: err.message });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  startStockScheduler();
  startReminderScheduler();
});
```

---

## 4. Database Configuration

**File:** `backend/config/database.js`

```javascript
import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medical-shop-management';

  await mongoose.connect(uri, {
    maxPoolSize: 100,       // Handle 1000 concurrent users
    minPoolSize: 10,        // Keep warm connections ready
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);
};

export default connectDB;
```

---

## 5. JWT Authentication Middleware

**File:** `backend/middleware/authMiddleware.js`

```javascript
import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({ message: 'Authorization token is required' });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  return next();
};
```

---

## 6. Core Data Models

### Sale Model — `backend/models/Sale.js`

```javascript
import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  customerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName:  String,
  items: [{
    medicineId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    medicineName: String,
    batchId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    quantity:    { type: Number, required: true },
    unitPrice:   { type: Number, required: true },
    lineTotal:   { type: Number, required: true },
  }],
  subtotal:       { type: Number, required: true },
  taxAmount:      { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  total:          { type: Number, required: true },
  paymentMethod:  { type: String, enum: ['cash', 'upi', 'card'], required: true },
  paymentStatus:  { type: String, enum: ['paid', 'partial', 'pending'], default: 'paid' },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

saleSchema.index({ createdAt: -1 });
saleSchema.index({ customerId: 1 });
saleSchema.index({ createdAt: -1, paymentMethod: 1 });

export default mongoose.model('Sale', saleSchema);
```

### Daily Sales Summary Model — `backend/models/DailySalesSummary.js`

```javascript
const dailySalesSummarySchema = new mongoose.Schema({
  date:               { type: String, required: true, unique: true }, // "2026-01-30"
  totalSales:         { type: Number, default: 0 },
  totalRevenue:       { type: Number, default: 0 },
  profit:             { type: Number, default: 0 },
  billCount:          { type: Number, default: 0 },
  itemsSold:          { type: Number, default: 0 },
  averageTicketSize:  { type: Number, default: 0 },
}, { timestamps: true });
```

### Stock Ledger Model — `backend/models/StockLedger.js`

```javascript
const stockLedgerSchema = new mongoose.Schema({
  medicineId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  batchId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  type: {
    type: String,
    enum: ['PURCHASE', 'SALE', 'EXPIRED_WRITE_OFF', 'ADJUSTMENT_ADD', 'ADJUSTMENT_REMOVE'],
    required: true,
  },
  quantity:      { type: Number, required: true }, // Positive = inflow, Negative = outflow
  purchasePrice: Number,
  sellingPrice:  Number,
  totalValue:    { type: Number, default: 0 },
  totalLoss:     { type: Number, default: 0 },
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Centralized ledger writer
stockLedgerSchema.statics.recordMovement = async function (data) {
  if (data.type === 'SALE' && data.quantity >= 0)
    throw new Error('SALE quantity must be negative');
  if (data.type === 'PURCHASE' && data.quantity <= 0)
    throw new Error('PURCHASE quantity must be positive');
  return this.create(data);
};
```

---

## 7. DevOps Report Controller

**File:** `backend/controllers/devopsReportController.js`

```javascript
// Helper: build date range from query params (?range=7d|30d|90d)
const getDateRange = (query) => {
  const { range = '7d', startDate, endDate } = query;
  if (startDate && endDate) return { from: new Date(startDate), to: new Date(endDate) };
  const days = range === '30d' ? 30 : range === '90d' ? 90 : 7;
  const from = new Date(); from.setDate(from.getDate() - days);
  return { from, to: new Date() };
};

// GET /api/devops-report/summary
export const getOperationalSummary = async (req, res) => {
  const { from, to } = getDateRange(req.query);

  const [salesData, purchaseData, writeOffData] = await Promise.all([
    Sale.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: null, totalSales: { $sum: 1 }, totalRevenue: { $sum: '$total' } } },
    ]),
    Purchase.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
    ]),
    WriteOffLog.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: '$reason', count: { $sum: 1 }, totalLoss: { $sum: '$financialLoss' } } },
    ]),
  ]);

  res.json({ period: { from, to }, sales: salesData[0], purchases: purchaseData, writeOffs: writeOffData });
};

// GET /api/devops-report/sales-trend  — daily revenue grouped by date
export const getSalesTrendReport = async (req, res) => {
  const { from, to } = getDateRange(req.query);
  const trend = await Sale.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        salesCount: { $sum: 1 },
        revenue:    { $sum: '$total' },
        avgTicket:  { $avg: '$total' },
    }},
    { $sort: { _id: 1 } },
  ]);
  res.json({ period: { from, to }, trend });
};

// GET /api/devops-report/inventory-health  — low stock medicines
export const getInventoryHealthReport = async (req, res) => {
  const lowStockItems = await StockLedger.aggregate([
    { $group: { _id: '$medicineId', currentStock: { $sum: '$quantity' } } },
    { $lookup: { from: 'medicines', localField: '_id', foreignField: '_id', as: 'medicine' } },
    { $unwind: '$medicine' },
    { $match: { $expr: { $lt: ['$currentStock', '$medicine.minStockLevel'] } } },
    { $project: { medicineName: '$medicine.name', currentStock: 1,
                  minStockLevel: '$medicine.minStockLevel',
                  deficit: { $subtract: ['$medicine.minStockLevel', '$currentStock'] } } },
    { $sort: { deficit: -1 } },
    { $limit: 20 },
  ]);
  res.json({ lowStockCount: lowStockItems.length, lowStockItems });
};

// GET /api/devops-report/payment-breakdown  — cash / upi / card split
export const getPaymentBreakdown = async (req, res) => {
  const { from, to } = getDateRange(req.query);
  const breakdown = await Sale.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$total' } } },
    { $sort: { total: -1 } },
  ]);
  res.json({ period: { from, to }, breakdown });
};

// GET /api/devops-report/top-medicines  — top selling by quantity
export const getTopMedicinesReport = async (req, res) => {
  const { from, to } = getDateRange(req.query);
  const topMedicines = await StockLedger.aggregate([
    { $match: { type: 'SALE', createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$medicineId', medicineName: { $first: '$medicineName' },
                totalQtySold: { $sum: { $abs: '$quantity' } },
                totalRevenue: { $sum: '$totalValue' } } },
    { $sort: { totalQtySold: -1 } },
    { $limit: parseInt(req.query.limit) || 10 },
  ]);
  res.json({ period: { from, to }, topMedicines });
};
```

---

## 8. API Routes

**File:** `backend/routes/reportsRoutes.js`

```javascript
import express from 'express';
const router = express.Router();

router.get('/analytics',          getReportsAnalytics);
router.get('/sales-trend',        getSalesTrend);
router.get('/expiry-loss',        getExpiryLossDetails);
router.get('/dead-stock',         getDeadStockReport);
router.post('/expiry-loss/reset', resetExpiryLoss);

export default router;
```

**DevOps Report Routes** — `backend/routes/devopsReportRoutes.js`

```javascript
router.get('/summary',            getOperationalSummary);
router.get('/sales-trend',        getSalesTrendReport);
router.get('/stock-movements',    getStockMovementReport);
router.get('/inventory-health',   getInventoryHealthReport);
router.get('/payment-breakdown',  getPaymentBreakdown);
router.get('/top-medicines',      getTopMedicinesReport);
```

---

## 9. Containerization — Dockerfiles

**Backend** — `backend/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

**DevOps App** — `devops-project/app/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 10. Kubernetes Manifests

### Backend Deployment — `devops-project/k8s/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: devops-demo
spec:
  replicas: 3
  selector:
    matchLabels:
      app: devops-demo
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: app
        image: 181527945211.dkr.ecr.us-east-1.amazonaws.com/devops-demo:latest
        env:
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: MONGO_URI
        ports:
        - containerPort: 3000
        resources:
          requests: { cpu: "200m", memory: "256Mi" }
          limits:   { cpu: "500m", memory: "512Mi" }
        livenessProbe:
          httpGet: { path: /api/health, port: 3000 }
          initialDelaySeconds: 15
          periodSeconds: 20
        readinessProbe:
          httpGet: { path: /api/health, port: 3000 }
          initialDelaySeconds: 5
          periodSeconds: 10
```

### Service & Ingress

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: devops-demo-svc
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: devops-demo

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: devops-demo-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: devops-demo.local
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: devops-demo-svc
            port: { number: 80 }
```

### MongoDB in Kubernetes

```yaml
# mongodb-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: mongodb
        image: mongo:latest
        ports:
        - containerPort: 27017
        resources:
          requests: { cpu: "100m", memory: "256Mi" }
          limits:   { cpu: "250m", memory: "512Mi" }

---
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-secret
type: Opaque
stringData:
  MONGO_URI: "mongodb://mongodb-service:27017/medical-shop"
```

---

## 11. Infrastructure as Code — Terraform

### VPC — `devops-project/infra/main.tf`

```hcl
provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "devops-demo-vpc"
  cidr = "10.0.0.0/16"
  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  public_subnet_tags  = { "kubernetes.io/role/elb" = 1 }
  private_subnet_tags = { "kubernetes.io/role/internal-elb" = 1 }

  tags = { Environment = "dev", Project = "DevOps-Demo" }
}
```

### EKS Cluster — `devops-project/infra/k8s.tf`

```hcl
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "devops-cluster-v3"
  cluster_version = "1.30"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access           = true
  enable_cluster_creator_admin_permissions = true

  eks_managed_node_groups = {
    app_nodes = {
      min_size       = 1
      max_size       = 3
      desired_size   = 2
      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
    }
  }
}
```

### Outputs — `devops-project/infra/outputs.tf`

```hcl
output "cluster_endpoint"  { value = module.eks.cluster_endpoint }
output "cluster_name"      { value = module.eks.cluster_name }
output "configure_kubectl" {
  value = "aws eks --region ${var.aws_region} update-kubeconfig --name ${module.eks.cluster_name}"
}
```

---

## 12. CI/CD Pipeline — Jenkins

**File:** `devops-project/jenkins/Jenkinsfile`

```groovy
pipeline {
    agent any

    environment {
        BACKEND_REGISTRY  = "181527945211.dkr.ecr.us-east-1.amazonaws.com/devops-demo"
        FRONTEND_REGISTRY = "181527945211.dkr.ecr.us-east-1.amazonaws.com/devops-frontend"
        IMAGE_TAG         = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Build Docker Images') {
            parallel {
                stage('Build Backend') {
                    steps {
                        sh "docker build -t ${BACKEND_REGISTRY}:${IMAGE_TAG} ../backend"
                    }
                }
                stage('Build Frontend') {
                    steps {
                        sh "docker build -t ${FRONTEND_REGISTRY}:${IMAGE_TAG} ../"
                    }
                }
            }
        }

        stage('Push to ECR') {
            steps {
                sh "aws ecr get-login-password | docker login --username AWS --password-stdin 181527945211.dkr.ecr.us-east-1.amazonaws.com"
                sh "docker push ${BACKEND_REGISTRY}:${IMAGE_TAG}"
                sh "docker push ${FRONTEND_REGISTRY}:${IMAGE_TAG}"
            }
        }

        stage('Terraform Provision') {
            steps {
                dir('infra') {
                    sh 'terraform init'
                    sh "terraform apply -auto-approve -var image_tag=${IMAGE_TAG}"
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                dir('k8s') {
                    sh "sed -i 's/\${IMAGE_TAG}/${IMAGE_TAG}/g' deployment.yaml"
                    sh "kubectl apply -f deployment.yaml"
                    sh "kubectl apply -f service.yaml"
                }
            }
            post {
                success { sh "kubectl rollout status deployment/devops-demo" }
            }
        }
    }

    post {
        always  { cleanWs() }
        success { echo "Pipeline completed successfully!" }
        failure { echo "Pipeline failed! Check the logs." }
    }
}
```

---

## 13. Monitoring — Prometheus & Grafana

### Prometheus Custom Metrics — `devops-project/app/metrics.js`

```javascript
const client = require('prom-client');

// Collect default metrics: CPU, memory, event loop lag
client.collectDefaultMetrics();

// Custom metric: HTTP request duration histogram
const httpRequestDurationMicroseconds = new client.Histogram({
  name:       'http_request_duration_ms',
  help:       'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets:    [0.1, 5, 15, 50, 100, 300, 500, 1000],
});

module.exports = { client, httpRequestDurationMicroseconds };
```

### Metrics Endpoint — `devops-project/app/index.js`

```javascript
// Middleware: measure every request duration
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, code: res.statusCode });
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Prometheus scrape endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

### Prometheus Config — `devops-project/monitoring/prometheus-values.yaml`

```yaml
prometheus:
  prometheusSpec:
    retention: 10d
    resources:
      requests: { memory: 400Mi }
      limits:   { memory: 1Gi }
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 10Gi
```

---

## 14. DevOps Pipeline Flow

```
Developer Push
      │
      ▼
  Jenkins CI
  ┌─────────────────────────────────────────┐
  │ 1. Checkout code from Git               │
  │ 2. Build Backend + Frontend Docker imgs │
  │ 3. Push images to AWS ECR               │
  │ 4. Terraform apply (VPC + EKS)          │
  │ 5. kubectl apply (deploy to K8s)        │
  │ 6. Rollout status check                 │
  └─────────────────────────────────────────┘
      │
      ▼
  AWS EKS Cluster
  ┌─────────────────────────────────────────┐
  │  Backend Pods (3 replicas)              │
  │  Frontend Pods (2 replicas, Nginx)      │
  │  MongoDB Pod (1 replica)                │
  │  LoadBalancer Service (port 80)         │
  │  Ingress (Nginx controller)             │
  └─────────────────────────────────────────┘
      │
      ▼
  Prometheus scrapes /metrics every 15s
      │
      ▼
  Grafana dashboards (HTTP latency, CPU, memory)
```

---

## 15. Key API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | User login (JWT) |
| GET | `/api/sales` | List all sales |
| POST | `/api/sales` | Create new sale |
| GET | `/api/purchases` | List purchases |
| GET | `/api/reports/analytics` | Sales analytics |
| GET | `/api/reports/dead-stock` | Dead stock report |
| GET | `/api/devops-report/summary` | Operational summary |
| GET | `/api/devops-report/sales-trend` | Daily sales trend |
| GET | `/api/devops-report/inventory-health` | Low stock items |
| GET | `/api/devops-report/payment-breakdown` | Payment method split |
| GET | `/api/devops-report/top-medicines` | Top selling medicines |
| GET | `/metrics` | Prometheus metrics |

---

## 16. Infrastructure Destroyed / Cost Management

```powershell
# Destroy all AWS resources to stop billing
cd devops-project/infra
terraform destroy -auto-approve

# Resources destroyed: 52 total
# EC2 Worker Nodes, EKS Control Plane, NAT Gateway,
# VPC & Subnets, Load Balancers, Internet Gateway
# AWS daily cost after destroy: $0.00

# Rebuild when needed (~15-20 mins)
terraform apply -auto-approve
```

---

*All source code is saved in `d:\medical-shop-management`. Rebuild on April 28 with `terraform apply`.*
