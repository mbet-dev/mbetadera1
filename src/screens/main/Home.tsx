import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, Modal } from 'react-native';
import { Parcel } from '../../types';
import { supabase } from '../../services/supabase';
import { OpenStreetMap } from '../../components/OpenStreetMap';
import * as Location from 'expo-location';

interface PartnerLocation {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  color: string;
  businessName: string;
  workingHours?: string;
  phoneNumber?: string;
}

interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  color: string;
}

export default function Home({ navigation }: any) {
  const [activeDeliveries, setActiveDeliveries] = useState<Parcel[]>([]);
  const [partnerLocations, setPartnerLocations] = useState<PartnerLocation[]>([]);
  const [userLocation, setUserLocation] = useState({
    latitude: 9.0222,  // Addis Ababa coordinates
    longitude: 38.7468,
  });
  const [selectedLocation, setSelectedLocation] = useState<PartnerLocation | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerLocation | null>(null);
  const [showPartnerDetails, setShowPartnerDetails] = useState(false);

  useEffect(() => {
    fetchPartnerLocations();
    fetchActiveDeliveries();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermissionGranted(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const fetchPartnerLocations = async () => {
    try {
      const { data: partners, error } = await supabase
        .from('partners')
        .select(`
          id,
          business_name,
          color,
          addresses (
            id,
            latitude,
            longitude,
            address_line
          ),
          working_hours,
          phone_number
        `)
        .not('addresses', 'is', null);

      if (error) throw error;
      
      console.log('Fetched partners data:', partners);

      if (!partners || partners.length === 0) {
        console.warn('No partners found in the database');
        return;
      }

      // Use a type assertion to ensure we only include non-null values
      const locations = partners.map((partner: any) => {
        // Find first valid address for this partner
        const address = partner.addresses && partner.addresses.length > 0 
          ? partner.addresses[0] 
          : null;
          
        if (!address || address.latitude === null || address.longitude === null) {
          console.warn(`Partner ${partner.id} has no valid address data`);
          return null;
        }
        
        return {
          id: partner.id,
          latitude: address.latitude,
          longitude: address.longitude,
          title: partner.business_name?.substring(0, 2) || 'MP',
          color: partner.color || '#2196F3',
          businessName: partner.business_name || 'MBet Partner',
          workingHours: partner.working_hours,
          phoneNumber: partner.phone_number
        };
      }).filter(Boolean) as PartnerLocation[];

      console.log('Transformed partner locations:', locations);
      setPartnerLocations(locations);
    } catch (error) {
      console.error('Error fetching partner locations:', error);
    }
  };

  const fetchActiveDeliveries = async () => {
    try {
      const { data: deliveries, error } = await supabase
        .from('parcels_with_addresses')
        .select('*')
        .in('status', ['pending', 'accepted', 'picked_up', 'in_transit']);

      if (error) throw error;
      console.log('Active deliveries with addresses:', deliveries);
      setActiveDeliveries(deliveries || []);
    } catch (error) {
      console.error('Error fetching active deliveries:', error);
    }
  };

  const handleMarkerPress = (marker: Marker) => {
    const partnerLocation = partnerLocations.find(loc => loc.id === marker.id);
    if (partnerLocation) {
      setSelectedPartner(partnerLocation);
      setShowPartnerDetails(true);
    }
  };

  const handleMapPress = (location: { latitude: number; longitude: number }) => {
    Alert.alert(
      'Location Selected',
      'Would you like to use this location?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Use as Pickup',
          onPress: () => navigation.navigate('NewDelivery', { pickupLocation: location }),
        },
        {
          text: 'Use as Dropoff',
          onPress: () => navigation.navigate('NewDelivery', { dropoffLocation: location }),
        },
      ]
    );
  };

  // Transform markers for the map
  const transformedMarkers = partnerLocations.map(location => ({
    id: location.id,
    latitude: location.latitude,
    longitude: location.longitude,
    title: location.title,
    color: location.color || '#2196F3' // Use color from database or default blue
  }));
  
  console.log('Markers to display:', transformedMarkers);

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'pending': 
        return styles.statusPending;
      case 'picked_up':
      case 'in_transit':
        return styles.statusInTransit;
      case 'delivered':
        return styles.statusDelivered;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return {};
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <Text style={styles.sectionTitle}>Available PickUp/Dropoff Points</Text>
        <OpenStreetMap
          markers={transformedMarkers}
          initialLocation={userLocation}
          onMarkerPress={handleMarkerPress}
          onMapPress={handleMapPress}
          style={styles.map}
          showCurrentLocation={true}
        />
      </View>

      <Modal
        visible={showPartnerDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPartnerDetails(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedPartner && (
              <>
                <Text style={styles.modalTitle}>{selectedPartner.businessName}</Text>
                <Text style={styles.modalText}>Location: {selectedPartner.title}</Text>
                <Text style={styles.modalText}>Working Hours: {selectedPartner.workingHours}</Text>
                <Text style={styles.modalText}>Phone: {selectedPartner.phoneNumber}</Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowPartnerDetails(false)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.pickupButton]}
                    onPress={() => {
                      setShowPartnerDetails(false);
                      navigation.navigate('NewDelivery', { pickupLocation: selectedPartner });
                    }}
                  >
                    <Text style={styles.buttonText}>Use as Pickup</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.dropoffButton]}
                    onPress={() => {
                      setShowPartnerDetails(false);
                      navigation.navigate('NewDelivery', { dropoffLocation: selectedPartner });
                    }}
                  >
                    <Text style={styles.buttonText}>Use as Dropoff</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.deliveriesContainer}>
        <Text style={styles.sectionTitle}>Active Deliveries</Text>
        {activeDeliveries.length === 0 ? (
          <Text style={styles.emptyText}>No active deliveries</Text>
        ) : (
          activeDeliveries.map((delivery) => (
            <TouchableOpacity
              key={delivery.id}
              style={styles.deliveryCard}
              onPress={() => navigation.navigate('DeliveryDetails', { id: delivery.id })}
            >
              <View style={styles.deliveryHeader}>
                <Text style={styles.deliveryId}>#{delivery.tracking_code}</Text>
                <View style={[styles.statusBadge, getStatusStyle(delivery.status)]}>
                  <Text style={styles.statusText}>{delivery.status_display || delivery.status}</Text>
                </View>
              </View>
              
              <View style={styles.deliveryDetails}>
                {delivery.package_size && (
                  <View style={styles.packageInfo}>
                    <Text style={styles.packageSize}>
                      {delivery.package_size.charAt(0).toUpperCase() + delivery.package_size.slice(1)} package
                    </Text>
                    {delivery.is_fragile && (
                      <View style={styles.fragileTag}>
                        <Text style={styles.fragileText}>Fragile</Text>
                      </View>
                    )}
                  </View>
                )}
                
                {delivery.package_description && (
                  <Text style={styles.packageDescription} numberOfLines={1} ellipsizeMode="tail">
                    {delivery.package_description}
                  </Text>
                )}
                
                {delivery.estimated_price && (
                  <Text style={styles.priceText}>
                    {delivery.formatted_price || `ETB ${delivery.estimated_price}`}
                    {delivery.formatted_distance && ` • ${delivery.formatted_distance}`}
                  </Text>
                )}
              </View>
              
              <View style={styles.addressContainer}>
                <View style={styles.addressItem}>
                  <View style={styles.addressHeader}>
                    <Text style={styles.addressLabel}>From:</Text>
                    {delivery.pickup_business_name && (
                      <View style={[styles.partnerTag, {backgroundColor: delivery.pickup_partner_color || '#4CAF50'}]}>
                        <Text style={styles.partnerText}>{delivery.pickup_business_name}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addressText}>{delivery.pickup_address || 'N/A'}</Text>
                  {delivery.pickup_working_hours && (
                    <Text style={styles.workingHours}>Hours: {delivery.pickup_working_hours}</Text>
                  )}
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.addressItem}>
                  <View style={styles.addressHeader}>
                    <Text style={styles.addressLabel}>To:</Text>
                    {delivery.dropoff_business_name && (
                      <View style={[styles.partnerTag, {backgroundColor: delivery.dropoff_partner_color || '#2196F3'}]}>
                        <Text style={styles.partnerText}>{delivery.dropoff_business_name}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addressText}>{delivery.dropoff_address || 'N/A'}</Text>
                  {delivery.dropoff_working_hours && (
                    <Text style={styles.workingHours}>Hours: {delivery.dropoff_working_hours}</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.newDeliveryButton}
        onPress={() => navigation.navigate('NewDelivery')}
      >
        <Text style={styles.buttonText}>New Delivery</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    height: '50%',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  map: {
    flex: 1,
  },
  deliveriesContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1,
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  deliveryCard: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  deliveryId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deliveryStatus: {
    color: '#4CAF50',
    marginTop: 5,
    marginBottom: 10,
  },
  addressContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop:.8,
  },
  addressItem: {
    marginVertical: 6,
  },
  addressLabel: {
    fontWeight: 'bold',
    marginRight: 5,
    color: '#555',
  },
  addressText: {
    flex: 1,
    color: '#333',
  },
  newDeliveryButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    margin: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
    minWidth: '30%',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  pickupButton: {
    backgroundColor: '#4CAF50',
  },
  dropoffButton: {
    backgroundColor: '#2196F3',
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  statusPending: {
    backgroundColor: '#FF9800',
  },
  statusInTransit: {
    backgroundColor: '#2196F3',
  },
  statusDelivered: {
    backgroundColor: '#4CAF50',
  },
  statusCancelled: {
    backgroundColor: '#F44336',
  },
  deliveryDetails: {
    marginBottom: 10,
  },
  packageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  packageSize: {
    fontSize: 14,
    color: '#555',
  },
  fragileTag: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  fragileText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  priceText: {
    fontSize: 14,
    color: '#555',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  partnerTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  partnerText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  workingHours: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  packageDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
});
