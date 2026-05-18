resource "google_compute_network" "main" {
  name                    = "${var.name_prefix}-network"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  name          = "${var.name_prefix}-subnet"
  ip_cidr_range = "10.20.0.0/24"
  region        = var.region
  network       = google_compute_network.main.id
}

resource "google_compute_firewall" "ssh" {
  name    = "${var.name_prefix}-allow-ssh"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = var.ssh_source_ranges
  target_tags   = ["${var.name_prefix}-server"]
}

resource "google_compute_firewall" "app" {
  name    = "${var.name_prefix}-allow-app"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = var.app_ports
  }

  source_ranges = var.app_source_ranges
  target_tags   = ["${var.name_prefix}-server"]
}

resource "google_compute_firewall" "internal" {
  name    = "${var.name_prefix}-allow-internal"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  source_ranges = [google_compute_subnetwork.main.ip_cidr_range]
}

resource "google_compute_address" "server" {
  name   = "${var.name_prefix}-ip"
  region = var.region
}

resource "google_service_account" "server" {
  account_id   = "${var.name_prefix}-vm"
  display_name = "School Platform VM"
}

resource "google_compute_instance" "server" {
  name         = "${var.name_prefix}-server"
  machine_type = var.machine_type
  zone         = var.zone
  tags         = ["${var.name_prefix}-server"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = var.boot_disk_size_gb
      type  = "pd-balanced"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.main.id

    access_config {
      nat_ip = google_compute_address.server.address
    }
  }

  service_account {
    email  = google_service_account.server.email
    scopes = ["cloud-platform"]
  }

  metadata = var.ssh_public_key == "" ? {} : {
    ssh-keys = "${var.ssh_user}:${var.ssh_public_key}"
  }

  metadata_startup_script = <<-EOF
    #!/usr/bin/env bash
    set -euxo pipefail
    apt-get update
    apt-get install -y ca-certificates curl gnupg lsb-release git rsync
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    id -u ${var.ssh_user} >/dev/null 2>&1 && usermod -aG docker ${var.ssh_user} || true
    mkdir -p /opt/school-platform
  EOF
}
