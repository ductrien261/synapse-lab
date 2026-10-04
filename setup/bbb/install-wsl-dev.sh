#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root inside Ubuntu 22.04 WSL." >&2
  exit 1
fi

BBB_HOST="${BBB_HOST:-bbb.synapse.test}"

source /etc/os-release
if [[ "${ID:-}" != "ubuntu" || "${VERSION_ID:-}" != "22.04" ]]; then
  echo "This development installer requires Ubuntu 22.04." >&2
  exit 1
fi

if [[ ! -f /local/certs/fullchain.pem || ! -f /local/certs/privkey.pem ]]; then
  echo "Missing /local/certs/fullchain.pem or privkey.pem." >&2
  exit 1
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y language-pack-en wget
update-locale LANG=en_US.UTF-8
systemctl set-environment LANG=en_US.UTF-8

# -d uses the development certificate mounted at /local/certs.
# -j relaxes production sizing checks; it does not make WSL production-ready.
wget -qO- https://raw.githubusercontent.com/bigbluebutton/bbb-install/v3.0.x-release/bbb-install.sh \
  | bash -s -- -j -d -v jammy-300 -s "${BBB_HOST}"

bbb-conf --check
echo "BBB development install completed for https://${BBB_HOST}"
