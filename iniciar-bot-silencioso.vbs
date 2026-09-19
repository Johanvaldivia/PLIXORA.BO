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

' 2. Si ya está corriendo, enviar orden de reinicio/recuperación limpia
If isAlreadyRunning Then
    On Error Resume Next
    Set xmlHttp2 = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    xmlHttp2.setTimeouts 1500, 1500, 1500, 1500
    xmlHttp2.open "GET", "http://127.0.0.1:3000/api/restart-bot", False
    xmlHttp2.send
    On Error GoTo 0
    WScript.Quit 0
End If

' 3. Si no está corriendo, ejecutar run-bot.bat de forma 100% invisible (ventana 0)
WshShell.Run "cmd.exe /c """ & batPath & """", 0, False
