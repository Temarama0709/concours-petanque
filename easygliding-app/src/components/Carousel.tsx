import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';

import { CAROUSEL_INTERVAL_MS, colors } from '@/config/app';
import { Button } from './ui';

export interface Slide {
  key: string;
  title: string;
  color: string;
}

/**
 * F05 — Carrousel du tiers supérieur : défilement automatique (~4 s)
 * et manuel, puis une dernière vignette avec un bouton d'achat.
 */
export function Carousel({
  slides,
  height,
  buyTitle,
  buyLabel,
  onBuy,
}: {
  slides: Slide[];
  height: number;
  buyTitle: string;
  buyLabel: string;
  onBuy?: () => void;
}) {
  const { width } = useWindowDimensions();
  const ref = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length + 1;

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % total;
        ref.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused, total, width]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
    setPaused(false);
  };

  return (
    <View style={{ height }}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => setPaused(true)}
        onMomentumScrollEnd={onMomentumEnd}
      >
        {slides.map((slide) => (
          <View key={slide.key} style={[styles.slide, { width, backgroundColor: slide.color }]}>
            <Text style={styles.title}>{slide.title}</Text>
          </View>
        ))}
        <View style={[styles.slide, { width, backgroundColor: colors.primaryDark }]}>
          <Text style={styles.title}>{buyTitle}</Text>
          {onBuy && <Button title={buyLabel} onPress={onBuy} style={{ marginTop: 16, backgroundColor: colors.accent }} />}
        </View>
      </ScrollView>
      <View style={styles.dots}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  dots: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff' },
});
