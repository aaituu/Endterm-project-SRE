variable "project_id" {
  description = "Google Cloud project id."
  type        = string
}

variable "region" {
  description = "Google Cloud region."
  type        = string
  default     = "europe-west1"
}

variable "zone" {
  description = "Google Cloud zone."
  type        = string
  default     = "europe-west1-b"
}

variable "name_prefix" {
  description = "Resource name prefix."
  type        = string
  default     = "school-platform"
}

variable "machine_type" {
  description = "Compute Engine machine type."
  type        = string
  default     = "e2-standard-2"
}

variable "boot_disk_size_gb" {
  description = "VM boot disk size in GB."
  type        = number
  default     = 50
}

variable "ssh_user" {
  description = "Linux username for SSH metadata."
  type        = string
  default     = "deploy"
}

variable "ssh_public_key" {
  description = "Public SSH key content. Leave empty if you manage SSH keys outside Terraform."
  type        = string
  default     = ""
  sensitive   = true
}

variable "ssh_source_ranges" {
  description = "CIDR ranges allowed to SSH to the VM."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "app_source_ranges" {
  description = "CIDR ranges allowed to access app and monitoring ports."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "app_ports" {
  description = "Public TCP ports opened by firewall."
  type        = list(string)
  default     = ["80", "443", "8088", "8080", "3000", "9090"]
}
