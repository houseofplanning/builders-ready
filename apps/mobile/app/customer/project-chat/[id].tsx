import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { palette } from '@br/shared';
import { getCustomerProject, type ProjectHeader } from '../../../lib/marketplace';
import { ProjectChat } from '../../../components/project-chat';

export default function CustomerProjectChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<ProjectHeader | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (id) setProject(await getCustomerProject(id));
      setLoading(false);
    })();
  }, [id]);

  if (loading || !project) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.canvas }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={palette.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return <ProjectChat projectId={project.id} tenantId={project.tenant_id} title={project.trade_name} />;
}
