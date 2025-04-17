import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { parcelService } from '@/services/parcelService';
import { NewDeliveryFormData, PackageSize, PaymentMethod } from '@/types/parcel';
import { COLORS } from '@/constants/colors';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { OpenStreetMap } from '@/components/OpenStreetMap';
import * as Location from 'expo-location';

export default function NewDeliveryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<NewDeliveryFormData>>({
    packageSize: 'medium', // Default value
    isFragile: false,
    paymentMethod: 'cash', // Default value
    deliveryFee: 100, // Default or calculated value
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [userLocation, setUserLocation] = useState({
    latitude: 9.0222,  // Addis Ababa coordinates
    longitude: 38.7468,
  });
  const [showPickupMap, setShowPickupMap] = useState(false);
  const [showDropoffMap, setShowDropoffMap] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
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

  const handleInputChange = (name: keyof NewDeliveryFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMapPress = (location: { latitude: number; longitude: number }, isPickup: boolean) => {
    if (isPickup) {
      setFormData((prev) => ({
        ...prev,
        pickupLatitude: location.latitude,
        pickupLongitude: location.longitude,
      }));
      setShowPickupMap(false);
    } else {
      setFormData((prev) => ({
        ...prev,
        dropoffLatitude: location.latitude,
        dropoffLongitude: location.longitude,
      }));
      setShowDropoffMap(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      // Use web alert and set validation error state for web
      window.alert(message);
      setValidationError(message);
    } else {
      // Use React Native Alert for native platforms
      Alert.alert(title, message);
    }
  };

  // Function to render required field marker
  const requiredField = () => (
    <Text style={styles.requiredField}>*</Text>
  );

  const handleSubmit = async () => {
    // Clear any previous validation errors
    setValidationError(null);
    
    if (!user) {
      showAlert('Error', 'You must be logged in to create a delivery.');
      return;
    }

    // Basic validation with field highlighting
    const newInvalidFields: Record<string, boolean> = {};
    if (!formData.pickupLocation) newInvalidFields.pickupLocation = true;
    if (!formData.dropoffLocation) newInvalidFields.dropoffLocation = true;
    if (!formData.packageDescription) newInvalidFields.packageDescription = true;
    if (!formData.pickupContact) newInvalidFields.pickupContact = true;
    if (!formData.dropoffContact) newInvalidFields.dropoffContact = true;
    if (!formData.paymentMethod) newInvalidFields.paymentMethod = true;
    
    if (Object.keys(newInvalidFields).length > 0) {
      setInvalidFields(newInvalidFields);
      showAlert('Error', 'Please fill in all required fields.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const completeFormData = formData as NewDeliveryFormData;
        const newParcel = await parcelService.createDelivery(completeFormData, user.id);
        
        if (newParcel) {
            Alert.alert('Success', `Delivery created successfully! Tracking code: ${newParcel.tracking_code}`);
            router.replace('/(tabs)/orders'); 
        } else {
            throw new Error('Failed to create delivery. Parcel data was null.');
        }
    } catch (err: any) {
        console.error('Error creating delivery:', err);
        setError(`Failed to create delivery: ${err.message || 'Unknown error'}`);
        Alert.alert('Error', `Failed to create delivery: ${err.message || 'Unknown error'}`);
    } finally {
        setIsLoading(false);
    }
  };

  const nextStep = () => {
    // Clear any previous validation errors
    setValidationError(null);
    // Reset invalid fields
    const newInvalidFields: Record<string, boolean> = {};
    
    // Validate current step
    if (currentStep === 1) {
      if (!formData.packageDescription) {
        newInvalidFields.packageDescription = true;
      }
      if (!formData.packageSize) {
        newInvalidFields.packageSize = true;
      }
      
      if (Object.keys(newInvalidFields).length > 0) {
        setInvalidFields(newInvalidFields);
        showAlert('Error', 'Please fill in all required package details.');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.pickupLocation) {
        newInvalidFields.pickupLocation = true;
      }
      if (!formData.pickupContact) {
        newInvalidFields.pickupContact = true;
      }
      if (!formData.pickupLatitude || !formData.pickupLongitude) {
        newInvalidFields.pickupMap = true;
      }
      
      if (Object.keys(newInvalidFields).length > 0) {
        setInvalidFields(newInvalidFields);
        if (newInvalidFields.pickupMap) {
          showAlert('Error', 'Please select a pickup location on the map.');
        } else {
          showAlert('Error', 'Please fill in all required pickup details.');
        }
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.dropoffLocation) {
        newInvalidFields.dropoffLocation = true;
      }
      if (!formData.dropoffContact) {
        newInvalidFields.dropoffContact = true;
      }
      if (!formData.dropoffLatitude || !formData.dropoffLongitude) {
        newInvalidFields.dropoffMap = true;
      }
      
      if (Object.keys(newInvalidFields).length > 0) {
        setInvalidFields(newInvalidFields);
        if (newInvalidFields.dropoffMap) {
          showAlert('Error', 'Please select a dropoff location on the map.');
        } else {
          showAlert('Error', 'Please fill in all required dropoff details.');
        }
        return;
      }
    }
    
    // If we get here, no validation errors
    setInvalidFields({});
    setCurrentStep(current => Math.min(current + 1, 4));
  };

  const prevStep = () => {
    setCurrentStep(current => Math.max(current - 1, 1));
  };

  const calculateFee = () => {
    if (formData.pickupLatitude && formData.pickupLongitude && formData.dropoffLatitude && formData.dropoffLongitude && formData.packageSize) {
      // Calculate approximate distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (formData.dropoffLatitude - formData.pickupLatitude) * Math.PI / 180;
      const dLon = (formData.dropoffLongitude - formData.pickupLongitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(formData.pickupLatitude * Math.PI / 180) * Math.cos(formData.dropoffLatitude * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c; // Distance in km
      
      const fee = parcelService.calculateDeliveryFee(formData.packageSize as PackageSize, distance);
      handleInputChange('deliveryFee', fee);
    }
  };

  // Calculate fee when changing to payment step
  useEffect(() => {
    if (currentStep === 4) {
      calculateFee();
    }
  }, [currentStep]);

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map(step => (
        <View key={step} style={[
          styles.stepDot, 
          currentStep === step ? styles.activeStep : (currentStep > step ? styles.completedStep : {})
        ]}>
          <Text style={styles.stepNumber}>{step}</Text>
        </View>
      ))}
    </View>
  );

  // Package details step
  const renderPackageDetailsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Package Details</Text>
      
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Package Description</Text>
        {requiredField()}
      </View>
      <TextInput
        style={[
          styles.input, 
          invalidFields.packageDescription && styles.invalidInput
        ]}
        placeholder="Describe what you're sending"
        value={formData.packageDescription || ''}
        onChangeText={(value) => handleInputChange('packageDescription', value)}
      />
      
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Package Size</Text>
        {requiredField()}
      </View>
      <View style={[
        styles.packageSizeContainer,
        invalidFields.packageSize && styles.invalidContainer
      ]}>
        {(['document', 'small', 'medium', 'large'] as PackageSize[]).map(size => (
          <TouchableOpacity
            key={size}
            style={[
              styles.packageSizeButton,
              formData.packageSize === size && styles.packageSizeButtonActive
            ]}
            onPress={() => handleInputChange('packageSize', size)}
          >
            <Text style={[
              styles.packageSizeText,
              formData.packageSize === size && styles.packageSizeTextActive
            ]}>
              {size.charAt(0).toUpperCase() + size.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.label}>Is Fragile?</Text>
        <Switch
          value={formData.isFragile}
          onValueChange={(value) => handleInputChange('isFragile', value)}
          trackColor={{ false: '#ccc', true: COLORS.primary }}
        />
      </View>
    </View>
  );

  // Pickup location step
  const renderPickupLocationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Pickup Details</Text>
      
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Pickup Location</Text>
        {requiredField()}
      </View>
      <TextInput
        style={[
          styles.input,
          invalidFields.pickupLocation && styles.invalidInput
        ]}
        placeholder="Enter pickup address"
        value={formData.pickupLocation || ''}
        onChangeText={(value) => handleInputChange('pickupLocation', value)}
      />
      
      <TouchableOpacity 
        style={[
          styles.mapButton,
          invalidFields.pickupMap && styles.invalidMapButton
        ]}
        onPress={() => setShowPickupMap(true)}
      >
        <MaterialIcons name="add-location" size={20} color="white" />
        <Text style={styles.mapButtonText}>
          {formData.pickupLatitude ? 'Change Pickup Location on Map' : 'Select Pickup Location on Map'} {requiredField()}
        </Text>
      </TouchableOpacity>
      
      {formData.pickupLatitude && formData.pickupLongitude && (
        <Text style={styles.coordinatesText}>
          Location selected at: {formData.pickupLatitude.toFixed(6)}, {formData.pickupLongitude.toFixed(6)}
        </Text>
      )}
      
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Pickup Contact</Text>
        {requiredField()}
      </View>
      <TextInput
        style={[
          styles.input,
          invalidFields.pickupContact && styles.invalidInput
        ]}
        placeholder="Enter pickup contact number"
        value={formData.pickupContact || ''}
        onChangeText={(value) => handleInputChange('pickupContact', value)}
        keyboardType="phone-pad"
      />
      
      {showPickupMap && (
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>Select Pickup Location</Text>
            <TouchableOpacity onPress={() => setShowPickupMap(false)}>
              <Ionicons name="close" size={24} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
          <OpenStreetMap
            markers={[]}
            initialLocation={userLocation}
            onMapPress={(location) => handleMapPress(location, true)}
            style={styles.map}
            showCurrentLocation={true}
          />
          <Text style={styles.mapInstructions}>Tap anywhere on the map to select the pickup location</Text>
        </View>
      )}
    </View>
  );

  // Dropoff location step
  const renderDropoffLocationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Dropoff Details</Text>
      
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Dropoff Location</Text>
        {requiredField()}
      </View>
      <TextInput
        style={[
          styles.input,
          invalidFields.dropoffLocation && styles.invalidInput
        ]}
        placeholder="Enter dropoff address"
        value={formData.dropoffLocation || ''}
        onChangeText={(value) => handleInputChange('dropoffLocation', value)}
      />
      
      <TouchableOpacity 
        style={[
          styles.mapButton,
          invalidFields.dropoffMap && styles.invalidMapButton
        ]}
        onPress={() => setShowDropoffMap(true)}
      >
        <MaterialIcons name="add-location" size={20} color="white" />
        <Text style={styles.mapButtonText}>
          {formData.dropoffLatitude ? 'Change Dropoff Location on Map' : 'Select Dropoff Location on Map'} {requiredField()}
        </Text>
      </TouchableOpacity>
      
      {formData.dropoffLatitude && formData.dropoffLongitude && (
        <Text style={styles.coordinatesText}>
          Location selected at: {formData.dropoffLatitude.toFixed(6)}, {formData.dropoffLongitude.toFixed(6)}
        </Text>
      )}
      
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Dropoff Contact</Text>
        {requiredField()}
      </View>
      <TextInput
        style={[
          styles.input,
          invalidFields.dropoffContact && styles.invalidInput
        ]}
        placeholder="Enter dropoff contact number"
        value={formData.dropoffContact || ''}
        onChangeText={(value) => handleInputChange('dropoffContact', value)}
        keyboardType="phone-pad"
      />
      
      {showDropoffMap && (
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>Select Dropoff Location</Text>
            <TouchableOpacity onPress={() => setShowDropoffMap(false)}>
              <Ionicons name="close" size={24} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
          <OpenStreetMap
            markers={[]}
            initialLocation={userLocation}
            onMapPress={(location) => handleMapPress(location, false)}
            style={styles.map}
            showCurrentLocation={true}
          />
          <Text style={styles.mapInstructions}>Tap anywhere on the map to select the dropoff location</Text>
        </View>
      )}
    </View>
  );

  // Payment details step
  const renderPaymentDetailsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Payment Details</Text>
      
      <View style={styles.feeContainer}>
        <Text style={styles.label}>Delivery Fee</Text>
        <Text style={styles.feeAmount}>{formData.deliveryFee?.toFixed(2)} ETB</Text>
      </View>
      
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Payment Method</Text>
        {requiredField()}
      </View>
      <View style={[
        styles.paymentMethodContainer,
        invalidFields.paymentMethod && styles.invalidContainer
      ]}>
        {(['wallet', 'cash', 'yenepay', 'telebirr'] as PaymentMethod[]).map(method => (
          <TouchableOpacity
            key={method}
            style={[
              styles.paymentMethodButton,
              formData.paymentMethod === method && styles.paymentMethodButtonActive
            ]}
            onPress={() => handleInputChange('paymentMethod', method)}
          >
            <Text style={[
              styles.paymentMethodText,
              formData.paymentMethod === method && styles.paymentMethodTextActive
            ]}>
              {method.charAt(0).toUpperCase() + method.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.deliveryNote}>
        Your parcel will be picked up after payment is confirmed.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create New Delivery</Text>
        
        {(error || validationError) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || validationError}</Text>
          </View>
        )}
        
        <View style={styles.requiredFieldNote}>
          <Text style={styles.requiredField}>*</Text>
          <Text style={styles.noteText}>Required fields</Text>
        </View>
        
        {renderStepIndicator()}
        
        {currentStep === 1 && renderPackageDetailsStep()}
        {currentStep === 2 && renderPickupLocationStep()}
        {currentStep === 3 && renderDropoffLocationStep()}
        {currentStep === 4 && renderPaymentDetailsStep()}
        
        <View style={styles.navigationButtonsContainer}>
          {currentStep > 1 && (
            <TouchableOpacity 
              style={[styles.navigationButton, styles.backButton]} 
              onPress={prevStep}
            >
              <Ionicons name="arrow-back" size={20} color="white" />
              <Text style={styles.navigationButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          {currentStep < 4 ? (
            <TouchableOpacity 
              style={[styles.navigationButton, styles.nextButton]} 
              onPress={nextStep}
            >
              <Text style={styles.navigationButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.navigationButton, styles.submitButton]} 
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.navigationButtonText}>Create Delivery</Text>
                  <Ionicons name="checkmark" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: COLORS.text,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStep: {
    backgroundColor: COLORS.primary,
  },
  completedStep: {
    backgroundColor: '#4CAF50',
  },
  stepNumber: {
    color: 'white',
    fontWeight: 'bold',
  },
  stepContainer: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: COLORS.text,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  packageSizeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  packageSizeButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
  },
  packageSizeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  packageSizeText: {
    color: COLORS.text,
    fontWeight: '500',
  },
  packageSizeTextActive: {
    color: 'white',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  paymentMethodButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
  },
  paymentMethodButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paymentMethodText: {
    color: COLORS.text,
    fontWeight: '500',
  },
  paymentMethodTextActive: {
    color: 'white',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  mapButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  mapButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
  },
  coordinatesText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 100,
    padding: 10,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  map: {
    flex: 1,
    marginVertical: 10,
  },
  mapInstructions: {
    textAlign: 'center',
    color: COLORS.textLight,
    marginBottom: 10,
  },
  feeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  feeAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  deliveryNote: {
    textAlign: 'center',
    marginTop: 20,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  navigationButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  backButton: {
    backgroundColor: COLORS.textLight,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  navigationButtonText: {
    color: 'white',
    marginHorizontal: 5,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    fontSize: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  
  requiredField: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  
  requiredFieldNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'flex-end',
  },
  
  noteText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  
  invalidInput: {
    borderColor: '#ff3b30',
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  
  invalidContainer: {
    borderWidth: 1,
    borderColor: '#ff3b30',
    borderRadius: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  
  invalidMapButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
  },
});

