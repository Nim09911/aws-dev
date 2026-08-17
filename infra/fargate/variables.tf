variable "aws_region" {
  description = "AWS Region used for every regional resource."
  type        = string

  validation {
    condition     = can(regex("^[a-z]{2}(-gov)?-[a-z]+-[0-9]$", var.aws_region))
    error_message = "Use an explicit AWS Region such as us-east-1."
  }
}

variable "name_prefix" {
  description = "Unique lowercase course prefix."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,23}$", var.name_prefix))
    error_message = "Use 3-24 lowercase letters, digits, or hyphens, starting with a letter."
  }
}

variable "owner" {
  description = "Non-sensitive owner identifier used in tags."
  type        = string

  validation {
    condition     = length(trimspace(var.owner)) >= 2 && length(var.owner) <= 40
    error_message = "Owner must be a 2-40 character non-sensitive identifier."
  }
}

variable "expires_at" {
  description = "UTC teardown deadline recorded as a tag, for example 2026-08-17T18:00:00Z."
  type        = string

  validation {
    condition     = can(timecmp(var.expires_at, timestamp()))
    error_message = "expires_at must be an RFC 3339 timestamp."
  }
}

variable "ingress_cidr" {
  description = "Single trusted public IPv4 CIDR allowed to call port 3000; use your current public IP/32."
  type        = string

  validation {
    condition     = can(cidrnetmask(var.ingress_cidr)) && var.ingress_cidr != "0.0.0.0/0"
    error_message = "Use a valid restricted IPv4 CIDR; 0.0.0.0/0 is intentionally rejected."
  }
}

variable "image_tag" {
  description = "Immutable image tag, normally a full 40-character Git commit SHA."
  type        = string

  validation {
    condition     = can(regex("^[0-9a-f]{40}$", var.image_tag))
    error_message = "image_tag must be a lowercase 40-character Git commit SHA."
  }
}

variable "desired_count" {
  description = "Number of paid Fargate tasks. Keep zero until the image and parameters exist."
  type        = number
  default     = 0

  validation {
    condition     = contains([0, 1], var.desired_count)
    error_message = "The course stack allows only zero or one task."
  }
}

variable "cors_allowed_origins" {
  description = "Exact HTTPS browser origins allowed by the API."
  type        = list(string)

  validation {
    condition = length(var.cors_allowed_origins) > 0 && alltrue([
      for origin in var.cors_allowed_origins :
      can(regex("^https://[^/]+(?::[0-9]+)?$", origin))
    ])
    error_message = "Provide at least one exact HTTPS origin without a path."
  }
}

variable "jwt_public_key_parameter_name" {
  description = "Existing Standard SecureString parameter name; its value is seeded outside Terraform."
  type        = string
  default     = "/aws-developer-course/ecs/dev/jwt-public-key-base64"
}

variable "jwt_issuer_parameter_name" {
  description = "Existing Standard String parameter name; its value is seeded outside Terraform."
  type        = string
  default     = "/aws-developer-course/ecs/dev/jwt-issuer"
}

variable "jwt_audience_parameter_name" {
  description = "Existing Standard String parameter name; its value is seeded outside Terraform."
  type        = string
  default     = "/aws-developer-course/ecs/dev/jwt-audience"
}

variable "github_repository" {
  description = "GitHub owner/repository allowed to assume the deployment role."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "Use owner/repository."
  }
}

variable "github_environment" {
  description = "Protected GitHub environment used by the deployment workflow."
  type        = string
  default     = "ecs-dev"
}

variable "github_oidc_provider_arn" {
  description = "ARN of an existing account-level token.actions.githubusercontent.com OIDC provider."
  type        = string

  validation {
    condition     = can(regex("^arn:[^:]+:iam::[0-9]{12}:oidc-provider/token\\.actions\\.githubusercontent\\.com$", var.github_oidc_provider_arn))
    error_message = "Provide the existing GitHub Actions OIDC provider ARN for this account."
  }
}
