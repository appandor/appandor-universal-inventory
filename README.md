# Universal Inventory Platform

This repository contains the core software architecture and infrastructure for a universal, multi-tenancy ready inventory and tracking system. It is designed to run efficiently inside Docker on an Ubuntu LTS server.

## System Architecture
* **Database:** PostgreSQL (with automated schema initialization for Products, Boxes, and Locations)
* **Backend:** Node.js with Express Framework (featuring a simulated Fake-Auth development middleware)
* **Deployment:** Containerized via Docker Compose

## Repository File Structure
* `01_init_tables.sql` - Core PostgreSQL database schema (English)
* `package.json` - Node.js dependencies (Express & PG Driver)
* `server.js` - Main backend API logic with active CRUD endpoints
* `docker-compose.yml` - Container orchestration manager
* `scripts/setup_server.sh` - Automated deployment script for fresh server initialization
