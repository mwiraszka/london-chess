import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MOCK_MODIFICATION_INFOS } from '@app/mocks/modification-info.mock';
import { MemberProfile } from '@app/models';
import { FormatDatePipe } from '@app/pipes';
import { ApiService, MemberProfilesService } from '@app/services';
import { formatDate, query, queryTextContent } from '@app/utils';

import { ModificationInfoComponent } from './modification-info.component';

describe('ModificationInfoComponent', () => {
  let fixture: ComponentFixture<ModificationInfoComponent>;
  let component: ModificationInfoComponent;

  const api = { get: vi.fn(() => Promise.resolve<MemberProfile[]>([])) };

  beforeEach(async () => {
    api.get.mockClear();

    await TestBed.configureTestingModule({
      imports: [FormatDatePipe, ModificationInfoComponent],
      providers: [provideRouter([]), { provide: ApiService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(ModificationInfoComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('info', MOCK_MODIFICATION_INFOS[0]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('template rendering', () => {
    it('should render correct creation information', () => {
      const createDetails = query(fixture.debugElement, '.create-details-container');

      expect(query(createDetails, 'ea-icon-file-plus')).toBeTruthy();
      expect(queryTextContent(createDetails, '.name .member-link > span')).toBe(
        MOCK_MODIFICATION_INFOS[0].createdBy,
      );
      expect(queryTextContent(createDetails, '.date')).toBe(
        formatDate(MOCK_MODIFICATION_INFOS[0].dateCreated, 'short'),
      );
    });

    it('should render correct edit information when creation and edit dates are different', () => {
      const editDetails = query(fixture.debugElement, '.edit-details-container');

      expect(query(editDetails, 'ea-icon-edit')).toBeTruthy();
      expect(queryTextContent(editDetails, '.name .member-link > span')).toBe(
        MOCK_MODIFICATION_INFOS[0].lastEditedBy,
      );
      expect(queryTextContent(editDetails, '.date')).toBe(
        formatDate(MOCK_MODIFICATION_INFOS[0].dateLastEdited, 'short'),
      );
    });

    it('should not render edit information when creation and edit dates are the same', () => {
      fixture.componentRef.setInput('info', MOCK_MODIFICATION_INFOS[4]);
      fixture.detectChanges();

      expect(query(fixture.debugElement, '.edit-details-container')).toBeFalsy();
    });

    it("should show a credited editor's current name, linked to their profile", async () => {
      api.get.mockResolvedValue([
        { number: 0, firstName: 'Johnny', lastName: 'Doe', avatarUrl: null },
      ]);

      await TestBed.inject(MemberProfilesService).reload();
      fixture.detectChanges();

      const createDetails = query(fixture.debugElement, '.create-details-container');
      expect(queryTextContent(createDetails, '.name .member-link > span')).toBe(
        'Johnny Doe',
      );
      expect(query(createDetails, '.name a.member-link')).toBeTruthy();
    });
  });
});
