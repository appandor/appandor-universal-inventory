# Universal Inventory Platform

This repository contains the core software architecture and infrastructure for a universal, multi-tenancy ready inventory and tracking system. It is designed to run efficiently inside Docker on an Ubuntu LTS server.

## ⚠️ MANDATORY PREREQUISITE (BEFORE RUNNING THE SETUP)
Because this repository is **Private**, your server cannot download the files without authorization. You **MUST** set up an SSH Deployment Key before executing the initialization script.
* Follow the step-by-step guide located in: `docs/ssh_setup_guide.txt`
* Once the key is registered in GitHub, the script will run fully automated without prompting for passwords.

## 🚀 HOW TO RUN THE PROJECT (ONCE INITIALIZED)
After running the automated script `scripts/setup_server.sh`, follow these commands to start the platform:
1. Navigate to the installation directory:
   ```bash
   cd ~/appandor-system
   ```
2. Start all containers in detached mode (runs silently in the background):
   ```bash
   docker compose up -d
   ```
3. Verify that all containers are healthy and running:
   ```bash
   docker compose ps
   ```

## 🛠️ DAILY OPERATIONS & HEALTH CHECKS
* **Live Status Check:** Open your web browser and navigate to `http://appandor.com` to verify the backend and database connection.
* **Web Interface:** Access the main dashboard at `http://appandor.com` (served directly from the `web/public` directory).
* **Database Logs:** To inspect live database activities or issues, run:
   ```bash
   docker compose logs postgres-db
   ```

## 💾 RECOVERY & BACKUP STRATEGY
* **PostgreSQL Text Dumps:** Automated nightly cron jobs export raw transaction data into your private Google Drive storage.
* **System Snapshots:** Before any major system updates (`apt upgrade`), always freeze the environment via the Netcup SCP snapshot feature.
* **Image Assets:** Product images are kept local to the server (`app_images` volume) and are excluded from daily cloud sync. Primary recovery fallback is a manual re-import via Shopify API.

## 📁 Repository File Structure
* `01_init_tables.sql` - Core PostgreSQL database schema (Supply Chain & JSONB Attributes)
* `package.json` - Node.js dependencies (Express & PG Driver)
* `server.js` - Main backend API logic with active CRUD endpoints & static asset serving
* `docker-compose.yml` - Container orchestration manager (Postgres 16 & Node 20)
* `docs/architecture.txt` - Strategic 5-year technical infrastructure and backup concept
* `docs/ssh_setup_guide.txt` - Step-by-step guide for passwordless server-to-GitHub authentication
* `scripts/setup_server.sh` - Automated deployment script for fresh server initialization
