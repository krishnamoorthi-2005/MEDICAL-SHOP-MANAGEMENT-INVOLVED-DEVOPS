module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "devops-cluster-v3"
  cluster_version = "1.30"

  create_kms_key = false
  cluster_encryption_config = {}

  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.public_subnets

  cluster_endpoint_public_access = true
  enable_cluster_creator_admin_permissions = true

  eks_managed_node_groups = {
    app_nodes = {
      min_size     = 1
      max_size     = 3
      desired_size = 2

      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
    }
  }

  tags = {
    Environment = "dev"
    Project     = "DevOps-Demo"
  }
}
