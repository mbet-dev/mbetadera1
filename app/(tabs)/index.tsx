import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  Alert, 
  Modal, 
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
  FlatList
} from 'react-native';
import { OpenStreetMap } from '../../src/components/OpenStreetMap';
import { router } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import * as Location from 'expo-location';
import { useAuth } from '@/context/AuthContext';
import { parcelService } from '@/services/parcelService';
import { Parcel } from '@/types/parcel';
import { ParcelCard } from '../../src/components/ParcelCard';
import { WebLayout } from '../../src/components/layout/WebLayout';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// Get screen dimensions for responsive layouts
const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  size?: number;
  icon?: string;
}

interface Partner {
  id: string;
  business_name: string;
  address: {
    latitude: number;
    longitude: number;
    address_line: string;
  } | null;
}

// Default map configuration
const DEFAULT_MAP_CONFIG = {
  zoomLevel: 13, // Higher number = more zoomed in
  centerLatitude: 9.0222, // Addis Ababa coordinates
  centerLongitude: 38.7468,
};

export default function Home() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDeliveries, setActiveDeliveries] = useState<Parcel[]>([]);
  const [partnerLocations, setPartnerLocations] = useState<PartnerLocation[]>([]);
  const [userLocation, setUserLocation] = useState({
    latitude: DEFAULT_MAP_CONFIG.centerLatitude,
    longitude: DEFAULT_MAP_CONFIG.centerLongitude,
  });
  const [mapConfig, setMapConfig] = useState({
    zoomLevel: DEFAULT_MAP_CONFIG.zoomLevel,
    center: {
      latitude: DEFAULT_MAP_CONFIG.centerLatitude,
      longitude: DEFAULT_MAP_CONFIG.centerLongitude,
    }
  });
  const [selectedPartner, setSelectedPartner] = useState<PartnerLocation | null>(null);
  const [showPartnerDetails, setShowPartnerDetails] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [stats, setStats] = useState({
    active: 0,
    delivered: 0,
    total: 0
  });

  useEffect(() => {
    if (user) {
      fetchPartnerLocations();
      fetchActiveDeliveries();
      fetchParcelStats();
      requestLocationPermission();
    }
  }, [user]);

  // Request location permissions and update map
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermissionGranted(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        const newLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        
        setUserLocation(newLocation);
        
        // Update map center to user's location with slightly increased zoom level
        setMapConfig({
          zoomLevel: DEFAULT_MAP_CONFIG.zoomLevel + 1,
          center: newLocation
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Fetch partner locations from database
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

  // Fetch active deliveries for current user
  const fetchActiveDeliveries = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const deliveries = await parcelService.getActiveDeliveries(user.id);
      setActiveDeliveries(deliveries);
    } catch (error) {
      console.error('Error fetching active deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch parcel statistics for current user
  const fetchParcelStats = async () => {
    if (!user) return;
    
    try {
      // Get total count
      const { count: totalCount, error: totalError } = await supabase
        .from('parcels')
        .select('*', { count: 'exact', head: true })
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      
      // Get delivered count
      const { count: deliveredCount, error: deliveredError } = await supabase
        .from('parcels')
        .select('*', { count: 'exact', head: true })
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'delivered');
      
      // Get active count
      const { count: activeCount, error: activeError } = await supabase
        .from('parcels')
        .select('*', { count: 'exact', head: true })
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .in('status', ['confirmed', 'picked_up', 'in_transit']);
      
      if (!totalError && !deliveredError && !activeError) {
        setStats({
          total: totalCount || 0,
          delivered: deliveredCount || 0,
          active: activeCount || 0
        });
      }
    } catch (error) {
      console.error('Error fetching parcel stats:', error);
    }
  };

  // Handle marker press on map
  const handleMarkerPress = (marker: Marker) => {
    const partnerLocation = partnerLocations.find(loc => loc.id === marker.id);
    if (partnerLocation) {
      setSelectedPartner(partnerLocation);
      setShowPartnerDetails(true);
    }
  };

  // Handle map press to set location
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
          onPress: () => router.push('/new-delivery' as any),
        },
        {
          text: 'Use as Dropoff',
          onPress: () => router.push('/new-delivery' as any),
        },
      ]
    );
  };

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchActiveDeliveries(),
        fetchParcelStats(),
        fetchPartnerLocations()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  // Transform data for map markers with custom styling
  const transformedMarkers = [
    // User location marker (only show if we have actual user location)
    ...(locationPermissionGranted ? [{
      id: 'user',
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      title: 'You',
      color: '#f44336', // Red color for user
      size: 40, // Larger marker for user
      icon: 'person-pin' // Custom icon
    }] : []),
    
    // Partner location markers
    ...partnerLocations.map(location => ({
      id: location.id,
      latitude: location.latitude,
      longitude: location.longitude,
      title: location.title,
      color: location.color || '#2196F3', // Use color from database or default blue
      size: 30, // Standard size for partners
      icon: 'store' // Custom icon for partners
    }))
  ];
  
  console.log('Map markers to render:', transformedMarkers);

  // Render statistics card
  const renderStatsCard = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <MaterialIcons name="inventory" size={24} color="#4CAF50" />
        <Text style={styles.statValue}>{stats.active}</Text>
        <Text style={styles.statLabel}>Active</Text>
      </View>
      <View style={styles.statCard}>
        <MaterialIcons name="done-all" size={24} color="#2196F3" />
        <Text style={styles.statValue}>{stats.delivered}</Text>
        <Text style={styles.statLabel}>Delivered</Text>
      </View>
      <View style={styles.statCard}>
        <MaterialIcons name="summarize" size={24} color="#FFC107" />
        <Text style={styles.statValue}>{stats.total}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
    </View>
  );

  // Render quick action buttons
  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => router.push('/new-delivery' as any)}
      >
        <View style={[styles.actionIcon, { backgroundColor: '#4CAF50' }]}>
          <MaterialIcons name="add" size={24} color="#FFF" />
        </View>
        <Text style={styles.actionText}>Send Parcel</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => router.push('/orders' as any)}
      >
        <View style={[styles.actionIcon, { backgroundColor: '#2196F3' }]}>
          <MaterialIcons name="inventory" size={24} color="#FFF" />
        </View>
        <Text style={styles.actionText}>My Parcels</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => router.push('/(tabs)/profile/wallet' as any)}
      >
        <View style={[styles.actionIcon, { backgroundColor: '#FFC107' }]}>
          <Ionicons name="wallet" size={24} color="#FFF" />
        </View>
        <Text style={styles.actionText}>Wallet</Text>
      </TouchableOpacity>
    </View>
  );

  // Render empty state for active deliveries
  const renderEmptyDeliveries = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="inventory" size={48} color="#CCCCCC" />
      <Text style={styles.emptyText}>No active deliveries</Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => router.push('/new-delivery' as any)}
      >
        <Text style={styles.emptyButtonText}>Send a Parcel</Text>
      </TouchableOpacity>
    </View>
  );

  // Render active deliveries section
  const renderActiveDeliveries = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      );
    }

    if (activeDeliveries.length === 0) {
      return renderEmptyDeliveries();
    }

    // Limit to 3 for better performance
    const limitedDeliveries = activeDeliveries.slice(0, 3);
    
    return (
      <View>
        {limitedDeliveries.map(delivery => (
          <ParcelCard 
            key={delivery.id} 
            parcel={delivery} 
            onPress={() => router.push(`/orders/${delivery.id}` as any)}
          />
        ))}
      </View>
    );
  };

  return (
    <WebLayout contentContainerStyle={styles.webContainer}>
      <FlatList
        data={[{ key: 'content' }]}
        renderItem={() => (
          <View style={styles.content}>
            {/* Welcome Header */}
            <View style={styles.welcomeHeader}>
              <Text style={styles.welcomeText}>
                Welcome
                {user?.user_metadata?.name ? <Text>, {user.user_metadata.name}</Text> : null}!
              </Text>
              <Text style={styles.welcomeSubtext}>Track your deliveries and explore services</Text>
            </View>
            
            {/* Statistics Overview */}
            {renderStatsCard()}
            
            {/* Quick Actions */}
            {renderQuickActions()}
            
            {/* Partner Map */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available PickUp/Dropoff Points</Text>
            </View>
            <View style={styles.mapContainer}>
              <OpenStreetMap
                markers={transformedMarkers}
                initialLocation={{
                  latitude: mapConfig.center.latitude,
                  longitude: mapConfig.center.longitude
                }}
                zoomLevel={mapConfig.zoomLevel}
                onMarkerPress={handleMarkerPress}
                onMapPress={handleMapPress}
                style={styles.map}
                showLabels={true}
                showCurrentLocation={true}
              />
            </View>
            
            {/* Active Deliveries */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Deliveries</Text>
              <TouchableOpacity onPress={() => router.push('/orders?filter=active' as any)}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.deliveriesContainer}>
              {renderActiveDeliveries()}
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        contentContainerStyle={styles.flatListContent}
      />

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
                      router.push('/new-delivery' as any);
                    }}
                  >
                    <Text style={styles.buttonText}>Use as Pickup</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.dropoffButton]}
                    onPress={() => {
                      setShowPartnerDetails(false);
                      router.push('/new-delivery' as any);
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
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    maxWidth: SCREEN_WIDTH > 1024 ? '100%' : undefined, 
    padding: 0,
  },
  flatListContent: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  welcomeHeader: {
    marginBottom: 16,
    paddingTop: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 4,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#333333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  map: {
    flex: 1,
  },
  deliveriesContainer: {
    marginBottom: 16,
    minHeight: 100,
  },
  loadingContainer: {
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
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
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
