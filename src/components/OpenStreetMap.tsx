import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Platform, 
  TouchableOpacity, 
  Alert, 
  Text 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  color: string;
  size?: number;
  icon?: string;
}

export interface OpenStreetMapProps {
  markers: MarkerData[];
  initialLocation: {
    latitude: number;
    longitude: number;
  };
  onMarkerPress?: (marker: MarkerData) => void;
  onMapPress?: (location: { latitude: number; longitude: number }) => void;
  style?: any;
  zoomLevel?: number;
  showLabels?: boolean;
  showCurrentLocation?: boolean;
}

// Import platform-specific components
let MapView: any;
let Marker: any;
let WebView: any;

// Native-specific imports
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
} else {
  // Web-specific imports
  WebView = require('react-native-webview').default;
}

export function OpenStreetMap({
  markers,
  initialLocation,
  onMarkerPress,
  onMapPress,
  style,
  zoomLevel = 12,
  showLabels = false,
  showCurrentLocation = false,
}: OpenStreetMapProps) {
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  
  // Get user's current location
  useEffect(() => {
    if (showCurrentLocation) {
      getCurrentLocation();
    }
  }, [showCurrentLocation]);

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permission to access location was denied');
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Calculate delta based on zoom level (lower delta = higher zoom)
  const getRegionForZoomLevel = (location: typeof initialLocation, zoom: number) => {
    const latitudeDelta = 0.0922 / (zoom / 10);
    const longitudeDelta = 0.0421 / (zoom / 10);
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta,
      longitudeDelta,
    };
  };

  // Platform-specific implementation
  if (Platform.OS !== 'web') {
    return <NativeMap 
      markers={markers} 
      initialLocation={initialLocation}
      currentLocation={currentLocation}
      onMarkerPress={onMarkerPress}
      onMapPress={onMapPress}
      showLabels={showLabels}
      zoomLevel={zoomLevel}
      showCurrentLocation={showCurrentLocation}
      style={style}
      getCurrentLocation={getCurrentLocation}
    />;
  } else {
    return <WebMap 
      markers={markers} 
      initialLocation={initialLocation}
      currentLocation={currentLocation}
      onMarkerPress={onMarkerPress}
      onMapPress={onMapPress}
      showLabels={showLabels}
      zoomLevel={zoomLevel}
      style={style}
      getCurrentLocation={getCurrentLocation}
    />;
  }
}

// Native implementation
function NativeMap({ 
  markers, 
  initialLocation, 
  currentLocation, 
  onMarkerPress, 
  onMapPress,
  showLabels,
  zoomLevel,
  showCurrentLocation,
  style,
  getCurrentLocation
}: OpenStreetMapProps & { 
  currentLocation: {latitude: number, longitude: number} | null;
  getCurrentLocation: () => Promise<void>;
}) {
  const mapRef = useRef<any>(null);

  // Calculate delta based on zoom level (lower delta = higher zoom)
  const getRegionForZoomLevel = (location: typeof initialLocation, zoom: number) => {
    const latitudeDelta = 0.0922 / (zoom / 10);
    const longitudeDelta = 0.0421 / (zoom / 10);
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta,
      longitudeDelta,
    };
  };

  // Use current location for initial region if available
  const locationToUse = currentLocation || initialLocation;
  const region = getRegionForZoomLevel(locationToUse, zoomLevel || 12);

  // Function to center the map on current location
  const centerOnCurrentLocation = () => {
    if (currentLocation && mapRef.current) {
      const region = getRegionForZoomLevel(currentLocation, zoomLevel || 12);
      mapRef.current.animateToRegion(region, 1000);
    } else {
      getCurrentLocation();
    }
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider="google"
        initialRegion={region}
        onPress={(e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => 
          onMapPress && onMapPress(e.nativeEvent.coordinate)
        }
      >
        {/* Regular markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={showLabels ? marker.title : undefined}
            onPress={() => onMarkerPress && onMarkerPress(marker)}
          >
            <View style={[
              styles.markerContainer, 
              { 
                backgroundColor: marker.color,
                width: marker.size || 30,
                height: marker.size || 30,
                borderRadius: (marker.size || 30) / 2,
              }
            ]}>
              {marker.icon ? (
                <MaterialIcons 
                  name={marker.icon as any} 
                  size={(marker.size || 30) * 0.6} 
                  color="#FFF" 
                />
              ) : (
                <View style={styles.markerDot} />
              )}
            </View>
          </Marker>
        ))}

        {/* Current location marker */}
        {currentLocation && (
          <Marker
            key="current-location"
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Your location"
          >
            <View style={styles.currentLocationMarker}>
              <View style={styles.currentLocationPulse} />
              <View style={styles.currentLocationDot} />
            </View>
          </Marker>
        )}
      </MapView>
      
      {/* Current location button */}
      {showCurrentLocation && (
        <TouchableOpacity 
          style={styles.locationButton} 
          onPress={centerOnCurrentLocation}
        >
          <View style={styles.locationButtonInner}>
            <MaterialIcons name="my-location" size={24} color="#007AFF" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Web implementation
function WebMap({ 
  markers, 
  initialLocation,
  currentLocation,
  onMarkerPress, 
  onMapPress,
  showLabels,
  zoomLevel,
  style,
  getCurrentLocation
}: OpenStreetMapProps & { 
  currentLocation: {latitude: number, longitude: number} | null;
  getCurrentLocation: () => Promise<void>;
}) {
  const webViewRef = useRef<any>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [browserLocation, setBrowserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  
  // Initialize browser geolocation immediately
  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        initBrowserGeolocation();
        true;
      `);
    }
  }, [webViewRef.current]);
  
  // Create HTML with Leaflet map
  const leafletMapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <title>Leaflet Map</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
        }
        .user-marker {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }
        .user-marker-pulse {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: rgba(255, 59, 48, 0.3);
          animation: pulse 1.5s infinite;
        }
        .user-marker-dot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: #ff3b30;
          border: 2px solid #FFFFFF;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          z-index: 2;
        }
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.8; }
          70% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(0.8); opacity: 0; }
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        // Initialize map
        const map = L.map('map').setView([${initialLocation.latitude}, ${initialLocation.longitude}], ${zoomLevel});
        let userLocationMarker = null;
        let userLocationAccuracy = null;
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Add markers
        const markers = ${JSON.stringify(markers)};
        const markerObjects = {};
        
        markers.forEach(marker => {
          // Skip the user marker as we'll handle it separately with browser geolocation
          if (marker.id === 'user') return;
          
          const customIcon = L.divIcon({
            className: 'custom-marker',
            html: \`<div style="background-color: \${marker.color}; width: \${marker.size || 30}px; height: \${marker.size || 30}px; border-radius: 50%; display: flex; justify-content: center; align-items: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><div style="width: 12px; height: 12px; border-radius: 6px; background-color: white;"></div></div>\`,
            iconSize: [marker.size || 30, marker.size || 30],
            iconAnchor: [(marker.size || 30)/2, (marker.size || 30)/2]
          });
          
          const leafletMarker = L.marker([marker.latitude, marker.longitude], { icon: customIcon })
            .addTo(map);
          
          if (${showLabels}) {
            leafletMarker.bindTooltip(marker.title, { permanent: true });
          }
          
          markerObjects[marker.id] = leafletMarker;
          
          leafletMarker.on('click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'markerClick',
              marker: marker
            }));
          });
        });
        
        // Function to initialize browser geolocation with high accuracy
        function initBrowserGeolocation() {
          if (navigator.geolocation) {
            // Set up a watch for location updates with high accuracy
            navigator.geolocation.watchPosition(
              function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                
                // Send location back to React Native
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'locationUpdate',
                  latitude: lat,
                  longitude: lng,
                  accuracy: accuracy
                }));
                
                // Update or create the user location marker
                updateUserLocationMarker(lat, lng, accuracy);
              },
              function(error) {
                console.error('Error getting browser location:', error);
                // Try to fall back to the React Native provided location
                if (${currentLocation ? 'true' : 'false'}) {
                  updateUserLocationMarker(
                    ${currentLocation ? currentLocation.latitude : 0}, 
                    ${currentLocation ? currentLocation.longitude : 0}, 
                    100
                  );
                }
              },
              { 
                enableHighAccuracy: true, 
                maximumAge: 0, 
                timeout: 5000 
              }
            );
          }
        }
        
        // Update the user location marker on the map
        function updateUserLocationMarker(lat, lng, accuracy) {
          if (userLocationMarker) {
            userLocationMarker.setLatLng([lat, lng]);
            if (userLocationAccuracy) {
              userLocationAccuracy.setLatLng([lat, lng]);
              userLocationAccuracy.setRadius(accuracy);
            }
          } else {
            // Create a custom user location marker
            const userIcon = L.divIcon({
              className: 'user-marker',
              html: '<div class="user-marker-pulse"></div><div class="user-marker-dot"></div>',
              iconSize: [40, 40],
              iconAnchor: [20, 20]
            });
            
            userLocationMarker = L.marker([lat, lng], { 
              icon: userIcon,
              zIndexOffset: 1000
            }).addTo(map);
            
            userLocationMarker.bindTooltip('You', { permanent: ${showLabels} });
            
            // Add accuracy circle
            userLocationAccuracy = L.circle([lat, lng], {
              radius: accuracy,
              color: '#ff3b30',
              fillColor: '#ff3b30',
              fillOpacity: 0.15,
              weight: 1
            }).addTo(map);
          }
        }
        
        // Handle map clicks
        map.on('click', function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapClick',
            latitude: e.latlng.lat,
            longitude: e.latlng.lng
          }));
        });
        
        // Function to center on user location
        function centerOnUserLocation() {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              function(position) {
                // Center the map on user's location with accurate zoom
                map.setView([position.coords.latitude, position.coords.longitude], 16);
                
                // Update the location marker
                updateUserLocationMarker(
                  position.coords.latitude, 
                  position.coords.longitude,
                  position.coords.accuracy
                );
              },
              function(error) {
                console.error('Error centering on location:', error);
                // Let the user know there was an error
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'locationError',
                  message: error.message
                }));
              },
              { 
                enableHighAccuracy: true, 
                maximumAge: 0, 
                timeout: 5000 
              }
            );
          }
        }
      </script>
    </body>
    </html>
  `;

  // Handle messages from WebView
  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'markerClick' && onMarkerPress) {
        onMarkerPress(data.marker);
      } else if (data.type === 'mapClick' && onMapPress) {
        onMapPress({
          latitude: data.latitude,
          longitude: data.longitude
        });
      } else if (data.type === 'locationUpdate') {
        // Update the React Native state with browser location
        setBrowserLocation({
          latitude: data.latitude,
          longitude: data.longitude
        });
      } else if (data.type === 'locationError') {
        console.error('Browser location error:', data.message);
        Alert.alert('Location Error', 'Unable to get your precise location. Try enabling location services in your browser settings.');
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  // Center map on user's location
  const centerOnCurrentLocation = () => {
    setLocationRequested(true);
    webViewRef.current?.injectJavaScript(`
      centerOnUserLocation();
      true;
    `);
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: leafletMapHtml }}
        style={styles.map}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
      />
      
      <TouchableOpacity 
        style={styles.locationButton} 
        onPress={centerOnCurrentLocation}
      >
        <View style={styles.locationButtonInner}>
          <MaterialIcons name="my-location" size={24} color="#007AFF" />
        </View>
      </TouchableOpacity>
      
      {locationRequested && (
        <View style={styles.permissionNote}>
          <Text style={styles.permissionText}>
            Please allow location access in your browser if prompted
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  currentLocationMarker: {
    position: 'relative',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  currentLocationDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff3b30',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  currentLocationPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    opacity: 0.5,
  },
  locationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionNote: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 10,
    zIndex: 1000,
  },
  permissionText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
}); 