$fixes = @(
    @{ file = "app\(app)\cajero\caja.tsx";
       old = "backgroundColor: '#10B98120', borderColor: '#10B98140'";
       new = "backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40`" },

    @{ file = "app\(app)\cajero\cuentas.tsx";
       old = '{ backgroundColor: "#10B98112" }';
       new = '{ backgroundColor: `${accentColor}12` }' },

    @{ file = "app\(app)\cajero\cuentas.tsx";
       old = 'backgroundColor: "#10B981",';
       new = 'backgroundColor: accentColor,' },

    @{ file = "app\(app)\cajero\solicitudes.tsx";
       old = "backgroundColor: '#E11D48',`r`n        paddingVertical: 12,";
       new = "backgroundColor: accentColor,`r`n        paddingVertical: 12," },

    @{ file = "components\PendingSolicitudesAlert.tsx";
       old = "borderColor: isDark ? '#E11D48' : '#E11D48'";
       new = "borderColor: accentColor" },

    @{ file = "components\PendingSolicitudesAlert.tsx";
       old = "{ backgroundColor: '#E11D48', borderRadius: 24 }";
       new = "{ backgroundColor: accentColor, borderRadius: 24 }" },

    @{ file = "components\PendingSolicitudesAlert.tsx";
       old = "backgroundColor: '#E11D4820',";
       new = "backgroundColor: `${accentColor}20`," },

    @{ file = "components\PendingSolicitudesAlert.tsx";
       old = "backgroundColor: '#E11D48',`r`n        borderRadius: 10,";
       new = "backgroundColor: accentColor,`r`n        borderRadius: 10," },

    @{ file = "components\StaffCallOverlay.tsx";
       old = "backgroundColor: '#E11D4820',";
       new = "backgroundColor: `${accentColor}20`," }
)

foreach ($fix in $fixes) {
    if (-not (Test-Path $fix.file)) { Write-Host "NOT FOUND: $($fix.file)"; continue }
    $c = [System.IO.File]::ReadAllText($fix.file)
    $orig = $c
    $c = $c.Replace($fix.old, $fix.new)
    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($fix.file, $c, [System.Text.UTF8Encoding]::new($false))
        Write-Host "Updated: $($fix.file)"
    } else {
        Write-Host "No match: $($fix.file) -> $($fix.old.Substring(0, [Math]::Min(40, $fix.old.Length)))"
    }
}
Write-Host "Done"
