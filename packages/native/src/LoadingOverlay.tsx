import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { BACKGROUND_COLOR } from './config'

/**
 * Opaque overlay shown on top of the WebView until the first page paints.
 * Being opaque (not translucent) is what prevents the white flash on a cold
 * launch — the WebView is blank until content loads, so we cover it.
 */
export function LoadingOverlay() {
  return (
    <View style={styles.container} pointerEvents="none">
      <ActivityIndicator size="large" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
    justifyContent: 'center',
  },
})
