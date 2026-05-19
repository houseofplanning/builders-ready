import { StyleSheet } from 'react-native';
import type { TenantPalette } from '@br/shared';
import { radius, spacing, typography } from '@br/shared';

/**
 * Build a memoised stylesheet from a tenant palette. Components call:
 *   const styles = makeStyles(palette);
 * inside a useMemo keyed on palette so the styles object identity is
 * stable per palette.
 *
 * Keeping styling helpers here means screens don't have to import the
 * raw tokens — they get a typed palette + helpers.
 */
export const tokens = { radius, spacing, typography };

export function makeButtonStyles(palette: TenantPalette) {
  return StyleSheet.create({
    primary: {
      backgroundColor: palette.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryText: {
      color: '#FFFFFF',
      fontSize: typography.size.md,
      fontWeight: typography.weightSemibold as '600',
    },
    ghost: {
      backgroundColor: palette.card,
      borderColor: palette.hairline,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostText: {
      color: palette.ink,
      fontSize: typography.size.body,
      fontWeight: typography.weightSemibold as '600',
    },
  });
}

export function tenantInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
