import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppState, Platform, View, Text, StyleSheet } from 'react-native';
import { palette, typography } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { countCustomerUnread } from '../../lib/marketplace';

function useCustomerUnread() {
  const { user_id } = useTenant();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!user_id) return;
    let active = true;
    const tick = () => {
      countCustomerUnread(user_id)
        .then((n) => active && setCount(n))
        .catch(() => null);
    };
    tick();
    const interval = setInterval(tick, 15000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      active = false;
      clearInterval(interval);
      sub.remove();
    };
  }, [user_id]);
  return count;
}

export default function CustomerLayout() {
  const unread = useCustomerUnread();
  return (
    <Tabs
      // The customer detail screens (job, request, thread, project, …) are
      // hidden tabs, so without this, pressing Back from any of them returns to
      // the first tab (Home) instead of the previous screen. 'history' makes
      // Back return to the last-visited screen, so navigation feels like a stack.
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.inkMuted,
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopColor: palette.hairline,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 22 : 10,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarLabelStyle: {
          fontSize: typography.size.xs,
          fontWeight: typography.weightSemibold as '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'My Jobs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="chatbubbles-outline" size={size} color={color} />
              {unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="browse" options={{ href: null }} />
      <Tabs.Screen name="post" options={{ href: null }} />
      <Tabs.Screen name="thread/[id]" options={{ href: null }} />
      <Tabs.Screen name="project-chat/[id]" options={{ href: null }} />
      <Tabs.Screen name="quote/[id]" options={{ href: null }} />
      <Tabs.Screen name="request/[id]" options={{ href: null }} />
      <Tabs.Screen name="job/[id]" options={{ href: null }} />
      <Tabs.Screen name="project/[id]" options={{ href: null }} />
      <Tabs.Screen name="review/[projectId]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: typography.weightBold as '700' },
});
