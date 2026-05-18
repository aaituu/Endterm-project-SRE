output "server_external_ip" {
  description = "Public IP address of the VM."
  value       = google_compute_address.server.address
}

output "ssh_command" {
  description = "SSH command."
  value       = "ssh ${var.ssh_user}@${google_compute_address.server.address}"
}

output "frontend_url" {
  description = "Frontend URL on the VM."
  value       = "http://${google_compute_address.server.address}:8088"
}

output "grafana_url" {
  description = "Grafana URL on the VM."
  value       = "http://${google_compute_address.server.address}:3000"
}

output "prometheus_url" {
  description = "Prometheus URL on the VM."
  value       = "http://${google_compute_address.server.address}:9090"
}
