import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native'

interface ErrorViewProps {
  /** True when the device has no network connectivity at all. */
  offline: boolean
  onRetry: () => void
}

/**
 * Full-screen fallback shown when the page fails to load or the device is
 * offline. Distinguishes "you're offline" from a generic load failure so the
 * message is actionable.
 */
export function ErrorView({ offline, onRetry }: ErrorViewProps) {
  const dark = useColorScheme() === 'dark'
  const fg = dark ? '#f5f5f5' : '#1a1a1a'
  const muted = dark ? '#a0a0a0' : '#666666'
  const bg = dark ? '#000000' : '#ffffff'

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.emoji]}>{offline ? '📡' : '⚠️'}</Text>
      <Text style={[styles.title, { color: fg }]}>
        {offline ? "You're offline" : "Couldn't load Otter"}
      </Text>
      <Text style={[styles.body, { color: muted }]}>
        {offline
          ? 'Check your connection and try again.'
          : 'Something went wrong reaching otter.zander.wtf.'}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  body: { fontSize: 16, marginBottom: 24, textAlign: 'center' },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
})
