import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, spacing, typography } from '@br/shared';
import { ProfileToggle } from '../../components/profile-toggle';
import { ConnThreadList } from '../../components/conn-thread-list';

export default function ForHireMessages() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.sub}>Chats with builders who hire you</Text>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <ProfileToggle mode="forhire" />
      </View>
      <View style={{ flex: 1 }}>
        <ConnThreadList side="sub" emptyHint="When a builder messages you — or you message them from a job — the chat shows here." />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: typography.size.xl, fontWeight: typography.weightBold as '700', color: palette.ink },
  sub: { fontSize: typography.size.sm, color: palette.inkMuted, marginTop: 2 },
});
