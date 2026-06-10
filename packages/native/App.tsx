import NetInfo from '@react-native-community/netinfo'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Linking, Platform, StyleSheet, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import type { WebViewNavigation } from 'react-native-webview/lib/WebViewTypes'

import { syncToAppGroup } from './modules/cookie-bridge'
import { BACKGROUND_COLOR, isOtterUrl, OTTER_URL } from './src/config'
import { ErrorView } from './src/ErrorView'
import { LoadingOverlay } from './src/LoadingOverlay'

export default function App() {
  const webViewRef = useRef<WebView>(null)
  // Loading is true until the first page settles (success or error).
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)
  const [offline, setOffline] = useState(false)

  const reload = useCallback(() => {
    setErrored(false)
    setLoading(true)
    webViewRef.current?.reload()
  }, [])

  // Push the current session cookies into the shared App Group so the share
  // extension can reuse the logged-in session. Fire-and-forget; no-op if the
  // native module / App Group isn't available.
  const syncCookies = useCallback(() => {
    syncToAppGroup().catch(() => {})
  }, [])

  // Sync again whenever the app goes to the background — captures any login
  // that happened during the session right before the user shares from another
  // app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        syncCookies()
      }
    })
    return () => sub.remove()
  }, [syncCookies])

  // Track connectivity so we can show a dedicated offline state and auto-recover
  // when the connection returns while the error screen is up.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOffline = state.isConnected === false
      setOffline(isOffline)
      // Reconnected while showing an error → retry automatically.
      if (!isOffline && errored) {
        reload()
      }
    })
    return unsubscribe
  }, [errored, reload])

  // Open external (non-Otter) links the user *taps* in the system browser, so
  // they don't get trapped in the WebView. OAuth/login redirects are NOT user
  // taps (navigationType !== 'click'), so they stay in the WebView and complete.
  const handleShouldStartLoad = useCallback(
    (request: WebViewNavigation): boolean => {
      const { url, navigationType } = request

      // Always hand non-http(s) schemes (mailto:, tel:, maps:, etc.) to the OS.
      if (!/^https?:\/\//i.test(url)) {
        Linking.openURL(url).catch(() => {})
        return false
      }

      if (navigationType === 'click' && !isOtterUrl(url)) {
        Linking.openURL(url).catch(() => {})
        return false
      }
      return true
    },
    [],
  )

  const handleLoadEnd = useCallback(() => {
    setLoading(false)
    // A finished navigation may have completed a login → mirror cookies.
    syncCookies()
  }, [syncCookies])

  const handleError = useCallback(() => {
    setErrored(true)
    setLoading(false)
  }, [])

  // Treat server errors (5xx) and hard 404s on the top frame as failures too.
  const handleHttpError = useCallback(
    (event: { nativeEvent: { statusCode: number; url: string } }) => {
      const { statusCode, url } = event.nativeEvent
      if (url.startsWith(OTTER_URL) && statusCode >= 500) {
        handleError()
      }
    },
    [handleError],
  )

  const showError = errored || offline

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.container}>
          {!showError && (
            <WebView
              ref={webViewRef}
              source={{ uri: OTTER_URL }}
              style={styles.webView}
              // Match the brand bg so the WebView itself never flashes white.
              containerStyle={styles.webView}
              // --- Persistent cookies / auth across app restarts ---
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              // --- External link handling ---
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              setSupportMultipleWindows={false}
              // --- Loading / error states ---
              onLoadStart={() => setLoading(true)}
              onLoadEnd={handleLoadEnd}
              onError={handleError}
              onHttpError={handleHttpError}
              // --- Behaviour ---
              allowsBackForwardNavigationGestures
              originWhitelist={['https://*', 'http://*']}
              decelerationRate="normal"
              // iPad: allow inline media, modern UA so the web app serves its
              // full responsive layout.
              allowsInlineMediaPlayback
              automaticallyAdjustContentInsets={false}
              pullToRefreshEnabled={Platform.OS === 'ios'}
            />
          )}
          {loading && !showError && <LoadingOverlay />}
          {showError && <ErrorView offline={offline} onRetry={reload} />}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: BACKGROUND_COLOR, flex: 1 },
  safeArea: { backgroundColor: BACKGROUND_COLOR, flex: 1 },
  webView: { backgroundColor: BACKGROUND_COLOR, flex: 1 },
})
