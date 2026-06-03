!macro customInstall
  StrCpy $launchLink "$INSTDIR\start-model-with-loading.vbs"

  Delete "$newStartMenuLink"
  CreateShortCut "$newStartMenuLink" "$SYSDIR\wscript.exe" "$\"$INSTDIR\start-model-with-loading.vbs$\"" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 "" "" "${APP_DESCRIPTION}"

  Delete "$newDesktopLink"
  CreateShortCut "$newDesktopLink" "$SYSDIR\wscript.exe" "$\"$INSTDIR\start-model-with-loading.vbs$\"" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 "" "" "${APP_DESCRIPTION}"
!macroend

!macro customUnInstall
  Delete "$newStartMenuLink"
  Delete "$newDesktopLink"
!macroend
