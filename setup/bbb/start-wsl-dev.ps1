$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$distro = "Ubuntu-22.04"
$keepAliveScript = "/mnt/d/synapse-lab/setup/bbb/keep-wsl-bbb-alive.sh"
$proxyScript = Join-Path $PSScriptRoot "configure-wsl-proxy.ps1"

$existingKeepAlive = Get-CimInstance Win32_Process |
    Where-Object {
        $_.Name -eq "wsl.exe" -and
        $_.CommandLine -like "*$keepAliveScript*"
    } |
    Select-Object -First 1

$keepAlive = $null
if ($null -eq $existingKeepAlive) {
    $keepAlive = Start-Process `
        -FilePath "wsl.exe" `
        -ArgumentList @("-d", $distro, "-u", "root", "--", "bash", $keepAliveScript) `
        -WindowStyle Hidden `
        -PassThru
}

Start-Sleep -Seconds 8
if ($null -ne $keepAlive -and $keepAlive.HasExited) {
    throw "Tiến trình giữ BBB trong WSL đã thoát với mã $($keepAlive.ExitCode)."
}

$proxy = Start-Process `
    -FilePath "powershell.exe" `
    -Verb RunAs `
    -WindowStyle Hidden `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $proxyScript) `
    -Wait `
    -PassThru

if ($proxy.ExitCode -ne 0) {
    throw "Không cập nhật được Windows proxy/hosts cho BBB."
}

$keepAlivePid = if ($null -ne $keepAlive) { $keepAlive.Id } else { $existingKeepAlive.ProcessId }
Write-Host "BBB đang chạy nền trong $distro (keep-alive PID $keepAlivePid)."
Write-Host "Mở https://bbb.synapse.test hoặc chạy setup/bbb/connect-wsl-dev.ps1."
