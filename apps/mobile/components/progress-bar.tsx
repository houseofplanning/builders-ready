import { View, StyleSheet } from 'react-native';
import { useTenant } from '../lib/tenant-provider';

/**
 * Branded gradient progress bar (primary → accent). RN doesn't ship a
 * native linear-gradient, so we fake it with two stacked layers.
 */
export function ProgressBar({
  percent,
  height = 8,
}: {
  percent: number;
  height?: number;
}) {
  const { palette } = useTenant();
  const safe = Math.max(0, Math.min(100, percent));
  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: palette.hairline },
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${safe}%`,
            height,
            borderRadius: height / 2,
            backgroundColor: palette.primary,
          },
        ]}
      />
      <View
        style={[
          styles.accentOverlay,
          {
            width: `${safe}%`,
            height,
            borderRadius: height / 2,
            opacity: 0.5,
            backgroundColor: palette.accent,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  accentOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
