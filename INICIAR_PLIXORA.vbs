' PLIXORA.BO - Lanzador Principal (Plataforma Web 24/7 conectada a Nube)
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
htmlFile = currentDir & "\index.html"

' Abrir index.html en el navegador predeterminado (conectado al Bot Virtual en Oracle Cloud)
WshShell.Run """" & htmlFile & """", 1, False
