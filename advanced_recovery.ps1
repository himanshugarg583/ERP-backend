# Advanced InnoDB Data Recovery Script
$ibdPath = "C:\xampp\mysql\data\practice_erp"
$outputFile = ".\data_recovery.json"
$results = @{}

# Priority tables
$priorityTables = @(
    "users", "students", "teachers", "fee_invoices", 
    "fee_payments", "academic_years", "class_sections", "subjects"
)

function Extract-DataFromIBD {
    param($FilePath, $TableName)
    
    Write-Host "Analyzing $TableName..." -ForegroundColor Yellow
    
    $fileBytes = [System.IO.File]::ReadAllBytes($FilePath)
    $fileSize = $fileBytes.Length
    
    # Extract all readable strings (minimum 4 chars)
    $strings = @()
    $currentString = ""
    $stringPositions = @{}
    
    for ($i = 0; $i -lt $fileSize; $i++) {
        $byte = $fileBytes[$i]
        if ($byte -ge 32 -and $byte -le 126) {
            $currentString += [char]$byte
        } else {
            if ($currentString.Length -ge 4) {
                $strings += $currentString
                $stringPositions[$currentString] = $i - $currentString.Length
            }
            $currentString = ""
        }
    }
    
    # Look for UTF-8 encoded strings as well
    $utf8Strings = @()
    try {
        $text = [System.Text.Encoding]::UTF8.GetString($fileBytes)
        $utf8Strings = [regex]::Matches($text, '[\x20-\x7E]{4,}') | ForEach-Object { $_.Value }
    } catch {}
    
    $allStrings = $strings + $utf8Strings | Select-Object -Unique
    
    # Pattern matching for different data types
    $patterns = @{
        emails = @()
        dates = @()
        timestamps = @()
        phones = @()
        names = @()
        numbers = @()
        json = @()
        urls = @()
        ids = @()
        passwords = @()
    }
    
    foreach ($str in $allStrings) {
        # Email pattern
        if ($str -match '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}') {
            $patterns.emails += $Matches[0]
        }
        
        # Date patterns
        if ($str -match '\d{4}-\d{2}-\d{2}') {
            $patterns.dates += $Matches[0]
        }
        if ($str -match '\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}') {
            $patterns.timestamps += $Matches[0]
        }
        
        # Phone numbers
        if ($str -match '\b\d{10,15}\b' -or $str -match '\+\d{1,3}-?\d{3,14}') {
            $patterns.phones += $Matches[0]
        }
        
        # Names (Title case words)
        if ($str -match '\b[A-Z][a-z]+ [A-Z][a-z]+\b') {
            $patterns.names += $Matches[0]
        }
        
        # JSON structures
        if ($str -match '\{.*\}' -or $str -match '\[.*\]') {
            $patterns.json += $str
        }
        
        # URLs
        if ($str -match 'https?://[^\s]+') {
            $patterns.urls += $Matches[0]
        }
        
        # UUIDs or IDs
        if ($str -match '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}') {
            $patterns.ids += $Matches[0]
        }
        
        # BCrypt or other password hashes
        if ($str -match '\$2[ayb]\$.{56}') {
            $patterns.passwords += $str
        }
        
        # Numeric values
        if ($str -match '^\d+\.?\d*$' -and $str.Length -le 10) {
            $patterns.numbers += $str
        }
    }
    
    # Table-specific extraction logic
    $tableSpecificData = @()
    
    switch ($TableName) {
        "users" {
            # Try to correlate emails with names and roles
            for ($i = 0; $i -lt [Math]::Min($patterns.emails.Count, 10); $i++) {
                $record = @{
                    email = if ($patterns.emails.Count -gt $i) { $patterns.emails[$i] } else { $null }
                    name = if ($patterns.names.Count -gt $i) { $patterns.names[$i] } else { $null }
                    password_hash = if ($patterns.passwords.Count -gt $i) { $patterns.passwords[$i].Substring(0, [Math]::Min(20, $patterns.passwords[$i].Length)) + "..." } else { $null }
                }
                if ($record.email -or $record.name) {
                    $tableSpecificData += $record
                }
            }
        }
        
        "students" {
            # Extract student records
            $enrollmentNumbers = $allStrings | Where-Object { $_ -match 'ENR\d+|STU\d+|ROLL\d+|\d{6,10}' }
            for ($i = 0; $i -lt [Math]::Min($patterns.names.Count, 10); $i++) {
                $record = @{
                    name = if ($patterns.names.Count -gt $i) { $patterns.names[$i] } else { $null }
                    enrollment = if ($enrollmentNumbers.Count -gt $i) { $enrollmentNumbers[$i] } else { $null }
                    class = $allStrings | Where-Object { $_ -match 'Class|Grade|Section' } | Select-Object -First 1
                }
                if ($record.name -or $record.enrollment) {
                    $tableSpecificData += $record
                }
            }
        }
        
        "fee_invoices" {
            # Extract invoice data
            $invoiceNumbers = $allStrings | Where-Object { $_ -match 'INV\d+|INVOICE\d+|\d{6,}' }
            $amounts = $patterns.numbers | Where-Object { [double]$_ -gt 0 -and [double]$_ -lt 1000000 }
            
            for ($i = 0; $i -lt [Math]::Min($invoiceNumbers.Count, 10); $i++) {
                $record = @{
                    invoice_number = if ($invoiceNumbers.Count -gt $i) { $invoiceNumbers[$i] } else { $null }
                    amount = if ($amounts.Count -gt $i) { $amounts[$i] } else { $null }
                    date = if ($patterns.dates.Count -gt $i) { $patterns.dates[$i] } else { $null }
                }
                if ($record.invoice_number -or $record.amount) {
                    $tableSpecificData += $record
                }
            }
        }
        
        "fee_payments" {
            # Extract payment records
            $paymentIds = $allStrings | Where-Object { $_ -match 'PAY\d+|PMT\d+|TXN\d+' }
            $amounts = $patterns.numbers | Where-Object { [double]$_ -gt 0 -and [double]$_ -lt 1000000 }
            
            for ($i = 0; $i -lt [Math]::Min($paymentIds.Count, 10); $i++) {
                $record = @{
                    payment_id = if ($paymentIds.Count -gt $i) { $paymentIds[$i] } else { $null }
                    amount = if ($amounts.Count -gt $i) { $amounts[$i] } else { $null }
                    date = if ($patterns.timestamps.Count -gt $i) { $patterns.timestamps[$i] } else { $null }
                    method = $allStrings | Where-Object { $_ -match 'cash|online|cheque|card' -and $_.Length -lt 20 } | Select-Object -First 1
                }
                if ($record.payment_id -or $record.amount) {
                    $tableSpecificData += $record
                }
            }
        }
        
        "academic_years" {
            # Extract academic year data
            $years = $allStrings | Where-Object { $_ -match '20\d{2}-20\d{2}|20\d{2}' }
            foreach ($year in ($years | Select-Object -Unique -First 5)) {
                $tableSpecificData += @{ year = $year }
            }
        }
        
        "class_sections" {
            # Extract class and section data
            $classes = $allStrings | Where-Object { $_ -match 'Class \d+|Grade \d+|Section [A-Z]|Std \d+' }
            foreach ($class in ($classes | Select-Object -Unique -First 10)) {
                $tableSpecificData += @{ class_section = $class }
            }
        }
        
        "subjects" {
            # Extract subject names
            $subjects = $allStrings | Where-Object { 
                $_ -match 'Math|Science|English|Hindi|History|Geography|Physics|Chemistry|Biology|Computer' -or
                ($_.Length -gt 3 -and $_.Length -lt 50 -and $_ -match '^[A-Z][a-z]+')
            }
            foreach ($subject in ($subjects | Select-Object -Unique -First 10)) {
                $tableSpecificData += @{ subject_name = $subject }
            }
        }
        
        "teachers" {
            # Extract teacher data
            for ($i = 0; $i -lt [Math]::Min($patterns.names.Count, 10); $i++) {
                $record = @{
                    name = if ($patterns.names.Count -gt $i) { $patterns.names[$i] } else { $null }
                    email = if ($patterns.emails.Count -gt $i) { $patterns.emails[$i] } else { $null }
                    phone = if ($patterns.phones.Count -gt $i) { $patterns.phones[$i] } else { $null }
                }
                if ($record.name -or $record.email) {
                    $tableSpecificData += $record
                }
            }
        }
    }
    
    # Build result object
    $result = @{
        table_name = $TableName
        file_size = $fileSize
        total_strings_found = $allStrings.Count
        estimated_record_count = [Math]::Max(
            $patterns.emails.Count, 
            [Math]::Max($patterns.names.Count, $patterns.dates.Count)
        )
        data_patterns = @{
            emails = $patterns.emails.Count
            dates = $patterns.dates.Count
            timestamps = $patterns.timestamps.Count
            phone_numbers = $patterns.phones.Count
            names = $patterns.names.Count
            numeric_values = $patterns.numbers.Count
            json_structures = $patterns.json.Count
            urls = $patterns.urls.Count
            uuids = $patterns.ids.Count
            password_hashes = $patterns.passwords.Count
        }
        sample_data = $tableSpecificData
        unique_emails = $patterns.emails | Select-Object -Unique -First 5
        unique_names = $patterns.names | Select-Object -Unique -First 5
    }
    
    return $result
}

# Process each priority table
foreach ($table in $priorityTables) {
    $ibdFile = Join-Path $ibdPath "$table.ibd"
    
    if (Test-Path $ibdFile) {
        $results[$table] = Extract-DataFromIBD -FilePath $ibdFile -TableName $table
    } else {
        Write-Host "File not found: $ibdFile" -ForegroundColor Red
    }
}

# Save complete results
$results | ConvertTo-Json -Depth 5 | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "`nRecovery complete! Results saved to $outputFile" -ForegroundColor Green

# Display summary
Write-Host "`n=== RECOVERY SUMMARY ===" -ForegroundColor Cyan
foreach ($table in $results.Keys) {
    $data = $results[$table]
    Write-Host "`nTable: $table" -ForegroundColor Yellow
    Write-Host "  - File Size: $($data.file_size) bytes"
    Write-Host "  - Total Strings Found: $($data.total_strings_found)"
    Write-Host "  - Estimated Records: $($data.estimated_record_count)"
    Write-Host "  - Sample Records Retrieved: $($data.sample_data.Count)"
    
    if ($data.data_patterns.emails -gt 0) {
        Write-Host "  - Emails Found: $($data.data_patterns.emails)" -ForegroundColor Green
    }
    if ($data.data_patterns.names -gt 0) {
        Write-Host "  - Names Found: $($data.data_patterns.names)" -ForegroundColor Green
    }
}

Write-Host "`nFull details available in: $outputFile" -ForegroundColor Cyan
