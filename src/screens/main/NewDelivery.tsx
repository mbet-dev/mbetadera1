import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Location } from '../../types';

export default function NewDelivery({ navigation }: any) {
  const [recipientPhone, setRecipientPhone] = useState('');
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('small');
  const [weight, setWeight] = useState('');
  const [description, setDescription] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);

  const handleCreateDelivery = async () => {
    try {
      // TODO: Implement delivery creation logic with Supabase
      navigation.navigate('Orders');
    } catch (error) {
      console.error('Error creating delivery:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>New Delivery</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recipient Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Recipient Phone Number"
          value={recipientPhone}
          onChangeText={setRecipientPhone}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Package Details</Text>
        <View style={styles.sizeContainer}>
          {(['small', 'medium', 'large'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sizeButton, size === s && styles.selectedSize]}
              onPress={() => setSize(s)}
            >
              <Text style={[styles.sizeText, size === s && styles.selectedSizeText]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Weight (kg)"
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <TextInput
          style={styles.input}
          placeholder="Special Instructions (Optional)"
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
          multiline
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pickup Location</Text>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 9.0222,
              longitude: 38.7468,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          >
            {pickupLocation && (
              <Marker
                coordinate={{
                  latitude: pickupLocation.latitude,
                  longitude: pickupLocation.longitude,
                }}
                title="Pickup Location"
              />
            )}
          </MapView>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dropoff Location</Text>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 9.0222,
              longitude: 38.7468,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          >
            {dropoffLocation && (
              <Marker
                coordinate={{
                  latitude: dropoffLocation.latitude,
                  longitude: dropoffLocation.longitude,
                }}
                title="Dropoff Location"
              />
            )}
          </MapView>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleCreateDelivery}>
        <Text style={styles.buttonText}>Create Delivery</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  sizeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sizeButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  selectedSize: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  sizeText: {
    color: '#000',
  },
  selectedSizeText: {
    color: '#fff',
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginVertical: 20,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
