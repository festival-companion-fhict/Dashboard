/* Voorbeelddata uit het Figma-ontwerp. Wordt alleen gebruikt als API_CONFIG.USE_MOCK = true.
   aangemaakt_op wordt relatief aan "nu" gezet, zodat "x min geleden" klopt. */
const minutesAgo = (min) => new Date(Date.now() - min * 60000).toISOString();

const MOCK_INCIDENTS = [
  {
    id: 'M-1048', type: 'MEDICAL', status: 'OPEN',
    beschrijving: 'Bezoeker onwel geworden bij de ingang',
    detail: 'Een bezoeker is onwel geworden en zit op de grond naast de kluisjes. De bezoeker is aanspreekbaar, maar erg duizelig. Een vriend blijft ter plaatse.',
    lat: 51.4478, lon: 5.4552, gebruiker_id: 'usr_892', melder: 'Sophie Jansen',
    locatie: 'Noordingang · bij kluisjes', aangemaakt_op: minutesAgo(2),
  },
  {
    id: 'M-1047', type: 'SECURITY', status: 'IN_BEHANDELING',
    beschrijving: 'Ruzie tussen meerdere personen',
    detail: 'Er is een woordenwisseling tussen drie personen aan de rechterzijde van de bar. De situatie lijkt op dit moment nog niet fysiek.',
    lat: 51.4471, lon: 5.4569, gebruiker_id: null, melder: 'Anoniem',
    locatie: 'Stage North · rechter bar', aangemaakt_op: minutesAgo(5),
  },
  {
    id: 'M-1046', type: 'TOILET', status: 'OPEN',
    beschrijving: 'Toiletgroep B heeft geen stromend water',
    detail: 'Bij meerdere kranen in toiletgroep B komt geen water. De toiletten zelf zijn nog toegankelijk.',
    lat: 51.4465, lon: 5.4545, gebruiker_id: 'usr_104', melder: 'Daan de Wit',
    locatie: 'Toiletgroep B · westzijde', aangemaakt_op: minutesAgo(12),
  },
  {
    id: 'M-1045', type: 'AFVAL', status: 'OPEN',
    beschrijving: 'Volle afvalbakken naast de foodcourt',
    detail: 'Drie afvalbakken naast de ingang van de foodcourt zijn vol. Er ligt inmiddels afval naast.',
    lat: 51.4459, lon: 5.4561, gebruiker_id: 'usr_511', melder: 'Lina Bakker',
    locatie: 'Foodcourt · ingang oost', aangemaakt_op: minutesAgo(18),
  },
  {
    id: 'M-1044', type: 'KAPOT', status: 'AFGEHANDELD',
    beschrijving: 'Hek bij backstage doorgang staat los',
    detail: 'Het onderste scharnier van het hek zit los. De doorgang kan nog worden afgesloten.',
    lat: null, lon: null, gebruiker_id: 'usr_722', melder: 'Mark van Dijk',
    locatie: 'Geen locatie gedeeld', aangemaakt_op: minutesAgo(31),
  },
  {
    id: 'M-1043', type: 'OVERIG', status: 'AFGEHANDELD',
    beschrijving: 'Gevonden sleutelbos afgegeven',
    detail: 'Een sleutelbos met blauwe tag is gevonden en afgegeven bij de infobalie.',
    lat: 51.4461, lon: 5.4572, gebruiker_id: null, melder: 'Anoniem',
    locatie: 'Infobalie · hoofdingang', aangemaakt_op: minutesAgo(46),
  },
];
