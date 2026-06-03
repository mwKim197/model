$ErrorActionPreference = "Stop"

$ModelExePath = Join-Path $PSScriptRoot "model.exe"
$ModelProcessName = "model"

if (-not (Test-Path $ModelExePath)) {
  throw "model.exe not found: $ModelExePath"
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = "Model Loading"
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.WindowState = [System.Windows.Forms.FormWindowState]::Maximized
$form.TopMost = $true
$form.BackColor = [System.Drawing.Color]::FromArgb(16, 19, 26)
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen

$outerLayout = New-Object System.Windows.Forms.TableLayoutPanel
$outerLayout.Dock = [System.Windows.Forms.DockStyle]::Fill
$outerLayout.RowCount = 3
$outerLayout.ColumnCount = 1
$outerLayout.BackColor = $form.BackColor
$outerLayout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 50)))
$outerLayout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 190)))
$outerLayout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 50)))

$centerLayout = New-Object System.Windows.Forms.TableLayoutPanel
$centerLayout.Dock = [System.Windows.Forms.DockStyle]::Fill
$centerLayout.RowCount = 2
$centerLayout.ColumnCount = 1
$centerLayout.BackColor = $form.BackColor
$centerLayout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 132)))
$centerLayout.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 58)))

$label = New-Object System.Windows.Forms.Label
$label.Text = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String("OLrgwnTHIADkwonVEcmFx8iy5LIuAA0ACgCgx9zCzLkgADCu5LIkuPzIOMGUxi4A"))
$label.ForeColor = [System.Drawing.Color]::FromArgb(245, 247, 251)
$label.Font = New-Object System.Drawing.Font("Malgun Gothic", 24, [System.Drawing.FontStyle]::Bold)
$label.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$label.Dock = [System.Windows.Forms.DockStyle]::Fill

$progressTrack = New-Object System.Windows.Forms.Panel
$progressTrack.Width = 380
$progressTrack.Height = 10
$progressTrack.Anchor = [System.Windows.Forms.AnchorStyles]::Top
$progressTrack.BackColor = [System.Drawing.Color]::FromArgb(45, 51, 64)

$progressBar = New-Object System.Windows.Forms.Panel
$progressBar.Width = 110
$progressBar.Height = 10
$progressBar.Left = -110
$progressBar.Top = 0
$progressBar.BackColor = [System.Drawing.Color]::FromArgb(112, 214, 255)
$progressTrack.Controls.Add($progressBar)

$progressHost = New-Object System.Windows.Forms.Panel
$progressHost.Dock = [System.Windows.Forms.DockStyle]::Fill
$progressHost.BackColor = $form.BackColor
$progressHost.Controls.Add($progressTrack)

function Center-ProgressTrack {
  if ($progressHost.Width -le 0 -or $progressHost.Height -le 0) {
    return
  }

  $progressTrack.Left = [Math]::Max(0, [int](($progressHost.Width - $progressTrack.Width) / 2))
  $progressTrack.Top = [Math]::Max(0, [int](($progressHost.Height - $progressTrack.Height) / 2))
}

$progressHost.Add_Resize({
  Center-ProgressTrack
})

$centerLayout.Controls.Add($label, 0, 0)
$centerLayout.Controls.Add($progressHost, 0, 1)
$outerLayout.Controls.Add((New-Object System.Windows.Forms.Panel), 0, 0)
$outerLayout.Controls.Add($centerLayout, 0, 1)
$outerLayout.Controls.Add((New-Object System.Windows.Forms.Panel), 0, 2)
$form.Controls.Add($outerLayout)

$startedProcess = $null
$modelWindowDetectedAt = $null

$startTimer = New-Object System.Windows.Forms.Timer
$startTimer.Interval = 300
$startTimer.Add_Tick({
  $startTimer.Stop()
  $script:startedProcess = Start-Process -FilePath $ModelExePath -PassThru
})

$closeTimer = New-Object System.Windows.Forms.Timer
$closeTimer.Interval = 1000
$closeTimer.Add_Tick({
  $visibleModelWindow = Get-Process -Name $ModelProcessName -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 } |
    Select-Object -First 1

  if ($visibleModelWindow) {
    if (-not $script:modelWindowDetectedAt) {
      $script:modelWindowDetectedAt = Get-Date
      return
    }

    if (((Get-Date) - $script:modelWindowDetectedAt).TotalSeconds -ge 3) {
      $closeTimer.Stop()
      $form.Close()
    }
    return
  }

  if ($script:startedProcess -and $script:startedProcess.HasExited) {
    $closeTimer.Stop()
    $form.Close()
  }
})

$animationTimer = New-Object System.Windows.Forms.Timer
$animationTimer.Interval = 16
$animationTimer.Add_Tick({
  $progressBar.Left += 7

  if ($progressBar.Left -gt $progressTrack.Width) {
    $progressBar.Left = -$progressBar.Width
  }
})

$form.Add_KeyDown({
  if ($_.KeyCode -eq [System.Windows.Forms.Keys]::Escape) {
    $form.Close()
  }
})

$form.Add_Shown({
  Center-ProgressTrack
  $startTimer.Start()
  $closeTimer.Start()
  $animationTimer.Start()
})

[void]$form.ShowDialog()
