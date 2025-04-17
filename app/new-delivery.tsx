import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WebLayout } from '../src/components/layout/WebLayout';
import { COLORS } from '../src/constants/colors';
import { useNewDelivery } from '../src/hooks/useNewDelivery';

export default function NewDeliveryScreen() {
  const router = useRouter();
  const {
    currentStep,
    formData,
    loading,
    errors,
    distance,
    updateFormField,
    handleNextStep,
    handlePreviousStep,
    useCurrentLocationAsPickup,
  } = useNewDelivery();

  const renderPackageDetails = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Package Details</Text>
      
      <Text style={styles.sectionTitle}>Package Size</Text>
      <View style={styles.packageSizeContainer}>
        {[
          { id: 'document', label: 'Document', icon: 'document-outline' },
          { id: 'small', label: 'Small', icon: 'cube-outline' },
          { id: 'medium', label: 'Medium', icon: 'cube' },
          { id: 'large', label: 'Large', icon: 'cube' },
        ].map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.packageSizeItem,
              formData.packageSize === item.id && styles.packageSizeItemSelected,
              errors.packageSize && styles.inputError,
            ]}
            onPress={() => updateFormField('packageSize', item.id)}
          >
            <Ionicons
              name={item.icon as any}
              size={24}
              color={formData.packageSize === item.id ? COLORS.primary : COLORS.textLight}
            />
            <Text
              style={[
                styles.packageSizeLabel,
                formData.packageSize === item.id && styles.packageSizeLabelSelected,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.packageSize && <Text style={styles.errorText}>{errors.packageSize}</Text>}
      
      <Text style={styles.sectionTitle}>Package Description</Text>
      <TextInput
        style={[styles.textInput, errors.packageDescription && styles.inputError]}
        placeholder="Describe your package (optional)"
        value={formData.packageDescription}
        onChangeText={(text) => updateFormField('packageDescription', text)}
        multiline
        numberOfLines={3}
      />
      {errors.packageDescription && <Text style={styles.errorText}>{errors.packageDescription}</Text>}
      
      <View style={styles.checkboxContainer}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => updateFormField('isFragile', !formData.isFragile)}
        >
          {formData.isFragile && (
            <Ionicons name="checkmark" size={16} color={COLORS.primary} />
          )}
        </TouchableOpacity>
        <Text style={styles.checkboxLabel}>This package is fragile</Text>
      </View>
    </View>
  );
  
  const renderLocationDetails = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Location Details</Text>
      
      <View style={styles.locationSection}>
        <View style={styles.locationHeader}>
          <View style={[styles.locationDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.locationTitle}>Pickup Location</Text>
        </View>
        
        <View
          style={[styles.locationInput, errors.pickupLocation && styles.inputError]}
        >
          <Ionicons name="location-outline" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.locationTextInput}
            placeholder="Enter pickup address"
            value={formData.pickupLocation}
            onChangeText={(text) => updateFormField('pickupLocation', text)}
          />
          <TouchableOpacity onPress={useCurrentLocationAsPickup}>
            <Ionicons name="locate" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        {errors.pickupLocation && <Text style={styles.errorText}>{errors.pickupLocation}</Text>}
        
        <TextInput
          style={[styles.contactInput, errors.pickupContact && styles.inputError]}
          placeholder="Pickup contact phone (e.g., 0911234567)"
          value={formData.pickupContact}
          onChangeText={(text) => updateFormField('pickupContact', text)}
          keyboardType="phone-pad"
        />
        {errors.pickupContact && <Text style={styles.errorText}>{errors.pickupContact}</Text>}
      </View>
      
      <View style={styles.locationDivider} />
      
      <View style={styles.locationSection}>
        <View style={styles.locationHeader}>
          <View style={[styles.locationDot, { backgroundColor: COLORS.secondary }]} />
          <Text style={styles.locationTitle}>Dropoff Location</Text>
        </View>
        
        <View
          style={[styles.locationInput, errors.dropoffLocation && styles.inputError]}
        >
          <Ionicons name="location-outline" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.locationTextInput}
            placeholder="Enter dropoff address"
            value={formData.dropoffLocation}
            onChangeText={(text) => updateFormField('dropoffLocation', text)}
          />
        </View>
        {errors.dropoffLocation && <Text style={styles.errorText}>{errors.dropoffLocation}</Text>}
        
        <TextInput
          style={[styles.contactInput, errors.dropoffContact && styles.inputError]}
          placeholder="Dropoff contact phone (e.g., 0911234567)"
          value={formData.dropoffContact}
          onChangeText={(text) => updateFormField('dropoffContact', text)}
          keyboardType="phone-pad"
        />
        {errors.dropoffContact && <Text style={styles.errorText}>{errors.dropoffContact}</Text>}
      </View>
    </View>
  );
  
  const renderPaymentDetails = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Payment Details</Text>
      
      <View style={styles.deliverySummary}>
        <Text style={styles.summaryTitle}>Delivery Summary</Text>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Package Size</Text>
          <Text style={styles.summaryValue}>
            {formData.packageSize.charAt(0).toUpperCase() + formData.packageSize.slice(1)}
          </Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Distance</Text>
          <Text style={styles.summaryValue}>{distance ? `${distance} km` : 'Calculating...'}</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Estimated Time</Text>
          <Text style={styles.summaryValue}>{distance ? `${Math.ceil(distance * 5)} min` : '30-45 min'}</Text>
        </View>
        
        <View style={[styles.summaryItem, styles.totalItem]}>
          <Text style={styles.totalLabel}>Total Fee</Text>
          <Text style={styles.totalValue}>ETB {formData.deliveryFee.toFixed(2)}</Text>
        </View>
      </View>
      
      <Text style={styles.sectionTitle}>Payment Method</Text>
      <View style={styles.paymentMethodsContainer}>
        {[
          { id: 'wallet', label: 'Wallet', icon: 'wallet-outline' },
          { id: 'cash', label: 'Cash', icon: 'cash-outline' },
          { id: 'yenepay', label: 'YenePay', icon: 'card-outline' },
          { id: 'telebirr', label: 'TeleBirr', icon: 'phone-portrait-outline' },
        ].map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.paymentMethodItem,
              formData.paymentMethod === item.id && styles.paymentMethodItemSelected,
              errors.paymentMethod && styles.inputError,
            ]}
            onPress={() => updateFormField('paymentMethod', item.id)}
          >
            <Ionicons
              name={item.icon as any}
              size={24}
              color={formData.paymentMethod === item.id ? COLORS.primary : COLORS.textLight}
            />
            <Text
              style={[
                styles.paymentMethodLabel,
                formData.paymentMethod === item.id && styles.paymentMethodLabelSelected,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.paymentMethod && <Text style={styles.errorText}>{errors.paymentMethod}</Text>}
    </View>
  );
  
  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <View
            style={[
              styles.stepDot,
              currentStep >= step && styles.stepDotActive,
              currentStep === step && styles.stepDotCurrent,
            ]}
          >
            {currentStep > step ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text style={styles.stepDotText}>{step}</Text>
            )}
          </View>
          {step < 3 && (
            <View
              style={[
                styles.stepLine,
                currentStep > step && styles.stepLineActive,
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
  
  // Handle back navigation - works on both web and mobile
  const handleBackNavigation = () => {
    if (currentStep > 0) {
      handlePreviousStep();
    } else {
      // Go back to home screen or previous screen
      router.back();
    }
  };

  return (
    <WebLayout>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBackNavigation}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Delivery</Text>
        <View style={{ width: 24 }} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView style={styles.container}>
          
          {renderStepIndicator()}
          
          {currentStep === 1 && renderPackageDetails()}
          {currentStep === 2 && renderLocationDetails()}
          {currentStep === 3 && renderPaymentDetails()}
          
          <View style={styles.buttonContainer}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handlePreviousStep}
                disabled={loading}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNextStep}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.nextButtonText}>
                  {currentStep === 3 ? 'Create Delivery' : 'Next'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepDotCurrent: {
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  stepDotText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#ddd',
    marginHorizontal: 5,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary,
  },
  stepContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: COLORS.text,
  },
  packageSizeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  packageSizeItem: {
    width: '23%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageSizeItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '20',
  },
  packageSizeLabel: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textLight,
  },
  packageSizeLabelSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#f9f9f9',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  locationSection: {
    marginBottom: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#f9f9f9',
  },
  locationTextInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text,
  },
  contactInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#f9f9f9',
    marginTop: 8,
    height: 48,
  },
  locationDivider: {
    height: 20,
    width: 1,
    backgroundColor: '#ddd',
    marginLeft: 6,
    marginVertical: 8,
  },
  deliverySummary: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: COLORS.text,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  totalItem: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paymentMethodItem: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
  paymentMethodItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '20',
  },
  paymentMethodLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textLight,
  },
  paymentMethodLabelSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 32,
  },
  backButton: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  nextButton: {
    flex: 2,
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});