$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$distro = "Ubuntu-22.04"
$hostname = "bbb.synapse.test"

$ipOutput = (& wsl -d $distro -- hostname -I 2>$null) -join " "
if ($LASTEXITCODE -ne 0) {
    throw "Không lấy được địa chỉ IP của $distro."
}

$wslIp = ($ipOutput.Trim() -split "\s+")[0]
$parsedIp = $null
if (-not [System.Net.IPAddress]::TryParse($wslIp, [ref]$parsedIp)) {
    throw "Địa chỉ WSL không hợp lệ: $wslIp"
}

# Keep the shared secret in this PowerShell process only. It is passed to the
# backend container and is never written to a repository file or printed.
$secretOutput = (& wsl -d $distro -u root -- bbb-conf --secret 2>$null) -join "`n"
if ($LASTEXITCODE -ne 0) {
    throw "Không đọc được cấu hình BigBlueButton."
}

$secretMatch = [regex]::Match($secretOutput, '(?m)^\s*Secret:\s*(\S+)\s*$')
if (-not $secretMatch.Success) {
    throw "Không tìm thấy shared secret trong kết quả bbb-conf."
}

$env:BBB_ENABLED = "true"
$env:BBB_URL = "https://$hostname/bigbluebutton/api"
$env:BBB_SECRET = $secretMatch.Groups[1].Value
$env:BBB_CHECKSUM_ALGORITHM = "sha256"
$env:BBB_SSL_VERIFY = "false"

Push-Location $repoRoot
try {
    docker compose up -d --no-deps --force-recreate be
    if ($LASTEXITCODE -ne 0) {
        throw "Không thể tạo lại backend container."
    }

    docker compose exec -T be python manage.py shell -c "from classroom.services import BigBlueButtonService; service = BigBlueButtonService(); service.check_connection(); print({'mode': service.mode, 'configured': service.configured, 'reachable': True})"
    if ($LASTEXITCODE -ne 0) {
        throw "Backend chưa kết nối được tới BigBlueButton."
    }
}
finally {
    Pop-Location
    Remove-Item Env:BBB_SECRET -ErrorAction SilentlyContinue
}

Write-Host "Backend đã kết nối tới https://$hostname qua WSL $wslIp."
Write-Host "Lưu ý: BBB_SSL_VERIFY=false chỉ dành cho chứng chỉ CA nội bộ ở môi trường local."
