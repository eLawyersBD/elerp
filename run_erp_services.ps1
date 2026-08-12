# Keep ERP and CRM Services running continuously
$ErrorActionPreference = "SilentlyContinue"

$ERPWorkspaceDir = "h:\ERP for EL"
$ERPServerDir = "h:\ERP for EL\server"
$CRMWorkspaceDir = "h:\CRM V1"
$ELMailServerDir = "g:\EL Mail\stitch_outlook_style_webmail\server"

$firstRun = $true

while ($true) {
    # 1. Check ERP Backend (Port 5000)
    $backendPort = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
    if (-not $backendPort) {
        # Start backend invisibly
        Start-Process -FilePath "node" -ArgumentList "src/app.js" -WorkingDirectory $ERPServerDir -WindowStyle Hidden
    }

    # 2. Check ERP Frontend (Port 3000)
    $frontendPort = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    if (-not $frontendPort) {
        # Start ERP frontend dev server invisibly
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $ERPWorkspaceDir -WindowStyle Hidden
    }

    # 3. Check CRM V1 (Port 3005)
    $crmPort = Get-NetTCPConnection -LocalPort 3005 -State Listen -ErrorAction SilentlyContinue
    if (-not $crmPort) {
        # Start CRM V1 dev server invisibly
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $CRMWorkspaceDir -WindowStyle Hidden
    }

    # 4. Check EL Mail Webmail Portal (Port 3006)
    $elMailPort = Get-NetTCPConnection -LocalPort 3006 -State Listen -ErrorAction SilentlyContinue
    if (-not $elMailPort) {
        # Start EL Mail server invisibly
        Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $ELMailServerDir -WindowStyle Hidden
    }

    # 5. Check Cloudflare Tunnel
    $tunnelProc = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
    if (-not $tunnelProc) {
        # Start tunnel invisibly
        Start-Process -FilePath "cloudflared" -ArgumentList "tunnel run erp-el-tunnel" -WorkingDirectory $ERPWorkspaceDir -WindowStyle Hidden
    }

    # On initial service start (computer boot), open localhost in browser
    if ($firstRun) {
        Start-Sleep -Seconds 3
        Start-Process "http://localhost:3000"
        Start-Process "http://localhost:3005"
        Start-Process "http://localhost:3006"
        $firstRun = $false
    }

    Start-Sleep -Seconds 10
}

