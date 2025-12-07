terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0"
    }
  }
}

provider "google" {
  project = "app-chat-478713"
  region  = "asia-southeast1"
}

resource "google_container_cluster" "autopilot" {
  name               = "realtime-chat-autopilot-1"
  location           = "asia-southeast1"
  enable_autopilot   = true

  workload_identity_config {
    workload_pool = "app-chat-478713.svc.id.goog"
  }
}

resource "google_compute_address" "client_ip" {
  name   = "chat-client-ip"
  region = "asia-southeast1"
}

resource "google_compute_address" "gateway_ip" {
  name   = "chat-gateway-ip"
  region = "asia-southeast1"
}

resource "google_artifact_registry_repository" "repo" {
  name     = "chat"
  format   = "DOCKER"
  location = "asia-southeast1"
}

resource "google_project_iam_member" "compute_reader" {
  project = "app-chat-478713"
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:37387478146-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "gke_robot_reader" {
  project = "app-chat-478713"
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:service-37387478146@container-engine-robot.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "github_actions_writer" {
  project = "app-chat-478713"
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:github-actions-sa@app-chat-478713.iam.gserviceaccount.com"
}

output "gke_cluster_name" {
  value = google_container_cluster.autopilot.name
}

output "client_static_ip" {
  value = google_compute_address.client_ip.address
}

output "gateway_static_ip" {
  value = google_compute_address.gateway_ip.address
}
