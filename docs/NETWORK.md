# إعداد الشبكة المحلية — Hospital Network Setup Guide

## نظرة عامة / Overview

BSCH runs on **one Windows computer** (the server) inside the hospital.
All other hospital computers, tablets, and phones access the system through
any web browser — no installation required on client devices.

```
Hospital LAN (192.168.x.x / 10.x.x.x)
         │
         │  Wi-Fi or Ethernet
         ├─────────────────── Nursing Station PC (browser)
         ├─────────────────── Reception PC (browser)
         ├─────────────────── Doctor's Phone (browser / PWA)
         ├─────────────────── Tablet (browser / PWA)
         │
   ┌─────┴──────┐
   │ Server PC  │  ← BSCH installed here
   │            │     PostgreSQL + Node.js
   │ 192.168.1.5│
   └────────────┘
```

---

## 1. تشغيل الخادم / Start the Server

On the **server PC**, double-click **`StartServer.bat`** in the project root.

The script will display the server's IP address:
```
Server IP addresses:
  192.168.1.5   (most likely your LAN address)
  ...
Open this URL on any hospital computer: http://192.168.1.5:8080
```

Note the IP address shown — distribute it to all staff.

---

## 2. الوصول من الأجهزة الأخرى / Access from Other Devices

On any hospital computer, tablet, or phone connected to the **same network**:

1. Open any web browser (Chrome, Edge, Firefox, Safari)
2. Type the server address: `http://192.168.1.5:8080`
   (replace `192.168.1.5` with your actual server IP)
3. Log in with the system password

**No installation, no apps, no downloads required.**

---

## 3. جدار الحماية / Windows Firewall

If other computers cannot connect, allow the port through Windows Firewall on the server PC:

**Method 1 — Automatic (run as Administrator):**
```cmd
netsh advfirewall firewall add rule name="BSCH Server" dir=in action=allow protocol=TCP localport=8080
```

**Method 2 — Manual:**
1. Open **Windows Defender Firewall with Advanced Security**
2. Click **Inbound Rules** → **New Rule**
3. Rule type: **Port** → TCP → Specific port: **8080**
4. Action: **Allow the connection**
5. Apply to: **Domain**, **Private** (uncheck Public for security)
6. Name: `BSCH Server`

---

## 4. اختصار سطح المكتب / Desktop Shortcut for Staff

Create a shortcut on each client computer's desktop for quick access:

1. Right-click the desktop → **New** → **Shortcut**
2. Location: `http://192.168.1.5:8080`
3. Name: `نظام BSCH`
4. (Optional) Right-click the shortcut → Properties → Change Icon → browse to a hospital icon

Alternatively, staff can **install the app as a PWA** (see below) for a native app experience.

---

## 5. استخدام اسم مضيف / Using a Hostname (Optional)

Instead of remembering an IP address, you can assign a hostname to the server:

**Windows Hosts File Method** (on each client PC, run Notepad as Administrator):
1. Open `C:\Windows\System32\drivers\etc\hosts`
2. Add a line:
   ```
   192.168.1.5   bsch-hospital
   ```
3. Save. Now staff can access `http://bsch-hospital:8080`

**Router DNS Method** (if your router supports local DNS):
- Configure your router to resolve `bsch.local` or similar to `192.168.1.5`
- All devices on the LAN can then use `http://bsch.local:8080`

---

## 6. التشغيل على المنفذ 80 / Using Port 80 (No Port Number)

To let staff access `http://192.168.1.5` without typing `:8080`:

1. Edit `.env` and set `PORT=80`
2. Restart the server (must run as Administrator for port 80)
3. Update the Windows Firewall rule to port 80

Or use **Port 8080 with Nginx** to redirect port 80:
- Install [Nginx for Windows](https://nginx.org/en/docs/windows.html)
- Configure a reverse proxy from port 80 → 8080

---

## 7. تشغيل تلقائي عند بدء Windows / Auto-Start on Windows Boot

Use **NSSM** (Non-Sucking Service Manager) to run BSCH as a Windows Service
that starts automatically on boot:

```cmd
# Download NSSM from https://nssm.cc
nssm install BSCH "node" "--enable-source-maps artifacts\api-server\dist\index.mjs"
nssm set BSCH AppDirectory "C:\Medical-Case-Manager"
nssm set BSCH AppEnvironmentExtra PORT=8080 NODE_ENV=production FRONTEND_DIR=artifacts\bsch\dist\public DATABASE_URL=postgresql://bsch_user:password@localhost:5432/bsch_db SESSION_SECRET=your_secret
nssm set BSCH AppRestartDelay 5000
nssm start BSCH
```

Verify the service is running:
```cmd
nssm status BSCH
```

---

## 8. تثبيت التطبيق (PWA) / Installing as a PWA on Devices

The system is a **Progressive Web App** — it can be installed on any device
for a native app-like experience with an icon on the home screen.

### Android (Chrome / Samsung Internet)

1. Open `http://192.168.1.5:8080` in Chrome
2. Tap the **⋮ menu** → **"Add to Home screen"** (or the install banner appears automatically)
3. Tap **Install**
4. The app icon appears on the home screen

### iPhone / iPad (Safari)

1. Open `http://192.168.1.5:8080` in **Safari** (must be Safari, not Chrome)
2. Tap the **Share button** (⬆) at the bottom
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **Add**
5. The app icon appears on the home screen

### Windows (Chrome / Edge)

1. Open `http://192.168.1.5:8080` in Chrome or Edge
2. Look for the **install icon** (⊕) in the address bar, or go to menu → **"Install BSCH"**
3. Click **Install**
4. The app opens in its own window, like a desktop app

### After Installation

- The app works offline for static content (cached on first load)
- API calls require the server to be running on the hospital LAN
- The app icon can be pinned to the taskbar (Windows) or dock (Mac)

---

## 9. الأمان / Security Considerations

| Risk | Mitigation |
|------|-----------|
| Unauthorized LAN access | Change default password immediately; use named user accounts with restricted access |
| Port 8080 exposed publicly | Block port 8080 on your router's WAN firewall; only allow on LAN |
| Data loss | Run daily automated backups via Task Scheduler (see BACKUP.md) |
| Server going offline | Configure NSSM for automatic restart on crash |

**The system is designed for trusted hospital LAN use. Do not expose port 8080 to the public internet.**

---

## 10. استكشاف الأخطاء / Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't connect from other computers | Check Windows Firewall rule; verify both devices are on same LAN |
| IP address changes after server restart | Set a static IP on the server PC (Windows Network Settings) |
| App shows "offline" | Verify server PC is running StartServer.bat; check LAN connection |
| Very slow loading | Ensure server PC is connected via Ethernet (not Wi-Fi) |
| Port 8080 already in use | Another program uses port 8080; change PORT in .env to 8081 or 8090 |
