Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = currentDir & "\whatsapp-bot\run-bot.bat"

' 1. Verificar si el bot ya est? corriendo en el puerto 3000
isAlreadyRunning = False
On Error Resume Next
Set xmlHttp = CreateObject("MSXML2.ServerXMLHTTP.6.0")
xmlHttp.setTimeouts 1000, 1000, 1000, 1000
xmlHttp.open "GET", "http://127.0.0.1:3000/status", False
xmlHttp.send

If Err.Number = 0 Then
    If xmlHttp.status = 200 Or xmlHttp.status = 503 Then
        isAlreadyRunning = True
    End If
End If
On Error GoTo 0

' 2. Si ya est? corriendo, salir pac?ficamente
If isAlreadyRunning Then
    WScript.Quit 0
End If

' 3. Si no est? corriendo, ejecutar run-bot.bat de forma 100% invisible (ventana 0)
WshShell.Run """" & batPath & """", 0, False
