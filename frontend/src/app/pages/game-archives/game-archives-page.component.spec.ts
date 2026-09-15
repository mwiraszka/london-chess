import { provideMockStore } from '@ngrx/store/testing';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';

import { MetaAndTitleService } from '@app/services';
import { AppSelectors } from '@app/store/app';
import { initialState as membersInitialState } from '@app/store/members';
import { PARSE_CSV } from '@app/tokens';
import { query } from '@app/utils';

import { GameArchivesPageComponent } from './game-archives-page.component';

describe('GameArchivesPageComponent', () => {
  let fixture: ComponentFixture<GameArchivesPageComponent>;
  let component: GameArchivesPageComponent;

  let metaAndTitleService: MetaAndTitleService;

  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  beforeEach(async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockResolvedValue({
        blob: vi
          .fn()
          .mockResolvedValue(new Blob(['mock,csv,data'], { type: 'text/csv' })),
      }),
      configurable: true,
    });

    await TestBed.configureTestingModule({
      imports: [GameArchivesPageComponent, ReactiveFormsModule],
      providers: [
        {
          provide: PARSE_CSV,
          useValue: vi.fn().mockResolvedValue([
            ['A00', 'Dummy Opening', '1. a4'],
            ['B00', 'Another Opening', '1. e4 e5'],
          ]),
        },
        {
          provide: MetaAndTitleService,
          useValue: {
            updateTitle: vi.fn(),
            updateDescription: vi.fn(),
          },
        },
        provideMockStore({
          initialState: { membersState: membersInitialState },
          selectors: [
            {
              selector: AppSelectors.selectIsDarkMode,
              value: false,
            },
          ],
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GameArchivesPageComponent);
    component = fixture.componentInstance;

    metaAndTitleService = TestBed.inject(MetaAndTitleService);

    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should set meta title and description', () => {
      expect(updateTitleSpy).toHaveBeenCalledTimes(1);
      expect(updateTitleSpy).toHaveBeenCalledWith('Game Archives');
      expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
    });

    it('should initialize form with default values', () => {
      expect(component.form.value).toStrictEqual({
        firstName: '',
        lastName: '',
        asWhite: true,
        asBlack: true,
        movesMin: '',
        movesMax: '',
        resultWhiteWon: true,
        resultDraw: true,
        resultBlackWon: true,
        resultInconclusive: true,
      });
    });

    it('should initialize games map and filtered games map', () => {
      expect(component.allGames).toBeInstanceOf(Map);
      expect(component.allGames.size).toBeGreaterThan(0);
      expect(component.filteredGames).toBeInstanceOf(Map);
      expect(component.filteredGames.size).toBeGreaterThan(0);
    });
  });

  describe('form validation', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should have max value validator for movesMin', () => {
      component.form.controls.movesMin.setValue('1000');

      expect(component.form.controls.movesMin.invalid).toBe(true);
      expect(component.form.controls.movesMin.errors?.['max']).toBeTruthy();
    });

    it('should have max value validator for movesMax', () => {
      component.form.controls.movesMax.setValue('1000');

      expect(component.form.controls.movesMax.invalid).toBe(true);
      expect(component.form.controls.movesMax.errors?.['max']).toBeTruthy();
    });

    it('should have pattern validator for movesMin', () => {
      component.form.controls.movesMin.setValue('abc');

      expect(component.form.controls.movesMin.invalid).toBe(true);
      expect(component.form.controls.movesMin.errors?.['pattern']).toBeTruthy();
    });

    it('should have pattern validator for movesMax', () => {
      component.form.controls.movesMax.setValue('abc');

      expect(component.form.controls.movesMax.invalid).toBe(true);
      expect(component.form.controls.movesMax.errors?.['pattern']).toBeTruthy();
    });

    it('should accept valid numeric values for moves', () => {
      component.form.controls.movesMin.setValue('50');
      component.form.controls.movesMax.setValue('100');

      expect(component.form.controls.movesMin.valid).toBe(true);
      expect(component.form.controls.movesMax.valid).toBe(true);
    });
  });

  describe('form interactions', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should automatically check asWhite when asBlack is unchecked', () => {
      component.form.controls.asWhite.setValue(false);
      component.form.controls.asBlack.setValue(false);

      expect(component.form.controls.asWhite.value).toBe(true);
    });

    it('should automatically check asBlack when asWhite is unchecked', () => {
      component.form.controls.asBlack.setValue(false);
      component.form.controls.asWhite.setValue(false);

      expect(component.form.controls.asBlack.value).toBe(true);
    });

    it('should automatically check a result when all results are unchecked', () => {
      component.form.controls.resultWhiteWon.setValue(false);
      component.form.controls.resultDraw.setValue(false);
      component.form.controls.resultBlackWon.setValue(false);
      component.form.controls.resultInconclusive.setValue(false);

      expect(
        component.form.controls.resultWhiteWon.value ||
          component.form.controls.resultDraw.value ||
          component.form.controls.resultBlackWon.value ||
          component.form.controls.resultInconclusive.value,
      ).toBe(true);
    });
  });

  describe('computed properties', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should calculate filtered game count', () => {
      component.filteredGames.clear();
      component.filteredGames.set('2024', [
        {
          pgn: 'test-pgn-1',
          whiteFirstName: 'John',
          whiteLastName: 'Doe',
          blackFirstName: 'Jane',
          blackLastName: 'Smith',
        },
        {
          pgn: 'test-pgn-2',
          whiteFirstName: 'Bob',
          whiteLastName: 'Johnson',
          blackFirstName: 'Alice',
          blackLastName: 'Brown',
        },
      ]);

      expect(component.filteredGameCount).toBe(2);
    });

    it('should generate search result summary message for no matches', () => {
      component.filteredGames.clear();

      expect(component.searchResultSummaryMessage).toBe('No matches 😢');
    });

    it('should generate search result summary message for single game', () => {
      component.allGames.clear();
      component.filteredGames.clear();

      component.allGames.set('2024', [
        {
          pgn: 'test-pgn',
          whiteFirstName: 'John',
          whiteLastName: 'Doe',
          blackFirstName: 'Jane',
          blackLastName: 'Smith',
        },
      ]);
      component.filteredGames.set('2024', [
        {
          pgn: 'test-pgn',
          whiteFirstName: 'John',
          whiteLastName: 'Doe',
          blackFirstName: 'Jane',
          blackLastName: 'Smith',
        },
      ]);

      expect(component.searchResultSummaryMessage).toBe('Showing 1 / 1 game');
    });

    it('should generate search result summary message for multiple games', () => {
      component.allGames.clear();
      component.filteredGames.clear();

      component.allGames.set('2024', [
        {
          pgn: 'test-pgn-1',
          whiteFirstName: 'John',
          whiteLastName: 'Doe',
          blackFirstName: 'Jane',
          blackLastName: 'Smith',
        },
        {
          pgn: 'test-pgn-2',
          whiteFirstName: 'Bob',
          whiteLastName: 'Johnson',
          blackFirstName: 'Alice',
          blackLastName: 'Brown',
        },
      ]);
      component.filteredGames.set('2024', [
        {
          pgn: 'test-pgn-1',
          whiteFirstName: 'John',
          whiteLastName: 'Doe',
          blackFirstName: 'Jane',
          blackLastName: 'Smith',
        },
      ]);

      expect(component.searchResultSummaryMessage).toBe('Showing 1 / 2 game');
    });
  });

  describe('stats functionality', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should initialize showStats as false', () => {
      expect(component.showStats).toBe(false);
    });

    it('should set showStats to true', () => {
      component.showStats = true;

      expect(component.showStats).toBe(true);
    });

    it('should set showStats to false', () => {
      component.showStats = true;

      component.showStats = false;

      expect(component.showStats).toBe(false);
    });

    it('should not change showStats when setting same value', () => {
      const initialValue = component.showStats;

      component.showStats = initialValue;

      expect(component.showStats).toBe(initialValue);
    });
  });

  describe('event handlers', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should prevent default for arrow key events', () => {
      const mockEvent = {
        key: 'ArrowLeft',
        preventDefault: vi.fn(),
      } as unknown as Event;

      component.onKeydown(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('should prevent default for arrow right key events', () => {
      const mockEvent = {
        key: 'ArrowRight',
        preventDefault: vi.fn(),
      } as unknown as Event;

      component.onKeydown(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('should not prevent default for non-arrow key events', () => {
      const mockEvent = {
        key: 'Enter',
        preventDefault: vi.fn(),
      } as unknown as Event;

      component.onKeydown(mockEvent);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should return 0 for originalOrder function', () => {
      expect(component.originalOrder()).toBe(0);
    });
  });

  describe('trackBy function', () => {
    it('should return PGN string for tracking', () => {
      const mockGame = {
        pgn: '[Event "Test Game"]\n1. e4 e5',
        whiteFirstName: 'John',
        whiteLastName: 'Doe',
      };

      const result = component.trackByFn(0, mockGame);

      expect(result).toBe('[Event "Test Game"]\n1. e4 e5');
    });
  });

  describe('component cleanup', () => {
    it('should call ngOnDestroy without errors', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('should handle ngOnDestroy when called multiple times', () => {
      component.ngOnDestroy();

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('template rendering', () => {
    it('should render page header', () => {
      component.ngOnInit();
      fixture.detectChanges();
      expect(query(fixture.debugElement, 'lcc-page-header')).toBeTruthy();
    });

    it('should render form controls', () => {
      component.ngOnInit();
      fixture.detectChanges();
      expect(query(fixture.debugElement, 'form')).toBeTruthy();
      expect(
        query(fixture.debugElement, 'input[formControlName="firstName"]'),
      ).toBeTruthy();
      expect(
        query(fixture.debugElement, 'input[formControlName="lastName"]'),
      ).toBeTruthy();
    });

    it('should render active games section when active year has games', () => {
      component.ngOnInit();
      // Override filtered games BEFORE first detectChanges so section appears based on our data
      component.filteredGames = new Map([
        [
          '2024',
          [
            {
              pgn: 'test-pgn',
              whiteFirstName: 'John',
              whiteLastName: 'Doe',
              blackFirstName: 'Jane',
              blackLastName: 'Smith',
            },
          ],
        ],
      ]);
      component.activeYear = '2024';
      fixture.detectChanges();

      expect(query(fixture.debugElement, '.active-games')).toBeTruthy();
    });

    it('should not render active games section when active year is null', () => {
      const localFixture = TestBed.createComponent(GameArchivesPageComponent);
      const localComponent = localFixture.componentInstance;

      localComponent['filterGames'] = vi.fn();
      localComponent.ngOnInit();
      localComponent.filteredGames = new Map([
        [
          '2024',
          [
            {
              pgn: 'test-pgn',
              whiteFirstName: 'John',
              whiteLastName: 'Doe',
              blackFirstName: 'Jane',
              blackLastName: 'Smith',
            },
          ],
        ],
      ]);
      localComponent.activeYear = null;
      localFixture.detectChanges();

      expect(query(localFixture.debugElement, '.active-games')).toBeFalsy();
    });

    it('should not render active games section when active year has no games', () => {
      const localFixture = TestBed.createComponent(GameArchivesPageComponent);
      const localComponent = localFixture.componentInstance;

      localComponent['filterGames'] = vi.fn();
      localComponent.ngOnInit();
      localComponent.activeYear = '2024';
      localComponent.filteredGames = new Map([['2024', []]]);
      localFixture.detectChanges();

      expect(query(localFixture.debugElement, '.active-games')).toBeFalsy();
    });
  });
});
