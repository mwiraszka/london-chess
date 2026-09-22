import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogButtonsComponent } from '@app/components/dialog-buttons/dialog-buttons.component';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { MemberWithNewRatings } from '@app/models';
import { query, queryAll } from '@app/utils';

import { RatingChangesComponent } from './rating-changes.component';

describe('RatingChangesComponent', () => {
  let fixture: ComponentFixture<RatingChangesComponent>;

  let dialogResultSpy: MockInstance;

  const mockMembersWithNewRatings: MemberWithNewRatings[] = [
    {
      ...MOCK_MEMBERS[0],
      newRating: (parseInt(MOCK_MEMBERS[0].rating) + 10).toString(),
      newPeakRating: (parseInt(MOCK_MEMBERS[0].peakRating) + 5).toString(),
    },
    {
      ...MOCK_MEMBERS[1],
      newRating: (parseInt(MOCK_MEMBERS[1].rating) - 10).toString(),
      newPeakRating: MOCK_MEMBERS[1].peakRating,
    },
  ];

  const unmatchedMembers = ['Charlie Brown', 'Danny Ocean'];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatingChangesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RatingChangesComponent);

    dialogResultSpy = vi.spyOn(fixture.componentInstance.dialogResult, 'emit');

    fixture.componentRef.setInput('membersWithNewRatings', mockMembersWithNewRatings);
    fixture.componentRef.setInput('unmatchedMembers', unmatchedMembers);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('template rendering', () => {
    it('should list each member with their old and new ratings, marking the changes', () => {
      const rows = queryAll(
        fixture.debugElement,
        '.ea-data-table__body .ea-data-table__row',
      );

      expect(rows).toHaveLength(mockMembersWithNewRatings.length);
      rows.forEach((row, i) => {
        const member = mockMembersWithNewRatings[i];
        const [newRating, newPeakRating] = queryAll(row, '.rating-changes__value');

        expect(
          queryAll(row, '.ea-data-table__cell').map(cell =>
            cell.nativeElement.textContent.trim(),
          ),
        ).toEqual([
          member.firstName,
          member.lastName,
          member.rating,
          member.newRating,
          member.peakRating,
          member.newPeakRating,
        ]);
        expect(!!newRating.classes['rating-changes__value--changed']).toBe(
          member.rating !== member.newRating,
        );
        expect(!!newPeakRating.classes['rating-changes__value--changed']).toBe(
          member.peakRating !== member.newPeakRating,
        );
      });
    });

    it('should render unmatched members list', () => {
      const unmatchedMembersElements = queryAll(
        fixture.debugElement,
        '.unmatched-member-list li',
      );

      expect(unmatchedMembersElements.length).toBe(unmatchedMembers.length);
      unmatchedMembersElements.forEach((unmatchedMemberElement, i) => {
        expect(unmatchedMemberElement.nativeElement.textContent.trim()).toBe(
          unmatchedMembers[i],
        );
      });
    });

    it('should disable confirm button when there are no members with new ratings', () => {
      fixture.componentRef.setInput('membersWithNewRatings', []);
      fixture.detectChanges();

      expect(query(fixture.debugElement, '.confirm-button').properties['disabled']).toBe(
        true,
      );
    });
  });

  describe('dialog result handling', () => {
    it('should emit cancel when cancel button clicked', () => {
      query(fixture.debugElement, '.cancel-button').triggerEventHandler('click');

      expect(dialogResultSpy).toHaveBeenCalledWith('cancel');
    });

    it('should emit confirm when confirm button clicked', () => {
      query(fixture.debugElement, '.confirm-button').triggerEventHandler('click');

      expect(dialogResultSpy).toHaveBeenCalledWith('confirm');
    });

    it('should apply the ratings before confirming', async () => {
      let finishUpdate: () => void = () => undefined;
      const confirmAction = vi.fn(
        () => new Promise<void>(resolve => (finishUpdate = () => resolve())),
      );
      fixture.componentRef.setInput('confirmAction', confirmAction);
      fixture.detectChanges();
      const buttons: DialogButtonsComponent = query(
        fixture.debugElement,
        'lcc-dialog-buttons',
      ).componentInstance;

      const confirmation = buttons.confirm();
      fixture.detectChanges();

      expect(confirmAction).toHaveBeenCalledTimes(1);
      expect(query(fixture.debugElement, '.confirm-button ea-spinner')).toBeTruthy();
      expect(dialogResultSpy).not.toHaveBeenCalled();

      finishUpdate();
      await confirmation;

      expect(dialogResultSpy).toHaveBeenCalledWith('confirm');
    });
  });
});
