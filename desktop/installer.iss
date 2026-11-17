#ifndef AppSource
  #error AppSource must point to the prepared embedded application
#endif
#ifndef OutputPath
  #error OutputPath must point to the installer output directory
#endif
#ifndef ReleaseVersion
  #define ReleaseVersion "3.0.0"
#endif
[Setup]
AppId={{B3CF85DB-948D-4F13-BE51-54642CA86415}
AppName=SGD Diócesis de Tibú
AppVersion={#ReleaseVersion}
AppPublisher=Proyecto SGD Diócesis de Tibú
DefaultDirName={localappdata}\Programs\SGDTibuUDES
DefaultGroupName=SGD Tibú UDES
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir={#OutputPath}
OutputBaseFilename=SGD_Tibu_Setup
SetupIconFile=..\launcher\launcher.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\SGD_Tibu.exe
SetupLogging=yes
LicenseFile=AVISOS_DISTRIBUCION.txt

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Files]
Source: "{#AppSource}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Tasks]
Name: "desktopicon"; Description: "Crear acceso directo en el escritorio"; Flags: checkedonce

[Icons]
Name: "{userdesktop}\SGD Tibú UDES"; Filename: "{app}\SGD_Tibu.exe"; WorkingDir: "{app}"; Tasks: desktopicon
Name: "{group}\SGD Diócesis de Tibú"; Filename: "{app}\SGD_Tibu.exe"; WorkingDir: "{app}"
Name: "{group}\Desinstalar SGD Diócesis de Tibú"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\SGD_Tibu.exe"; Description: "Configurar y abrir el SGD"; Flags: nowait postinstall skipifsilent

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
  if not WizardSilent then
    Result := MsgBox('El programa incluye PostgreSQL 18, Python, FastAPI y React compilado.' + #13#10 +
      'La base de evaluación se prepara automáticamente en su perfil Windows, sin modificar otros servicios.' + #13#10 +
      'Cierre el SGD antes de actualizar. La base y los documentos se conservan.', mbInformation, MB_OKCANCEL) = IDOK;
end;
