import { TrophyIconComponent } from '@eagami/ui';
import { Store } from '@ngrx/store';
import { take } from 'rxjs/operators';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { ExpansionPanelComponent } from '@app/components/expansion-panel/expansion-panel.component';
import { MemberLinkComponent } from '@app/components/member-link/member-link.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { PhotoCarouselComponent } from '@app/components/photo-carousel/photo-carousel.component';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { ChampionshipTableRowData, Image } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { MembersActions, MembersSelectors } from '@app/store/members';
import { isExpired } from '@app/utils';

@Component({
  selector: 'lcc-champion-page',
  templateUrl: './champion-page.component.html',
  styleUrl: './champion-page.component.scss',
  imports: [
    ExpansionPanelComponent,
    MemberLinkComponent,
    PageHeaderComponent,
    TrophyIconComponent,
    PhotoCarouselComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChampionPageComponent implements OnInit {
  protected readonly pageIcon = TrophyIconComponent;

  public readonly photos: Partial<Image>[] = [
    {
      id: '1',
      mainUrl: 'assets/london-chess-champion/championship-trophies.webp',
      mainWidth: 957,
      mainHeight: 637,
      caption: 'Championship Trophies',
    },
    {
      id: '2',
      mainUrl: 'assets/london-chess-champion/2023-champion.webp',
      mainWidth: 609,
      mainHeight: 906,
      caption: '2023 & 2024 London Chess Champion: Serhii Ivanchuk',
    },
    {
      id: '3',
      mainUrl: 'assets/london-chess-champion/championship-cup.jpg',
      mainWidth: 450,
      mainHeight: 600,
      caption: 'Championship Cup',
    },
    {
      id: '4',
      mainUrl: 'assets/london-chess-champion/2019-champion.jpg',
      mainWidth: 356,
      mainHeight: 600,
      caption: '2019 London Chess Champion: Kevin Gibson',
    },
    {
      id: '5',
      mainUrl: 'assets/london-chess-champion/2022-championship-match.webp',
      mainWidth: 600,
      mainHeight: 300,
      caption: '2022 Championship Match: Carl Ehrman vs. Geoffrey Ruelland',
    },
  ];

  public readonly activeChampionships: ChampionshipTableRowData[] = [
    { year: 2024, winners: [{ name: 'Serhii Ivanchuk', peakRating: '2176' }] },
    { year: 2023, winners: [{ name: 'Kevin Gibson', peakRating: '2302' }] },
    { year: 2019, winners: [{ name: 'Kevin Gibson', peakRating: '2217*' }] },
    { year: 2018, winners: [{ name: 'Amir Docheshmeh', peakRating: '1771*' }] },
    { year: 2017, winners: [{ name: 'Steve Demmery', peakRating: '2166*' }] },
    { year: 2016, winners: [{ name: 'Tony Bao', peakRating: '2007*' }] },
    {
      year: 2015,
      winners: [
        { name: 'Steve Demmery', peakRating: '2166*' },
        { name: 'Dan Thomas', peakRating: '2099*' },
        { name: 'Jim Kearley', peakRating: '1977' },
      ],
    },
    { year: 2014, winners: [{ name: 'Steve Demmery', peakRating: '2166*' }] },
    {
      year: 2013,
      winners: [
        { name: 'Steve Demmery', peakRating: '2166*' },
        { name: 'Mike Coleman', peakRating: '2091*' },
      ],
    },
    { year: 2012, winners: [{ name: 'Steve Demmery', peakRating: '2166*' }] },
    { year: 2011, winners: [{ name: 'Steve Demmery', peakRating: '2166*' }] },
    { year: 2010, winners: [{ name: 'Kevin Gibson', peakRating: '2187*' }] },
    { year: 2009, winners: [{ name: 'Carl Ehrman', peakRating: '2174*' }] },
    { year: 2008, winners: [{ name: 'Steve Demmery', peakRating: '2162*' }] },
    { year: 2007, winners: [{ name: 'Steve Demmery', peakRating: '2162*' }] },
    { year: 2006, winners: [{ name: 'Steve Demmery', peakRating: '2162*' }] },
    { year: 2005, winners: [{ name: 'Mike Coleman', peakRating: '1929*' }] },
    { year: 2004, winners: [{ name: 'Steve Demmery', peakRating: '2162*' }] },
    { year: 2003, winners: [{ name: 'Jay Zendrowski', peakRating: '2232*' }] },
    { year: 2002, winners: [{ name: 'Jay Zendrowski', peakRating: '2232*' }] },
    { year: 2001, winners: [{ name: 'Jay Zendrowski', peakRating: '2232*' }] },
    { year: 2000, winners: [{ name: 'Carl Ehrman', peakRating: '2174*' }] },
    { year: 1999, winners: [{ name: 'Jay Zendrowski', peakRating: '2232*' }] },
    { year: 1998, winners: [{ name: 'Jay Zendrowski', peakRating: '2232*' }] },
    { year: 1997, winners: [{ name: 'Jay Zendrowski', peakRating: '2232*' }] },
    { year: 1996, winners: [{ name: 'Todd Southam', peakRating: '2371*' }] },
    { year: 1995, winners: [{ name: 'Hans Jung', peakRating: '2323*' }] },
    { year: 1994, winners: [{ name: 'Carl Ehrman', peakRating: '2174*' }] },
  ];

  public readonly juniorChampionships: ChampionshipTableRowData[] = [
    {
      year: 2026,
      winners: [{ name: 'Akshaj Achyuth', peakRating: '2021' }],
      textStyle: 'font-weight: bold;',
    },
    { year: 2025, winners: [{ name: 'Akshaj Achyuth', peakRating: '2009' }] },
    { year: 2011, winners: [{ name: 'Kevin Gibson', peakRating: '2244' }] },
    { year: 2010, winners: [{ name: 'Kevin Gibson', peakRating: '2244' }] },
    { year: 2009, winners: [{ name: 'Kevin Gibson', peakRating: '2244' }] },
    { year: 2008, winners: [{ name: 'Kevin Gibson', peakRating: '2016' }] },
    { year: 2007, winners: [{ name: 'Kevin Gibson', peakRating: '2016' }] },
    { year: 2006, winners: [{ name: 'Peter Yang', peakRating: '1858' }] },
    { year: 2005, winners: [{ name: 'Kevin Gibson', peakRating: '2016' }] },
    { year: 2004, winners: [{ name: 'Wylon Wong', peakRating: '1999' }] },
    { year: 2003, winners: [{ name: 'David Wang', peakRating: '2260' }] },
    { year: 2002, winners: [{ name: 'Brent Komer', peakRating: '1668' }] },
    { year: 2001, winners: [{ name: 'Wylon Wong', peakRating: '1999' }] },
    { year: 2000, winners: [{ name: 'Liat Dobrishman', peakRating: '1968' }] },
    { year: 1999, winners: [{ name: 'Zamir Khan', peakRating: '2182' }] },
    { year: 1998, winners: [{ name: 'Zamir Khan', peakRating: '2182' }] },
    { year: 1997, winners: [{ name: 'Zamir Khan', peakRating: '2182' }] },
    { year: 1996, winners: [{ name: 'Zamir Khan', peakRating: '2182' }] },
  ];

  public readonly speedChampionships: ChampionshipTableRowData[] = [
    { year: 2019, winners: [{ name: 'Tony Bao', peakRating: '2071' }] },
    {
      year: 2018,
      winners: [
        { name: 'Steve Demmery', peakRating: '2166' },
        { name: 'Geoffrey Ruelland', peakRating: '2102' },
      ],
    },
    { year: 2017, winners: [{ name: 'Tony Bao', peakRating: '2032' }] },
    { year: 2016, winners: [{ name: 'Steve Demmery', peakRating: '2188' }] },
    { year: 2015, winners: [{ name: 'Geoffrey Ruelland', peakRating: '2016' }] },
    {
      year: 2014,
      winners: [
        { name: 'Steve Demmery', peakRating: '2188' },
        { name: 'Carl Ehrman', peakRating: '2174' },
      ],
    },
    { year: 2013, winners: [{ name: 'Kevin Gibson', peakRating: '2244' }] },
    {
      year: 2012,
      winners: [
        { name: 'Steve Demmery', peakRating: '2242' },
        { name: 'Kevin Gibson', peakRating: '2244' },
      ],
    },
    { year: 2011, winners: [{ name: 'Kevin Gibson', peakRating: '2244' }] },
    { year: 2010, winners: [{ name: 'Carl Ehrman', peakRating: '2202' }] },
    { year: 2009, winners: [{ name: 'Carl Ehrman', peakRating: '2202' }] },
    { year: 2008, winners: [{ name: 'Steve Demmery', peakRating: '2208' }] },
    { year: 2007, winners: [{ name: 'Carl Ehrman', peakRating: '2202' }] },
    { year: 2006, winners: [{ name: 'Jay Zendrowski', peakRating: '2307' }] },
    { year: 2005, winners: [{ name: 'Jay Zendrowski', peakRating: '2307' }] },
    { year: 2004, winners: [{ name: 'Jay Zendrowski', peakRating: '2307' }] },
    { year: 2003, winners: [{ name: 'Mike Coleman', peakRating: '2179' }] },
    { year: 2002, winners: [{ name: 'Steve Demmery', peakRating: '2208' }] },
    { year: 2001, winners: [{ name: 'Carl Ehrman', peakRating: '2202' }] },
    { year: 2000, winners: [{ name: 'Dan Surlan', peakRating: '2221' }] },
    { year: 1999, winners: [{ name: 'Jay Zendrowski', peakRating: '2307' }] },
    { year: 1998, winners: [{ name: 'Zamir Khan', peakRating: '2182' }] },
    { year: 1997, winners: [{ name: 'Dan Surlan', peakRating: '2221' }] },
    { year: 1996, winners: [{ name: 'Todd Southam', peakRating: '2423' }] },
    { year: 1995, winners: [{ name: 'Kosta Elieff', peakRating: '2300' }] },
    { year: 1994, winners: [{ name: 'Hans Jung', peakRating: '2346' }] },
    { year: 1993, winners: [{ name: 'Ron Pitre', peakRating: '2290' }] },
  ];

  public readonly standardChampionships: ChampionshipTableRowData[] = [
    {
      year: 2025,
      winners: [{ name: 'Rene Bartar', peakRating: '2027' }],
      textStyle: 'font-weight: bold;',
    },
    {
      year: 2024,
      winners: [{ name: 'Serhii Ivanchuk', peakRating: '2195' }],
    },
    { year: 2023, winners: [{ name: 'Serhii Ivanchuk', peakRating: '2195' }] },
    { year: 2022, winners: [{ name: 'Geoffrey Ruelland', peakRating: '2164' }] },
    {
      year: 2021,
      winners: [{ name: 'Cancelled due to pandemic' }],
      textStyle: 'font-style: italic;',
    },
    {
      year: 2020,
      winners: [{ name: 'Cancelled due to pandemic' }],
      textStyle: 'font-style: italic;',
    },
    { year: 2019, winners: [{ name: 'Kevin Gibson', peakRating: '2244' }] },
    { year: 2018, winners: [{ name: 'Kevin Gibson', peakRating: '2244' }] },
    { year: 2017, winners: [{ name: 'Kevin Gibson', peakRating: '2244' }] },
    { year: 2016, winners: [{ name: 'Kevin Gibson', peakRating: '2244' }] },
    { year: 2015, winners: [{ name: 'Kevin Gibson', peakRating: '2244' }] },
    { year: 2014, winners: [{ name: 'Steve Demmery', peakRating: '2242' }] },
    { year: 2013, winners: [{ name: 'Kevin Gibson', peakRating: '2244' }] },
    { year: 2012, winners: [{ name: 'Kevin Gibson', peakRating: '2244' }] },
    { year: 2011, winners: [{ name: 'Steve Demmery', peakRating: '2242' }] },
    { year: 2010, winners: [{ name: 'Kevin Gibson', peakRating: '2244' }] },
    { year: 2009, winners: [{ name: 'Mike Coleman', peakRating: '2179' }] },
    { year: 2008, winners: [{ name: 'Carl Ehrman', peakRating: '2202' }] },
    {
      year: 2007,
      winners: [
        { name: 'David Wang', peakRating: '2260' },
        { name: 'Mike Coleman', peakRating: '2179' },
      ],
    },
    { year: 2006, winners: [{ name: 'Dan Surlan', peakRating: '2221' }] },
    { year: 2005, winners: [{ name: 'Steve Demmery', peakRating: '2208' }] },
    { year: 2004, winners: [{ name: 'Jay Zendrowski', peakRating: '2307' }] },
    { year: 2003, winners: [{ name: 'David Jackson', peakRating: '2302' }] },
    {
      year: 2002,
      winners: [
        { name: 'Jay Zendrowski', peakRating: '2307' },
        { name: 'Steve Demmery', peakRating: '2208' },
      ],
    },
    {
      year: 2001,
      winners: [
        { name: 'Dan Surlan', peakRating: '2221' },
        { name: 'Carl Ehrman', peakRating: '2202' },
      ],
    },
    { year: 2000, winners: [{ name: 'Carl Ehrman', peakRating: '2202' }] },
    { year: 1999, winners: [{ name: 'Jay Zendrowski', peakRating: '2307' }] },
    { year: 1998, winners: [{ name: 'Carl Ehrman', peakRating: '2202' }] },
    { year: 1997, winners: [{ name: 'Jay Zendrowski', peakRating: '2307' }] },
    { year: 1996, winners: [{ name: 'Todd Southam', peakRating: '2423' }] },
    { year: 1995, winners: [{ name: 'Hans Jung', peakRating: '2346' }] },
    { year: 1994, winners: [{ name: 'Ron Pitre', peakRating: '2290' }] },
    { year: 1993, winners: [{ name: 'Hans Jung', peakRating: '2346' }] },
    { year: 1992, winners: [{ name: 'Kosta Elieff', peakRating: '2300' }] },
    { year: 1991, winners: [{ name: 'Jay Zendrowski', peakRating: '2307' }] },
    { year: 1990, winners: [{ name: 'David McTavish', peakRating: '2300' }] },
    { year: 1989, winners: [{ name: 'Hans Jung', peakRating: '2346' }] },
    { year: 1988, winners: [{ name: 'Dan Surlan', peakRating: '2221' }] },
    { year: 1987, winners: [{ name: 'David McTavish', peakRating: '2300' }] },
    { year: 1986, winners: [{ name: 'Hans Jung', peakRating: '2346' }] },
    { year: 1985, winners: [{ name: 'Hans Jung', peakRating: '2346' }] },
    { year: 1984, winners: [{ name: 'Hans Jung', peakRating: '2346' }] },
    { year: 1983, winners: [{ name: 'Hans Jung', peakRating: '2346' }] },
    { year: 1982, winners: [{ name: 'Hans Jung', peakRating: '2346' }] },
    { year: 1981, winners: [{ name: 'Hans Jung', peakRating: '2346' }] },
    { year: 1980, winners: [{ name: 'Hans Jung', peakRating: '2346' }] },
    { year: 1979, winners: [{ name: 'Hans Jung', peakRating: '2346' }] },
    { year: 1978, winners: [{ name: 'Hans Jung', peakRating: '2346' }] },
    { year: 1977, winners: [{ name: 'Hans Jung', peakRating: '2346' }] },
    { year: 1976, winners: [{ name: 'Ray Ebisuzaki', peakRating: 'unr.' }] },
    { year: 1975, winners: [{ name: 'Peter Murray', peakRating: '2289' }] },
    { year: 1974, winners: [{ name: 'Peter Murray', peakRating: '2289' }] },
    { year: 1973, winners: [{ name: 'Peter Murray', peakRating: '2289' }] },
    { year: 1972, winners: [{ name: 'Peter Murray', peakRating: '2289' }] },
    { year: 1971, winners: [{ name: 'Edward Durrant', peakRating: 'unr.' }] },
    { year: 1970, winners: [{ name: 'Edward Durrant', peakRating: 'unr.' }] },
    { year: 1969, winners: [{ name: 'John Wright', peakRating: '2224' }] },
    { year: 1968, winners: [{ name: 'Peter Murray', peakRating: '2289' }] },
    { year: 1967, winners: [{ name: 'Peter Murray', peakRating: '2289' }] },
  ];

  public seeFullActiveTable = false;
  public seeFullJuniorTable = false;
  public seeFullSpeedTable = false;
  public seeFullStandardTable = false;

  constructor(
    private readonly metaAndTitleService: MetaAndTitleService,
    private readonly store: Store,
  ) {}

  public ngOnInit(): void {
    this.metaAndTitleService.updateTitle('City Champion');
    this.metaAndTitleService.updateDescription(
      'All about the London Chess Championship and past winners.',
    );

    // Winner names link to member profiles, which needs the members loaded
    this.store
      .select(MembersSelectors.selectLastFullFetch)
      .pipe(take(1))
      .subscribe(lastFullFetch => {
        if (isExpired(lastFullFetch)) {
          this.store.dispatch(MembersActions.fetchAllMembersRequested());
        }
      });
  }
}
