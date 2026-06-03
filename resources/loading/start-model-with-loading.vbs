Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
loaderPath = scriptDir & "\start-model-with-loading.ps1"

shell.Run "powershell -NoProfile -ExecutionPolicy Bypass -File """ & loaderPath & """", 0, False
