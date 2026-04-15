$ibdPath = "C:\xampp\mysql\data\practice_erp"
$results = @{}

# Priority tables to recover
$priorityTables = @(
    "users", "students", "teachers", "fee_invoices", 
    "fee_payments", "academic_years", "class_sections", "subjects"
)

function Extract-StringsFromFile {
    param($FilePath)
    
    $minLength = 3
    $content = [System.IO.File]::ReadAllBytes($FilePath)
    $strings = @()
    $currentString = ""
    
    foreach ($byte in $content) {
        if ($byte -ge 32 -and $byte -le 126) {
            $currentString += [char]$byte
        } else {
            if ($currentString.Length -ge $minLength) {
                $strings += $currentString
            }
            $currentString = ""
        }
    }
    
    if ($currentString.Length -ge $minLength) {
        $strings += $currentString
    }
    
    return $strings
}

Write-Output "Starting data recovery process..."

foreach ($table in $priorityTables) {
    $ibdFile = Join-Path $ibdPath "$table.ibd"
    
    if (Test-Path $ibdFile) {
        Write-Output "Processing $table.ibd..."
        
        $tableData = @{
            table_name = $table
            file_size = (Get-Item $ibdFile).Length
            data_patterns = @{}
            sample_data = @()
            estimated_record_count = 0
        }
        
        $strings = Extract-StringsFromFile -FilePath $ibdFile
        
        # Pattern detection
        $emails = $strings | Where-Object { $_ -match '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' }
        $dates = $strings | Where-Object { $_ -match '\d{4}-\d{2}-\d{2}' }
        $phoneNumbers = $strings | Where-Object { $_ -match '^\d{10,15}$' }
        $names = $strings | Where-Object { $_ -match '^[A-Z][a-z]+ [A-Z][a-z]+$' }
        $amounts = $strings | Where-Object { $_ -match '^\d+\.?\d{0,2}$' -and [int]$_.Length -le 10 }
        
        $tableData.data_patterns["emails"] = $emails.Count
        $tableData.data_patterns["dates"] = $dates.Count
        $tableData.data_patterns["phone_numbers"] = $phoneNumbers.Count
        $tableData.data_patterns["names"] = $names.Count
        $tableData.data_patterns["numeric_values"] = $amounts.Count
        
        # Sample extraction based on table type
        switch ($table) {
            "users" {
                if ($emails.Count -gt 0) {
                    $tableData.sample_data += $emails | Select-Object -First 5
                }
                if ($names.Count -gt 0) {
                    $tableData.sample_data += $names | Select-Object -First 5
                }
            }
            "students" {
                if ($names.Count -gt 0) {
                    $tableData.sample_data += $names | Select-Object -First 5
                }
                $tableData.sample_data += $strings | Where-Object { $_ -match 'class|section|grade' } | Select-Object -First 3
            }
            "fee_invoices" {
                $tableData.sample_data += $strings | Where-Object { $_ -match 'INV|invoice' } | Select-Object -First 5
                if ($amounts.Count -gt 0) {
                    $tableData.sample_data += $amounts | Select-Object -First 5
                }
            }
            "fee_payments" {
                if ($amounts.Count -gt 0) {
                    $tableData.sample_data += $amounts | Select-Object -First 5
                }
                $tableData.sample_data += $strings | Where-Object { $_ -match 'paid|payment|gateway' } | Select-Object -First 3
            }
            default {
                $tableData.sample_data += $strings | Where-Object { $_.Length -gt 5 -and $_.Length -lt 100 } | Select-Object -First 10
            }
        }
        
        # Estimate record count based on patterns
        $tableData.estimated_record_count = [Math]::Max($emails.Count, [Math]::Max($names.Count, $dates.Count))
        
        $results[$table] = $tableData
    }
}

$results | ConvertTo-Json -Depth 4 | Out-File -FilePath ".\data_recovery_initial.json" -Encoding UTF8
Write-Output "Initial recovery complete. Saved to data_recovery_initial.json"
Get-Content ".\data_recovery_initial.json" | Select-Object -First 50
