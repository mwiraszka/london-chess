import { Club } from '@app/models';

export const LCC: Club = {
  id: 'london-chess-club',
  name: 'London Chess Club',
  mapUrl: 'https://maps.app.goo.gl/9KbVMTcdTD938QAz9',
  location: { lat: 42.982546, lng: -81.261387 },
  addressLine1: "Kiwanis Seniors' Community Centre",
  addressLine2: '78 Riverside Drive',
  addressLine3: 'London, ON N6H 1B4',
  scheduleText: 'Thursdays, 6:00pm–9:00pm',
  email: 'welcome@londonchess.ca',
};

export const REGIONAL_CLUBS: Club[] = [
  {
    id: 'st-thomas-chess-club',
    name: 'St. Thomas Chess Club',
    mapUrl: 'https://maps.app.goo.gl/RUJk2MGqZsTACu4y9',
    location: { lat: 42.7753743, lng: -81.1909538 },
    addressLine1: 'Central United Church',
    addressLine2: '135 Wellington Street',
    addressLine3: 'St. Thomas, ON N5R 2R7',
    scheduleText:
      'Wednesdays, 6:30pm–8:30pm\n\n(basement entry through parking lot back door)',
  },
  {
    id: 'new-hamburg-chess-club',
    name: 'New Hamburg Chess Club',
    mapUrl: 'https://maps.app.goo.gl/A8vhqayvZrkTJ74J6',
    location: { lat: 43.3781213, lng: -80.7123328 },
    addressLine1: 'New Hamburg Library',
    addressLine2: '145 Huron Street',
    addressLine3: 'New Hamburg, ON N3A 1K1',
    scheduleText:
      'September–December 2025\nTuesdays, 6:00pm–7:45pm\nSaturdays, 12:00pm–1:45pm',
    email: 'nhchessclub@proton.me',
  },
  {
    id: 'glencoe-chess-club',
    name: 'Glencoe Chess Club',
    mapUrl: 'https://maps.app.goo.gl/Wdu9MZd9ezDmMT5Q6',
    location: { lat: 42.7467175, lng: -81.7110544 },
    addressLine1: 'Glencoe Arena',
    addressLine2: '138 Mill Street',
    addressLine3: 'Glencoe, ON N0L 1M0',
    scheduleText: 'Mondays, 6:00pm–8:00pm',
  },
  {
    id: 'baden-chess-club',
    name: 'Baden Chess Club',
    mapUrl: 'https://maps.app.goo.gl/b5r4x94poGWBXsRM6',
    location: { lat: 43.4033669, lng: -80.6721427 },
    addressLine1: 'Baden Branch Library',
    addressLine2: "115 Snyder's Road East",
    addressLine3: 'Baden, ON N3A 2V4',
    scheduleText: 'Wednesdays, 6:00pm–7:45pm',
    email: 'badenchessclub@proton.me',
  },
  {
    id: 'stratford-public-library-chess',
    name: 'Stratford Public Library Chess',
    mapUrl: 'https://maps.app.goo.gl/G29enJVYt2rsygog7',
    location: { lat: 43.3708652, lng: -80.9852903 },
    addressLine1: 'Stratford Public Library',
    addressLine2: '19 St. Andrew Street',
    addressLine3: 'Stratford, ON N5A 1A2',
    scheduleText: 'Mondays, 6:30pm–8:30pm',
    email: 'idemeester@splibrary.ca',
  },
];
