import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { ImageViewerComponent } from '@app/components/image-viewer/image-viewer.component';
import { AdminControlsDirective } from '@app/directives/admin-controls.directive';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { MOCK_IMAGES } from '@app/mocks/images.mock';
import { DialogService, StoreRequestService } from '@app/services';
import { ImagesActions } from '@app/store/images';
import {
  customSort,
  lastOpenedDialog,
  query,
  queryAll,
  queryTextContent,
} from '@app/utils';

import { PhotoGridComponent } from './photo-grid.component';

@Component({
  template: '',
})
class PhotoGalleryStubComponent {}

describe('PhotoGridComponent', () => {
  let fixture: ComponentFixture<PhotoGridComponent>;
  let component: PhotoGridComponent;

  let dialogService: DialogService;

  let dialogOpenSpy: MockInstance;
  let onClickAlbumCoverSpy: MockInstance;
  let storeRequestSpy: Mock;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminControlsDirective, PhotoGridComponent, TooltipDirective],
      providers: [
        {
          provide: DialogService,
          useValue: { open: vi.fn() },
        },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
        provideRouter([
          {
            path: 'photo-gallery',
            component: PhotoGalleryStubComponent,
          },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoGridComponent);
    component = fixture.componentInstance;

    dialogService = TestBed.inject(DialogService);

    dialogOpenSpy = vi.spyOn(dialogService, 'open');
    onClickAlbumCoverSpy = vi.spyOn(component, 'onClickAlbumCover');
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);

    fixture.componentRef.setInput('isAdmin', true);
    fixture.componentRef.setInput('photoImages', MOCK_IMAGES);

    fixture.detectChanges();
  });

  describe('showSkeleton', () => {
    it('should return true when isLoading is true', () => {
      fixture.componentRef.setInput('isLoading', true);

      expect(component.showSkeleton()).toBe(true);
    });

    it('should return false when isLoading is false', () => {
      fixture.componentRef.setInput('isLoading', false);

      expect(component.showSkeleton()).toBe(false);
    });

    it('should return false when isLoading is undefined', () => {
      expect(component.showSkeleton()).toBe(false);
    });
  });

  describe('displayCovers', () => {
    it('should return visibleAlbumCovers when not loading', () => {
      fixture.componentRef.setInput('isLoading', false);

      expect(component.displayCovers()).toBe(component.visibleAlbumCovers());
    });

    it('should return 20 skeleton covers when loading', () => {
      fixture.componentRef.setInput('isLoading', true);

      const covers = component.displayCovers();

      expect(covers).toHaveLength(20);
      expect(covers.every(c => c.id === '' && c.album === '')).toBe(true);
    });
  });

  describe('onClickAlbumCover', () => {
    it('should open ImageViewerComponent dialog with correct data', async () => {
      const album = 'Album of the Year';
      const albumPhotos = MOCK_IMAGES.filter(image => image.album === album).sort(
        (a, b) => customSort(a, b, 'caption'),
      );

      await component.onClickAlbumCover(album);

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: ImageViewerComponent,
        isModal: true,
        inputs: {
          album,
          images: albumPhotos,
          isAdmin: true,
        },
      });
    });
  });

  describe('onOpenImageExplorer', () => {
    it('should open ImageExplorerComponent dialog with correct data', async () => {
      await component.onOpenImageExplorer();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: expect.any(Function),
        inputs: { selectable: false },
        isModal: true,
      });
    });
  });

  describe('getAdminControlsConfig', () => {
    it('should return correct admin controls config for albums', () => {
      const album = MOCK_IMAGES[0].album;
      const config = component.getAdminControlsConfig(album);

      expect(config.buttonSize).toBe(34);
      expect(config.editPath).toEqual(['album', 'edit', album]);
      expect(config.isEditDisabled).toBe(false);
      expect(config.isDeleteDisabled).toBe(false);
      expect(config.itemName).toBe(album);
    });
  });

  describe('onDeleteAlbum', () => {
    it('should delete the album from the confirmation dialog', async () => {
      await component.onDeleteAlbum(MOCK_IMAGES[1].album);
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      const photoCount = MOCK_IMAGES.filter(
        image => image.album === MOCK_IMAGES[1].album,
      ).length;

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        isModal: true,
        inputs: {
          dialog: expect.objectContaining({
            title: 'Confirm',
            body: `Delete ${MOCK_IMAGES[1].album} and its ${photoCount} photos?`,
            confirmButtonText: 'Delete',
            confirmButtonType: 'warning',
          }),
        },
      });
      expect(storeRequestSpy).toHaveBeenCalledWith(
        ImagesActions.deleteAlbumRequested({ album: MOCK_IMAGES[1].album }),
        [ImagesActions.deleteAlbumSucceeded, ImagesActions.deleteAlbumFailed],
      );
    });

    it('should not delete anything until the dialog is confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      await component.onDeleteAlbum(MOCK_IMAGES[1].album);

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(storeRequestSpy).not.toHaveBeenCalled();
    });
  });

  describe('getAlbumPhotoCountText', () => {
    it('should return correct singular photo count text', () => {
      expect(component.getAlbumPhotoCountText('Tournaments')).toBe('1 photo');
    });

    it('should return correct plural photo count text', () => {
      const albumName = 'Album of the Year';
      const expectedPhotoCount = MOCK_IMAGES.filter(
        image => image.album === albumName,
      ).length;

      expect(component.getAlbumPhotoCountText(albumName)).toBe(
        `${expectedPhotoCount} photos`,
      );
    });
  });

  describe('template rendering', () => {
    it('should call onClickAlbumCover when an album cover is clicked', () => {
      query(fixture.debugElement, '.album-cover').triggerEventHandler('click');

      expect(onClickAlbumCoverSpy).toHaveBeenCalledWith("John's Images");
    });

    it('should honour maxAlbums input property', () => {
      fixture.componentRef.setInput('maxAlbums', 3);
      fixture.detectChanges();

      expect(queryAll(fixture.debugElement, '.album-cover').length).toBe(3);
    });

    it('should display admin toolbar when isAdmin is true', () => {
      fixture.componentRef.setInput('isAdmin', true);
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'lcc-admin-toolbar')).toBeTruthy();
    });

    it('should not display admin toolbar when isAdmin is false', () => {
      fixture.componentRef.setInput('isAdmin', false);
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'lcc-admin-toolbar')).toBeFalsy();
    });

    describe('when loading', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('isLoading', true);
        fixture.detectChanges();
      });

      it('should render 20 skeleton album covers', () => {
        const skeletonCards = queryAll(fixture.debugElement, '.album-cover.skeleton');

        expect(skeletonCards.length).toBe(20);
      });

      it('should render image placeholders instead of real images', () => {
        expect(
          query(fixture.debugElement, '.album-image-container.skeleton-image'),
        ).toBeTruthy();
        expect(query(fixture.debugElement, 'lcc-image')).toBeFalsy();
      });

      it('should render name and count placeholders instead of real text', () => {
        expect(query(fixture.debugElement, '.skeleton-album-name')).toBeTruthy();
        expect(query(fixture.debugElement, '.skeleton-photo-count')).toBeTruthy();
        expect(query(fixture.debugElement, '.album-name')).toBeFalsy();
        expect(query(fixture.debugElement, '.photo-count')).toBeFalsy();
      });

      it('should not call onClickAlbumCover when skeleton cover is clicked', () => {
        query(fixture.debugElement, '.album-cover').triggerEventHandler('click');

        expect(onClickAlbumCoverSpy).not.toHaveBeenCalled();
      });
    });

    it('should display album covers with correct information', () => {
      const albumCovers = queryAll(fixture.debugElement, '.album-cover');
      const expectedAlbumCovers = MOCK_IMAGES.filter(image => image.albumCover);

      expect(albumCovers.length).toBe(expectedAlbumCovers.length);

      albumCovers.forEach((albumCover, i) => {
        expect(queryTextContent(albumCover, '.album-name')).toBe(
          expectedAlbumCovers[i].album,
        );

        const expectedPhotoCountText = component
          .getAlbumPhotoCountText(expectedAlbumCovers[i].album)
          .toUpperCase();
        expect(queryTextContent(albumCover, '.photo-count')).toBe(expectedPhotoCountText);
      });
    });
  });
});
