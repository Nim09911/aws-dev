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
  description = "UTC teardown deadline recorded as an RFC 3339 tag."
  type        = string
  validation {
    condition     = can(timecmp(var.expires_at, timestamp()))
    error_message = "expires_at must be an RFC 3339 timestamp."
  }
}

variable "artifact_path" {
  description = "Path to the deterministic Lambda zip produced by scripts/package-lambda.sh."
  type        = string
  validation {
    condition     = endswith(var.artifact_path, ".zip")
    error_message = "artifact_path must identify a zip file."
  }
}

variable "cors_allowed_origins" {
  description = "Exact HTTPS browser origins allowed by API Gateway."
  type        = list(string)
  validation {
    condition = length(var.cors_allowed_origins) > 0 && alltrue([
      for origin in var.cors_allowed_origins :
      can(regex("^https://[^/]+(?::[0-9]+)?$", origin))
    ])
    error_message = "Provide at least one exact HTTPS origin without a path."
  }
}

variable "jwt_parameter_base_path" {
  description = "Base path whose dev and stage children are seeded outside Terraform."
  type        = string
  default     = "/aws-developer-course/lambda"
  validation {
    condition     = can(regex("^/[A-Za-z0-9_.\\-/]+[A-Za-z0-9_.-]$", var.jwt_parameter_base_path))
    error_message = "Use an absolute Parameter Store path without a trailing slash."
  }
}

variable "parameter_cache_ttl_seconds" {
  description = "Warm-runtime auth configuration cache TTL."
  type        = number
  default     = 30
  validation {
    condition     = var.parameter_cache_ttl_seconds >= 5 && var.parameter_cache_ttl_seconds <= 300
    error_message = "Use a bounded TTL from 5 through 300 seconds."
  }
}

variable "github_repository" {
  description = "GitHub owner/repository allowed to assume the deployment role."
  type        = string
  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "Use owner/repository."
  }
}

variable "github_oidc_provider_arn" {
  description = "ARN of an existing account-level GitHub Actions OIDC provider."
  type        = string
  validation {
    condition     = can(regex("^arn:[^:]+:iam::[0-9]{12}:oidc-provider/token\\.actions\\.githubusercontent\\.com$", var.github_oidc_provider_arn))
    error_message = "Provide the existing GitHub Actions OIDC provider ARN."
  }
}
