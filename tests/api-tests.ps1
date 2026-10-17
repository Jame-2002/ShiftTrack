param([string]$BaseUrl='http://127.0.0.1:8092')
$ErrorActionPreference='Stop'
$base=$BaseUrl+'/api.php?action='
$ownerSession=[Microsoft.PowerShell.Commands.WebRequestSession]::new()
$memberSession=[Microsoft.PowerShell.Commands.WebRequestSession]::new()
function Request($action,$payload,$session,$token,$expected=200){
 $args=@{Uri=($base+$action);WebSession=$session;SkipHttpErrorCheck=$true}
 if($null -ne $payload){$args.Method='POST';$args.ContentType='application/json';$args.Body=ConvertTo-Json $payload -Depth 10 -Compress;$args.Headers=@{'X-CSRF-Token'=$token}}
 $r=Invoke-WebRequest @args
 if([int]$r.StatusCode -ne $expected){throw "${action}: Expected $expected, got $($r.StatusCode): $($r.Content)"}
 return ($r.Content | ConvertFrom-Json)
}
$member=Request 'session' $null $memberSession ''
$token=$member.csrf
Request 'publish' @{month='2026-10'} $memberSession $token 401 | Out-Null
Request 'employee' @{employee='001'} $memberSession 'bad' 403 | Out-Null
Request 'publish' $null $memberSession '' 405 | Out-Null
$s=Request 'session' $null $ownerSession ''
$ownerToken=$s.csrf
$credential=Get-Content -LiteralPath (Join-Path $PSScriptRoot '../private/LOCAL_OWNER.txt') -Raw
$ownerPassword=[regex]::Match($credential,'Owner password: ([a-f0-9]+)').Groups[1].Value
Request 'login' @{password=$ownerPassword} $ownerSession $ownerToken | Out-Null
foreach($id in @('001','002')){Request 'employee' @{employee=$id;name="Test $id";emoji='🙂';active=1} $ownerSession $ownerToken | Out-Null}
$rows=@(@{employee='001';date='2026-10-01';code='E'},@{employee='001';date='2026-10-02';code='L'},@{employee='001';date='2026-10-03';code='N'},@{employee='002';date='2026-10-01';code='E'})
Request 'publish' @{month='2026-10';revision=0;reviewed=$true;rows=$rows} $ownerSession $ownerToken | Out-Null
$result=Request 'roster&employee=001&month=2026-10' $null $memberSession ''
if($result.total -ne 260 -or $result.rows.Count -ne 3 -or $result.person.employee -cne '001'){throw 'Total, row count, or leading-zero ID incorrect'}
if(($result.peers | Where-Object {$_.day -eq '2026-10-01'}).Count -ne 2){throw 'Peers incorrect'}
Request 'publish' @{month='2026-10';revision=0;reviewed=$true;rows=$rows} $ownerSession $ownerToken 409 | Out-Null
Request 'publish' @{month='2026-10';revision=1;reviewed=$true;rows=@($rows[0],$rows[0])} $ownerSession $ownerToken 422 | Out-Null
Request 'publish' @{month='2026-10';revision=1;reviewed=$true;rows=@(@{employee='999';date='2026-10-01';code='E'})} $ownerSession $ownerToken 422 | Out-Null
Request 'publish' @{month='2026-10';revision=1;reviewed=$true;rows=@(@{employee='001';date='2026-10-32';code='E'})} $ownerSession $ownerToken 422 | Out-Null
Request 'publish' @{month='2026-10';revision=1;reviewed=$true;rows=$rows} $ownerSession $ownerToken | Out-Null
$result=Request 'roster&employee=001&month=2026-10' $null $memberSession ''
if($result.rows.Count -ne 3 -or $result.total -ne 260){throw 'Repeated import changed totals'}
Request 'roster&employee=999&month=2026-10' $null $memberSession '' 404 | Out-Null
Request 'logout' @{} $ownerSession $ownerToken | Out-Null
Request 'admin' $null $ownerSession '' 401 | Out-Null
'PASS: anonymous access, CSRF, owner authorization, method restriction, IDs, 260-baht total, peers, revision conflict, duplicate rejection, unknown employee, invalid dates, idempotent import, logout'
