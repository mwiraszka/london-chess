import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { pick } from 'lodash';
import { BehaviorSubject, EMPTY, firstValueFrom, take } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { INITIAL_MEMBER_FORM_DATA, MEMBER_FORM_DATA_PROPERTIES } from '@app/constants';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { Id, MemberFormData } from '@app/models';
import { MetaAndTitleService } from '@app/services';
import { initialState as appInitialState } from '@app/store/app';
import {
  MembersActions,
  MembersSelectors,
  MembersState,
  initialState as membersInitialState,
} from '@app/store/members';
import { query } from '@app/utils';

import { MemberEditorPageComponent } from './member-editor-page.component';

describe('MemberEditorPageComponent', () => {
  let fixture: ComponentFixture<MemberEditorPageComponent>;
  let component: MemberEditorPageComponent;

  let metaAndTitleService: MetaAndTitleService;
  let store: MockStore;

  let dispatchSpy: MockInstance;
  let updateDescriptionSpy: MockInstance;
  let updateTitleSpy: MockInstance;

  let mockParamsSubject: BehaviorSubject<{ member_id?: Id }>;

  beforeEach(async () => {
    mockParamsSubject = new BehaviorSubject<{ member_id?: Id }>({});

    const mockMembersState: MembersState = {
      ...membersInitialState,
      recordsScope: 'admin',
      ids: MOCK_MEMBERS.map(member => member.id),
      entities: Object.fromEntries(
        MOCK_MEMBERS.map(member => [member.id, { member, formData: null }]),
      ),
      totalCount: MOCK_MEMBERS.length,
    };

    await TestBed.configureTestingModule({
      imports: [MemberEditorPageComponent],
      providers: [
        provideMockActions(() => EMPTY),
        {
          provide: ActivatedRoute,
          useValue: { params: mockParamsSubject.asObservable() },
        },
        {
          provide: MetaAndTitleService,
          useValue: {
            updateTitle: vi.fn(),
            updateDescription: vi.fn(),
          },
        },
        provideMockStore({
          initialState: {
            appState: appInitialState,
            membersState: mockMembersState,
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberEditorPageComponent);
    component = fixture.componentInstance;

    metaAndTitleService = TestBed.inject(MetaAndTitleService);
    store = TestBed.inject(MockStore);

    dispatchSpy = vi.spyOn(store, 'dispatch');
    updateDescriptionSpy = vi.spyOn(metaAndTitleService, 'updateDescription');
    updateTitleSpy = vi.spyOn(metaAndTitleService, 'updateTitle');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    describe('with member_id route param', () => {
      beforeEach(() => {
        mockParamsSubject.next({ member_id: MOCK_MEMBERS[0].id });
        component.ngOnInit();
      });

      it('should set viewModel$ based on member title', async () => {
        const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(vm).toStrictEqual({
          formData: pick(MOCK_MEMBERS[0], MEMBER_FORM_DATA_PROPERTIES),
          hasUnsavedChanges: false,
          isFormReady: true,
          isSafeMode: false,
          originalMember: MOCK_MEMBERS[0],
          pageHeading: `Edit ${MOCK_MEMBERS[0].firstName} ${MOCK_MEMBERS[0].lastName}`,
        });
      });

      it('should update title and meta tag accordingly', async () => {
        await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(updateTitleSpy).toHaveBeenCalledTimes(1);
        expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
        expect(updateTitleSpy).toHaveBeenCalledWith(
          `Edit ${MOCK_MEMBERS[0].firstName} ${MOCK_MEMBERS[0].lastName}`,
        );
        expect(updateDescriptionSpy).toHaveBeenCalledWith(
          `Edit ${MOCK_MEMBERS[0].firstName} ${MOCK_MEMBERS[0].lastName} for the London Chess Club.`,
        );
      });
    });

    describe('without member_id route param', () => {
      beforeEach(() => {
        component.ngOnInit();
      });

      it("should default viewModel$ to 'create' mode", async () => {
        const vm = await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(vm).toStrictEqual({
          formData: INITIAL_MEMBER_FORM_DATA,
          hasUnsavedChanges: false,
          isFormReady: true,
          isSafeMode: false,
          originalMember: null,
          pageHeading: 'Add a member',
        });
      });

      it('should update title and meta tag accordingly', async () => {
        await firstValueFrom(component.viewModel$!.pipe(take(1)));

        expect(updateTitleSpy).toHaveBeenCalledTimes(1);
        expect(updateDescriptionSpy).toHaveBeenCalledTimes(1);
        expect(updateTitleSpy).toHaveBeenCalledWith('Add a member');
        expect(updateDescriptionSpy).toHaveBeenCalledWith(
          'Add a member for the London Chess Club.',
        );
      });
    });
  });

  describe('onCancel', () => {
    it('should dispatch cancelSelected action', () => {
      component.onCancel();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(MembersActions.cancelSelected());
    });
  });

  describe('onChange', () => {
    it('should dispatch changeSelected action', () => {
      const mockMemberId = 'abc123';
      const mockChangedFormData: Partial<MemberFormData> = {
        lastName: 'Carlsen',
      };
      component.onChange(mockMemberId, mockChangedFormData);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        MembersActions.formDataChanged({
          memberId: mockMemberId,
          formData: mockChangedFormData,
        }),
      );
    });
  });

  describe('onRequestAddMember', () => {
    it('should dispatch addMemberRequested action', () => {
      component.onRequestAddMember(true);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        MembersActions.addMemberRequested({ notifyMember: true }),
      );
    });
  });

  describe('onRequestUpdateMember', () => {
    it('should dispatch updateMemberRequested action', () => {
      const mockMemberId = 'abc123abc123';
      component.onRequestUpdateMember(mockMemberId, false);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        MembersActions.updateMemberRequested({
          memberId: mockMemberId,
          notifyMember: false,
        }),
      );
    });
  });

  describe('onRestore', () => {
    it('should dispatch formDataRestored action', () => {
      const mockMemberId = 'abc123';
      component.onRestore(mockMemberId);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        MembersActions.formDataRestored({ memberId: mockMemberId }),
      );
    });
  });

  describe('template rendering', () => {
    describe('when viewModel$ is undefined', () => {
      it('should not render page components', () => {
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-member-form')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeFalsy();
      });
    });

    describe('when viewModel$ is defined', () => {
      beforeEach(() => {
        fixture.detectChanges();
      });

      it('should render page components', () => {
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-member-form')).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeTruthy();
      });
    });

    describe('when the member to edit has only a public record', () => {
      beforeEach(() => {
        store.overrideSelector(MembersSelectors.selectRecordsScope, 'public');
        mockParamsSubject.next({ member_id: MOCK_MEMBERS[0].id });

        fixture.detectChanges();
      });

      it('should wait for the admin record before rendering the form', () => {
        expect(query(fixture.debugElement, 'lcc-page-header')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-member-form')).toBeFalsy();
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeTruthy();
      });
    });
  });
});
