$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$distro = "Ubuntu-22.04"
$hostname = "bbb.synapse.test"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

$ipOutput = (& wsl -d $distro -- hostname -I 2>$null) -join " "
if ($LASTEXITCODE -ne 0) {
    throw "Không lấy được địa chỉ IP của $distro."
}

$wslIp = ($ipOutput.Trim() -split "\s+")[0]
$parsedIp = $null
if (-not [System.Net.IPAddress]::TryParse($wslIp, [ref]$parsedIp)) {
    throw "Địa chỉ WSL không hợp lệ: $wslIp"
}

# Portproxy is TCP-only. WebRTC UDP media continues directly to WSL through
# the narrowly scoped Hyper-V firewall rule created by the companion script.
& netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=443 | Out-Null
& netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=443 connectaddress=$wslIp connectport=443
if ($LASTEXITCODE -ne 0) {
    throw "Không tạo được Windows portproxy cho BBB."
}

$proxyRuleName = "Synapse BBB WSL Dev - TCP proxy"
$proxyRule = Get-NetFirewallRule -DisplayName $proxyRuleName -ErrorAction SilentlyContinue
if ($null -eq $proxyRule) {
    New-NetFirewallRule `
        -DisplayName $proxyRuleName `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort 443 `
        -RemoteAddress LocalSubnet | Out-Null
}
else {
    $proxyRule | Set-NetFirewallRule -Enabled True -Action Allow | Out-Null
}

& (Join-Path $PSScriptRoot "update-wsl-host.ps1") -IpAddress "127.0.0.1" -Hostname $hostname
Write-Host "Đã chuyển https://$hostname:443 tới WSL $wslIp:443."
