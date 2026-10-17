$ErrorActionPreference='Stop'
$base='http://127.0.0.1:8092/api.php?action='
$session=[Microsoft.PowerShell.Commands.WebRequestSession]::new()
$initial=Invoke-RestMethod ($base+'session') -WebSession $session
$headers=@{'X-CSRF-Token'=$initial.csrf}
function Call($action,$data=$null,$expected=200){
 $options=@{Uri=($base+$action);WebSession=$session;SkipHttpErrorCheck=$true}
 if($null -ne $data){$options.Method='POST';$options.ContentType='application/json';$options.Headers=$headers;$options.Body=ConvertTo-Json $data -Depth 12 -Compress}
 $r=Invoke-WebRequest @options
 if([int]$r.StatusCode -ne $expected){throw "Expected $expected for $action, got $($r.StatusCode): $($r.Content)"}
 if($r.Headers['Content-Type'] -match 'json'){return $r.Content|ConvertFrom-Json}
 return $r
}
$owner=Get-Content -LiteralPath (Join-Path $PSScriptRoot '../private/LOCAL_OWNER.txt') -Raw
$password=[regex]::Match($owner,'Owner password: ([a-f0-9]+)').Groups[1].Value
Call 'login' @{password='incorrect'} 401 | Out-Null
Call 'login' @{password=$password} | Out-Null
$photo='data:image/png;base64,'+[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $PSScriptRoot '../public/assets/icon-192.png')))
Call 'employee' @{employee='003';name='QA photo';active=1;avatar=$photo} | Out-Null
$image=Call 'avatar&employee=003'
if($image.Headers['Content-Type'] -notmatch 'image/png'){throw 'Avatar content type wrong'}
Call 'employee' @{employee='003';name='QA edited';active=1;avatar='data:image/png;base64,invalid'} 422 | Out-Null
$admin=Call 'admin';if(($admin.employees|Where-Object employee -eq '003').name -ne 'QA photo'){throw 'Invalid photo changed member'}
Call 'employee' @{employee='003';name='QA edited';active=1;remove_avatar=$true} | Out-Null
Call 'avatar&employee=003' $null 404 | Out-Null
Call 'employee' @{employee='003';name='QA edited';active=0} | Out-Null
Call 'roster&employee=003&month=2026-10' $null 404 | Out-Null
Call 'employee' @{employee='003';name='QA edited';active=1} | Out-Null
Call 'employee' @{employee='bad id';name='QA';active=1} 422 | Out-Null
Call 'employee' @{employee='004';name='';active=1} 422 | Out-Null
Call 'rates' @{rates=@(@{code='E';amount='80.25'})} | Out-Null
$r=Call 'roster&employee=001&month=2026-10';if($r.total -ne 260.25){throw 'Decimal rates incorrect'}
Call 'rates' @{rates=@(@{code='E';amount='90'},@{code='L';amount='-1'})} 422 | Out-Null
$r=Call 'roster&employee=001&month=2026-10';if($r.total -ne 260.25){throw 'Rate rollback failed'}
Call 'rates' @{rates=@(@{code='E';amount=$null})} | Out-Null
$r=Call 'roster&employee=001&month=2026-10';if($null -ne $r.total){throw 'Missing rate must not show zero total'}
Call 'rates' @{rates=@(@{code='E';amount='80'})} | Out-Null
$rows=@(@{employee='001';date='2028-02-29';code='PH'},@{employee='001';date='2028-02-28';code='BL'},@{employee='001';date='2028-02-27';code='D'})
Call 'publish' @{month='2028-02';revision=0;reviewed=$false;rows=$rows} 422 | Out-Null
Call 'publish' @{month='2028-02';revision=0;reviewed=$true;rows=$rows} | Out-Null
$r=Call 'roster&employee=001&month=2028-02';if($r.rows.Count -ne 3 -or $r.total -ne 0 -or $r.peers.Count -ne 1){throw 'Leap month, zero rates or leave peers incorrect'}
Call 'publish' @{month='2028-02';revision=1;reviewed=$true;rows=@(@{employee='001';date='2028-02-30';code='E'})} 422 | Out-Null
Call 'roster&employee=001&month=2026-09' | Out-Null
Call 'logout' @{} | Out-Null
Call 'rates' @{rates=@(@{code='E';amount=99})} 403 | Out-Null
'PASS: wrong login, create/edit/photo/remove/deactivate/reactivate, input validation, decimal/unset rates, rollback, leap dates, leave peers, empty month, logout CSRF'
