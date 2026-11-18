[CmdletBinding()]
param(
  [switch]$Release,
  [ValidateRange(0, 2100000000)]
  [int]$LastUploadedVersionCode
)

$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
  $appConfig = (Get-Content app.json -Raw | ConvertFrom-Json).expo
  if ($Release -and $PSBoundParameters.ContainsKey('LastUploadedVersionCode') -and
      $appConfig.android.versionCode -le $LastUploadedVersionCode) {
    throw "Increase expo.android.versionCode above $LastUploadedVersionCode in app.json before building a new upload."
  }

  $taskJava = 'C:\Program Files\Android\Android Studio\jbr'
  $taskSdk = Join-Path $env:USERPROFILE 'AppData\Local\Android\Sdk'
  if (-not $env:JAVA_HOME -and (Test-Path -LiteralPath "$taskJava\bin\java.exe")) { $env:JAVA_HOME = $taskJava }
  if (-not $env:ANDROID_HOME -and (Test-Path -LiteralPath $taskSdk)) { $env:ANDROID_HOME = $taskSdk }
  if (-not $env:JAVA_HOME -or -not $env:ANDROID_HOME) { throw 'Install Android Studio and its SDK, or set JAVA_HOME and ANDROID_HOME.' }
  $env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
  if ($Release) { $env:NODE_ENV = 'production' }
  & npx.cmd expo prebuild --platform android --no-install
  if ($LASTEXITCODE -ne 0) { throw 'Expo prebuild failed.' }
  Push-Location android
  try {
    $gradleTask = if ($Release) { ':app:bundleRelease' } else { ':app:assembleDebug' }
    & ./gradlew.bat $gradleTask
    if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
  } finally { Pop-Location }

  if ($Release) {
    $bundle = 'android/app/build/outputs/bundle/release/app-release.aab'
    $mapping = 'android/app/build/outputs/mapping/release/mapping.txt'
    if (!(Test-Path $mapping) -or !(Select-String -Path $mapping -Pattern '^# compiler: R8$' -Quiet)) {
      throw 'The release build did not produce an R8 mapping.'
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead((Resolve-Path $bundle).Path)
    try {
      if (!$archive.GetEntry('base/dex/classes.dex') -or
          !$archive.GetEntry('BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map')) {
        throw 'The release bundle is missing DEX or embedded R8 mapping.'
      }
      if ($archive.Entries | Where-Object FullName -Match '^META-INF/[^/]+\.(SF|RSA|DSA|EC)$') {
        throw 'The release bundle is already signed. Build an unsigned bundle for separate Play upload signing.'
      }
    } finally { $archive.Dispose() }
    Write-Host "Unsigned release bundle ($($appConfig.version), versionCode $($appConfig.android.versionCode)): $bundle"
    Write-Host "Verified R8 mapping and DEX in the bundle. Keep $mapping with the release."
  } else {
    Write-Host 'Debug APK: android/app/build/outputs/apk/debug/app-debug.apk'
    Write-Host 'Start Metro with npm start before launching this development APK.'
  }
} finally { Pop-Location }
