$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# WSL distributions share this well-known Hyper-V VM creator identifier.
$wslCreatorId = "{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}"

$rules = @(
    @{
        Name = "SynapseBBB-Web"
        DisplayName = "Synapse BBB WSL - Web"
        Protocol = "TCP"
        LocalPorts = @("80", "443")
    },
    @{
        Name = "SynapseBBB-Media"
        DisplayName = "Synapse BBB WSL - WebRTC media"
        Protocol = "UDP"
        LocalPorts = @("16384-32768")
    }
)

foreach ($rule in $rules) {
    $existing = Get-NetFirewallHyperVRule -Name $rule.Name -ErrorAction SilentlyContinue
    if ($null -eq $existing) {
        New-NetFirewallHyperVRule `
            -Name $rule.Name `
            -DisplayName $rule.DisplayName `
            -VMCreatorId $wslCreatorId `
            -Direction Inbound `
            -Action Allow `
            -Protocol $rule.Protocol `
            -LocalPorts $rule.LocalPorts | Out-Null
    }
    else {
        Set-NetFirewallHyperVRule `
            -Name $rule.Name `
            -VMCreatorId $wslCreatorId `
            -Direction Inbound `
            -Action Allow `
            -Protocol $rule.Protocol `
            -LocalPorts $rule.LocalPorts | Out-Null
    }
}

$wslInterface = Get-NetAdapter -IncludeHidden |
    Where-Object { $_.Name -like "vEthernet (WSL*" } |
    Select-Object -First 1

if ($null -eq $wslInterface) {
    throw "Không tìm thấy network interface vEthernet của WSL."
}

$windowsRules = @(
    @{
        DisplayName = "Synapse BBB WSL Dev - Web"
        Protocol = "TCP"
        LocalPorts = @("80", "443")
    },
    @{
        DisplayName = "Synapse BBB WSL Dev - WebRTC media"
        Protocol = "UDP"
        LocalPorts = @("16384-32768")
    }
)

foreach ($rule in $windowsRules) {
    $existing = Get-NetFirewallRule -DisplayName $rule.DisplayName -ErrorAction SilentlyContinue
    if ($null -eq $existing) {
        New-NetFirewallRule `
            -DisplayName $rule.DisplayName `
            -Direction Inbound `
            -Action Allow `
            -InterfaceAlias $wslInterface.Name `
            -Protocol $rule.Protocol `
            -LocalPort $rule.LocalPorts | Out-Null
    }
    else {
        $existing | Set-NetFirewallRule -Enabled True -Action Allow | Out-Null
    }
}

Write-Host "Đã mở TCP 80/443 và UDP 16384-32768 cho BBB trên Hyper-V và Windows Firewall."
