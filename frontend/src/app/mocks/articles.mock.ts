import moment from 'moment-timezone';

import { Article } from '@app/models';

import { MOCK_IMAGES } from './images.mock';
import { MOCK_MODIFICATION_INFOS } from './modification-info.mock';

export const MOCK_ARTICLES: Article[] = [
  {
    id: 'a7b8c9d0e1f2a3b4',
    title: 'Blitz Tournament Results - January 1st, 2025',
    body: `
      ### **Open**\n<br>\n\n| # | Name | Rating | Round 1 | Round 2 | Round 3 | Round 4 | Round 5
      | Round 6 | Round 7 | Points |\n|--|--|--|--|--|--|--|--|--|--|--|\n|1	|One, Person	|1935
      |W8 (b)	|W11 (w)	|W17 (b)	|D2 (w)	|D9 (b)	|W10 (w)	|W3 (b)	|6.0|\n|2	|Two, Person	|
      1863	|W12 (w)	|W29 (b)	|D10 (w)	|D1 (b)	|W4 (w)	|L3 (w)	|W6 (b)	|5.0|\n|3	|Three, Person
      |2193	|L14 (w)	|W20 (b)	|W12 (w)	|W6 (b)	|W7 (w)	|W2 (b)	|L1 (w)	|5.0|\n|4	|Four, Person
      |1809	|W6 (b)	|L10 (b)	|W14 (w)	|W16 (w)	|L2 (b)	|W20 (w)	|W11 (b)	|5.0|\n|5	|Five,
      Person	|1811	|L17 (w)	|L24 (b)	|W15 (b)	|W28 (w)	|W25 (b)	|D11 (w)	|W13 (b)	|4.5|\n|6
      |Six, Person	|1573	|L4 (w)	|W21 (b)	|W23 (w)	|L3 (w)	|W15 (b)	|W7 (b)	|L2 (w)	|4.0|\n|7
      |Seven, Person	|1827	|L11 (b)	|W16 (w)	|W13 (b)	|W8 (w)	|L3 (b)	|L6 (w)	|W14 (b)	|4.0|
      \n|8	|Eight, Person	|1538	|L1 (w)	|W30 (b)	|W28 (w)	|L7 (b)	|L11 (b)	|W15 (w)	|W16 (b)
      |4.0|\n|9	|Nine, Person	|2029	|H---	|W14 (b)	|W24 (w)	|W10 (b)	|D1 (w)	|U---	|U---	|4.0|\n
      |10	|Ten, Person	|1966	|W27 (b)	|W4 (w)	|D2 (b)	|L9 (w)	|W13 (b)	|L1 (b)	|U---	|3.5|\n|11
      |Eleven, Person	|1631	|W7 (w)	|L1 (b)	|L20 (w)	|W23 (b)	|W8 (w)	|D5 (b)	|L4 (w)	|3.5|\n|
      12|Twelve, Person	|1648	|L2 (b)	|W15 (w)	|L3 (b)	|D27 (w)	|W16 (b)	|L13 (w)	|W20 (b)	|
      3.5|\n|13	|Thirteen, Person	|1601	|H---	|W23 (b)	|L7 (w)	|W20 (b)	|L10 (w)	|W12 (b)	|L5
      (w)	|3.5|\n|14	|Fourteen, Person	|1694	|W3 (b)	|L9 (w)	|L4 (b)	|L15 (w)	|W26 (b)	|W22 (w)
      |L7 (w)	|3.0|\n|15	|Fifteen, Person	|unr.	|W21 (w)	|L12 (b)	|L5 (w)	|W14 (b)	|L6 (w)	|L8
      (b)	|W23 (w)	|3.0|\n|16	|Sixteen, Person	|1495	|W30 (w)	|L7 (b)	|W27 (w)	|L4 (b)	|L12
      (w) |W21 (b)	|L8 (w)	|3.0|\n|17	|Seventeen, Person	|1589	|W5 (b)	|W22 (w)	|L1 (w)	|W24
      (b)	|U--- |U---	|U---	|3.0|\n|18	|Eighteen, Person	|1852	|H---	|H---	|U---	|U---	|U---	|W26
      (w)	|W21 (b) |3.0|\n|19	|Nineteen, Person	|2081	|H---	|H---	|U---	|U---	|U---	|W27 (w)	|W22
      (b)	|3.0|\n |20	|Twenty, Person	|1669	|H---	|L3 (w)	|W11 (b)	|L13 (w)	|W27 (b)	|L4 (b)	|
      L12 (w)	|2.5|\n|21	|A, Person	|1465	|L15 (b)	|L6 (w)	|W22 (b)	|L25 (w)	|W30 (b)	|
      L16 (w)	|L18 (w)	|2.0|\n|22	|B, Person	|1677	|L29 (w)	|L17 (b)	|L21 (w)	|W30 (b)
      |W23 (w) |L14 (b)	|L19 (w)	|2.0|\n|23	|C, Person	|1337	|W25 (b)	|L13 (w)	|L6 (b)	|L11
      (w)	|L22 (b)	|W30 (w)	|L15 (b)	|2.0|\n|24	|D, Person	|1540	|W28 (b)	|W5 (w)	|L9 (b)	|
      L17 (w)	|U---	|U---	|U---	|2.0|\n|25	|E, Person	|1571	|L23 (w)	|L28 (b)	|W30 (w)	|W21
      (b)	|L5 (w)	|U---	|U---	|2.0|\n|26	|F, Person	|1304	|H---	|H---	|U---	|U---	|L14 (w)	|
      L18 (b)	|W30 (w)	|2.0|\n|27	|G, Person	|unr.	|L10 (w)	|B---	|L16 (b)	|D12 (b)	|L20
      (w)	|L19 (b)	|U---	|1.5|\n|28	|H, Person	|1220	|L24 (w)	|W25 (w)	|L8 (b)	|L5 (b)	|
      U---	|U---	|U---	|1.0|\n|29	|I, Person	|2013	|W22 (b)	|L2 (w)	|U---	|U---	|U---	|
      U---	|U---	|1.0|\n|30	|J, Person	|unr.	|L16 (b)	|L8 (w)	|L25 (b)	|L22 (w)	|L21 (w)
      |L23 (b)	|L26 (b)	|0.0|
    `,
    bannerImageId: MOCK_IMAGES[0].id,
    bookmarkDate: moment('2025-02-02').toISOString(),
    modificationInfo: MOCK_MODIFICATION_INFOS[0],
  },
  {
    id: 'b8c9d0e1f2a3b4c5',
    title: '2025 London Chess Championship Announcement',
    body: `
      ## **2025 London Chess Championship**\n<br>\n\n[Details]
      (article/view/22ab72bcd8ef1873fd62#details)\n\n## Details\n<br>\n\n### **Format**\n<br>\n\n
      * [Round-robin tournament](https://en.wikipedia.org/wiki/Round-robin_tournament) – 16 players
      in each section group, 8 players per section*\n* 7 rounds played over 7 weeks – 1 game per
      week, no byes (see Rescheduled Games and Withdrawals section below)\n* Finalists from each
      section will then play a two-game match (or four-game match if both players agree) to
      determine each section group’s winner\n* Ties are broken using head-to-head results when
      clear.  Otherwise, a playoff system determined by the LCC Executive will be used\n* The
      winner of Section A will be the [**2025 London Chess Champion**]
      (https://londonchess.ca/city-champion)\n\n\n<br>\n\n**Sections determined by total number
      of registered participants (A1 & A2, B1 & B2, C1 & C2, etc.)*\n\n<br>\n\n### **Time
      Control**\n<br>\n\n* Section A, G85+0 (85 minutes per player, no increment)\n* Subsequent
      sections, G80+0 (80 minutes per player, no increment)\n* **Please bring your own chess
      clock!**\n\n<br>\n\n### **Prize Distribution**\n<br>\n\n* The London Chess Champion
      receives $200\n* Winners of Sections A1 & A2 each receive a $100 performance bond*\n*
      Comparable prize structures for subsequent sections, with dollar amounts to be determined
      \n\n<br>\n\n**Once players complete their match participation commitment, they will be
      paid their bond*\n\n<br>\n\n### **Rules**\n<br>\n\n* [Touch-move rule]
      (https://en.wikipedia.org/wiki/Touch-move_rule)\n* Clocks will be started at the scheduled
      times, whether or not opponent has arrived\n* Cell phones must be off or ringer set to
      silent\n* Please use common sense and good sportsmanship to settle any discrepancies
      before calling for an arbiter\n* If an arbiter is needed, stop the clock before calling
      for one\n* Penalty for an infraction is 2 minutes added to opponent’s clock, at the
      arbiter’s discretion\n\n<br>\n\n### **Schedule**\n<br>\n\n|Date|	Round|	Clocks Start|\n
      |--|--|--|\n|Sept 5th, 2025|Draft & Draw Lots|7:00 pm|\n|\n|Sept 12th, 2025|Round 1|
      6:10 pm|\n|Sept 19th, 2025|Round 2|6:10 pm|\n|Sept 26th, 2025|Round 3|6:10 pm|\n|October
      3rd, 2025|Round 4|6:10 pm|\n|October 10th, 2025|Round 5|6:10 pm|\n|October 17th, 2025|
      Round 6|6:10 pm|\n|October 24th, 2025|Round 7|6:10 pm|\n|\n|October 31st, 2025|Tie-Breaks
      |6:10 pm|\n|\n|December 5th, 2025|Section Finals Game 1|6:10 pm|\n|December 12th, 2025|
      Section Finals Game 2|6:10 pm|\n|December 19th, 2025|Section Finals Game 3|6:10 pm|\n|
      December 26th, 2025|Section Finals Game 4|6:10 pm|\n\n<br>\n\n* **Arrive early for
      scheduled rounds; club doors open at 5:30 pm**\n\n<br>\n\n**Schedule is subject to change*
      \n\n<br>\n\n### **Rescheduled Games and Withdrawals**\n<br>\n\n* One reschedule is allowed
      per player for Rounds 1-5, within reason.  No reschedules are allowed in Rounds 6 or 7\n*
      Games must be made up by October 16th, 2025\n* Players who withdraw early will be subject
      to certain penalties and restrictions, at the discretion of the LCC Executive\n* **Let the
      TD know as soon as possible if a round cannot be played on its scheduled date**\n\n<br>
      \n\n### **Registration**\n<br>\n\n* Online registration has closed. If you wish to join
      late, please see the TD in person\n* Entry fee is $20, or $15 if you played in the
      Qualifier, payable via cash to the club Treasurer or e-transfer to the club [President]
      (mailto:lcc-championship@gmail.com), <u>on or before September 4th, 2025</u>\n* If you
      choose to e-transfer, please include the player name(s) and event in the message\n* **Late
      entries will be accepted on September 5th, 2025, but only until 6:45 pm. A late fee of
      $5 must be paid in addition to the registration fee**\n\n\n<br><br>\n\n## Results
      Crosstables\n<br>\n\n| | | |\n|--|--|--|\n|[Section A1](https://www.dropbox.com/scl/fi/
      4wz7qhgc5dqq5vetqjhlg/2025-Ch-A-RATED.pdf?rlkey=yvqng1w8zblz5pvmk5d68mykk&st=spcmynju&dl=0)
      |[Section A2](https://www.dropbox.com/scl/fi/4wz7qhgc5dqq5vetqjhlg/2025-Ch-A-RATED.pdf?
      rlkey=yvqng1w8zblz5pvmk5d68mykk&st=spcmynju&dl=0)	|[Section A Finals](https://www.
      dropbox.com/scl/fi/90nc69advr0k9tkdtqne5/2025-Ch-MATCHES.pdf?rlkey=
      3xzwoissqtutu45ck4maj6osk&st=otwqcja9&dl=0)|\n|[Section B1](https://www.dropbox.com
      /scl/fi/irayf42r2ks837k7t26i3/2025-Ch-B-RATED.pdf?rlkey=su588kcaju94ps82945967e95&st
      =v34z1et2&dl=0)	|[Section B2](https://www.dropbox.com/scl/fi/irayf42r2ks837k7t26i3/
      2025-Ch-B-RATED.pdf?rlkey=su588kcaju94ps82945967e95&st=v34z1et2&dl=0)	|[Section B
      Finals](https://www.dropbox.com/scl/fi/90nc69advr0k9tkdtqne5/2025-Ch-MATCHES.pdf?
      rlkey=3xzwoissqtutu45ck4maj6osk&st=otwqcja9&dl=0)|\n|[Section C1](https://www.dropbox
      .com/scl/fi/q5y9igsb0emqn4x24xrdw/2025-Ch-C-RATED.pdf?rlkey=f2jjbg1dyo0rb9l11i5ml1jwq
      &st=kgfo72uz&dl=0)	|[Section C2](https://www.dropbox.com/scl/fi/q5y9igsb0emqn4x24xrdw/
      2025-Ch-C-RATED.pdf?rlkey=f2jjbg1dyo0rb9l11i5ml1jwq&st=kgfo72uz&dl=0)	|[Section C Finals]
      (https://www.dropbox.com/scl/fi/90nc69advr0k9tkdtqne5/2025-Ch-MATCHES.pdf?rlkey=
      3xzwoissqtutu45ck4maj6osk&st=otwqcja9&dl=0)|\n|[Section D](https://www.dropbox.com/scl/fi/
      acwq0ku3csxl33j5sc04g/2025-Ch-D-RATED.pdf?rlkey=b4s18b6b81wtye2kt0lf1b3rb&st=b1ucnyqb&
      dl=0)	|[Section E](https://www.dropbox.com/scl/fi/5ph3veqyscxki95cu0csn/2025-Ch-E-RATED
      .pdf?rlkey=uy3sbo9eskessz22566m9x5xe&st=zhcrehgl&dl=0)	|[Youth](https://www.dropbox.com/
      scl/fi/vkszvk9pf2i4wq3gsvsqj/2025-Ch-YOUTH-RATED.pdf?rlkey=a05pgz3bnp2mdsu2gas61hycw&st=
      mf96ytpb&dl=0)|\n\n<br>\n\n* The latest tournament PGN file is available [here](https://
      www.dropbox.com/scl/fi/xo86cw43cs3oaqiih2g2v/2025-London-Ch.pgn?rlkey=
      5gd2idyje0q1gcnuh2cooakfp&st=vf2jr6qx&dl=0) shortly after each round\n* Games can also be
      viewed in the [Game Archives](https://londonchess.ca/game-archives), updated weekly \n\n
      <br>\n\n**Results Crosstables and PGNs provided by LCC Ratings Auditor*\n\n<br><br>\n\n
      ## Photos\n<br>\n\nComing soon...
    `,
    bannerImageId: MOCK_IMAGES[1].id,
    bookmarkDate: moment('2025-01-10').toISOString(),
    modificationInfo: MOCK_MODIFICATION_INFOS[1],
  },
  {
    id: 'c9d0e1f2a3b4c5d6',
    title:
      'A Very Short Article But With An Exceptionally Long Title That Goes Beyond the Character Limit for Article Titles and Should Be Truncated',
    body: `
      # An article header\n\n<br><br>\n\nAnd not much text underneath it.
    `,
    bannerImageId: MOCK_IMAGES[1].id,
    bookmarkDate: null,
    modificationInfo: MOCK_MODIFICATION_INFOS[2],
  },
  {
    id: 'd0e1f2a3b4c5d6e7',
    title: 'An even shorter one',
    body: `Got nothing to say!`,
    bannerImageId: MOCK_IMAGES[0].id,
    bookmarkDate: null,
    modificationInfo: MOCK_MODIFICATION_INFOS[3],
  },
  {
    id: 'e0f1a2b3c4d5e6f7',
    title: 'An article currently being modified',
    body: `Some article body text here...`,
    bannerImageId: MOCK_IMAGES[0].id,
    bookmarkDate: moment('2025-01-20T14:00:05').toISOString(),
    modificationInfo: MOCK_MODIFICATION_INFOS[3],
  },
];
