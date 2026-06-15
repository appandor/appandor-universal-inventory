#!/bin/bash
# =============================================================================
# UNIVERSAL SAAS-READY SETUP SCRIPT FOR "APPANDOR INTERN"
# =============================================================================
# REQUIREMENTS: Must be executed as user "root" on a fresh Ubuntu 24.04 LTS server.
# USAGE:        bash setup_server.sh
# =============================================================================

# 1. Create the system user 'appandor' with sudo privileges
echo "=== 1. Creating system user 'appandor' ==="
USER_PASS=$(echo "AppandorLager2026!" | openssl passwd -1 -stdin)
useradd -m -p "$USER_PASS" -s /bin/bash appandor
usermod -aG sudo appandor

# 2. Update the system and install core utilities
echo "=== 2. Updating system packages ==="
apt update && apt upgrade -y
apt install -y vi curl ca-certificates gnupg lsb-release git

# 3. Download and register official Docker repositories
echo "=== 3. Setting up official Docker keys & repository ==="
mkdir -p /etc/apt/keyrings
curl -fsSL https://docker.com | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://docker.com $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker and Docker Compose
echo "=== 4. Installing Docker infrastructure ==="
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Start Docker and authorize the 'appandor' user
echo "=== 5. Enabling Docker daemon ==="
systemctl start docker
systemctl enable docker
usermod -aG docker appandor

# 6. Deploy code architecture from GitHub
echo "=== 6. Deploying code architecture from GitHub ==="
TARGET_DIR="/home/appandor/appandor-system"

sudo -u appandor git clone https://github.com "$TARGET_DIR"

# Move the init SQL file into the correct place so Postgres picks it up
sudo -u appandor mkdir -p "$TARGET_DIR/init_sql"
sudo -u appandor mv "$TARGET_DIR/01_init_tables.sql" "$TARGET_DIR/init_sql/01_init_tables.sql"

echo "===================================================================="
echo "          SERVER INITIALIZATION COMPLETED SUCCESSFULLY!             "
echo "===================================================================="
echo " 1. New system user created:       appandor"
echo " 2. Deployment directory ready:    $TARGET_DIR"
echo "--------------------------------------------------------------------"
echo " IMMEDIATE NEXT STEPS (HUMAN INSTRUCTIONS):"
echo " 1. Type 'exit' to close this temporary root session completely."
echo " 2. Re-login immediately via terminal as your normal user:"
echo "    ssh appandor@YOUR_SERVER_IP"
echo " 3. Change your temporary password right away: passwd"
echo " 4. Navigate into your system folder: cd ~/appandor-system"
echo " 5. Spin up your full architecture: docker compose up -d"
echo " 6. Check if backend is alive in browser: http://YOUR_SERVER_IP/api/status"
echo "===================================================================="
