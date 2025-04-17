import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Parcel, ParcelStatus } from '@/types/parcel';
import { formatDate } from '@/utils/formatting';

const statusConfig: Record<ParcelStatus, {
  label: string;
  color: string;
  backgroundColor: string;
  icon: string;
}> = {
  pending: {
    label: 'Pending',
    color: '#F57C00',
    backgroundColor: '#FFF3E0',
    icon: 'time-outline'
  },
  confirmed: {
    label: 'Confirmed',
    color: '#039BE5',
    backgroundColor: '#E1F5FE',
    icon: 'checkmark-circle-outline'
  },
  picked_up: {
    label: 'Picked Up',
    color: '#7B1FA2',
    backgroundColor: '#F3E5F5',
    icon: 'cube-outline'
  },
  in_transit: {
    label: 'In Transit',
    color: '#00897B',
    backgroundColor: '#E0F2F1',
    icon: 'bicycle-outline'
  },
  delivered: {
    label: 'Delivered',
    color: '#43A047',
    backgroundColor: '#E8F5E9',
    icon: 'checkmark-done-outline'
  },
  cancelled: {
    label: 'Cancelled',
    color: '#E53935',
    backgroundColor: '#FFEBEE',
    icon: 'close-circle-outline'
  }
};

interface ParcelCardProps {
  parcel: Parcel;
  onPress?: () => void;
  showStatus?: boolean;
}

export const ParcelCard: React.FC<ParcelCardProps> = ({
  parcel,
  onPress,
  showStatus = true
}) => {
  const status = statusConfig[parcel.status as ParcelStatus];

  return (
    <TouchableOpacity
      style={styles.parcelCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.parcelHeader}>
        <Text style={styles.trackingCode}>#{parcel.tracking_code}</Text>
        <Text style={styles.date}>{formatDate(parcel.created_at)}</Text>
      </View>
      
      <View style={styles.addressContainer}>
        <View style={styles.addressRow}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.addressText} numberOfLines={1}>
            {parcel.pickup_address?.address_line || 'N/A'}
          </Text>
        </View>
        <View style={styles.verticalLine} />
        <View style={styles.addressRow}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.addressText} numberOfLines={1}>
            {parcel.dropoff_address?.address_line || 'N/A'}
          </Text>
        </View>
      </View>

      {showStatus && (
        <View
          style={[
            styles.statusContainer,
            { backgroundColor: status.backgroundColor },
          ]}
        >
          <Ionicons name={status.icon as any} size={16} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  parcelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
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
  },
  parcelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  addressContainer: {
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  verticalLine: {
    width: 1,
    height: 16,
    backgroundColor: '#E0E0E0',
    marginLeft: 8,
    marginVertical: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
}); 