import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, radius, gbp } from '@br/shared';
import type { DecisionOption } from '@br/shared';
import { useTenant } from '../lib/tenant-provider';
import { getSignedUrl } from '../lib/signed-url';

interface Props {
  option: DecisionOption;
  selected: boolean;
  chosen: boolean;          // the option that was ultimately accepted
  readOnly: boolean;
  onSelect: () => void;
  onPreviewPhoto: (uri: string) => void;
}

export function OptionCard({
  option,
  selected,
  chosen,
  readOnly,
  onSelect,
  onPreviewPhoto,
}: Props) {
  const { palette } = useTenant();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!option.photo_storage_path) {
      setPhotoUrl(null);
      return;
    }
    (async () => {
      const url = await getSignedUrl(
        'update-photos',
        option.photo_storage_path!,
      );
      if (!cancelled) setPhotoUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [option.photo_storage_path]);

  const borderColour = chosen
    ? palette.success
    : selected
      ? palette.primary
      : palette.hairline;
  const borderWidth = chosen || selected ? 2 : 1;

  return (
    <Pressable
      onPress={readOnly ? undefined : onSelect}
      style={[
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: borderColour,
          borderWidth,
        },
      ]}
      android_ripple={readOnly ? undefined : { color: palette.primarySoft }}
    >
      {photoUrl && (
        <TouchableOpacity
          onPress={() => onPreviewPhoto(photoUrl)}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: photoUrl }}
            style={styles.photo}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>
      )}

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: palette.ink }]}>
              {option.label}
            </Text>
            {option.description && (
              <Text style={[styles.description, { color: palette.inkMuted }]}>
                {option.description}
              </Text>
            )}
          </View>
          {option.price_gbp_pence !== null &&
            option.price_gbp_pence !== undefined && (
              <View style={styles.priceColumn}>
                <Text style={[styles.price, { color: palette.ink }]}>
                  {gbp(option.price_gbp_pence)}
                </Text>
              </View>
            )}
        </View>

        {chosen && (
          <View
            style={[
              styles.chosenBadge,
              { backgroundColor: palette.successSoft },
            ]}
          >
            <Ionicons name="checkmark-circle" size={14} color={palette.success} />
            <Text style={[styles.chosenText, { color: palette.success }]}>
              Chosen by the client
            </Text>
          </View>
        )}
        {!chosen && selected && !readOnly && (
          <View
            style={[
              styles.selectedBadge,
              { backgroundColor: palette.primarySoft },
            ]}
          >
            <Ionicons name="radio-button-on" size={14} color={palette.primary} />
            <Text style={[styles.selectedText, { color: palette.primary }]}>
              Selected — tap Accept below to confirm
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: '#eee',
  },
  body: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: typography.size.md,
    fontWeight: typography.weightBold as '700',
    lineHeight: 22,
  },
  description: {
    fontSize: typography.size.sm,
    marginTop: 4,
    lineHeight: 20,
  },
  priceColumn: {
    marginLeft: spacing.md,
  },
  price: {
    fontSize: typography.size.lg,
    fontWeight: typography.weightExtraBold as '800',
    letterSpacing: -0.3,
  },
  chosenBadge: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  chosenText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightBold as '700',
  },
  selectedBadge: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  selectedText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weightBold as '700',
  },
});
