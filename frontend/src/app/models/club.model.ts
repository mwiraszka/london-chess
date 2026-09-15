import { IsoDate } from './core.model';

export interface Club {
  id: string;
  name: string;
  mapUrl: string;
  location: google.maps.LatLngLiteral;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  scheduleText: string; // Supports \n for line breaks
  email?: string;
}

export interface ClubDocument {
  title: string;
  fileName: string;
  datePublished: IsoDate;
  dateLastModified: IsoDate;
}
