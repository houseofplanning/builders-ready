import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { palette, spacing, typography } from '@br/shared';
import { ConnThreadList } from '../components/conn-thread-list';

export default function SubMessages() {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ marginRight: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={palette.ink} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Subcontractor messages</Text>
          <Text style={styles.sub}>Chats with tradespeople you've hired or considered</Text>
        </View>
      </View>
      <ConnThreadList side="builder" emptyHint="When you message a subcontractor, or one messages you, it shows here." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: typography.size.xl, fontWeight: typography.weightBold as '700', color: palette.ink },
  sub: { fontSize: typography.size.sm, color: palette.inkMuted, marginTop: 2 },
});
