@echo off
rem BSCH Windows 7 tunnel configuration template
rem انسخ الملف إلى tunnel-config.bat ثم عدّل القيم.
rem لا ترفع tunnel-config.bat إلى GitHub؛ فهو مستثنى من .gitignore.

set "VPS_HOST=YOUR_VPS_IP_OR_HOSTNAME"
set "VPS_PORT=22"
set "VPS_USER=hospital-tunnel"
set "REMOTE_PORT=18080"
set "LOCAL_PORT=8080"
set "PLINK=C:\Program Files\PuTTY\plink.exe"
set "SSH_KEY=C:\BSCH\keys\hospital-tunnel.ppk"
set "TUNNEL_LOG=C:\BSCH\logs\tunnel.log"
