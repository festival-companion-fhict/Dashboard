# EHBO Meldingen Dashboard – Event Aid

Frontend voor het meldingen-dashboard van de festival companion app.
Gewone HTML, CSS en JavaScript: geen framework, geen build-stap.

## Starten

Open `index.html` in de browser, of zet de map op een webserver (Apache/DirectAdmin werkt prima).
Lokaal testen met een server:

```
python3 -m http.server 8080
```

Log in met willekeurige gegevens: in mock-modus wordt alles geaccepteerd.

## Structuur

| Bestand | Inhoud |
|---|---|
| `index.html` | Pagina-shell, laadt de scripts in volgorde |
| `css/style.css` | Alle styling uit het Figma-ontwerp (kleuren, layout, responsive, leesbaarheidsopties) |
| `js/data.js` | Voorbeeldmeldingen (alleen gebruikt in mock-modus) |
| `js/api.js` | API-laag: login, meldingen ophalen, status wijzigen |
| `js/icons.js` | SVG-lijniconen |
| `js/app.js` | Schermen, state en events |

## Koppelen aan de backend

In `js/api.js`:

```js
const API_CONFIG = {
  USE_MOCK: false,
  API_BASE: 'https://jouw-api.nl/api',
};
```

Verwachte endpoints (pas `api.js` aan als jullie backend anders werkt):

- `POST /login` met `{ username, password }` geeft `{ token, naam, rol }` terug
- `GET /meldingen` geeft een lijst met meldingen terug
- `PATCH /meldingen/{id}` met `{ status }` geeft de bijgewerkte melding terug

Velden van een melding: `id`, `type` (`MEDICAL`, `SECURITY`, `TOILET`, `AFVAL`, `KAPOT`, `OVERIG`),
`status` (`OPEN`, `IN_BEHANDELING`, `AFGEHANDELD`), `beschrijving`, `detail`, `lat`, `lon`,
`gebruiker_id`, `melder`, `locatie`, `aangemaakt_op` (ISO-datum).

Het token wordt als `Authorization: Bearer …` meegestuurd. Draait de API op een ander domein,
dan moet de backend CORS toestaan voor het domein van het dashboard.

## Functies

- Inloggen, meldingenlijst met filters (status en nood/overig), detailscherm met statusknoppen
- Terreinkaart met actieve meldingen en drukte-weergave
- Leesbaarheid: tekstgrootte, stevigere tekst, hoog contrast, ruimere bediening, minder animatie
- Instellingen: geluid bij nieuwe nood­meldingen, desktopmeldingen, automatisch verversen (10 s)
- Voorkeuren worden in de browser bewaard (`localStorage`)
- Alle tekst uit meldingen wordt ge-escaped (meldingen komen van bezoekers)

## Nog te doen

- De kaart is een getekende plattegrond met vaste pinposities (`PIN_POSITIONS` in `app.js`).
  Reken `lat`/`lon` om naar posities op de kaart, of gebruik een echte kaartlaag zoals Leaflet.
- "Wachtwoord vergeten?" en "Ingelogd blijven" zijn nog niet gekoppeld.
- Voor echte live-meldingen is WebSockets of Server-Sent Events beter dan elke 10 seconden verversen.
