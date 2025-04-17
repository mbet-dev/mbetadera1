import { Stack } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import Colors from '../../../constants/Colors';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Platform.OS === 'ios' ? undefined : Colors.light.background,
        },
        headerTintColor: Colors.light.primary,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="wallet"
        options={{
          headerTitle: 'Wallet',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="add-funds"
        options={{
          headerTitle: 'Add Funds',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="withdraw"
        options={{
          headerTitle: 'Withdraw',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          headerTitle: 'Edit Profile',
          headerShown: true,
        }}
      />
    </Stack>
  );
} 