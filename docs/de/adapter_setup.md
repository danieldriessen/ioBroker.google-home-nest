![Logo](../../admin/google-home-nest.png)

# ioBroker.google-home-nest

> [!NOTE]
> This is the documentation in German.<br>
> You can find the English version here: [🇬🇧 English documentation](../en/adapter_setup.md)

## Übersicht **'Admin Panel'**

![Übersicht 'Admin Panel'](img/screenshots/adminPanel/v0.2.0/annotated/5868px/screenshot_adminPanel_annotated_v0.2.0_(5868px).png)

|                                                               |                            |                                                                                                                            |
| ------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| ![Red annotation dot](../img/annotationDots/redDot.png)       | **Basis-Einrichtung**      | Die in der Übersicht mit roten Kreisen gekennzeichneten Bereiche<br>sind für die **Basis-Einrichtung** erforderlich.       |
| ![Yellow annotation dot](../img/annotationDots/yellowDot.png) | **Erweiterte-Einrichtung** | Die in der Übersicht mit gelben Kreisen gekennzeichneten Bereiche<br>sind für die **Erweiterte-Einrichtung** erforderlich. |

## Basis-Einrichtung

1. Für die **Basis-Einrichtung** muss zunächst unter Punkt 1 ein Port für den HTTP-Server ausgewählt werden.<br>

> [!IMPORTANT]
> Stelle sicher, dass der ausgewählte Port nicht bereits von einer anderen Anwendung oder einem anderen Prozess verwendet wird und auch nicht durch eine Firewall blockiert ist.

2. Anschließend müssen die Werte 2-4 eingetragen werden. Wie Du an diese Werte kommst wird in den nächsten Abschnitten beschrieben.<br>

3. Nach der Eingabe der erforderlichen Daten können diese mit einem Klick auf **'SPEICHERN'** gespeichert werden.<br>

4. Als nächstes muss der Adapter gestartet werden.<br>
   Der Adapter wird unmittelbar nach dem Start versuchen einen HTTP-Server zu erstellen der den unter Punkt 1 angegebenen Port auf eingehende Kommunikation überwacht.<br>

> [!IMPORTANT]
> Um den nachfolgenden Schritt erfolgreich abschließen zu können ist es zwingend erforderlich das der Adapter und damit der HTTP-Server gestartet wurde und der HTTP-Server den angegebenen Port überwachen kann.

> [!IMPORTANT]
> Um den folgenden Schritt erfolgreich abschließen zu können, muss dieser zwingend von einem Browser auf demselben Gerät ausgeführt werden, auf dem der ioBroker installiert ist.

5. Nun kann mit einem Klick auf den **'Authentifizieren'** Button im Bereich **'Authentifizierung'** des **'Admin Panel'** die Authentifizierung gestartet werden.

## **'OAuth-Client-ID'** & **'Clientschlüssel'** erwerben

Um eine **'OAuth-Client-ID'** zu erhalten muss zunächst ein Google Cloud Projekt angelegt werden.

1. Rufe in deinem Browser die [Google Cloud Console](https://console.cloud.google.com/) auf.<br>
> [!TIP]
> Die **'Google Cloud Console'** kann auch über die Adresse 'https://console.cloud.google.com/'<br>oder einem Klick auf einer der entsprechenden Button im **'Admin Panel'** aufgerufen werden.

2. Wenn Du die **'Google Cloud Console'** zum ersten Mal aufrufst, wirst Du nun aufgefordert die Nutzungsbedingungen für die **'Google Cloud Platform'** zu akzeptieren.
   ![Nutzungsbedingungen - Google Cloud Console](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_terms.png)
   
   Um fortzufahren, stimme den Nutzungsbedingungen zu.
> [!IMPORTANT]
> Achte darauf, das Du mit demselben Google Konto eingeloggt bist, mit dem auch deine Google (Nest) Geräte verknüpft sind.

3. Als nächstes muss in der **'Google Cloud Console'** ein neues Projekt angelegt werden.<br>
   Klicke dazu im oberen Bereich der **'Google Cloud Console'** auf das Auswahlmenü 'Projekt auswählen'.
   ![Google Cloud Console - Projekt auswählen](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_selectProject.png)

4. Wähle nun im sich öffnenden Popup-Fenster **'Neues Projekt'** aus um ein neues Projekt anzulegen.
   ![Google Cloud Console - Projekt auswählen Popup](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_selectProjectPopup.png)

5. Nun muss das neue Projekt konfiguriert werden.<br>

   Hierfür muss ein gültiger **'Projektname'** und eine gültige **'Projekt-ID'** vergeben werden.<br>
   <br>
   Der **'Projektname'** dient allein zur Identifizierung des Projekts in deiner Projektbibliothek.<br>
   Die **'Projekt-ID'** hingegen indentifiziert dein Projekt auf 'globaler' Ebene und muss daher eindeutig sein und kann nachträglich nicht geändert werden.<br>
   <br>
   Beim Öffnen der Seite für die Projekterstellung enthält das Textfeld **'Projektname'** bereits einen Vorschlag für den Projektnamen.<br>
   Ebenfalls wird bereits eine eideutige **'Projekt-ID'** angezeigt, die mit einem Klick auf den Button **'BEARBEITEN'** geändert werden kann.<br>
   <br>
   Ein **'Speicherort'** muss nicht zwingend angegeben werden.

   ![Google Cloud Console - Neues Projekt erstellen 01](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_createNewProject_01.png)

   Nachdem Du dich für einen **'Projektnamen'** entschieden und eine eindeutige **'Projekt-ID'** vergeben hast, klicke auf den Button **'ERSTELLEN'** um das Projekt anzulegen.

> [!TIP]
> Es bietet sich an einen eigenen **'Projektnamen'** zu vergeben, um das Projekt in Zukunft einfacher identifizieren zu können.<br>
> z.B.: '*ioBroker - Google Home Nest*' (wie im folgendem Bild zu sehen).

> [!TIP]
> Da die **'Projekt-ID'** dein Google Cloud Projekt unter allen Google Cloud Projekten eindeutig identifiziert und daher unter allen Google Cloud Projekten eindeutig sein muss,
> bietet es sich an der **'Projekt-ID'** eine persönliche Komponente zu verleihen.<br>
> Dein Name oder Teile deines Namens, dein Spitzname oder deine Domain (falls vorhanden) sind gute Beispiele für persönliche Komponenten für die **'Projekt-ID'**.
> Es spricht aber auch nichts dagegen, einfach die vorgeschlagene **'Projekt-ID'** zu übernehmen. Unter Umständen ist dies sogar die einfachste Option.

6. Wähle nun im Dropdown-Menü dein neu angelegtes Projekt aus und gehe dann zum **'Dashboard'** des Projekts.<br>
   
   Folge hierfür die Schritte 1-4 im unteren Bild.

   ![Google Cloud Console - Gehe zu Projekt Dashboard](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_goToProjectDashboard.png)

7. Auf dem **'Dashboard'** des Projekts findest du nun im Bereich **'Projektinformationen'** deinen **'Projektnamen'**, deine **'Projektnummer'** und deine **'Projekt-ID'**.<br>
   ![Google Cloud Console - Projektinformationen](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_projectInformation.png)

> [!NOTE]
> Die **'Projekt-ID'** benötigst Du für die **Erweiterte Einrichtung** und ist für die **Basis-Einrichtung** nicht erforderlich.

> [!IMPORTANT]
> Bei der **'Projekt-ID'** (im oberen Bild) handelt es sich um die **'Google Cloud - Projekt-ID'**.<br>
> Diese ist bitte nicht mit der **'Projekt-ID'** der Google **'Gerätezugriffskonsole'** zu verwechseln, die Du für die **Basis-Einrichtung** benötigst und im **'Admin Panel'** unter **Punkt 3** einzutragen ist.

8. Nachdem Du nun erfolgreich das Projekt in der **'Google Cloud Console'** angelegt hast, muss als nächstes die **'Smart Device Management API'** aktiviert werden.<br>

   Stelle hierfür sicher das im Dropdown-Menü dein neu angelegtes Projekt ausgewählt ist (Schritt 1 im unteren Bild) und folge dann den Schritten 2-4.

   ![Google Cloud Console - APIs aktivieren 01](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_enableAPIs_01.png)

9. Klicke nun auf der folgenden Seite auf **'+ APIS UND DIENSTE AKTIVIEREN'**.
   ![Google Cloud Console - APIs aktivieren 02](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_enableAPIs_02.png)

10. Nutze die Suchleiste auf der folgenden Seite um die Google **'API Bibliothek'** nach der **'Smart Device Management API'** zu durchsuchen.
    ![Google Cloud Console - APIs durchsuchen](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_searchAPIs.png)

11. Wähle die **'Smart Device Management API'** aus den Suchergebnissen aus.
    ![Google Cloud Console - APIs durchsuchen - Smart Device Management API](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_searchAPI_smartDeviceManagementAPI.png)

12. Klicke auf der Seite der **'Smart Device Management API'** auf den Button **'AKTIVIEREN'** um die API zu aktivieren.
    ![Google Cloud Console - API aktivieren - Smart Device Management API](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_activateAPI_smartManagementAPI.png)

13. Nachdem nun die **'Smart Device Management API'** aktiviert ist, müssen die Anmeldedaten erstellt werden.<br>

    Klicke dazu zunächst im Menü auf der linken Seite auf **'Anmeldedaten'** um die entsprechende Seite aufzurufen.
    ![Google Cloud Console - Gehe zu Anmeldedaten 01](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_goToCredentials_01.png)

14. Klicke auf der Seite der **'Anmeldedaten'** in der oberen Menüzeile auf den Button **'+ ANMELDEDATEN ERSTELLEN'** und dann auf **'OAuth-Client-ID'** (Schritt 2 im unteren Bild).
    ![Google Cloud Console - Anmeldedaten erstellen 01](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_createCredentials_01.png)

16. Wenn Du gerade erst ein neues Projekt angelegt hast, wird dir nun angezeigt dass Du vor dem Erstellen einer **'OAuth-Client-ID'** zuerst den **'Zustimmungsbildschirm'** konfigurieren musst.<br>

    Dies kannst du mit einem Klick auf den Button **'ZUSTIMMUNGSBILDSCHIRM KONFIGURIEREN'** nun tun.

    ![Google Cloud Console - Zustimmungsbildschirm konfigurieren 01](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_configureConsentScreen_01.png)

17. Wähle nun auf der nächsten Seite **'Extern'** für den **'User Type'** aus und klicke anschließend auf den Button **'ERSTELLEN'**
    ![Google Cloud Console - Zustimmungsbildschirm konfigurieren 02](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_configureConsentScreen_02.png)

18. Auf der nächsten Seite müssen nun einige Angaben für den **'Zustimmungsbildschirm'** gemacht werden.

    | Punkt | Feldname                                         | verpflichtend? | Beschreibung                                                                                                                 |
    | ----- | ------------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
    | 1     | Anwendungsname                                   | Ja             | Gebe hier einen Namen für die um Zustimmung bittende Anwendung ein.<br>Zum Beispiel: *'ioBroker Adapter: Google-Home-Nest'*  |
    | 2     | Nutzersupport E-Mail                             | Ja             | Hier wählst Du deine E-Mail Adresse aus dem Dropdown Menü aus                                                                |
    | 3     | E-Mail Adressen<br>(Kontaktdaten des Entwicklers | Ja             | Hier gibst Du erneut deine E-Mail Adresse ein                                                                                |
    | 4     | Hochzuladene Logodatei                           | Nein           | Hier kann ein Logo für die um Zustimmung bittende Anwendung hochgeladen werden.<br>Dies ist nicht verpflichtend und kann ausgelassen werden.<br>Falls erwünscht kann hier aber z.B. das Adapter-Logo hochgeladen werden.<br>Das Adapter-Logo kannst Du dir bei Bedarf von [hier](https://github.com/danieldriessen/ioBroker.google-home-nest/blob/main/admin/google-home-nest.png) herunterladen. |

    Wenn Du alle Angaben gemacht hast, klicke auf den Button **'SPEICHERN UND FORTFAHREN'** um deine Einstellungen zu speichern und zum nächsten Bildschirm zu gelangen.
    
    ![Google Cloud Console - Zustimmungsbildschirm konfigurieren 03](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_configureConsentScreen_03.png)

19. Der nächste Bildschirm kann mit einem Klick auf **'SPEICHERN UND FORTFAHREN'** einfach übersprungen werden.
    ![Google Cloud Console - Zustimmungsbildschirm konfigurieren 04](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_configureConsentScreen_04.png)

20. Auf dem nächsten Bildschirm muss ein **Testnutzer** angelegt werden.<br>

    Klicke hierzu zunächst auf **'+ ADD USER'**.
    ![Google Cloud Console - Zustimmungsbildschirm konfigurieren 05](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_configureConsentScreen_05.png)

    Im angezeigten Dialogfenster muss nun ein **Google Benutzerkonto** angegeben werden.
    ![Google Cloud Console - Zustimmungsbildschirm konfigurieren 06](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_configureConsentScreen_06.png)
    Klicke anschließend auf den Button **'HINZUFÜGEN'** im Dialogfenster und dann auf dem Button **'SPEICHERN UND FORTFAHREN'** auf der Haupseite.
    
> [!IMPORTANT]
> Stelle sicher das Du hier das **Google Benutzerkonto** angibst mit dem auch deine Google (Nest) Geräte verknüpft sind.

21. Klicke im nächsten Bildschirm, der eine Zusammenfassung der getätigten Einstellungen anzeigt, auf **'ZURÜCK ZUM DASHBOARD'**.
    ![Google Cloud Console - Zustimmungsbildschirm konfigurieren 07](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_configureConsentScreen_07.png)

22. Da der **'Zustimmungsbildschirm'** nun konfiguriert ist, kannst Du nun deine **'Anmeldedaten'** erstellen.
    Klicke hierzu wieder auf **'Anmeldedaten'** in der linken Menüleiste.
    ![Google Cloud Console - Gehe zu Anmeldedaten 02](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_goToCredentials_02.png)

23. Klicke nun auf der Seite der **'Anmeldedaten'** wieder in der oberen Menüzeile auf den Button **'+ ANMELDEDATEN ERSTELLEN'** und dann auf **'OAuth-Client-ID'** (Schritt 2 im unteren Bild).
    ![Google Cloud Console - Anmeldedaten erstellen 02](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_createCredentials_02.png)

24. Auf der Seite zur Erstellung der **'OAuth-Client-ID'** wählst Du nun **'Webanwendung'** aus dem Dropdown-Menü aus.
    ![Google Cloud Console - Anmeldedaten erstellen 03](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_createCredentials_03.png)

25. Im daraufhin erscheinendem Feld **'Name'**, (welches bereits mit dem Text '*Webclient 1*' vorausgefüllt ist, kannst du nun den Namen der 'Anwendung' (des Webclient) angeben, der Zugriff auf die Resource verlangt.
    ![Google Cloud Console - Anmeldedaten erstellen 04](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_createCredentials_04.png)

> [!TIP]
> Ein guter Name wäre an dieser Stelle z.B.: '*ioBroker*'

26. Als nächstes klickst Du bitte auf den Button **'+ URI HINZUFÜGEN'**.
    ![Google Cloud Console - Anmeldedaten erstellen 05](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_createCredentials_05.png)

27. Es erscheint nun ein weiteres Textfeld **'URIs 1'** in dem die **'Weiterleitungs-URI'** angegeben werden muss.<br>

    An dieser Stelle gibst Du bitte die folgende **URI** ein: **'http://localhost:{HTTP-SERVER-PORT}'**.<br>
    Hierbei ersetzt Du bitte den **'{HTTP-SERVER-PORT}'** - Teil der **URI**<br>mit dem **'HTTP-Server-Port'** den du im **'Admin Panel'** konfiguriert hast.
    ![Google Cloud Console - Anmeldedaten erstellen 06](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_createCredentials_06.png)

    Sobald Du die **URI** - Eingabe getätigt hast, klickst du bitte auf den Button **'ERSTELLEN'** um die Erstellung der **'OAuth-Client-ID'** abzuschließen.
    Beachte hierbei aber bitte dringend die folgenden Hinweise...

> [!NOTE]
> Wenn du den **HTTP-Server-Port** im **Admin Panel** nicht geändert hast, sollte dieser weiterhin auf den Port **'8881'** voreingestellt sein.<br>
> Die einzugebende **URI** würde in diesem Fall **'*http://localhost:8881*'** lauten.

> [!NOTE]
> Für die spätere Abfrage eines **'Authorization Code'** ist eine korrekt konfigurierte **'Weiterleitungs-URI'** zwingend erforderlich.

> [!IMPORTANT]
> An dieser Stelle nochmal der Hinweis:<br>
> Stelle sicher, dass der ausgewählte **HTTP-Server-Port** nicht bereits von einer anderen Anwendung oder einem anderen Prozess verwendet wird und auch nicht durch eine Firewall blockiert ist.

> [!IMPORTANT]
> Bitte beachte auch, dass die **'Weiterleitungs-URI'** **'*http://localhost:{HTTP-SERVER-PORT}*'** von Google akzeptiert wird, während die **'Weiterleitungs-URI'** **'*http://127.0.0.1:{HTTP-SERVER-PORT}*'** von Google NICHT akzeptiert wird.

> [!IMPORTANT]
> Die Verwendung von **'HTTPS'** anstelle von **'HTTP'** wird an dieser Stelle zu Problemen führen. Stelle sicher das Du **'HTTP'** verwendest.

> [!NOTE]
> Bei einer zukünftigen Änderung des **'HTTP-Server Port'** im Adapter **'Admin Panel'** muss zwingend auch die **'Weiterleitungs-URI'** entsprechend angepasst werden.

> [!NOTE]
> Es kann zwischen 5 Minuten und mehrere Stunden dauern, bis die Einstellungen wirksam werden.

28. In der nun angezeigten Übersicht findest Du deine **'OAuth-Client-ID'** & dein **'Clientschlüssel'**.<br>
    Trage diese im **'Admin Panel'** in die entsprechenden Felder ein (2 & 4) ein.
    ![Google Cloud Console - Anmeldedaten erstellen 07](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_createCredentials_07.png)

## **'Projekt-ID'** erwerben

Um eine **'Projekt-ID'** zu erhalten muss man sich zunächst für Google **'Device Access'** registrieren.

> [!NOTE]
> Die Registrierung setzt die Annahme der Nutzungsbedingungen für die 'Google API' und die 'Device Access Sandbox' sowie eine **einmalige Gebühr** von (Stand: Mai 2024) **$5 (US Dollar)** vorraus.

1. Rufe in deinem Browser die [Gerätezugriffskonsole](https://console.nest.google.com/device-access/) auf.<br>
> [!TIP]
> Die **'Gerätezugriffskonsole'** kann auch über die Adresse 'https://console.nest.google.com/device-access/'<br>oder einem Klick auf einer der entsprechenden Button im **'Admin Panel'** aufgerufen werden.

2. Sofern nicht bereits geschehen, müssen nun die Nutzungsbedingungen für die 'Google API' und die 'Device Access Sandbox' akzeptiert werden.
   ![Google Gerätezugriffskonsole - Nutzungsbedingungen](img/screenshots/googleDeviceAccessConsole/screenshot_googleDeviceAccessConsole_terms.png)
   Setze hier das Häckchen und klicke auf **'Weiter zur Zahlung'**.

3. Im nächsten Bildschirm wirst Du nun zur Begleichung der Gebühr aufgefordert.
   Füge falls nötig eine Kredit- oder Debitkarte hinzu und klicke anschließend auf den Button **'KAUFEN'** um die Gebühr zu begleichen und fortzufahren.
   ![Google Gerätezugriffskonsole - Gebühr 01](img/screenshots/googleDeviceAccessConsole/screenshot_googleDeviceAccessConsole_payment_01.png)
   ![Google Gerätezugriffskonsole - Gebühr 02](img/screenshots/googleDeviceAccessConsole/screenshot_googleDeviceAccessConsole_payment_02.png)

> [!IMPORTANT]
> Bitte stelle vor dem Begleichen der Gebühr nochmals sicher, dass Du mit demselben **Google Benutzerkonto** angemeldet bist mit dem auch deine Google (Nest) Geräte verknüpft sind.

5. Auf der **'Gerätezugriffskonsole'** klickst Du nun auf **'Projekt erstellen'** um ein neues Projekt anzulegen.
   ![Google Gerätezugriffskonsole - Projekt erstellen 01](img/screenshots/googleDeviceAccessConsole/screenshot_googleDeviceAccessConsole_createProject_01.png)

6. Als nächstes musst Du dem neuen Projekt einen Namen geben.<br>
   Du kannst den Namen für das neue Projekt frei wählen. **'*ioB: Google-Home-Nest*'** wäre Beispielsweise ein geeigneter Name.
   ![Google Gerätezugriffskonsole - Projekt erstellen 02](img/screenshots/googleDeviceAccessConsole/screenshot_googleDeviceAccessConsole_createProject_02.png)
   Nachdem Du den Projektnamen eingegeben hast, klickst du auf den Button **'Weiter'** um zum nächsten Bildschirm zu gelangen.

7. Nun wirst Du aufgefordert deine **'OAuth-Client-ID'** anzugeben.<br>
   Wie du **'Anmeldedaten'** erstellst und hierdurch eine **'OAuth-Client-ID'** erhälst, wird im Abschnitt **'OAuth-Client-ID & Clientschlüssel erwerben'** erklärt.<br>
   Gib deine **'OAuth-Client-ID'** ein und klicke anschließend auf den Button **'Weiter'**.
   ![Google Gerätezugriffskonsole - Projekt erstellen 03](img/screenshots/googleDeviceAccessConsole/screenshot_googleDeviceAccessConsole_createProject_03.png)

> [!IMPORTANT]
> An dieser Stelle wird dir die Möglichkeit gegeben diesen Schritt zu überspringen.<br>
> Solltest Du noch keine **'OAuth-Client-ID'** erworben haben, kannst Du diesen Schritt nun überspringen.<br>
> Beachte jedoch, dass die Eingabe der **'OAuth-Client-ID'** zwingend erforderlich ist.<br>
> Wenn du diesen Schritt überspringst, musst Du die **'OAuth-Client-ID'** zu einem späteren Zeitpunkt nachträglich hinzufügen.

8. Der nächste Bildschirm möchte von dir eine Entscheidung bezüglich der Aktivierung von **Ereignissen**.<br>
   Die Aktivierung von **Ereignissen** ist Teil der **'Erweiterten-Einrichtung'**. Gerne kannst du aber schon jezt die **Ereignissen** aktivieren.
   Wähle ob du die **Ereignisse** aktivieren möchtest oder nicht und klicke anschließend auf den Button **'Projekt erstellen'**.
   ![Google Gerätezugriffskonsole - Projekt erstellen 04](img/screenshots/googleDeviceAccessConsole/screenshot_googleDeviceAccessConsole_createProject_04.png)

9. Das neue Projekt ist nun angelegt und deine **'Projekt-ID'** wird dir im nächsten Bildschirm angezeigt.
   ![Google Gerätezugriffskonsole - Projekt erstellen 05](img/screenshots/googleDeviceAccessConsole/screenshot_googleDeviceAccessConsole_createProject_05.png)
   Die **'Projekt-ID'** wird für die **Basis-Einrichtung** benötigt und muss im **'Admin Panel'** unter **Punkt 3** eingetragen werden.
   
> [!IMPORTANT]
> Bei der **'Projekt-ID'** (im oberen Bild) handelt es sich um die **'Projekt-ID'** der Google **'Gerätezugriffskonsole'** und NICHT um die **'Google Cloud - Projekt-ID'**.<br>
