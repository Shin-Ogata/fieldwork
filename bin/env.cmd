@echo off

if DEFINED SHELL_ENV (
	exit /B 0
)
set SHELL_ENV=true

setlocal
set BIN_DIR=%~dp0
for /F "delims=" %%C in ("%BIN_DIR:~0,-1%") do set ROOT_DIR=%%~dpC
set PATH=%ROOT_DIR%node_modules\.bin;%PATH%
endlocal && set PATH=%PATH%
set NO_UPDATE_NOTIFIER=true
