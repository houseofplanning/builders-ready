import { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Text,
  Dimensions,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, typography } from '@br/shared';

interface Photo {
  id: string;
  width: number;
  height: number;
}

/**
 * Fullscreen photo viewer with swipe-between-photos.
 *
 * Layout note: the top bar is a normal flex child above the FlatList, NOT
 * an absolute overlay. The earlier overlay-with-pointerEvents approach lost
 * touches to the paging FlatList's pan handler. Pressable + explicit
 * elevation/zIndex on the close button further hardens the hit test.
 */
export function PhotoViewer({
  photos,
  urls,
  startIndex,
  onClose,
}: {
  photos: Photo[];
  urls: Record<string, string>;
  startIndex: number;
  onClose: () => void;
}) {
  const { width, height } = Dimensions.get('window');
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  return (
    <Modal
      visible
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.backdrop} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Text style={styles.counter}>
            {currentIndex + 1} / {photos.length}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={20}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && styles.closeBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close photo viewer"
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.photoArea}>
          <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={photos}
            initialScrollIndex={startIndex}
            getItemLayout={(_, idx) => ({
              length: width,
              offset: width * idx,
              index: idx,
            })}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentIndex(idx);
            }}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <View style={{ width, height: height - 120 }}>
                {urls[item.id] ? (
                  <Image
                    source={{ uri: urls[item.id] }}
                    style={StyleSheet.absoluteFill}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={120}
                  />
                ) : (
                  <View style={styles.loadingState}>
                    <Text style={styles.loadingText}>Loading…</Text>
                  </View>
                )}
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    // Ensures the bar paints above the FlatList in case of any z-fighting.
    zIndex: 10,
    elevation: 10,
  },
  counter: {
    flex: 1,
    color: '#fff',
    fontSize: typography.size.body,
    fontWeight: typography.weightSemibold as '600',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  closeBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  photoArea: {
    flex: 1,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
  },
});
