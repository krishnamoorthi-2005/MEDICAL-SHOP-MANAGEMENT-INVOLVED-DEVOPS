# DevOps End-to-End Project

This repository contains all the necessary resources to deploy a sample Node.js microservice through a fully-automated CI/CD pipeline using modern DevOps tools.

## Architecture & Tools Used
- **Source Code**: Node.js (Express)
- **Containerization**: Docker
- **CI/CD**: Jenkins
- **Infrastructure as Code**: Terraform (AWS VPC & EKS)
- **Container Orchestration**: Kubernetes
- **Monitoring**: Prometheus & Grafana

## Repository Structure
- `app/`: Contains the Node.js source code, `package.json`, Prometheus metrics setup, and the `Dockerfile`.
- `jenkins/`: Contains the declarative `Jenkinsfile` for the CI/CD pipeline.
- `infra/`: Terraform configurations for provisioning AWS infrastructure (VPC, Subnets, EKS Cluster).
- `k8s/`: Kubernetes YAML manifests (Deployment, Service, Ingress).
- `monitoring/`: Helm values files to configure Prometheus and Grafana.

## Getting Started

1. **Deploy Infrastructure**:
   ```bash
   cd infra
   terraform init
   terraform apply
   ```

2. **Configure kubectl**:
   ```bash
   aws eks --region us-east-1 update-kubeconfig --name devops-demo-cluster
   ```

3. **Deploy the Monitoring Stack**:
   ```bash
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm repo update
   helm upgrade --install prometheus prometheus-community/kube-prometheus-stack -f monitoring/prometheus-values.yaml
   helm upgrade --install grafana prometheus-community/grafana -f monitoring/grafana-values.yaml
   ```

4. **Run the CI/CD Pipeline**:
   - Create a new Pipeline job in Jenkins.
   - Point it to the Git repository.
   - Ensure Jenkins has Docker credentials configured (ID: `dockerhub`).
   - Trigger the build.

## Testing
To test the API, get the LoadBalancer external IP from Kubernetes:
```bash
kubectl get svc devops-demo-svc
```
Then navigate to `http://<EXTERNAL_IP>/api/health`.

To access metrics:
```bash
http://<EXTERNAL_IP>/metrics
```
