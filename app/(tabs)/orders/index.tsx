import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Platform
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { parcelService } from '@/services/parcelService';
import { Parcel } from '@/types/parcel';
import ParcelList from '@/components/ParcelList';
import { SegmentedButtons } from 'react-native-paper';

export default function OrdersScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchParcels();
    }
  }, [user]);

  const fetchParcels = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const fetchedParcels = await parcelService.getParcels(user.id);
      setParcels(fetchedParcels);
    } catch (error) {
      console.error('Error fetching parcels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchParcels();
    setRefreshing(false);
  };

  const filteredParcels = parcels.filter((parcel) => {
    switch (filter) {
      case 'active':
        return ['confirmed', 'picked_up', 'in_transit'].includes(parcel.status);
      case 'completed':
        return parcel.status === 'delivered';
      case 'cancelled':
        return parcel.status === 'cancelled';
      default:
        return true;
    }
  });

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
      </View>

      <ParcelList
        parcels={filteredParcels}
        loading={loading}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        emptyMessage={`No ${filter === 'all' ? '' : filter} parcels found`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  }
});
