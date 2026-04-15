# Direct binary extraction from InnoDB files
$ibdPath = "C:\xampp\mysql\data\practice_erp"

function Get-IBDStrings {
    param($FilePath, $MinLength = 4)
    
    $bytes = [System.IO.File]::ReadAllBytes($FilePath)
    $strings = New-Object System.Collections.ArrayList
    $current = ""
    
    foreach ($byte in $bytes) {
        if ($byte -ge 32 -and $byte -le 126) {
            $current += [char]$byte
        } else {
            if ($current.Length -ge $MinLength) {
                [void]$strings.Add($current)
            }
            $current = ""
        }
    }
    if ($current.Length -ge $MinLength) {
        [void]$strings.Add($current)
    }
    return $strings
}

Write-Host "DIRECT STRING EXTRACTION FROM IBD FILES" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check users.ibd specifically
$usersFile = Join-Path $ibdPath "users.ibd"
if (Test-Path $usersFile) {
    Write-Host "USERS TABLE:" -ForegroundColor Yellow
    $userStrings = Get-IBDStrings -FilePath $usersFile -MinLength 5
    
    # Find email-like patterns
    $emails = $userStrings | Where-Object { $_ -match '@' }
    Write-Host "  Email patterns found: $($emails.Count)"
    $emails | Select-Object -First 10 | ForEach-Object { Write-Host "    - $_" }
    
    # Find name-like patterns
    Write-Host "`n  Possible names (capitalized words):"
    $userStrings | Where-Object { $_ -match '^[A-Z][a-z]+' -and $_.Length -lt 30 } | 
        Select-Object -Unique -First 10 | ForEach-Object { Write-Host "    - $_" }
}

# Check students.ibd
$studentsFile = Join-Path $ibdPath "students.ibd"
if (Test-Path $studentsFile) {
    Write-Host "`nSTUDENTS TABLE:" -ForegroundColor Yellow
    $studentStrings = Get-IBDStrings -FilePath $studentsFile -MinLength 5
    
    Write-Host "  Total strings found: $($studentStrings.Count)"
    Write-Host "  Sample strings (length 5-50):"
    $studentStrings | Where-Object { $_.Length -ge 5 -and $_.Length -le 50 } | 
        Select-Object -Unique -First 15 | ForEach-Object { Write-Host "    - $_" }
}

# Check fee_invoices.ibd
$invoiceFile = Join-Path $ibdPath "fee_invoices.ibd"
if (Test-Path $invoiceFile) {
    Write-Host "`nFEE_INVOICES TABLE:" -ForegroundColor Yellow
    $invoiceStrings = Get-IBDStrings -FilePath $invoiceFile -MinLength 4
    
    Write-Host "  Total strings found: $($invoiceStrings.Count)"
    if ($invoiceStrings.Count -gt 0) {
        Write-Host "  All strings found:"
        $invoiceStrings | ForEach-Object { Write-Host "    - $_" }
    }
}

# Check fee_payments.ibd
$paymentFile = Join-Path $ibdPath "fee_payments.ibd"
if (Test-Path $paymentFile) {
    Write-Host "`nFEE_PAYMENTS TABLE:" -ForegroundColor Yellow
    $paymentStrings = Get-IBDStrings -FilePath $paymentFile -MinLength 4
    
    Write-Host "  Total strings found: $($paymentStrings.Count)"
    if ($paymentStrings.Count -gt 0) {
        Write-Host "  All strings found:"
        $paymentStrings | ForEach-Object { Write-Host "    - $_" }
    }
}
