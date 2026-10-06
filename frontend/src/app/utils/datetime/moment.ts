import moment from 'moment-timezone/moment-timezone';

import { CLUB_TIME_ZONE_DATA } from '@app/constants/time-zone.generated';

// moment-timezone's own entry loads every zone in the world, so the app loads only the club's
moment.tz.load(CLUB_TIME_ZONE_DATA);

export default moment;
