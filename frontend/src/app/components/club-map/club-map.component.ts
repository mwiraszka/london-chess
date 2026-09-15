import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';

import { Club } from '@app/models';

import { environment } from '@env';

@Component({
  selector: 'lcc-club-map',
  template: `
    <a
      [href]="club.mapUrl"
      rel="noopener noreferrer"
      target="_blank">
      <div
        #mapContainer
        [id]="club.id + '-location'">
      </div>
    </a>
  `,
  styles: `
    :host {
      width: 100%;
      min-width: 280px;
      border-radius: 3px;
      border: 3px solid #ffffff22;

      &:hover {
        border-color: var(--lcc-color--link);
      }
    }

    div {
      width: 100%;
      height: 100%;
      border-radius: 3px;

      ::ng-deep .gm-style > div {
        cursor: pointer !important;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubMapComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  @Input({ required: true }) club!: Club;

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
      center: this.club.location,
      clickableIcons: false,
      draggable: false,
      keyboardShortcuts: false,
      mapId: `${this.club.id}-location`,
      mapTypeControl: false,
      zoom: 15,
    };

    const map = await importLibrary('maps')
      .then(({ Map }) => new Map(this.mapContainer.nativeElement, mapOptions))
      .catch((error: unknown) =>
        console.error(`[LCC] Error creating Google Maps map: ${error}`),
      );

    if (map) {
      importLibrary('marker')
        .then(({ AdvancedMarkerElement }) => {
          new AdvancedMarkerElement({
            map,
            position: this.club.location,
          });
        })
        .catch((error: unknown) =>
          console.error(`[LCC] Error creating Google Maps advanced marker: ${error}`),
        );
    }
  }
}
