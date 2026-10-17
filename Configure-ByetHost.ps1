$ErrorActionPreference='Stop'
$phpPath=Join-Path (Split-Path $PSScriptRoot -Parent) '.shifttrack-runtime\php\php.exe'
$destination=Join-Path $PSScriptRoot 'dist\byethost-latest\private\config.php'
if(!(Test-Path -LiteralPath (Split-Path $destination -Parent))){throw 'Build the deployment folder first'}
$mysqlSecret=Read-Host 'ByetHost / vPanel password' -AsSecureString
$ownerSecret=Read-Host 'Choose ShiftTrack owner password (12+ characters)' -AsSecureString
$confirmation=Read-Host 'Repeat ShiftTrack owner password' -AsSecureString
$mysqlPlain=[Net.NetworkCredential]::new('',$mysqlSecret).Password
$ownerPlain=[Net.NetworkCredential]::new('',$ownerSecret).Password
$confirmPlain=[Net.NetworkCredential]::new('',$confirmation).Password
if($ownerPlain.Length -lt 12 -or $ownerPlain -cne $confirmPlain){throw 'Owner password too short or confirmation differs'}
try{
 $env:SHIFTTRACK_MYSQL_PASSWORD=$mysqlPlain
 $env:SHIFTTRACK_OWNER_PASSWORD=$ownerPlain
 $env:SHIFTTRACK_CONFIG_DESTINATION=$destination
 & $phpPath (Join-Path $PSScriptRoot 'tests\write-host-config.php')
 if($LASTEXITCODE -ne 0){throw 'Configuration failed'}
}finally{
 Remove-Item Env:SHIFTTRACK_MYSQL_PASSWORD,Env:SHIFTTRACK_OWNER_PASSWORD,Env:SHIFTTRACK_CONFIG_DESTINATION -ErrorAction SilentlyContinue
 $mysqlPlain=$null;$ownerPlain=$null;$confirmPlain=$null
}
Write-Host 'Ready. Upload the generated private/config.php outside htdocs. Do not share this file.'
