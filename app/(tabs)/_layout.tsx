import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    height: Platform.OS === 'ios' ? 88 : 60,
    paddingBottom: Platform.OS === 'ios' ? 34 : 8,
    paddingTop: 8,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

// Determine if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

export default function TabLayout() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // Only run this effect in the browser, not during SSR
  useEffect(() => {
    // Skip if not in browser or no user
    if (!isBrowser || !user) return;

    let mounted = true;
    let channel: any = null;

    const setupRealtime = async () => {
      try {
        // Initial fetch of unread messages
        const { count, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('read', false);
        
        if (error) {
          console.error('Error fetching unread count:', error);
          return;
        }

        if (mounted) {
          setUnreadCount(count || 0);
        }

        // Subscribe to real-time updates
        channel = supabase
          .channel('unread_messages')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
              filter: `receiver_id=eq.${user.id}`,
            },
            (payload) => {
              if (!mounted) return;
              
              if (payload.eventType === 'INSERT') {
                setUnreadCount(prev => prev + 1);
              } else if (payload.eventType === 'UPDATE') {
                const newMessage = payload.new as { read: boolean };
                if (newMessage.read) {
                  setUnreadCount(prev => Math.max(0, prev - 1));
                }
              }
            }
          )
          .subscribe((status) => {
            if (status !== 'SUBSCRIBED') {
              console.warn('Failed to subscribe to realtime changes:', status);
            }
          });
      } catch (error) {
        console.error('Error setting up realtime:', error);
      }
    };

    // Safe to run in browser environment
    setupRealtime();

    return () => {
      mounted = false;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.error('Error removing channel:', error);
        }
      }
    };
  }, [user, isBrowser]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: styles.tabBar,
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#333333',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="new-delivery"
        options={{
          title: 'Send',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="truck" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="orders/index"
        options={{
          title: 'My Orders',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialIcons name="inventory" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="orders/[id]"
        options={{
          title: 'Parcel Detail',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialIcons name="list" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <View>
              <Ionicons name="chatbubble-outline" size={size} color={color} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
