[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Web.Extensions
$ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$ser.MaxJsonLength = 2147483647

$projectDir = (Get-Location).Path
$uploadsDir = $projectDir
$i18nDir = "$projectDir\js\i18n"

$langs = @('tr', 'az', 'uz', 'kk', 'tk', 'ky', 'en')
$allData = @{}
foreach ($l in $langs) {
    $allData[$l] = New-Object 'System.Collections.Generic.Dictionary[string, string]'
}

function Set-Translation($l, $k, $v) {
    if ([string]::IsNullOrWhiteSpace($k) -or $null -eq $v) { return }
    $allData[$l][$k] = [string]$v
}

Write-Host "1. Loading window.TDA_I18N_DATA from master JS data..."
$jsPath = (Get-ChildItem -Path $projectDir -Filter "*i18n-data.js" | Select-Object -First 1).FullName
if (Test-Path $jsPath) {
    $jsContent = [System.IO.File]::ReadAllText($jsPath, [System.Text.Encoding]::UTF8)
    $startIdx = $jsContent.IndexOf("window.TDA_I18N_DATA =")
    if ($startIdx -ge 0) {
        $sub = $jsContent.Substring($startIdx + 22).Trim()
        if ($sub.EndsWith(";")) { $sub = $sub.Substring(0, $sub.Length - 1).Trim() }
        $tdaData = $ser.DeserializeObject($sub)
        $resources = $tdaData['resources']
        foreach ($l in $langs) {
            if ($resources.ContainsKey($l)) {
                $dict = $resources[$l]
                foreach ($k in $dict.Keys) {
                    Set-Translation $l $k $dict[$k]
                }
            }
        }
        Write-Host "Loaded resources from TDA_I18N_DATA."
    }
}

Write-Host "2. Loading dictionaries from original HTML..."
$htmlPath = "C:\Users\Lenovo\.gemini\antigravity\brain\e9369e65-06ab-497c-a5f8-d0d692e6e4e3\.user_uploaded\media_1792416859293_405821ba.html"
if (-not (Test-Path $htmlPath)) {
    $htmlPath = "$projectDir\index.html"
}
if (Test-Path $htmlPath) {
    $htmlContent = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)
    
    $dictVars = @(
        'translations',
        'authTranslations',
        'uiExtraTranslations',
        'completeStaticTranslations',
        'pointRuleTranslations',
        'manualTranslations',
        'finalExtraTranslations',
        'finalExtra2',
        'qualityTranslations',
        'flagCardTranslations',
        'runtimeI18n',
        'skillTranslations',
        'DONATION_I18N',
        'FEATURE_I18N',
        'MATCH_NOTE_I18N',
        'CERT_I18N',
        'TURAN_I18N'
    )
    
    foreach ($var in $dictVars) {
        $pattern = "(?s)(?:const|let|var)?\s+$var\s*=\s*(\{.*?\});"
        $m = [regex]::Match($htmlContent, $pattern)
        if ($m.Success) {
            try {
                $dictObj = $ser.DeserializeObject($m.Groups[1].Value)
                foreach ($l in $langs) {
                    if ($dictObj.ContainsKey($l)) {
                        $subDict = $dictObj[$l]
                        foreach ($k in $subDict.Keys) {
                            Set-Translation $l $k $subDict[$k]
                            if (-not $allData['tr'].ContainsKey($k)) {
                                Set-Translation 'tr' $k $k
                            }
                        }
                    }
                }
            } catch {
                Write-Host "Error parsing $var : $($_.Exception.Message)"
            }
        }
    }

    $mEN = [regex]::Match($htmlContent, '(?s)(?:const|let|var)?\s*EN_UI\s*=\s*(\{.*?\})\s*;')
    if ($mEN.Success) {
        try {
            $dictEN = $ser.DeserializeObject($mEN.Groups[1].Value)
            foreach ($k in $dictEN.Keys) {
                Set-Translation 'en' $k $dictEN[$k]
                if (-not $allData['tr'].ContainsKey($k)) {
                    Set-Translation 'tr' $k $k
                }
            }
        } catch {
            Write-Host "Error parsing EN_UI : $($_.Exception.Message)"
        }
    }
    
    $mTR = [regex]::Match($htmlContent, '(?s)(?:const|let|var)?\s*runtimeTR\s*=\s*(\{.*?\});')
    if ($mTR.Success) {
        try {
            $dictTR = $ser.DeserializeObject($mTR.Groups[1].Value)
            foreach ($k in $dictTR.Keys) {
                Set-Translation 'tr' $k $dictTR[$k]
            }
        } catch {}
    }
}

Write-Host "3. Loading CSV rows from CSV file..."
$csvPath = (Get-ChildItem -Path $projectDir -Filter "*.csv" | Select-Object -First 1).FullName

if (Test-Path $csvPath) {
    $rawCsv = [System.IO.File]::ReadAllText($csvPath, [System.Text.Encoding]::UTF8)
    
    function Parse-CsvLines($text) {
        $rows = @()
        $lines = $text -split "`r?`n"
        $currentRow = ""
        $inQuote = $false
        foreach ($line in $lines) {
            if (-not $inQuote -and [string]::IsNullOrWhiteSpace($line)) { continue }
            if ($currentRow.Length -gt 0) { $currentRow += "`n" + $line }
            else { $currentRow = $line }
            $quoteCount = ($currentRow -replace '""', '').Split('"').Length - 1
            if ($quoteCount % 2 -eq 0) {
                $inQuote = $false
                $rows += $currentRow
                $currentRow = ""
            } else {
                $inQuote = $true
            }
        }
        return $rows
    }
    
    function Split-CsvRow($rowStr) {
        $fields = @()
        $pattern = '(?!\s*$)\s*(?:"((?:[^"]|"")*)"|([^,]*))\s*(?:,|$)'
        $matches = [regex]::Matches($rowStr, $pattern)
        foreach ($m in $matches) {
            if ($m.Length -eq 0) { continue }
            $val = if ($m.Groups[1].Success) { $m.Groups[1].Value.Replace('""', '"') } else { $m.Groups[2].Value }
            $fields += $val.Trim()
        }
        return $fields
    }
    
    $rows = Parse-CsvLines $rawCsv
    $startIndex = if ($rows[0] -match 'Ключ' -or $rows[0] -match 'Key') { 1 } else { 0 }
    for ($i = $startIndex; $i -lt $rows.Count; $i++) {
        $cols = Split-CsvRow $rows[$i]
        if ($cols.Count -lt 2) { continue }
        $key = $cols[0]
        if ([string]::IsNullOrWhiteSpace($key)) { continue }
        
        $trVal = if ($cols.Count -gt 1) { $cols[1] } else { "" }
        $azVal = if ($cols.Count -gt 2) { $cols[2] } else { "" }
        $uzVal = if ($cols.Count -gt 3) { $cols[3] } else { "" }
        $kkVal = if ($cols.Count -gt 4) { $cols[4] } else { "" }
        $tkVal = if ($cols.Count -gt 5) { $cols[5] } else { "" }
        $kyVal = if ($cols.Count -gt 6) { $cols[6] } else { "" }
        $enVal = if ($cols.Count -gt 7) { $cols[7] } else { "" }
        
        $rowVals = @{
            tr = if ($trVal) { $trVal } else { $key }
            az = if ($azVal) { $azVal } else { $trVal }
            uz = if ($uzVal) { $uzVal } else { $trVal }
            kk = if ($kkVal) { $kkVal } else { $trVal }
            tk = if ($tkVal) { $tkVal } else { $trVal }
            ky = if ($kyVal) { $kyVal } else { $trVal }
            en = if ($enVal) { $enVal } else { $trVal }
        }
        
        foreach ($l in $langs) {
            Set-Translation $l $key $rowVals[$l]
            if ($trVal -and $trVal -ne $key) {
                Set-Translation $l $trVal $rowVals[$l]
            }
        }
    }
    Write-Host "Processed $($rows.Count) CSV rows."
}

Write-Host "4. Loading curated_i18n.json..."
$curatedPath = "$projectDir\curated_i18n.json"
if (Test-Path $curatedPath) {
    $curatedJson = [System.IO.File]::ReadAllText($curatedPath, [System.Text.Encoding]::UTF8)
    $curatedData = $ser.DeserializeObject($curatedJson)
    foreach ($k in $curatedData.Keys) {
        $item = $curatedData[$k]
        $trVal = $item['tr']
        foreach ($l in $langs) {
            $val = $item[$l]
            Set-Translation $l $k $val
            if ($trVal -and $trVal -ne $k) {
                Set-Translation $l $trVal $val
            }
        }
    }
    Write-Host "Loaded $($curatedData.Count) curated items."
}

# Add tab aliases
$tabMap = @{
    'home' = 'tabHome'
    'journey' = 'tabJourney'
    'matching' = 'tabMatching'
    'community' = 'tabCommunity'
    'articles' = 'tabArticles'
    'profile' = 'tabProfile'
    'turan' = 'tabTuran'
}
foreach ($t in $tabMap.Keys) {
    $tKey = $tabMap[$t]
    foreach ($l in $langs) {
        if ($allData[$l].ContainsKey($tKey)) {
            $allData[$l]["tab_$t"] = $allData[$l][$tKey]
        }
    }
}

Write-Host "5. Writing master JS dictionaries with UTF-8..."
$uiLanguageNames = $tdaData['uiLanguageNames']

# Generate unified translations.js adhering strictly to window.TDA_I18N_DATA
$masterObj = @{
    uiLanguageNames = $uiLanguageNames
    resources = $allData
}
$masterSb = New-Object System.Text.StringBuilder
$masterSb.AppendLine("/* Turk Dunyasi Beceri Agi - 7 dilin sozlukleri ve dil secici verisi */") | Out-Null
$masterSb.AppendLine("window.TDA_I18N_DATA = {") | Out-Null
$masterSb.Append("  uiLanguageNames: ") | Out-Null
$masterSb.Append($ser.Serialize($uiLanguageNames)) | Out-Null
$masterSb.AppendLine(",") | Out-Null
$masterSb.AppendLine("  resources: {") | Out-Null
for ($i = 0; $i -lt $langs.Count; $i++) {
    $l = $langs[$i]
    $masterSb.Append("    '$l': ") | Out-Null
    $masterSb.Append($ser.Serialize($allData[$l])) | Out-Null
    if ($i -lt $langs.Count - 1) { $masterSb.AppendLine(",") | Out-Null } else { $masterSb.AppendLine("") | Out-Null }
}
$masterSb.AppendLine("  }") | Out-Null
$masterSb.AppendLine("};") | Out-Null
$masterSb.AppendLine("window.TDA_TRANSLATIONS = window.TDA_I18N_DATA.resources;") | Out-Null

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$masterPath = "$i18nDir\translations.js"
[System.IO.File]::WriteAllText($masterPath, $masterSb.ToString(), $utf8NoBom)
Write-Host "Wrote master $masterPath successfully."

foreach ($l in $langs) {
    $dict = $allData[$l]
    $sb = New-Object System.Text.StringBuilder
    $sb.AppendLine("/**") | Out-Null
    $sb.AppendLine(" * Turk Dunyasi Beceri Agi - " + $l + " Dil Sozlugu") | Out-Null
    $sb.AppendLine(" * Toplam anahtar sayisi: " + $dict.Count) | Out-Null
    $sb.AppendLine(" */") | Out-Null
    $sb.AppendLine("window.TDA_TRANSLATIONS = window.TDA_TRANSLATIONS || {};") | Out-Null
    $sb.Append("window.TDA_TRANSLATIONS['" + $l + "'] = ") | Out-Null
    
    $jsonString = $ser.Serialize($dict)
    $sb.Append($jsonString) | Out-Null
    $sb.AppendLine(";") | Out-Null
    
    $outPath = "$i18nDir\$l.js"
    [System.IO.File]::WriteAllText($outPath, $sb.ToString(), $utf8NoBom)
    Write-Host "Wrote $outPath with $($dict.Count) keys."
}

Write-Host "All master language dictionaries generated successfully!"
