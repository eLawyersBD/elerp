# ERP & CRM Workspace Rules

- **Auto-open Localhost**: Whenever this workspace is loaded or a new conversation starts, you (Antigravity) must automatically verify if the local ERP server (Port 3000) and CRM server (Port 3005) are running. If either is not running, start it using `run_erp_services.ps1`. Then, open `http://localhost:3000` and `http://localhost:3005` in the user's default browser by running commands (`Start-Process http://localhost:3000; Start-Process http://localhost:3005`).
