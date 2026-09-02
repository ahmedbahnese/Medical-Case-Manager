@echo off
setlocal
set "TASK_NAME=BSCH Medical Case Manager LAN Server"
schtasks /Delete /TN "%TASK_NAME%" /F
if errorlevel 1 (
    echo تعذر حذف المهمة أو أنها غير موجودة.
    pause
    exit /b 1
)
echo تم إلغاء التشغيل التلقائي لخادم BSCH.
pause
