import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number;
}

class LocationService {
  private static instance: LocationService;

  private constructor() {}

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }

  async checkPermission(): Promise<boolean> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  }

  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        const granted = await this.requestPermission();
        if (!granted) {
          return null;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  async getLocationWithElevation(): Promise<LocationData | null> {
    const location = await this.getCurrentLocation();
    if (!location) return null;

    if (location.altitude === null) {
      try {
        const elevationData = await this.fetchElevation(location.latitude, location.longitude);
        if (elevationData !== null) {
          location.altitude = elevationData;
        }
      } catch (error) {
        console.error('Error fetching elevation:', error);
      }
    }

    return location;
  }

  private async fetchElevation(latitude: number, longitude: number): Promise<number | null> {
    try {
      const url = `https://nationalmap.gov/epqs/pqs.php?x=${longitude}&y=${latitude}&units=Meters&output=json`;
      const response = await fetch(url);
      const data = await response.json();
      
      const elevation = data?.USGS_Elevation_Point_Query_Service?.Elevation_Query?.Elevation;
      if (elevation && elevation !== '-1000000') {
        return parseFloat(elevation);
      }
      return null;
    } catch (error) {
      console.error('Error fetching elevation from USGS:', error);
      return null;
    }
  }

  formatCoordinates(latitude: number, longitude: number): string {
    const latDir = latitude >= 0 ? 'N' : 'S';
    const lonDir = longitude >= 0 ? 'E' : 'W';
    return `${Math.abs(latitude).toFixed(4)}° ${latDir}, ${Math.abs(longitude).toFixed(4)}° ${lonDir}`;
  }

  formatElevation(altitude: number | null): string {
    if (altitude === null) return 'Unknown';
    return `${Math.round(altitude)} m (${Math.round(altitude * 3.28084)} ft)`;
  }
}

export const locationService = LocationService.getInstance();
export default locationService;
