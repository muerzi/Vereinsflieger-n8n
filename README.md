# n8n-nodes-vereinsflieger

Ein [n8n](https://n8n.io) Community Node, um [Vereinsflieger.de](https://www.vereinsflieger.de) (bzw. [Flightcenter Plus](https://www.flightcenterplus.de)) per REST-API aus n8n-Workflows anzusteuern.

Dieses Projekt ist **inoffiziell** und steht in keiner Verbindung zu Vereinsflieger.de. Es implementiert die von Vereinsflieger veröffentlichte "REST-API-Spezifikation" (Stand 29.07.2025) für folgende Bereiche:

- **Anmeldung** (Kapitel 2): Sitzungsschlüssel anfordern, Anmelden, Abmelden, Benutzerinformationen
- **Flugdatenerfassung** (Kapitel 3): Flüge anlegen, bearbeiten, löschen, auslesen, F-Schlepp-Flüge verbinden
- **Kalender und Termine** (Kapitel 4): Kalender/Termine auslesen, Termine anlegen, bearbeiten, löschen

Die Anmeldung übernimmt der Node vollautomatisch im Hintergrund – du musst dich nur einmal in den Zugangsdaten (Credentials) hinterlegen.

## Inhalt

- [Voraussetzungen](#voraussetzungen)
- [Installation](#installation)
- [Zugangsdaten einrichten](#zugangsdaten-einrichten)
- [Node verwenden](#node-verwenden)
  - [Ressource: Flight (Flug)](#ressource-flight-flug)
  - [Ressource: Calendar (Termin)](#ressource-calendar-termin)
  - [Ressource: User (Benutzer)](#ressource-user-benutzer)
- [Beispiel-Workflow](#beispiel-workflow)
- [Sicherheit](#sicherheit)
- [Fehlerbehebung](#fehlerbehebung)
- [Entwicklung](#entwicklung)
- [Haftungsausschluss](#haftungsausschluss)

## Voraussetzungen

- n8n **1.0 oder neuer** (self-hosted; Community Nodes lassen sich auf n8n Cloud nicht selbst installieren)
- Node.js **20 oder neuer**, falls du den Node selbst bauen möchtest
- Ein Vereinsflieger- bzw. Flightcenter-Plus-Konto mit den benötigten Rechten (z. B. "Mitgliederdaten bearbeiten" für bestimmte Funktionen)
- Ein **App Key**, den du im Vereinsflieger unter **Stammdaten → Einstellungen → REST Interface** anlegst

> **Hinweis zum Limit:** Vereinsflieger begrenzt alle Aufrufe je App Key auf **500 Anfragen pro Tag**. Eine kommerzielle Nutzung der Schnittstelle ist laut Anbieter grundsätzlich untersagt. Jede Workflow-Ausführung dieses Nodes verbraucht mindestens 2 Anfragen zusätzlich zur eigentlichen Aktion (Anmelden + Abmelden), unabhängig davon, wie viele Datensätze in dieser einen Ausführung verarbeitet werden.

## Installation

### Über die n8n-Oberfläche (empfohlen)

1. Öffne dein n8n unter **Einstellungen → Community Nodes**.
2. Klicke auf **Install a community node**.
3. Trage den npm-Paketnamen ein: `n8n-nodes-vereinsflieger`
4. Bestätige die Installation.

Voraussetzung dafür ist, dass deine n8n-Instanz die Ausführung von Community Nodes erlaubt (`N8N_COMMUNITY_PACKAGES_ENABLED=true`, das ist bei self-hosted n8n meist die Standardeinstellung).

### Manuell / aus dem Quellcode

```bash
git clone https://github.com/muerzi/Vereinsflieger-n8n.git
cd Vereinsflieger-n8n
npm install
npm run build
npm link

# im n8n-Installationsverzeichnis (bzw. ~/.n8n/custom):
npm link n8n-nodes-vereinsflieger
```

Anschließend n8n neu starten, damit der Node geladen wird.

## Zugangsdaten einrichten

Lege in n8n eine neue Zugangsdaten (Credential) vom Typ **Vereinsflieger API** an und fülle folgende Felder aus:

| Feld | Pflicht | Beschreibung |
|---|---|---|
| **Environment** | ja | Plattform deines Vereins: `vereinsflieger.de` oder `flightcenterplus.de` |
| **Username** | ja | Dein Vereinsflieger-Benutzername |
| **Password** | ja | Dein Vereinsflieger-Passwort. Wird von diesem Node **vor jeder Anfrage lokal per MD5 gehasht**, genau wie es die REST-API vorschreibt – das Klartext-Passwort verlässt n8n nur verschlüsselt über HTTPS. |
| **App Key** | ja | Der unter *Stammdaten → Einstellungen → REST Interface* erzeugte Schlüssel |
| **Club ID (CID)** | nein | Nur nötig, wenn dein Benutzerkonto in mehreren Vereinen existiert |
| **Two-Factor Secret** | nein | Aktueller TOTP-Code, nur nötig, wenn für den Benutzer die Zwei-Faktor-Authentifizierung aktiviert ist |

Über den Button **Test** prüft n8n die Zugangsdaten: Es wird ein Sitzungsschlüssel angefordert, eine vollständige Anmeldung durchgeführt und die Sitzung danach sofort wieder beendet – dein Tageslimit wird dabei nur minimal belastet.

Passwort, App Key und 2FA-Secret werden als **Password-Felder** maskiert dargestellt und von n8n verschlüsselt gespeichert.

## Node verwenden

Der Node folgt dem n8n-Standardmuster **Resource → Operation**. Wähle zunächst die Ressource (Flight, Calendar oder User) und danach die gewünschte Operation.

Bei jeder Ausführung meldet sich der Node **einmal** am Anfang an (Sitzungsschlüssel anfordern + Anmelden) und **einmal** am Ende wieder ab – unabhängig davon, wie viele Eingabe-Items verarbeitet werden. Das schont dein Tageslimit von 500 Anfragen.

Alle Datums-/Uhrzeitfelder erwarten n8n-typische ISO-8601-Werte (z. B. über den Datums-Picker oder eine Expression wie `{{$now}}`); der Node rechnet sie automatisch in das von Vereinsflieger geforderte UTC-Format um.

### Ressource: Flight (Flug)

| Operation | Vereinsflieger-Funktion | Beschreibung |
|---|---|---|
| Create | 3.1 Flug anlegen | Neuen Flug erfassen |
| Update | 3.2 Flug bearbeiten | Bestehenden Flug ändern |
| Delete | 3.3 Flug löschen | Flug löschen |
| Join Tow Flights | 3.4 F-Schlepp Flüge verbinden | Segelflug und Schleppflug zusammenführen |
| Get | 3.5 Flug auslesen | Einzelnen Flug per ID auslesen |
| Get Many | 3.6 – 3.12 | Flüge listen, mit Filter: Today / By Date / By Aircraft / My Flights / By User / Recently Modified / Date Range |

### Ressource: Calendar (Termin)

| Operation | Vereinsflieger-Funktion | Beschreibung |
|---|---|---|
| Get Public Calendar | 4.1 Öffentlichen Kalender auslesen | **Ohne Login** – benötigt nur den Homepage-Zugangscode (Administration → Homepageerweiterungen → Kalender) |
| Get My Calendar | 4.2 Meine Termine (ICS) auslesen | Kalender des angemeldeten Benutzers |
| Get Many | 4.3 Termine auslesen | Termine für einen Zeitraum |
| Create | 4.4 Termin anlegen | Neuen Termin anlegen (Sichtbarkeit immer "Alle Personen") |
| Update | 4.5 Termin bearbeiten | Bestehenden Termin ändern |
| Delete | 4.6 Termin Löschen | Termin löschen |

### Ressource: User (Benutzer)

| Operation | Vereinsflieger-Funktion | Beschreibung |
|---|---|---|
| Get | 2.4 Benutzerinformationen | Daten zum aktuell angemeldeten Benutzer (uid, Name, Mitgliedsnr., Rollen, E-Mail) |

## Beispiel-Workflow

Ein einfacher Workflow, der täglich morgens alle Flüge des Vortages als E-Mail zusammenfasst:

1. **Schedule Trigger** – täglich um 07:00 Uhr
2. **Vereinsflieger** – Resource `Flight`, Operation `Get Many`, Filter `By Date`, Date = `{{$today.minus(1, 'day')}}`
3. **Send Email** – Ausgabe der Flugliste an den Vorstand

Da "Get Public Calendar" ohne Anmeldung funktioniert, eignet es sich z. B. auch für einen einfachen Website- oder Discord-Bot, der kommende Vereinstermine ohne hinterlegte Zugangsdaten anzeigt.

## Sicherheit

- **Kein Klartext-Passwort im Netzwerk:** Das Passwort wird vor dem Versand clientseitig per MD5 gehasht (Vorgabe der Vereinsflieger-API) und ausschließlich über HTTPS übertragen.
- **Geheime Felder sind maskiert:** Password, App Key und Two-Factor Secret sind als n8n-Password-Felder hinterlegt und werden von n8n verschlüsselt in der Datenbank abgelegt, niemals im Klartext geloggt.
- **Kurzlebige Sitzungen statt dauerhafter Tokens:** Es gibt keinen statischen API-Key für Datenzugriffe. Der Node fordert pro Ausführung einen frischen Sitzungsschlüssel an und meldet sich danach explizit wieder ab (`interface/rest/auth/signout`), auch wenn während der Ausführung ein Fehler auftritt.
- **Kein Zugriff auf Umgebungsvariablen oder Dateisystem:** Der Node verarbeitet ausschließlich Daten, die über Node-Parameter oder eingehende Items übergeben werden.
- **Keine externen Laufzeit-Abhängigkeiten:** Für HTTP-Aufrufe und das Passwort-Hashing werden ausschließlich die von n8n bereitgestellten Helper (`this.helpers.httpRequest`) sowie das in Node.js eingebaute `crypto`-Modul verwendet – keine zusätzlichen npm-Pakete zur Laufzeit.
- **2FA-Unterstützung:** Ist für den Benutzer eine Zwei-Faktor-Authentifizierung aktiv, kann der aktuelle TOTP-Code im Credential-Feld *Two-Factor Secret* hinterlegt werden.

## Fehlerbehebung

| Meldung | Mögliche Ursache |
|---|---|
| *"Vereinsflieger sign-in failed"* | Benutzername, Passwort, App Key, Club ID (CID) oder 2FA-Code falsch |
| *"Vereinsflieger did not return an access token…"* | Falsches Environment ausgewählt (`vereinsflieger.de` vs. `flightcenterplus.de`) |
| HTTP 401 bei einer Operation | Sitzung abgelaufen oder fehlende Berechtigung des Benutzers für diese Funktion (z. B. "Mitgliederdaten bearbeiten") |
| HTTP 400 | Pflichtfeld fehlt oder ungültiges Format (z. B. Datum/Uhrzeit) |
| Node meldet, dass das Tageslimit erreicht ist | 500 Anfragen/Tag je App Key sind ausgeschöpft – auf den nächsten Tag warten oder Workflow-Frequenz reduzieren |

## Entwicklung

```bash
npm install     # Abhängigkeiten installieren
npm run build   # TypeScript kompilieren + Icons kopieren (dist/)
npm run lint    # n8n-Community-Node-Linter (eslint-plugin-n8n-nodes-base)
npm run dev     # TypeScript im Watch-Modus
```

Projektstruktur:

```
credentials/
  VereinsfliegerApi.credentials.ts   # Zugangsdaten-Definition
nodes/Vereinsflieger/
  Vereinsflieger.node.ts             # Node-Definition + execute()
  GenericFunctions.ts                # Login/Logout, HTTP-Helper, Datumsformate
  descriptions/
    FlightDescription.ts             # Felder + Logik für Ressource "Flight"
    CalendarDescription.ts           # Felder + Logik für Ressource "Calendar"
    UserDescription.ts               # Felder + Logik für Ressource "User"
  vereinsflieger.svg                 # Node-Icon
```

Pull Requests, die weitere Kapitel der REST-API-Spezifikation umsetzen (z. B. Mitglieder, Reservierungen, Instandhaltung, Finanzen), sind willkommen.

## Haftungsausschluss

Dies ist ein privates, inoffizielles Community-Projekt. Es besteht keine Verbindung zur Vereinsflieger.de GmbH. Die Nutzung der REST-Schnittstelle unterliegt den [Nutzungsbedingungen von Vereinsflieger.de](https://www.vereinsflieger.de) – insbesondere dem Verbot der kommerziellen Nutzung und dem Limit von 500 Anfragen pro Tag und App Key. Nutzung auf eigene Verantwortung.

## Lizenz

Siehe [LICENSE](LICENSE).
