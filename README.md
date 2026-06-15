# Universal Inventory Platform

This repository contains the core software architecture and infrastructure for a universal, multi-tenancy ready inventory and tracking system. It is designed to run efficiently inside Docker on an Ubuntu LTS server.

## ⚠️ MANDATORY PREREQUISITE (BEFORE RUNNING THE SETUP)
Because this repository is **Private**, your server cannot download the files without authorization. You **MUST** set up an SSH Deployment Key before executing the initialization script.
* Follow the step-by-step guide located in: `docs/ssh_setup_guide.txt`
* Once the key is registered in GitHub, the script will run fully automated without prompting for passwords.

## System Architecture
* **Database:** PostgreSQL (with automated schema initialization for Products, Purchases, Boxes, and Locations)
* **Backend:** Node.js with Express Framework (featuring a simulated Fake-Auth development middleware)
* **Deployment:** Containerized via Docker Compose

## Repository File Structure
* `01_init_tables.sql` - Core PostgreSQL database schema (English)
* `package.json` - Node.js dependencies (Express & PG Driver)
* `server.js` - Main backend API logic with active CRUD endpoints
* `docker-compose.yml` - Container orchestration manager
* `docs/ssh_setup_guide.txt` - Step-by-step guide for passwordless server-to-GitHub authentication
* `scripts/setup_server.sh` - Automated deployment script for fresh server initialization
