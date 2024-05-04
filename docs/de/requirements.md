![Logo](../../admin/google-home-nest.png)

# ioBroker.google-home-nest

> [!NOTE]
> This is the documentation in German.<br>
> You can find the English version here: [🇬🇧 English documentation](../en/requirements.md)

## Basis Anforderungen
Um die Basisfunktionalität dieses Adapters nutzen zu können, müssen folgende Bedingungen erfüllt sein...

### 1. Deine Google (Nest) Geräte müssen mit einem Google Benutzerkonto verknüpft sein.
  Dies ist für gewöhnlich der Fall, wenn Du deine Google (Nest) Geräte in der Google Home App auf deinem Smartphone hinzugefügt hast und in der App mit einem Benutzerkonto angemeldet bist.
  > [!IMPORTANT]
  > Alte Nest Konten werden nicht unterstützt und müssen vor der Verwendung zu einem Google Konto migriert werden.

### 2. Du musst für Google **'Device Access'** registriert sein.
  Wie das funktioniert, erfährst Du im Abschnitt 'Adaptereinrichtung' ([hier](adapter_setup.md)).
  > [!NOTE]
  > Die Registrierung setzt die Annahme der Nutzungsbedingungen für die 'Google API' und die 'Device Access Sandbox' sowie eine einmalige Gebühr von (Stand: Mai 2024) $5 (US Dollar) vorraus.

  > [!IMPORTANT]
  > Achte darauf das die Registrierung für Google 'Device Access' über demselben Google Konto erfolgt mit dem auch deine Google (Nest) Geräte verknüpft sind.<br>
  > Alte Nest Konten werden nicht unterstützt und müssen vor der Verwendung zu einem Google Konto migriert werden.

### 3. Es muss ein Projekt in der Google **'Device Access Console'** erstellt werden.
  Das Projekt kannst Du nach erfolgreicher Registrierung für Google 'Device Access' in der Google 'Device Access Console' erstellen.<br>
  Wie das funktioniert, erfährst Du im Abschnitt 'Adaptereinrichtung' ([hier](adapter_setup.md)).

  > [!IMPORTANT]
  > Achte darauf, dass die Erstellung des Projekts in der Google 'Device Access Console' über demselben Google Konto erfolgt mit dem auch deine Google (Nest) Geräte verknüpft sind.<br>
  > Alte Nest Konten werden nicht unterstützt und müssen vor der Verwendung zu einem Google Konto migriert werden.

### 4. Es muss ein Projekt in der **'Google Cloud Console'** erstellt werden.
  Wie das funktioniert, erfährst Du im Abschnitt 'Adaptereinrichtung' ([hier](adapter_setup.md)).

  > [!IMPORTANT]
  > Achte darauf das die Erstellunng des Projekts in der 'Google Cloud Console' über demselben Google Konto erfolgt mit dem auch deine Google (Nest) Geräte verknüpft sind.<br>
  > Alte Nest Konten werden nicht unterstützt und müssen vor der Verwendung zu einem Google Konto migriert werden.
