import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTenant } from '../lib/tenant-provider';

/**
 * The My Builder <-> For Hire switch. Builder mode is the project-centric app;
 * For Hire mode is where other builders' work and your hireable profile live.
 * Only shown to tenants (owner/pm) — clients and customers don't have it.
 */
export function ProfileToggle({ mode }: { mode: 'builder' | 'forhire' }) {
  const router = useRouter();
  const { palette } = useTenant();

  return (
    <View style={[styles.wrap, { backgroundColor: palette.canvas, borderColor: palette.hairline }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => mode !== 'builder' && router.replace('/')}
        style={[styles.seg, mode === 'builder' && { backgroundColor: palette.primary }]}
      >
        <Text style={[styles.segText, { color: mode === 'builder' ? '#fff' : palette.inkMuted }]}>My Builder</Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => mode !== 'forhire' && router.push('/for-hire')}
        style={[styles.seg, mode === 'forhire' && { backgroundColor: palette.primary }]}
      >
        <Text style={[styles.segText, { color: mode === 'forhire' ? '#fff' : palette.inkMuted }]}>For Hire</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: 999, borderWidth: 1, padding: 3, marginBottom: 14, alignSelf: 'stretch' },
  seg: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
  segText: { fontSize: 13, fontWeight: '700' },
});
