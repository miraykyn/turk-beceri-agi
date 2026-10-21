$port = 8080
$rootDir = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "Sunucu baslatildi: $prefix"
} catch {
    $port = 8081
    $prefix = "http://localhost:$port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($prefix)
    $listener.Start()
    Write-Host "Sunucu baslatildi: $prefix"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath
        if ($path -eq "/" -or $path -eq "") {
            $path = "/index.html"
        }

        # Save dicts endpoint for modularization
        if ($path -eq "/api/save_dicts" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $json = $body | ConvertFrom-Json
            $lang = $json.lang
            $dictJson = $json.dict | ConvertTo-Json -Depth 10

            $i18nDir = [System.IO.Path]::Combine($rootDir, "js", "i18n")
            if (!(Test-Path $i18nDir)) { New-Item -ItemType Directory -Path $i18nDir -Force | Out-Null }

            $outFile = [System.IO.Path]::Combine($i18nDir, "$lang.js")
            $fileContent = @"
/**
 * Türk Dünyası Beceri Ağı - $lang Dil Sözlüğü
 */
window.TDA_TRANSLATIONS = window.TDA_TRANSLATIONS || {};
window.TDA_TRANSLATIONS['$lang'] = $dictJson;
"@
            [System.IO.File]::WriteAllText($outFile, $fileContent, [System.Text.Encoding]::UTF8)

            $respBytes = [System.Text.Encoding]::UTF8.GetBytes('{"status":"ok"}')
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $respBytes.Length
            $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
            $response.OutputStream.Close()
            continue
        }

        # Mock API destegi
        if ($path -eq "/api/ai" -and $request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            $jsonReq = $null
            try { $jsonReq = $body | ConvertFrom-Json } catch {}
            $userMsg = if ($jsonReq -and $jsonReq.message) { $jsonReq.message } else { "Merhaba" }

            $reply = "Turan: Sorunuzu aldım ('$userMsg'). Türk Dünyası Beceri Ağı üzerinden 7 bağımsız Türk devleti ve toplulukları arasında bilgi, dil ve beceri paylaşımı yapabilirsiniz."
            if ($userMsg -match "puan") {
                $reply = "Turan: Beceri Puanı sistemi zaman temellidir. 1 saatlik beceri paylaşımı = 1 puan kazandırır. Sıfır puanlı kullanıcılar topluluktan destek isteyebilir veya puan bağışlanabilir."
            } elseif ($userMsg -match "eşleş|esles") {
                $reply = "Turan: Akıllı Eşleştirme sekmesinden öğretmek veya öğrenmek istediğiniz beceri, dil, seviye ve ülke filtrelerini seçerek anında eşleşebilirsiniz."
            }

            $respObj = @{ reply = $reply }
            $respJson = $respObj | ConvertTo-Json -Compress
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($respJson)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.OutputStream.Close()
            continue
        }

        $localFilePath = [System.IO.Path]::Combine($rootDir, $path.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar))

        if (Test-Path $localFilePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localFilePath).ToLower()
            $contentType = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".htm"  { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".svg"  { "image/svg+xml" }
                ".ico"  { "image/x-icon" }
                default { "application/octet-stream" }
            }

            $bytes = [System.IO.File]::ReadAllBytes($localFilePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.OutputStream.Close()
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Bulunamadi")
            $response.OutputStream.Write($msg, 0, $msg.Length)
            $response.OutputStream.Close()
        }
    } catch {
        # continue listening
    }
}
