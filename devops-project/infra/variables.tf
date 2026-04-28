variable "aws_region" {
  description = "AWS region for the infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "image_tag" {
  description = "Docker image tag passed from Jenkins for deployment reference"
  type        = string
  default     = "latest"
}
