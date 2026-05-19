import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius } from '@br/shared';
import { getSignedUrl } from '../lib/signed-url';
import { useTenant } from '../lib/tenant-provider';
import { PhotoViewer } from './photo-viewer';

interface Photo {
  id: string;
  storage_path: string;
  width: number;
  height: number;
}

/**
 * Grid of up-to-10 photo thumbnails. Tap a thumbnail to open the
 * fullscreen viewer.
 */
export function PhotoGrid({ photos }: { photos: Photo[] }) {
  const { palette } = useTenant();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [viewerStart, setViewerStart] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        photos.map(async (p) => {
          const url = await getSignedUrl('update-photos', p.storage_path);
          if (url) next[p.id] = url;
        }),
      );
      if (!cancelled) setUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [photos]);

  if (photos.length === 0) return null;

  // Tile size: 3-up grid with 6px gaps, minus the card horizontal padding.
  const cardPad = spacing.lg * 2;
  const gap = 6;
  const tile = Math.floor(
    (Dimensions.get('window').width - cardPad - gap * 2) / 3,
  );

  return (
    <>
      <View style={styles.grid}>
        {photos.slice(0, 9).map((p, i) => (
          <TouchableOpacity
            key={p.id}
            activeOpacity={0.7}
            onPress={() => setViewerStart(i)}
            style={[
              styles.tile,
              {
                width: tile,
                height: tile,
                backgroundColor: palette.hairline,
              },
            ]}
          >
            {urls[p.id] ? (
              <Image
                source={{ uri: urls[p.id] }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
            ) : (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  styles.placeholder,
                  { backgroundColor: palette.canvas },
                ]}
              >
                <Ionicons
                  name="image-outline"
                  size={24}
                  color={palette.inkMuted}
                />
              </View>
            )}
            {photos.length > 9 && i === 8 && (
              <View style={styles.moreOverlay}>
                <View style={styles.moreText}>
                  <Ionicons name="add" size={18} color="#fff" />
                </View>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {viewerStart !== null && (
        <PhotoViewer
          photos={photos}
          urls={urls}
          startIndex={viewerStart}
          onClose={() => setViewerStart(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  tile: {
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,20,24,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
