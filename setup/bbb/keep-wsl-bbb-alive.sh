#!/usr/bin/env bash
set -euo pipefail

systemctl start docker
systemctl start redis-server
systemctl start bigbluebutton.target

# A WSL distribution may stop when the last Windows-side client exits, even
# while systemd services are present. Keep one harmless client alive for the
# lifetime of the local development server.
exec sleep infinity
