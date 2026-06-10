import { registerRootComponent } from 'expo'

import App from './App'

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
// and ensures the environment is set up appropriately for both Expo Go and
// native (bare/dev-client) builds.
registerRootComponent(App)
