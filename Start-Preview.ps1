$ErrorActionPreference='Stop'
$phpPath=Join-Path (Split-Path $PSScriptRoot -Parent) '.shifttrack-runtime\php\php.exe'
if(!(Test-Path -LiteralPath $phpPath)){throw 'Install PHP 8.3+ and run php -S 127.0.0.1:8091 -t public'}
Start-Process -FilePath $phpPath -ArgumentList '-S 127.0.0.1:8091 -t public' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
Start-Process 'http://127.0.0.1:8091'
