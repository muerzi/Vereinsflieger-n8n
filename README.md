# n8n-nodes-vereinsflieger

Ein [n8n](https://n8n.io) Community Node, um [Vereinsflieger.de](https://www.vereinsflieger.de) (bzw. [Flightcenter Plus](https://www.flightcenterplus.de)) per REST-API aus n8n-Workflows anzusteuern.

Dieses Projekt ist **inoffiziell** und steht in keiner Verbindung zu Vereinsflieger.de. Es implementiert die von Vereinsflieger veröffentlichte "REST-API-Spezifikation" (Stand 29.07.2025) für folgende Bereiche:

- **Anmeldung** (Kapitel 2): Sitzungsschlüssel anfordern, Anmelden, Abmelden, Benutzerinformationen
- **Flugdatenerfassung** (Kapitel 3): Flüge anlegen, bearbeiten, löschen, auslesen, F-Schlepp-Flüge verbinden
- **Kalender und Termine** (Kapitel 4): Kalender/Termine auslesen, Termine anlegen, bearbeiten, löschen
- **Mitglieder** (Kapitel 5): Mitgliederliste auslesen
- **Reservierungen** (Kapitel 6): Aktuelle Reservierungen auslesen
- **Instandhaltung** (Kapitel 7): Zellenzeiten eines Luftfahrzeugs auslesen
- **Finanzen – Buchungen** (Kapitel 8): Buchungen anlegen, bearbeiten, auslesen
- **Arbeitsstunden** (Kapitel 9): Arbeitsstunden auslesen, anlegen, Kategorien auslesen
- **Allgemeiner Verkauf** (Kapitel 10): Artikelliste auslesen, Verkäufe auslesen und anlegen
- **Datensicherung** (Kapitel 11): Datensicherungsdatei (ZIP) herunterladen
- **Gutscheine** (Kapitel 12): Gutscheinliste auslesen, Gutschein anlegen

Damit ist die komplette Spezifikation bis auf Kapitel 13 (Kontakt, reine Kontaktinfo ohne API-Endpunkt) abgedeckt. Die Anmeldung übernimmt der Node vollautomatisch im Hintergrund – du musst dich nur einmal in den Zugangsdaten (Credentials) hinterlegen.

## Inhalt

- [Voraussetzungen](#voraussetzungen)
- [Installation](#installation)
- [Zugangsdaten einrichten](#zugangsdaten-einrichten)
- [Node verwenden](#node-verwenden)
  - [Ressource: Flight (Flug)](#ressource-flight-flug)
  - [Ressource: Calendar (Termin)](#ressource-calendar-termin)
  - [Ressource: User (Benutzer)](#ressource-user-benutzer)
  - [Ressource: Member (Mitglied)](#ressource-member-mitglied)
  - [Ressource: Reservation (Reservierung)](#ressource-reservation-reservierung)
  - [Ressource: Maintenance (Instandhaltung)](#ressource-maintenance-instandhaltung)
  - [Ressource: Booking (Buchung)](#ressource-booking-buchung)
  - [Ressource: Work Hours (Arbeitsstunden)](#ressource-work-hours-arbeitsstunden)
  - [Ressource: Article (Artikel)](#ressource-article-artikel)
  - [Ressource: Sale (Verkauf)](#ressource-sale-verkauf)
  - [Ressource: Backup (Datensicherung)](#ressource-backup-datensicherung)
  - [Ressource: Voucher (Gutschein)](#ressource-voucher-gutschein)
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

> **Status:** Dieses Paket ist noch **nicht auf npm veröffentlicht** (Repository ist aktuell privat). Bis zur Veröffentlichung funktioniert nur die manuelle Installation unten. Sobald das Paket auf npm ist, wird das der einfachste Weg:
>
> 1. Öffne dein n8n unter **Einstellungen → Community Nodes**.
> 2. Klicke auf **Install a community node**.
> 3. Trage den npm-Paketnamen ein: `n8n-nodes-vereinsflieger`
> 4. Bestätige die Installation.
>
> Voraussetzung dafür ist, dass deine n8n-Instanz die Ausführung von Community Nodes erlaubt (`N8N_COMMUNITY_PACKAGES_ENABLED=true`, das ist bei self-hosted n8n meist die Standardeinstellung).

### Manuell / aus dem Quellcode

Für Docker-basierte n8n-Installationen (offizielles `n8nio/n8n`-Image) legt n8n installierte Community Nodes unter `~/.n8n/nodes/node_modules/` ab. Ein lokal gebautes Paket lässt sich dort per `npm install <lokaler-pfad>` einhängen, ganz ohne `npm link` (das in vielen Containern an fehlenden Schreibrechten auf den globalen npm-Ordner scheitert):

```bash
# Innerhalb des n8n-Containers bzw. auf dem Host mit Zugriff auf ~/.n8n
git clone https://github.com/muerzi/Vereinsflieger-n8n.git
cd Vereinsflieger-n8n
npm install --include=dev   # devDependencies werden von manchen n8n-Images sonst übersprungen (NODE_ENV=production)
npm run build

mkdir -p ~/.n8n/nodes
cd ~/.n8n/nodes
npm install /pfad/zu/Vereinsflieger-n8n
```

Anschließend den n8n-Container/-Prozess neu starten, damit der Node geladen wird. Bei einem Update des Quellcodes: `git pull`, `npm run build`, danach in `~/.n8n/nodes` einmal `npm uninstall n8n-nodes-vereinsflieger` gefolgt von `npm install /pfad/zu/Vereinsflieger-n8n` (ein einfaches erneutes `npm install` erkennt geänderte lokale Dateien bei gleicher Versionsnummer sonst nicht zuverlässig).

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

Der Node folgt dem n8n-Standardmuster **Resource → Operation**. Wähle zunächst die Ressource (Flight, Calendar, User, Member, Reservation, Maintenance, Booking, Work Hours, Article, Sale, Backup oder Voucher) und danach die gewünschte Operation.

Bei jeder Ausführung meldet sich der Node **einmal** am Anfang an (Sitzungsschlüssel anfordern + Anmelden) und **einmal** am Ende wieder ab – unabhängig davon, wie viele Eingabe-Items verarbeitet werden. Das schont dein Tageslimit von 500 Anfragen.

Alle Datums-/Uhrzeitfelder erwarten n8n-typische ISO-8601-Werte (z. B. über den Datums-Picker oder eine Expression wie `{{$now}}`); der Node rechnet sie automatisch in das von Vereinsflieger geforderte UTC-Format um.

Bei allen **"Get Many"**-Operationen (und vergleichbaren Listen-Operationen wie "Get Categories") gibt der Node automatisch **ein n8n-Item pro Datensatz** aus – ganz ohne zusätzlichen Code-Node. Das ist nötig, weil Vereinsflieger Listen inkonsistent kodiert: Ist die zugrunde liegende PHP-Liste fortlaufend ab 0 indiziert, liefert die API ein JSON-Array (`[...]`); ist sie z. B. nach Datensatz-ID indiziert (was bei mehreren Endpunkten vorkommt), liefert PHPs `json_encode` stattdessen ein JSON-**Objekt** (`{"12345": {...}, "67890": {...}}`). Der Node erkennt beide Formen und splittet sie zuverlässig in einzelne Items auf.

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

### Ressource: Member (Mitglied)

| Operation | Vereinsflieger-Funktion | Beschreibung |
|---|---|---|
| Get Many | 5.1 Auslesen der Mitgliederliste | Vollständige Mitgliederliste mit Kontakt-, Bank- und weiteren Stammdaten. Benötigt das Recht "Mitgliederdaten bearbeiten". |

### Ressource: Reservation (Reservierung)

| Operation | Vereinsflieger-Funktion | Beschreibung |
|---|---|---|
| Get Many | 6.1 Aktuelle Reservierungen auslesen | Alle aktuell aktiven Reservierungen (LFZ, Winde, …) |

### Ressource: Maintenance (Instandhaltung)

| Operation | Vereinsflieger-Funktion | Beschreibung |
|---|---|---|
| Get | 7.1 Aktuelle Zellenzeiten eines LFZs auslesen | Motorzählerstand, Flugzeit, Landungen und Schleppstarts zu einem Callsign |

### Ressource: Booking (Buchung)

| Operation | Vereinsflieger-Funktion | Beschreibung |
|---|---|---|
| Create | 8.1 Buchung anlegen | Neue Finanzbuchung anlegen (setzt Buchhaltungsmodus Version 2 voraus) |
| Update | 8.2 Buchung bearbeiten | Bestehende Buchung ändern |
| Get | 8.3 Einzelne Buchung auslesen | Eine Buchung per ID auslesen |
| Get Many | 8.4 – 8.6 | Buchungen listen, mit Filter: Today / Year / Date Range |

### Ressource: Work Hours (Arbeitsstunden)

| Operation | Vereinsflieger-Funktion | Beschreibung |
|---|---|---|
| Get Many | 9.1 Arbeitsstunden auslesen | Arbeitsstunden für einen Zeitraum |
| Create | 9.2 Arbeitsstunden anlegen | Neuen Arbeitsstundendatensatz anlegen |
| Get Categories | 9.3 Arbeitsstundenkategorien auslesen | Verfügbare Kategorien (für das Feld "Category ID" bei Create) |

### Ressource: Article (Artikel)

| Operation | Vereinsflieger-Funktion | Beschreibung |
|---|---|---|
| Get Many | 10.1 Artikelliste auslesen | Alle Artikel inkl. Preisen, Bestand und Gebührenbereich |

### Ressource: Sale (Verkauf)

| Operation | Vereinsflieger-Funktion | Beschreibung |
|---|---|---|
| Get Many | 10.2 – 10.5 | Verkäufe listen, mit Filter: Date Range / Recently Modified / By Date / Today (jeweils nach Leistungsdatum) |
| Create | 10.6 Verkauf anlegen | Neuen Verkauf anlegen (Artikelnummer + Menge, optional Zahlungsart fürs Kassenbuch) |

### Ressource: Backup (Datensicherung)

| Operation | Vereinsflieger-Funktion | Beschreibung |
|---|---|---|
| Download | 11.1 Datensicherungsdatei abrufen | Lädt die Datensicherung als ZIP-Datei herunter und legt sie als **Binärdaten** im Output ab (Feldname konfigurierbar über "Binary Property", Standard: `data`) |

Da die Antwort eine ZIP-Datei statt JSON ist, weicht diese Operation vom Rest des Nodes ab: Das Ergebnis-Item enthält keine (sinnvollen) JSON-Felder, dafür die Datei unter `binary.<Binary Property>` – direkt weiterverwendbar z. B. mit dem **Move Binary Data**- oder **Write Binary File**-Node.

### Ressource: Voucher (Gutschein)

| Operation | Vereinsflieger-Funktion | Beschreibung |
|---|---|---|
| Get Many | 12.1 Gutscheinliste auslesen | Alle Gutscheine mit Status, Betrag und Empfängerdaten |
| Create | 12.2 Gutschein anlegen | Neuen Gutschein anlegen, optional inkl. Anlage der Person in der Mitgliederverwaltung (dann ist "Last Name" Pflicht) |

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
    MemberDescription.ts             # Felder + Logik für Ressource "Member"
    ReservationDescription.ts        # Felder + Logik für Ressource "Reservation"
    MaintenanceDescription.ts        # Felder + Logik für Ressource "Maintenance"
    BookingDescription.ts            # Felder + Logik für Ressource "Booking"
    WorkHoursDescription.ts          # Felder + Logik für Ressource "Work Hours"
    ArticleDescription.ts            # Felder + Logik für Ressource "Article"
    SaleDescription.ts               # Felder + Logik für Ressource "Sale"
    BackupDescription.ts             # Felder + Logik für Ressource "Backup"
    VoucherDescription.ts            # Felder + Logik für Ressource "Voucher"
  vereinsflieger.svg                 # Node-Icon
```

Die REST-API-Spezifikation ist damit vollständig umgesetzt (bis auf Kapitel 13 "Kontakt", das nur postalische Kontaktdaten des Anbieters ohne API-Endpunkt enthält). Pull Requests für Verbesserungen, weitere Ausgabefelder oder Bugfixes sind natürlich weiterhin willkommen.

## Veröffentlichung (für Maintainer)

Ein Workflow unter [`.github/workflows/publish.yml`](.github/workflows/publish.yml) veröffentlicht das Paket auf npm inkl. [Provenance](https://docs.npmjs.com/generating-provenance-statements) – so wie n8n es für zukünftige [Verifizierung](https://docs.n8n.io/connect/create-nodes/deploy-your-node/submit-community-nodes/#submit-your-node-for-verification-by-n8n) verlangt. Er läuft **nicht automatisch bei jedem Push**, sondern nur bei einem veröffentlichten GitHub Release oder manuell über den "Run workflow"-Button im Actions-Tab.

Einmalig vor dem ersten Publish nötig:

1. Einen Account auf [npmjs.com](https://www.npmjs.com/) anlegen (falls noch nicht vorhanden).
2. Den allerersten Publish klassisch von einer lokalen Maschine aus durchführen (`npm login` + `npm publish --access public`), da der Paketname auf npm erst existieren muss, bevor ein "Trusted Publisher" dafür konfiguriert werden kann.
3. Anschließend auf npmjs.com unter den Paket-Einstellungen → **Publish access → Trusted Publishers** einen neuen Publisher mit Repository-Owner `muerzi`, Repository-Name `Vereinsflieger-n8n` und Workflow-Name `publish.yml` hinzufügen. Ab dann kann der GitHub-Actions-Workflow ohne gespeichertes npm-Token veröffentlichen.

Für eine offizielle Verifizierung durch n8n (Node erscheint dann in der n8n-Node-Suche) muss das GitHub-Repository zusätzlich **öffentlich** sein – aktuell ist es das bewusst noch nicht.

## Haftungsausschluss

Dies ist ein privates, inoffizielles Community-Projekt. Es besteht keine Verbindung zur Vereinsflieger.de GmbH. Die Nutzung der REST-Schnittstelle unterliegt den [Nutzungsbedingungen von Vereinsflieger.de](https://www.vereinsflieger.de) – insbesondere dem Verbot der kommerziellen Nutzung und dem Limit von 500 Anfragen pro Tag und App Key. Nutzung auf eigene Verantwortung.

## Lizenz

Siehe [LICENSE](LICENSE).
