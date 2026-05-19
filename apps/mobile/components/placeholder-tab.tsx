import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, radius } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';

/**
 * Branded "this tab arrives next session" placeholder.
 */
export function PlaceholderTab({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { palette } = useTenant();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.canvas },
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: palette.primarySoft, borderColor: palette.primary },
        ]}
      >
        <Ionicons
          name="construct-outline"
          size={32}
          color={palette.primary}
        />
      </View>
      <Text style={[styles.title, { color: palette.ink }]}>{title}</Text>
      <Text style={[styles.description, { color: palette.inkMuted }]}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.size.body,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
});
