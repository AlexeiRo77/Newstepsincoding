#!/bin/sh
# EC2 user data: runs once when deploy/aws-deploy.sh first creates the server (Ubuntu 24.04).
# Installs Docker with Compose and Buildx, and adds swap so the frontend build fits in 2 GB of memory.
set -eu
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
apt-get update -q
DEBIAN_FRONTEND=noninteractive apt-get install -yq docker.io docker-compose-v2 docker-buildx
systemctl enable --now docker
