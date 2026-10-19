#!/bin/sh
# EC2 user data: runs once when deploy/aws-deploy.sh first creates the server (Ubuntu 24.04).
# Installs Docker with Compose and Buildx, and adds swap so the frontend build fits in 2 GB of memory.
# (Each deploy re-checks Docker, so a failed install here is repaired on the next ./dc deploy.)
set -eu
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
apt-get update -q
DEBIAN_FRONTEND=noninteractive apt-get install -yq docker.io docker-compose-v2 docker-buildx
systemctl enable --now docker
