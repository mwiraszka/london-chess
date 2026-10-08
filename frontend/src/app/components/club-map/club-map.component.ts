import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  input,
  viewChild,
} from '@angular/core';

import { Club } from '@app/models';

import { environment } from '@env';

@Component({
  selector: 'lcc-club-map',
  template: `
    <a
      [attr.aria-label]="'Open ' + club().name + ' in Google Maps (opens in a new tab)'"
      [href]="club().mapUrl"
      rel="noopener noreferrer"
      target="_blank">
      <!-- The whole map is the link, so the map's own controls are kept out of reach -->
      <div
        #mapContainer
        class="map"
        inert
        [id]="club().id + '-location'">
      </div>
    </a>
  `,
  styles: `
    :host {
      width: 100%;
      min-width: 280px;
      border-radius: var(--radius-sm);
      border: 3px solid var(--lcc-map-border);

      &:hover {
        border-color: var(--color-text-link);
      }
    }

    .map {
      width: 100%;
      height: 100%;
      border-radius: var(--radius-sm);

      ::ng-deep .gm-style > div {
        cursor: pointer !important;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubMapComponent implements OnInit, AfterViewInit {
  readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  readonly club = input.required<Club>();

  public ngOnInit(): void {
    setOptions({
      key: environment.googleMapsApiKey,
      v: 'weekly',
    });
  }

  public ngAfterViewInit(): void {
    this.initMap();
  }

  private async initMap(): Promise<void> {
    const mapOptions: google.maps.MapOptions = {
      cameraControl: false,
      center: this.club().location,
      clickableIcons: false,
      draggable: false,
      keyboardShortcuts: false,
      mapId: `${this.club().id}-location`,
      mapTypeControl: false,
      zoom: 15,
    };

    const map = await importLibrary('maps')
      .then(({ Map }) => new Map(this.mapContainer().nativeElement, mapOptions))
      .catch((error: unknown) =>
        console.error(`[LCC] Error creating Google Maps map: ${error}`),
      );

    if (map) {
      importLibrary('marker')
        .then(({ AdvancedMarkerElement }) => {
          new AdvancedMarkerElement({
            map,
            position: this.club().location,
          });
        })
        .catch((error: unknown) =>
          console.error(`[LCC] Error creating Google Maps advanced marker: ${error}`),
        );
    }
  }
}
