// Metro config tuned for this pnpm monorepo.
// pnpm stores deps as symlinks under a shared store, so Metro must:
//   1. watch the repo root (to see the workspace + hoisted store), and
//   2. resolve modules from both the package and the root node_modules.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// 1. Watch all files in the monorepo.
config.watchFolders = [workspaceRoot]

// 2. Resolve from the package first, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// pnpm symlinks: let Metro follow them rather than treating each as a package
// boundary.
config.resolver.unstable_enableSymlinks = true
config.resolver.disableHierarchicalLookup = false

module.exports = config
