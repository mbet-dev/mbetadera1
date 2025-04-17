import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { NewDeliveryFormData, PackageSize, PaymentMethod } from '../types/parcel';
import { parcelService } from '../services/parcelService';
import { validationUtils } from '../utils/validationUtils';
import { errorUtils } from '../utils/errorUtils';
import { locationUtils } from '../utils/locationUtils';

export function useNewDelivery() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [distance, setDistance] = useState<number | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<NewDeliveryFormData>({
    // Package details
    packageSize: 'small',
    packageDescription: '',
    isFragile: false,
    
    // Location details
    pickupLocation: '',
    dropoffLocation: '',
    pickupContact: '',
    dropoffContact: '',
    
    // Payment details
    paymentMethod: 'wallet',
    deliveryFee: 150, // Default fee
  });
  
  // Update delivery fee when package size changes or when coordinates are available
  useEffect(() => {
    if (formData.pickupLatitude && formData.pickupLongitude && 
        formData.dropoffLatitude && formData.dropoffLongitude) {
      // Calculate distance between pickup and dropoff
      const calculatedDistance = locationUtils.calculateDistance(
        formData.pickupLatitude,
        formData.pickupLongitude,
        formData.dropoffLatitude,
        formData.dropoffLongitude
      );
      
      setDistance(calculatedDistance);
      
      // Update delivery fee based on package size and distance
      const fee = parcelService.calculateDeliveryFee(formData.packageSize, calculatedDistance);
      setFormData(prev => ({ ...prev, deliveryFee: fee }));
    } else {
      // If coordinates aren't available, just use package size
      const fee = parcelService.calculateDeliveryFee(formData.packageSize);
      setFormData(prev => ({ ...prev, deliveryFee: fee }));
    }
  }, [
    formData.packageSize, 
    formData.pickupLatitude, 
    formData.pickupLongitude, 
    formData.dropoffLatitude, 
    formData.dropoffLongitude
  ]);
  
  // Update form field
  const updateFormField = <K extends keyof NewDeliveryFormData>(
    field: K, 
    value: NewDeliveryFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  // Try to geocode addresses when they change
  useEffect(() => {
    const geocodeAddresses = async () => {
      if (formData.pickupLocation && formData.pickupLocation.length > 5) {
        try {
          const coordinates = await locationUtils.geocodeAddress(formData.pickupLocation);
          if (coordinates) {
            setFormData(prev => ({
              ...prev,
              pickupLatitude: coordinates.latitude,
              pickupLongitude: coordinates.longitude,
            }));
          }
        } catch (error) {
          console.error('Error geocoding pickup address:', error);
        }
      }
      
      if (formData.dropoffLocation && formData.dropoffLocation.length > 5) {
        try {
          const coordinates = await locationUtils.geocodeAddress(formData.dropoffLocation);
          if (coordinates) {
            setFormData(prev => ({
              ...prev,
              dropoffLatitude: coordinates.latitude,
              dropoffLongitude: coordinates.longitude,
            }));
          }
        } catch (error) {
          console.error('Error geocoding dropoff address:', error);
        }
      }
    };
    
    // Debounce the geocoding to avoid too many API calls
    const timeoutId = setTimeout(geocodeAddresses, 1000);
    return () => clearTimeout(timeoutId);
  }, [formData.pickupLocation, formData.dropoffLocation]);
  
  // Use current location as pickup
  const useCurrentLocationAsPickup = async () => {
    try {
      setLoading(true);
      const currentLocation = await locationUtils.getCurrentLocation();
      
      if (currentLocation) {
        const address = await locationUtils.reverseGeocodeCoordinates(
          currentLocation.latitude,
          currentLocation.longitude
        );
        
        setFormData(prev => ({
          ...prev,
          pickupLocation: address || 'Current Location',
          pickupLatitude: currentLocation.latitude,
          pickupLongitude: currentLocation.longitude,
        }));
      } else {
        Alert.alert('Location Error', 'Unable to get your current location. Please check your location permissions.');
      }
    } catch (error) {
      errorUtils.handleApiError(error, 'Failed to get current location');
    } finally {
      setLoading(false);
    }
  };
  
  // Validate current step
  const validateCurrentStep = (): boolean => {
    let stepErrors: Record<string, string> = {};
    
    switch (currentStep) {
      case 1: // Package details
        if (!formData.packageSize) {
          stepErrors.packageSize = 'Please select a package size';
        }
        break;
        
      case 2: // Location details
        if (!formData.pickupLocation || !validationUtils.isValidAddress(formData.pickupLocation)) {
          stepErrors.pickupLocation = 'Please enter a valid pickup location';
        }
        
        if (!formData.dropoffLocation || !validationUtils.isValidAddress(formData.dropoffLocation)) {
          stepErrors.dropoffLocation = 'Please enter a valid dropoff location';
        }
        
        if (!formData.pickupContact || !validationUtils.isValidPhoneNumber(formData.pickupContact)) {
          stepErrors.pickupContact = 'Please enter a valid pickup contact phone number';
        }
        
        if (!formData.dropoffContact || !validationUtils.isValidPhoneNumber(formData.dropoffContact)) {
          stepErrors.dropoffContact = 'Please enter a valid dropoff contact phone number';
        }
        break;
        
      case 3: // Payment details
        if (!formData.paymentMethod) {
          stepErrors.paymentMethod = 'Please select a payment method';
        }
        break;
    }
    
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };
  
  // Handle next step
  const handleNextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    } else {
      // Show validation errors
      errorUtils.handleValidationErrors(errors);
    }
  };
  
  // Handle previous step
  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Final validation of all form data
      const { isValid, errors: validationErrors } = validationUtils.validateNewDeliveryForm(formData);
      
      if (!isValid) {
        setErrors(validationErrors);
        errorUtils.handleValidationErrors(validationErrors);
        setLoading(false);
        return;
      }
      
      // Create the delivery
      const { parcel, error } = await parcelService.createDelivery(formData);
      
      if (error) {
        throw error;
      }
      
      // Success! Navigate to orders screen
      Alert.alert(
        'Success',
        `Delivery created successfully! Your tracking code is ${parcel.tracking_code}`,
        [
          { text: 'OK', onPress: () => router.push('/(tabs)/orders') }
        ]
      );
    } catch (error) {
      errorUtils.handleApiError(error, 'Failed to create delivery');
    } finally {
      setLoading(false);
    }
  };
  
  return {
    currentStep,
    formData,
    loading,
    errors,
    distance,
    updateFormField,
    handleNextStep,
    handlePreviousStep,
    useCurrentLocationAsPickup,
  };
}
