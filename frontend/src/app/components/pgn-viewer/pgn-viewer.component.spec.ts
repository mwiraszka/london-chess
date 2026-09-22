import LichessPgnViewer from 'lichess-pgn-viewer';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MOCK_GAMES } from '@app/mocks/games.mock';
import { buildPgn } from '@app/utils';

import { PgnViewerComponent } from './pgn-viewer.component';

// Stands in for the board, which renders a person element per player
vi.mock('lichess-pgn-viewer', () => ({
  default: vi.fn((container: HTMLElement) => {
    container.innerHTML = `
      <div class="lpv">
        <div class="lpv__player lpv__player--top"><span class="lpv__player__person"></span></div>
        <div class="lpv__player lpv__player--bottom"><span class="lpv__player__person"></span></div>
      </div>`;
  }),
}));

describe('PgnViewerComponent', () => {
  let fixture: ComponentFixture<PgnViewerComponent>;
  let component: PgnViewerComponent;

  const board = vi.mocked(LichessPgnViewer);

  // The board's own elements are outside Angular's view, so read them from the DOM
  const person = (side: 'top' | 'bottom'): Element =>
    (fixture.nativeElement as HTMLElement).querySelector(
      `.lpv__player--${side} > .lpv__player__person`,
    )!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PgnViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PgnViewerComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('game', MOCK_GAMES[0]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the game on the board from its PGN', () => {
    expect(board).toHaveBeenCalledTimes(1);
    expect(board).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ pgn: buildPgn(MOCK_GAMES[0]), orientation: 'white' }),
    );
  });

  it('should label each player with their name and score', () => {
    expect(person('bottom').getAttribute('data-name')).toBe('John Doe');
    expect(person('bottom').getAttribute('data-score')).toBe('1');
    expect(person('top').getAttribute('data-name')).toBe('H. Roe');
    expect(person('top').getAttribute('data-score')).toBe('0');
  });

  it('should show another game when the input changes', () => {
    fixture.componentRef.setInput('game', MOCK_GAMES[1]);
    fixture.detectChanges();

    expect(board).toHaveBeenCalledTimes(2);
    expect(board).toHaveBeenLastCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ pgn: buildPgn(MOCK_GAMES[1]) }),
    );
    expect(person('bottom').getAttribute('data-name')).toBe('Jane Smith');
    expect(person('bottom').getAttribute('data-score')).toBe('½');
    expect(person('top').getAttribute('data-name')).toBe('John Doe');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.lpv')).toHaveLength(
      1,
    );
  });
});
