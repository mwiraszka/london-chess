import { ButtonComponent, DialogRef } from '@eagami/ui';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { BasicDialogResult, MemberWithNewRatings } from '@app/models';
import { query, queryAll } from '@app/utils';

import { RatingChangesComponent } from './rating-changes.component';

describe('RatingChangesComponent', () => {
  let fixture: ComponentFixture<RatingChangesComponent>;

  let closeSpy: MockInstance;

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
    const dialogRef = new DialogRef<BasicDialogResult>();
    closeSpy = vi.spyOn(dialogRef, 'close');

    await TestBed.configureTestingModule({
      imports: [RatingChangesComponent],
      providers: [{ provide: DialogRef, useValue: dialogRef }],
    }).compileComponents();

    fixture = TestBed.createComponent(RatingChangesComponent);

    fixture.componentRef.setInput('membersWithNewRatings', mockMembersWithNewRatings);
    fixture.componentRef.setInput('unmatchedMembers', unmatchedMembers);
    fixture.detectChanges();
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

      const confirm: ButtonComponent = query(
        fixture.debugElement,
        '.confirm-button',
      ).componentInstance;
      expect(confirm.disabled()).toBe(true);
    });
  });

  describe('dialog result handling', () => {
    it('should answer cancel when cancel button clicked', () => {
      query(fixture.debugElement, '.cancel-button').triggerEventHandler('clicked');

      expect(closeSpy).toHaveBeenCalledWith('cancel');
    });

    it('should answer confirm when confirm button clicked', async () => {
      query(fixture.debugElement, '.confirm-button').triggerEventHandler('clicked');
      await fixture.whenStable();

      expect(closeSpy).toHaveBeenCalledWith('confirm');
    });

    it('should close without an answer when the dialog is dismissed', () => {
      query(fixture.debugElement, '.ea-dialog__close').nativeElement.click();

      expect(closeSpy).toHaveBeenCalledWith();
    });

    it('should apply the ratings before confirming', async () => {
      let finishUpdate: () => void = () => undefined;
      const confirmAction = vi.fn(
        () => new Promise<void>(resolve => (finishUpdate = () => resolve())),
      );
      fixture.componentRef.setInput('confirmAction', confirmAction);
      fixture.detectChanges();

      const confirmation = fixture.componentInstance.confirm();
      fixture.detectChanges();

      const confirm: ButtonComponent = query(
        fixture.debugElement,
        '.confirm-button',
      ).componentInstance;
      expect(confirmAction).toHaveBeenCalledTimes(1);
      expect(confirm.loading()).toBe(true);
      expect(closeSpy).not.toHaveBeenCalled();

      finishUpdate();
      await confirmation;

      expect(closeSpy).toHaveBeenCalledWith('confirm');
    });
  });
});
