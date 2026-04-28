# ============================================================
# RESUME SCRIPT - Run this to START AWS services again
# Wait ~5 minutes after running for everything to be ready
# ============================================================

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  RESUMING Medical Shop AWS Services" -ForegroundColor Cyan
Write-Host "  Wait ~5 minutes for full startup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Scale EKS node group back to 2 nodes
Write-Host "[1/4] Starting EC2 worker nodes (this takes ~3 minutes)..." -ForegroundColor Cyan
aws eks update-nodegroup-config `
    --cluster-name devops-cluster-v3 `
    --nodegroup-name "app_nodes" `
    --scaling-config minSize=2,maxSize=3,desiredSize=2

Write-Host "      Node group scaling up... waiting 3 minutes for nodes to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 180

# Step 2: Scale deployments back up
Write-Host "[2/4] Starting all deployments..." -ForegroundColor Cyan
kubectl scale deployment devops-frontend --replicas=2
kubectl scale deployment devops-demo --replicas=3
kubectl scale deployment mongodb --replicas=1
Write-Host "      Deployments started." -ForegroundColor Green

# Step 3: Recreate Load Balancers (frontend)
Write-Host "[3/4] Creating Load Balancers..." -ForegroundColor Cyan
kubectl apply -f d:\medical-shop-management\devops-project\k8s\frontend-service.yaml
kubectl apply -f d:\medical-shop-management\devops-project\k8s\service.yaml

Write-Host "      Waiting 30 seconds for Load Balancers to get external IPs..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Step 4: Show the live URLs
Write-Host "[4/4] Getting your live URLs..." -ForegroundColor Cyan
Write-Host ""
kubectl get svc devops-frontend-svc devops-demo-svc

Write-Host "      Applying IPv6 fix for mobile networks..." -ForegroundColor Cyan
# Get the Security Group Name of the new ELB
$ELB_NAME = (kubectl get svc devops-frontend-svc -o jsonpath="{.status.loadBalancer.ingress[0].hostname}").Split("-")[0]
$SG_NAME = "k8s-elb-$ELB_NAME"
$SG_ID = aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG_NAME" --query "SecurityGroups[*].GroupId" --output text

if ($SG_ID) {
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --ip-permissions file://d:\medical-shop-management\devops-project\ipv6-sg-rule.json | Out-Null
    Write-Host "      IPv6 fix applied to Security Group $SG_ID" -ForegroundColor Green
} else {
    Write-Host "      WARNING: Could not find Security Group to apply IPv6 fix" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  RESUMED! Your app is live again." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Copy the EXTERNAL-IP above and open it in browser." -ForegroundColor Green
Write-Host "  Login: admin@gmail.com / admin123" -ForegroundColor Green
Write-Host ""
Write-Host "  NOTE: Load Balancer DNS may take 2-3 more minutes" -ForegroundColor Yellow
Write-Host "  to become reachable on mobile." -ForegroundColor Yellow
