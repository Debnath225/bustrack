export interface GpsPoint {
  lat: number;
  lon: number;
  speed: number;
  bearing: number;
  accuracy: number;
  source: string;
  recordedAt?: string;
}
