@echo off
setlocal
netsh advfirewall firewall add rule name="BSCH Medical Case Manager LAN" dir=in action=allow protocol=TCP localport=8080 profile=any
if errorlevel 1 (
  echo تعذر فتح المنفذ. شغل هذا الملف بصلاحية Run as administrator.
  pause
  exit /b 1
)
echo تم فتح منفذ التطبيق 8080 داخل الشبكة بنجاح.
echo شغل التطبيق على السيرفر ثم افتح من الأجهزة الأخرى: http://SERVER-IP:8080
pause
