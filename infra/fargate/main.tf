data "aws_caller_identity" "current" {}

locals {
  service_name = "${var.name_prefix}-ecs-api"
  tags = {
    project       = "aws-developer-course"
    environment   = "dev"
    owner         = var.owner
    managed-by    = "terraform"
    course-lesson = "10"
    expires-at    = var.expires_at
  }
  parameter_names = [
    var.jwt_public_key_parameter_name,
    var.jwt_issuer_parameter_name,
    var.jwt_audience_parameter_name,
  ]
  parameter_arns = [
    for name in local.parameter_names :
    "arn:${data.aws_partition.current.partition}:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${name}"
  ]
}

data "aws_partition" "current" {}

resource "aws_vpc" "this" {
  cidr_block           = "10.42.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.name_prefix}-vpc" }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name_prefix}-igw" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.this.id
  cidr_block              = "10.42.1.0/24"
  map_public_ip_on_launch = false
  availability_zone       = data.aws_availability_zones.available.names[0]

  tags = { Name = "${var.name_prefix}-public-a" }
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = { Name = "${var.name_prefix}-public" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "service" {
  name        = "${var.name_prefix}-ecs-api"
  description = "Course API ingress from one trusted IPv4 CIDR"
  vpc_id      = aws_vpc.this.id

  ingress {
    description = "API from learner workstation"
    protocol    = "tcp"
    from_port   = 3000
    to_port     = 3000
    cidr_blocks = [var.ingress_cidr]
  }

  egress {
    description = "HTTPS to ECR, CloudWatch, and SSM through the internet gateway"
    protocol    = "tcp"
    from_port   = 443
    to_port     = 443
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.name_prefix}-ecs-api" }
}

resource "aws_ecr_repository" "app" {
  name                 = local.service_name
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  force_delete = true
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep five newest course images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/aws/ecs/${local.service_name}"
  retention_in_days = 3
}

resource "aws_ecs_cluster" "this" {
  name = "${var.name_prefix}-cluster"
}
