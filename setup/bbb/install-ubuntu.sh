#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root (for example: sudo env BBB_HOST=... BBB_EMAIL=... bash install-ubuntu.sh)." >&2
  exit 1
fi

: "${BBB_HOST:?Set BBB_HOST to the public BigBlueButton hostname.}"
: "${BBB_EMAIL:?Set BBB_EMAIL to the Let's Encrypt contact email.}"

if [[ "$(uname -m)" != "x86_64" ]]; then
  echo "BigBlueButton requires an x86_64 Ubuntu server." >&2
  exit 1
fi

source /etc/os-release
if [[ "${ID:-}" != "ubuntu" || "${VERSION_ID:-}" != "22.04" ]]; then
  echo "BigBlueButton 3.0 requires Ubuntu 22.04." >&2
  exit 1
fi

apt-get update
apt-get install -y wget

wget -qO- https://raw.githubusercontent.com/bigbluebutton/bbb-install/v3.0.x-release/bbb-install.sh \
  | bash -s -- -w -v jammy-300 -s "${BBB_HOST}" -e "${BBB_EMAIL}"

bbb-conf --check
echo "Installation completed. Run 'sudo bbb-conf --secret' and keep the shared secret private."
