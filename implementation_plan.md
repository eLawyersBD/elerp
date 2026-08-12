# ZeroTier VPN Setup Plan
## Goal: Connect Home PC → Office MySQL Server (192.168.68.53)

---

## Overview

ZeroTier creates a **virtual private network** between your home PC and the office MySQL server machine — as if they were both on the same LAN, without needing port-forwarding or a dedicated VPN appliance.

```
[Your Home PC]  ──── ZeroTier Cloud ────  [Office MySQL Server]
192.168.0.103                              192.168.68.53
     ↓                                           ↓
 10.147.x.x  ←───── same virtual LAN ───→  10.147.x.y
```

---

## Who Does What

| Person | Task |
|---|---|
| **You (at home)** | Create ZeroTier account, create network, install ZeroTier on home PC |
| **Someone at office** | Install ZeroTier on the MySQL server machine, join the network |
| **You (at home)** | Authorize both machines, update `.env`, test connection |

---

## PHASE 1 — Create a ZeroTier Network (You, at Home)

### Step 1.1 — Create a free ZeroTier account
1. Go to 👉 **https://my.zerotier.com**
2. Click **Sign Up** → use your email
3. Verify your email and log in

### Step 1.2 — Create a new Network
1. Click **"Create A Network"**
2. A new network appears with a random **Network ID** like:
   ```
   8056c2e21c000001
   ```
3. Click on the network to open settings
4. Under **Access Control**, select **"Private"** (requires manual approval of members)
5. Under **IPv4 Auto-Assign**, make sure it's **enabled** (e.g. `10.147.17.*`)
6. **Copy and save the Network ID** — you'll need to share it

---

## PHASE 2 — Install ZeroTier on Your Home PC

### Step 2.1 — Download & Install
1. Go to 👉 **https://www.zerotier.com/download/**
2. Download the **Windows** installer
3. Run the installer (just click Next → Install)

### Step 2.2 — Join Your Network
1. Right-click the ZeroTier icon in the system tray (bottom-right of taskbar)
2. Click **"Join New Network..."**
3. Enter your **Network ID** from Step 1.2
4. Click **Join**

### Step 2.3 — Authorize Your Home PC
1. Go back to **https://my.zerotier.com** → Your Network
2. Under **Members**, you'll see your home PC listed
3. Tick the **✅ Auth** checkbox to authorize it
4. Note your home PC's **ZeroTier IP** (e.g. `10.147.17.50`)

---

## PHASE 3 — Install ZeroTier on Office MySQL Server Machine
*(Someone at the office does this — or you can do it via remote desktop/TeamViewer)*

### Step 3.1 — Download & Install on Office PC
1. Go to **https://www.zerotier.com/download/** on the office machine
2. Download and install (Windows or Linux depending on the server OS)

### Step 3.2 — Join the Same Network
**Windows:**
1. Right-click ZeroTier tray icon → **"Join New Network..."**
2. Enter the same **Network ID**
3. Click Join

**Linux (if the MySQL server runs on Linux):**
```bash
# Install ZeroTier
curl -s https://install.zerotier.com | sudo bash

# Join the network
sudo zerotier-cli join YOUR_NETWORK_ID

# Check status
sudo zerotier-cli status
```

### Step 3.3 — Authorize the Office Machine
1. Go back to **https://my.zerotier.com** → Your Network → Members
2. You'll see the office machine listed (second member)
3. Tick the **✅ Auth** checkbox
4. Note the office machine's **ZeroTier IP** (e.g. `10.147.17.51`)

---

## PHASE 4 — Allow MySQL Remote Connections (Office Machine)

> ⚠️ MySQL by default only accepts connections from `localhost`. You need to allow remote connections.

### Step 4.1 — Open MySQL and Grant Access
Connect to MySQL on the office machine and run:

```sql
-- Allow user 'Ekram' to connect from any ZeroTier IP
CREATE USER IF NOT EXISTS 'Ekram'@'10.147.17.%' IDENTIFIED BY '123ekraM.com';
GRANT ALL PRIVILEGES ON atcl_hr.* TO 'Ekram'@'10.147.17.%';
FLUSH PRIVILEGES;
```

Or grant from any IP (less secure but simpler):
```sql
CREATE USER IF NOT EXISTS 'Ekram'@'%' IDENTIFIED BY '123ekraM.com';
GRANT ALL PRIVILEGES ON atcl_hr.* TO 'Ekram'@'%';
FLUSH PRIVILEGES;
```

### Step 4.2 — Edit MySQL Config to Listen on All Interfaces
Find the MySQL config file:
- **Windows:** `C:\ProgramData\MySQL\MySQL Server 8.x\my.ini`
- **Linux:** `/etc/mysql/mysql.conf.d/mysqld.cnf`

Change this line:
```ini
# BEFORE
bind-address = 127.0.0.1

# AFTER
bind-address = 0.0.0.0
```

Then restart MySQL:
- **Windows:** Open Services → Restart "MySQL80"
- **Linux:** `sudo systemctl restart mysql`

### Step 4.3 — Allow Port 3306 in Windows Firewall (if Windows server)
```powershell
# Run in PowerShell as Administrator on the office machine
New-NetFirewallRule -DisplayName "MySQL ZeroTier" -Direction Inbound -Protocol TCP -LocalPort 3306 -Action Allow
```

---

## PHASE 5 — Update Your App's `.env` File

Once both machines are connected on ZeroTier, update `server/.env`:

```env
PORT=5000
DB_HOST=10.147.17.51    ← Replace with the ZeroTier IP of the office MySQL machine
DB_USER=Ekram
DB_PASSWORD=123ekraM.com
DB_NAME=atcl_hr
DB_PORT=3306
```

---

## PHASE 6 — Restart & Test

### Step 6.1 — Restart the backend server
Stop the current backend (task-105) and restart:
```powershell
cd "d:\ATCL Inventory\server"
npm run start
```

### Step 6.2 — Test the connection
```powershell
# Quick connectivity test
Test-NetConnection -ComputerName 10.147.17.51 -Port 3306
```

### Step 6.3 — Verify in the app
- Open **http://localhost:5173**
- The backend logs should now show:
  ```
  [MySQL] Connected successfully to database: atcl_hr
  ```
- Instead of the current:
  ```
  [MySQL] Database connection failed: connect ETIMEDOUT
  ```

---

## Open Questions

> [!IMPORTANT]
> **What OS is the office MySQL server running?**
> - Windows → Phase 3 & 4 steps use Windows instructions
> - Linux/Ubuntu → Phase 3 & 4 use Linux commands

> [!IMPORTANT]
> **Do you have remote access to the office MySQL machine?**
> - If yes (TeamViewer/RDP) → you can do Phase 3 & 4 yourself
> - If no → someone at the office needs to physically do Phase 3 & 4

> [!NOTE]
> **ZeroTier Free Tier** supports up to **25 devices** at no cost — plenty for this setup.

---

## Summary of Steps

```
Phase 1 → Create ZeroTier account + network (my.zerotier.com)        [YOU]
Phase 2 → Install ZeroTier on home PC + join network                  [YOU]
Phase 3 → Install ZeroTier on office MySQL machine + join network      [OFFICE]
Phase 4 → Allow MySQL remote connections + open firewall port 3306     [OFFICE]
Phase 5 → Update server/.env with new ZeroTier IP                     [YOU]
Phase 6 → Restart backend + verify connection                          [YOU]
```

**Estimated time:** ~20-30 minutes total (if someone is at the office to help)
