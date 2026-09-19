Get-ChildItem -Path src -Recurse -Filter *.tsx | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $matches = [regex]::Matches($content, '<([A-Z][a-zA-Z0-9]*)\b')
    $tags = $matches | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
    foreach ($tag in $tags) {
        if ($tag -eq "React" -or $tag -match "^[A-Z]$") { continue }
        if ($content -notmatch ('import .*?\b' + $tag + '\b') -and $content -notmatch ('import ' + $tag + '\b')) {
            Write-Host $_.FullName ' missing ' $tag
        }
    }
}
