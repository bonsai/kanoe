$filePath = 'script.js'
$content = Get-Content -Path $filePath -Raw -Encoding UTF8

# Fix seaAnimation - replace the creation lines with getElementById
$oldPattern = "// 海アニメーション用要素を body 直下に追加`r?`nconst seaAnimation = document.createElement\('div'\);`r?`nseaAnimation\.id = 'seaAnimation';`r?`nseaAnimation\.innerHTML = '<div class=`"sea-text`">海に到着！<br>おつかれさまでした</div>';`r?`ndocument\.body\.appendChild\(seaAnimation\);"
$newContent = "// Get reference to existing seaAnimation element from HTML`r`nconst seaAnimation = document.getElementById('seaAnimation');"

$content = $content -replace $oldPattern, $newContent

Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline
Write-Host "Done"
