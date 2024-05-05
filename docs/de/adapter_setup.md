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

## **'OAuth-Client-ID'** erwerben

Um eine **'OAuth-Client-ID'** zu erhalten muss zunächst ein Google Cloud Projekt angelegt werden.

1. Rufe in deinem Browser die [Google Cloud Console](https://console.cloud.google.com/) auf.<br>
> [!TIP]
> Die **'Google Cloud Console'** kann auch über die Adresse 'https://console.cloud.google.com/'<br>oder einem Klick auf einer der entsprechenden Button im **'Admin Panel'** aufgerufen werden.

2. Wenn Du die **'Google Cloud Console'** zum ersten Mal aufrufst, wirst Du nun aufgefordert die Nutzungsbedingungen für die **'Google Cloud Platform'** zu akzeptieren.
   ![Nutzungsbedingungen - Google Cloud Console](img/screenshots/googleCloudConsole/screenshot_googleCloudConsole_terms.png)
   
   Um fortzufahren, stimme den Nutzungsbedingungen zu.
> [!IMPORTANT]
> Achte darauf, das Du mit demselben Google Konto eingeloggt bist, mit dem auch deine Google (Nest) Geräte verknüpft sind.

## **'Projekt-ID'** erwerben

Um eine **'Projekt-ID'** zu erhalten muss man sich zunächst für Google **'Device Access'** registrieren.

> [!NOTE]
> Die Registrierung setzt die Annahme der Nutzungsbedingungen für die 'Google API' und die 'Device Access Sandbox' sowie eine **einmalige Gebühr** von (Stand: Mai 2024) **$5 (US Dollar)** vorraus.

1. Rufe in deinem Browser die [Gerätezugriffskonsole](https://console.nest.google.com/device-access/) auf.<br>
> [!TIP]
> Die **'Gerätezugriffskonsole'** kann auch über die Adresse 'https://console.nest.google.com/device-access/'<br>oder einem Klick auf einer der entsprechenden Button im **'Admin Panel'** aufgerufen werden.

2. Sofern nicht bereits geschehen, müssen nun die Nutzungsbedingungen für die 'Google API' und die 'Device Access Sandbox' akzeptiert werden.
   ![Nutzungsbedingungen - Google Device Access Console](img/screenshots/googleDeviceAccessConsole/screenshot_googleDeviceAccessConsole_terms.png)
