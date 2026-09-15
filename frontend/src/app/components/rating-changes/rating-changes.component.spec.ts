import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { MemberWithNewRatings } from '@app/models';
import { query, queryAll, queryTextContent } from '@app/utils';

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
    it('should render table rows for each member with new ratings', () => {
      const rows = queryAll(fixture.debugElement, 'tbody tr');
      expect(rows.length).toBe(mockMembersWithNewRatings.length);

      rows.forEach((row, i) => {
        const cells = queryAll(row, 'td');
        expect(queryTextContent(row, 'td:nth-child(1)')).toBe(
          mockMembersWithNewRatings[i].firstName,
        );
        expect(queryTextContent(row, 'td:nth-child(2)')).toBe(
          mockMembersWithNewRatings[i].lastName,
        );
        expect(queryTextContent(row, 'td:nth-child(3)')).toBe(
          mockMembersWithNewRatings[i].rating,
        );
        expect(queryTextContent(row, 'td:nth-child(4)')).toBe(
          mockMembersWithNewRatings[i].newRating,
        );
        expect(queryTextContent(row, 'td:nth-child(5)')).toBe(
          mockMembersWithNewRatings[i].peakRating,
        );
        expect(queryTextContent(row, 'td:nth-child(6)')).toBe(
          mockMembersWithNewRatings[i].newPeakRating,
        );
        const ratingClass = cells[3].attributes['class'] || '';
        const peakClass = cells[5].attributes['class'] || '';
        expect(ratingClass.includes('changed')).toBe(
          mockMembersWithNewRatings[i].rating !== mockMembersWithNewRatings[i].newRating,
        );
        expect(peakClass.includes('changed')).toBe(
          mockMembersWithNewRatings[i].peakRating !==
            mockMembersWithNewRatings[i].newPeakRating,
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
  });
});
