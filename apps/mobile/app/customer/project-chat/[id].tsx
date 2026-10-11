import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { palette, spacing, typography, radius } from '@br/shared';
import { getCustomerProject, type ProjectHeader } from '../../../lib/marketplace';
import { ProjectChat } from '../../../components/project-chat';

export default function CustomerProjectChat() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<ProjectHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        setProject(await getCustomerProject(id));
        setLoadError(false);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={palette.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || !project) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Ionicons name="alert-circle-outline" size={44} color={palette.inkMuted} />
          <Text
            style={{
              color: palette.inkMuted,
              textAlign: 'center',
              marginTop: spacing.md,
              fontSize: typography.size.body,
            }}
          >
            Couldn&apos;t open this conversation. Please try again.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.85}
            style={{
              backgroundColor: palette.primary,
              borderRadius: radius.md,
              paddingHorizontal: spacing.xl,
              paddingVertical: 12,
              marginTop: spacing.lg,
            }}
          >
            <Text style={{ color: '#fff', fontSize: typography.size.body, fontWeight: typography.weightBold as '700' }}>
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return <ProjectChat projectId={project.id} tenantId={project.tenant_id} title={project.trade_name} />;
}
