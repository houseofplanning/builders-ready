import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  palette as defaultPalette,
  spacing,
  typography,
} from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { tenantInitials } from '../lib/theme';

/**
 * Branded header shown above every tab. Reflects the tenant's logo,
 * name, and role. Falls back to the BR placeholder if no tenant resolved.
 */
export function TenantHeader() {
  const { tenant, role, palette } = useTenant();

  return (
    <SafeAreaView
      edges={['top']}
      style={{ backgroundColor: palette.card }}
    >
      <View
        style={[
          styles.bar,
          {
            borderBottomColor: palette.hairline,
            backgroundColor: palette.card,
          },
        ]}
      >
        {tenant?.logo_url ? (
          <Image
            source={{ uri: tenant.logo_url }}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : (
          <View
            style={[styles.crest, { backgroundColor: palette.primary }]}
          >
            <Text style={styles.crestText}>
              {tenant ? tenantInitials(tenant.name) : 'BR'}
            </Text>
          </View>
        )}
        <View style={styles.identity}>
          <Text style={styles.name}>{tenant?.name ?? 'Builders Ready'}</Text>
          {role && (
            <Text style={[styles.role, { color: palette.inkMuted }]}>
              {role === 'owner'
                ? 'Owner'
                : role === 'pm'
                  ? 'Project Manager'
                  : 'Client'}
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  crest: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestText: {
    color: '#fff',
    fontSize: typography.size.body,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: 1.5,
    // RN doesn't honour textTransform here on iOS reliably for letter-spacing
    ...(Platform.OS === 'android' ? { textTransform: 'uppercase' } : {}),
  },
  identity: {
    marginLeft: spacing.md,
    flex: 1,
  },
  name: {
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
    color: defaultPalette.ink,
    letterSpacing: 0.3,
  },
  role: {
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
    fontWeight: typography.weightSemibold as '600',
  },
});
