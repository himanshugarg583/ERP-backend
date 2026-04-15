$ErrorActionPreference = 'Stop'

$mysql = 'c:\xampp\mysql\bin\mysql.exe'
$db = 'practice_erp_v3'
$oldDir = 'c:\xampp\mysql\old_data\practice_erp_v3'
$newDir = 'c:\xampp\mysql\data\practice_erp_v3'

function Invoke-MySqlRaw([string]$sql) {
  & $mysql -h 127.0.0.1 -P 3308 -u root -D $db --batch --raw --skip-column-names -e $sql
}

function Invoke-MySql([string]$sql) {
  & $mysql -h 127.0.0.1 -P 3308 -u root -D $db -e $sql
  if ($LASTEXITCODE -ne 0) {
    throw "MySQL failed: $sql"
  }
}

$oldTables = Get-ChildItem -Path $oldDir -Filter *.ibd | ForEach-Object { $_.BaseName } | Sort-Object -Unique
$currentTables = @(Invoke-MySqlRaw "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='$db';")
$tables = $oldTables | Where-Object { $currentTables -contains $_ }

if (-not $tables -or $tables.Count -eq 0) {
  throw 'No recoverable table intersection found between old_data and current schema.'
}

Write-Output "Tables to recover: $($tables.Count)"

$indexDefs = @{}
$fkDefs = @{}

foreach ($t in $tables) {
  $idxRows = @(Invoke-MySqlRaw @"
SELECT INDEX_NAME, NON_UNIQUE, INDEX_TYPE,
       GROUP_CONCAT(CONCAT('`', COLUMN_NAME, '`') ORDER BY SEQ_IN_INDEX SEPARATOR ',')
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA='$db' AND TABLE_NAME='$t' AND INDEX_NAME <> 'PRIMARY'
GROUP BY INDEX_NAME, NON_UNIQUE, INDEX_TYPE;
"@)

  $idxList = @()
  foreach ($row in $idxRows) {
    if ([string]::IsNullOrWhiteSpace($row)) { continue }
    $parts = $row -split "`t"
    if ($parts.Count -lt 4) { continue }
    $idxList += [PSCustomObject]@{
      Name      = $parts[0]
      NonUnique = $parts[1]
      IndexType = $parts[2]
      Columns   = $parts[3]
    }
  }
  $indexDefs[$t] = $idxList

  $fkRows = @(Invoke-MySqlRaw @"
SELECT rc.CONSTRAINT_NAME,
       rc.UPDATE_RULE,
       rc.DELETE_RULE,
       kcu.REFERENCED_TABLE_NAME,
       GROUP_CONCAT(CONCAT('`', kcu.COLUMN_NAME, '`') ORDER BY kcu.ORDINAL_POSITION SEPARATOR ','),
       GROUP_CONCAT(CONCAT('`', kcu.REFERENCED_COLUMN_NAME, '`') ORDER BY kcu.ORDINAL_POSITION SEPARATOR ',')
FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
 AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
 AND rc.TABLE_NAME = kcu.TABLE_NAME
WHERE rc.CONSTRAINT_SCHEMA='$db' AND rc.TABLE_NAME='$t'
GROUP BY rc.CONSTRAINT_NAME, rc.UPDATE_RULE, rc.DELETE_RULE, kcu.REFERENCED_TABLE_NAME;
"@)

  $fkList = @()
  foreach ($row in $fkRows) {
    if ([string]::IsNullOrWhiteSpace($row)) { continue }
    $parts = $row -split "`t"
    if ($parts.Count -lt 6) { continue }
    $fkList += [PSCustomObject]@{
      Name       = $parts[0]
      UpdateRule = $parts[1]
      DeleteRule = $parts[2]
      RefTable   = $parts[3]
      Columns    = $parts[4]
      RefColumns = $parts[5]
    }
  }
  $fkDefs[$t] = $fkList
}

$importOk = @()
$importFail = @()

foreach ($t in $tables) {
  try {
    Write-Output "[IMPORT] $t"

    foreach ($fk in $fkDefs[$t]) {
      try {
        Invoke-MySql "ALTER TABLE $t DROP FOREIGN KEY $($fk.Name);"
      }
      catch {
        Write-Output "  FK drop skipped: $t.$($fk.Name)"
      }
    }

    foreach ($idx in $indexDefs[$t]) {
      try {
        Invoke-MySql "ALTER TABLE $t DROP INDEX $($idx.Name);"
      }
      catch {
        Write-Output "  Index drop skipped: $t.$($idx.Name)"
      }
    }

    Invoke-MySql "SET FOREIGN_KEY_CHECKS=0; ALTER TABLE $t DISCARD TABLESPACE; SET FOREIGN_KEY_CHECKS=1;"

    Copy-Item -Force (Join-Path $oldDir "$t.ibd") (Join-Path $newDir "$t.ibd")

    Invoke-MySql "ALTER TABLE $t IMPORT TABLESPACE;"

    $importOk += $t
  }
  catch {
    $importFail += [PSCustomObject]@{ Table = $t; Error = $_.Exception.Message }
    Write-Output "  IMPORT FAILED: $t :: $($_.Exception.Message)"
  }
}

$indexFail = @()
foreach ($t in $tables) {
  foreach ($idx in $indexDefs[$t]) {
    try {
      $unique = if ($idx.NonUnique -eq '0') { 'UNIQUE ' } else { '' }
      $using = if ($idx.IndexType -and $idx.IndexType -ne 'BTREE') { " USING $($idx.IndexType)" } else { '' }
      Invoke-MySql "ALTER TABLE $t ADD ${unique}INDEX $($idx.Name) ($($idx.Columns))$using;"
    }
    catch {
      $indexFail += [PSCustomObject]@{ Table = $t; IndexName = $idx.Name; Error = $_.Exception.Message }
      Write-Output "  INDEX ADD FAILED: $t.$($idx.Name)"
    }
  }
}

$fkFail = @()
foreach ($t in $tables) {
  foreach ($fk in $fkDefs[$t]) {
    try {
      Invoke-MySql "ALTER TABLE $t ADD CONSTRAINT $($fk.Name) FOREIGN KEY ($($fk.Columns)) REFERENCES $($fk.RefTable) ($($fk.RefColumns)) ON UPDATE $($fk.UpdateRule) ON DELETE $($fk.DeleteRule);"
    }
    catch {
      $fkFail += [PSCustomObject]@{ Table = $t; FKName = $fk.Name; Error = $_.Exception.Message }
      Write-Output "  FK ADD FAILED: $t.$($fk.Name)"
    }
  }
}

Write-Output '--- RECOVERY SUMMARY ---'
Write-Output "Imported OK: $($importOk.Count)"
Write-Output "Import Failed: $($importFail.Count)"
Write-Output "Index Recreate Failed: $($indexFail.Count)"
Write-Output "FK Recreate Failed: $($fkFail.Count)"

if ($importFail.Count -gt 0) {
  Write-Output '--- IMPORT FAILURES ---'
  $importFail | ForEach-Object { Write-Output ("{0} :: {1}" -f $_.Table, $_.Error) }
}
if ($indexFail.Count -gt 0) {
  Write-Output '--- INDEX FAILURES ---'
  $indexFail | ForEach-Object { Write-Output ("{0}.{1} :: {2}" -f $_.Table, $_.IndexName, $_.Error) }
}
if ($fkFail.Count -gt 0) {
  Write-Output '--- FK FAILURES ---'
  $fkFail | ForEach-Object { Write-Output ("{0}.{1} :: {2}" -f $_.Table, $_.FKName, $_.Error) }
}
