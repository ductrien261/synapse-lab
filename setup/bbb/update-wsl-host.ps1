param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^(?:\d{1,3}\.){3}\d{1,3}$')]
    [string]$IpAddress,

    [string]$Hostname = 'bbb.synapse.test'
)

$ErrorActionPreference = 'Stop'
$hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
$resolvedHostsPath = (Resolve-Path -LiteralPath $hostsPath).Path

if ($resolvedHostsPath -ne "$env:SystemRoot\System32\drivers\etc\hosts") {
    throw "Unexpected hosts file path: $resolvedHostsPath"
}

$octets = $IpAddress.Split('.')
if ($octets.Count -ne 4 -or ($octets | Where-Object { [int]$_ -gt 255 })) {
    throw "Invalid IPv4 address: $IpAddress"
}

$backupPath = "$resolvedHostsPath.synapse-bbb.bak"
Copy-Item -LiteralPath $resolvedHostsPath -Destination $backupPath -Force

$escapedHostname = [regex]::Escape($Hostname)
$lines = Get-Content -LiteralPath $resolvedHostsPath |
    Where-Object { $_ -notmatch "^\s*\S+\s+$escapedHostname(?:\s|$)" }
$lines += "$IpAddress`t$Hostname # Synapse BBB WSL development"

Set-Content -LiteralPath $resolvedHostsPath -Value $lines -Encoding ascii
Write-Output "Mapped $Hostname to $IpAddress. Backup: $backupPath"
