import { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  PROJECT_TEMPLATES,
  spacing,
  typography,
  radius,
  type ProjectTemplate,
} from '@br/shared';
import { useTenant } from '../lib/tenant-provider';

/**
 * Searchable project-type picker. Tap to open a full-screen searchable list of
 * trades / job types; picking one seeds that timeline when the quote converts.
 */
export function TemplatePicker({
  value,
  onChange,
  label = 'Type of work',
}: {
  value: string;
  onChange: (key: string) => void;
  label?: string;
}) {
  const { palette } = useTenant();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = PROJECT_TEMPLATES.find((t) => t.key === value);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: ProjectTemplate[] = q
      ? PROJECT_TEMPLATES.filter((t) =>
          `${t.label} ${t.group} ${(t.keywords ?? []).join(' ')}`
            .toLowerCase()
            .includes(q),
        )
      : [...PROJECT_TEMPLATES];
    const out: Record<string, ProjectTemplate[]> = {};
    for (const t of list) (out[t.group] ??= []).push(t);
    return out;
  }, [query]);

  return (
    <>
      <Text style={[styles.label, { color: palette.inkMuted }]}>{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          { borderColor: palette.hairline, backgroundColor: palette.card },
        ]}
      >
        <Text
          style={{
            fontSize: typography.size.body,
            color: selected ? palette.ink : palette.inkMuted,
          }}
        >
          {selected ? selected.label : 'Choose a project type'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={palette.inkMuted} />
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: palette.canvas }}
          edges={['top', 'bottom']}
        >
          <View
            style={[
              styles.header,
              { borderBottomColor: palette.hairline, backgroundColor: palette.card },
            ]}
          >
            <Text style={[styles.headerTitle, { color: palette.ink }]}>
              Project type
            </Text>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={26} color={palette.ink} />
            </TouchableOpacity>
          </View>

          <View style={{ padding: spacing.lg }}>
            <View
              style={[
                styles.search,
                { borderColor: palette.hairline, backgroundColor: palette.card },
              ]}
            >
              <Ionicons name="search" size={18} color={palette.inkMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search trades & job types…"
                placeholderTextColor={palette.inkMuted}
                autoFocus
                style={{
                  flex: 1,
                  marginLeft: 8,
                  fontSize: typography.size.body,
                  color: palette.ink,
                }}
              />
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
            {Object.keys(groups).length === 0 ? (
              <Text style={{ color: palette.inkMuted, textAlign: 'center', marginTop: spacing.xl }}>
                No match. Pick “Custom” to build your own timeline.
              </Text>
            ) : (
              Object.entries(groups).map(([group, items]) => (
                <View key={group} style={{ marginBottom: spacing.md }}>
                  <Text style={[styles.groupLabel, { color: palette.inkMuted }]}>
                    {group}
                  </Text>
                  {items.map((t) => {
                    const isSel = t.key === value;
                    const steps =
                      t.stages.length === 0
                        ? 'Custom'
                        : `${t.stages.length} step${t.stages.length === 1 ? '' : 's'}`;
                    return (
                      <TouchableOpacity
                        key={t.key}
                        onPress={() => {
                          onChange(t.key);
                          setOpen(false);
                          setQuery('');
                        }}
                        style={[
                          styles.row,
                          {
                            backgroundColor: isSel ? palette.primarySoft : palette.card,
                            borderColor: isSel ? palette.primary : palette.hairline,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            flex: 1,
                            fontSize: typography.size.body,
                            fontWeight: isSel
                              ? (typography.weightBold as '700')
                              : (typography.weightMedium as '500'),
                            color: isSel ? palette.primary : palette.ink,
                          }}
                        >
                          {t.label}
                        </Text>
                        <Text style={{ fontSize: typography.size.xs, color: palette.inkMuted }}>
                          {steps}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: typography.weightSemibold as '600',
    marginBottom: 6,
    marginTop: spacing.md,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  groupLabel: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: typography.weightSemibold as '600',
    marginTop: spacing.sm,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
});
