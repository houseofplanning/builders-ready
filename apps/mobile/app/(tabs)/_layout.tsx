import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { palette as defaultPalette, typography } from '@br/shared';
import { useTenant } from '../../lib/tenant-provider';
import { useCurrentProject } from '../../lib/current-project';
import { TenantHeader } from '../../components/tenant-header';

// NOTE: CurrentProjectProvider lives in app/_layout.tsx so the modal route
// `compose-update` (which is a sibling of (tabs), not a child) can also
// read the current project. Don't reintroduce it here.
export default function TabsLayout() {
  const { palette } = useTenant();
  const { selectedId } = useCurrentProject();

  // Hide the tab bar entirely when no project is selected. The Home tab in
  // that state renders the project grid; the other tabs only make sense
  // once you're inside a project.
  const tabBarHidden = !selectedId;

  return (
    <View style={styles.shell}>
      <TenantHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: palette.primary,
          tabBarInactiveTintColor: defaultPalette.inkMuted,
          tabBarStyle: tabBarHidden
            ? { display: 'none' }
            : {
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
            letterSpacing: 0.2,
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
          name="timeline"
          options={{
            title: 'Timeline',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="git-branch-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="updates"
          options={{
            title: 'Updates',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="camera-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="decisions"
          options={{
            title: 'Decisions',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="checkbox-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="ellipsis-horizontal" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: defaultPalette.canvas,
  },
});
