' PLIXORA.BO - Lanzador Principal (Bot Silencioso + Plataforma Web)
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
vbsBot = currentDir & "\iniciar-bot-silencioso.vbs"
htmlFile = currentDir & "\index.html"

' 1. Iniciar el bot en segundo plano (si ya est? iniciado, el script lo detecta y no hace nada)
WshShell.Run "wscript.exe """ & vbsBot & """", 0, False

' 2. Abrir index.html en el navegador predeterminado
WshShell.Run """" & htmlFile & """", 1, False
