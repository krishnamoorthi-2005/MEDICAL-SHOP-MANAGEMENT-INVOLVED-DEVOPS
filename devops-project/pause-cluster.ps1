# ============================================================
# PAUSE SCRIPT - Run this to STOP AWS services and save credits
# Saves: ~$3.2/day (EC2 nodes + Load Balancers)
# Still costs: ~$3.5/day (EKS control plane + NAT Gateway)
# ============================================================

Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "  PAUSING Medical Shop AWS Services" -ForegroundColor Yellow
Write-Host "  This will save ~3.2 USD/day in credits" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host ""

# Step 1: Delete Load Balancers (change services to ClusterIP to remove ELBs)
Write-Host "[1/3] Removing Load Balancers..." -ForegroundColor Cyan
kubectl delete svc devops-frontend-svc devops-demo-svc --ignore-not-found=true
Write-Host "      Load Balancers deleted." -ForegroundColor Green

# Step 2: Scale down all deployments to 0 replicas (stops pods but keeps config)
Write-Host "[2/3] Scaling down all deployments to 0..." -ForegroundColor Cyan
kubectl scale deployment devops-frontend --replicas=0
kubectl scale deployment devops-demo --replicas=0
kubectl scale deployment mongodb --replicas=0
Write-Host "      All deployments scaled to 0." -ForegroundColor Green

# Step 3: Scale EKS node group to 0 (stops EC2 instances = biggest saving)
Write-Host "[3/3] Stopping EC2 worker nodes (node group scale to 0)..." -ForegroundColor Cyan
aws eks update-nodegroup-config `
    --cluster-name devops-cluster-v3 `
    --nodegroup-name "app_nodes" `
    --scaling-config minSize=0,maxSize=3,desiredSize=0

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  PAUSED! Services are stopped." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Remaining costs (cannot avoid):" -ForegroundColor Yellow
Write-Host "    - EKS Control Plane: ~2.40 USD/day" -ForegroundColor Yellow
Write-Host "    - NAT Gateway:       ~1.08 USD/day" -ForegroundColor Yellow
Write-Host "    Total remaining:     ~3.48 USD/day" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Run 'resume-cluster.ps1' to restart everything." -ForegroundColor Cyan
