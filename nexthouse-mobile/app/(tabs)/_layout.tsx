import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

export default function TabLayout() {
  const notifCount = useAppSelector(s => s.notif.unreadCount);
  const chatCount  = useAppSelector(s => s.chat.totalUnread);
  const insets     = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border, height: 56 + insets.bottom, paddingBottom: insets.bottom + 4, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index"         options={{ title: 'Feed',          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="explore"       options={{ title: 'Explore',       tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="chat"          options={{ title: 'Chat',          tabBarIcon: ({ color, size, focused }) => (
        <View><Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={color} /><Badge count={chatCount} /></View>
      )}} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts',        tabBarIcon: ({ color, size, focused }) => (
        <View><Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={size} color={color} /><Badge count={notifCount} /></View>
      )}} />
      <Tabs.Screen name="profile"       options={{ title: 'Profile',       tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge:     { position: 'absolute', top: -4, right: -8, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
