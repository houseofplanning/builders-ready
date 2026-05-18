import { View, Text, StyleSheet } from 'react-native';
import { palette, typography, spacing } from '@br/shared';

/**
 * Placeholder root screen — replaced by an auth gate in Sprint 0 Day 3.
 */
export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>BUILDERS READY</Text>
      <Text style={styles.tag}>The client portal for UK builders</Text>
      <View style={styles.divider} />
      <Text style={styles.body}>
        Sprint 0 scaffold. Auth, tenant resolution, and tabs land next.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  brand: {
    fontWeight: typography.weightExtraBold as '800',
    fontSize: typography.size.lg,
    letterSpacing: typography.trackingWide,
    color: palette.ink,
  },
  tag: {
    marginTop: spacing.xs,
    color: palette.inkMuted,
    fontSize: typography.size.sm,
  },
  divider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.primary,
    marginVertical: spacing.lg,
  },
  body: {
    color: palette.inkMuted,
    fontSize: typography.size.body,
    textAlign: 'center',
    maxWidth: 280,
  },
});
