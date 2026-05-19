import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  spacing,
  typography,
  radius,
  palette as defaultPalette,
} from '@br/shared';
import { useCurrentProject } from '../lib/current-project';
import { useTenant } from '../lib/tenant-provider';

/**
 * Tappable project name + chevron. If the user has only one project, the
 * chevron is hidden and tapping does nothing. With multiple projects, it
 * opens a bottom-sheet-style modal listing all projects.
 */
export function ProjectPickerButton() {
  const { projects, selectedId, setSelectedId, current } = useCurrentProject();
  const { palette } = useTenant();
  const [open, setOpen] = useState(false);

  if (!current) return null;
  const multiple = projects.length > 1;

  return (
    <>
      <TouchableOpacity
        onPress={() => multiple && setOpen(true)}
        activeOpacity={multiple ? 0.6 : 1}
        style={styles.button}
      >
        <View style={styles.brandColumn}>
          <Text style={[styles.eyebrow, { color: palette.inkMuted }]}>
            PROJECT
          </Text>
          <Text style={[styles.name, { color: palette.ink }]} numberOfLines={1}>
            {current.project.name}
          </Text>
        </View>
        {multiple && (
          <Ionicons
            name="chevron-down"
            size={18}
            color={palette.inkMuted}
            style={{ marginLeft: spacing.sm }}
          />
        )}
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <View style={[styles.sheet, { backgroundColor: palette.canvas }]}>
          <View
            style={[
              styles.sheetHeader,
              { borderBottomColor: palette.hairline },
            ]}
          >
            <Text style={[styles.sheetTitle, { color: palette.ink }]}>
              Switch project
            </Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Ionicons name="close" size={26} color={palette.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {projects.map((p) => {
              const isActive = p.id === selectedId;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setSelectedId(p.id);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: pressed
                        ? palette.primarySoft
                        : palette.card,
                      borderBottomColor: palette.hairline,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.rowName,
                        {
                          color: palette.ink,
                          fontWeight: isActive
                            ? typography.weightExtraBold
                            : typography.weightSemibold,
                        },
                      ]}
                    >
                      {p.name}
                    </Text>
                    <Text style={[styles.rowSub, { color: palette.inkMuted }]}>
                      {p.city} · {p.postcode} · {p.progress_percent}% complete
                    </Text>
                  </View>
                  {isActive && (
                    <Ionicons
                      name="checkmark"
                      size={22}
                      color={palette.primary}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  brandColumn: { flex: 1 },
  eyebrow: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightSemibold as '600',
    letterSpacing: 1,
  },
  name: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  sheet: { flex: 1 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    flex: 1,
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
  },
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  rowName: {
    fontSize: typography.size.body,
  },
  rowSub: {
    fontSize: typography.size.xs,
    color: defaultPalette.inkMuted,
    marginTop: 2,
  },
});
