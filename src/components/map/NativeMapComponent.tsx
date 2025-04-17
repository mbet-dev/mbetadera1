import React, { forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView from 'react-native-maps';
import { Marker } from 'react-native-maps';
import { MapViewProps } from './types';

// This component is only imported on native platforms
// It's completely isolated from the web bundle
const NativeMapComponent = forwardRef<any, MapViewProps>((props, ref) => {
  const { markers = [], onMarkerPress, onMapPress, initialRegion, children, ...otherProps } = props;

  return (
    <MapView
      ref={ref}
      style={[styles.container, props.style]}
      initialRegion={initialRegion || {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
      onPress={(e: any) => onMapPress?.(e.nativeEvent.coordinate)}
      {...otherProps}
    >
      {markers.map((marker: any) => (
        <Marker
          key={marker.id}
          coordinate={{
            latitude: marker.latitude,
            longitude: marker.longitude,
          }}
          title={marker.title}
          description={marker.description}
          onPress={() => onMarkerPress?.(marker)}
        />
      ))}
      {children}
    </MapView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default NativeMapComponent;
