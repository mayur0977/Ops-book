// Metro, made monorepo-aware.
//
// Three separate things have to be true for a physical-device build to work,
// and each of them fails silently in a different way:
//
// 1. The workspace root is WATCHED, or an edit in packages/contracts never
//    triggers a reload.
// 2. Both node_modules folders are searched. `nodeLinker: hoisted` in
//    pnpm-workspace.yaml puts most things at the root; this covers the rest.
// 3. Relative `.js` specifiers inside the shared TypeScript packages resolve.
//    See resolveRequest below — this is the one that bites.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;

/**
 * @daybook/contracts and @daybook/core are consumed as TypeScript source with
 * no build step, and their tsconfig is NodeNext — which *requires* relative
 * imports to carry a `.js` extension even though the file on disk is `.ts`.
 * The API needs that; Metro cannot resolve it, because bundler resolution
 * expects the specifier to be extensionless.
 *
 * Rather than force one convention on both consumers, the specifier is
 * rewritten here on the way in. Dropping the extension and letting Metro's own
 * `sourceExts` find the `.ts` file keeps both toolchains honest.
 *
 * The alternative — extensionless imports in the shared packages — breaks
 * `tsc` and the API's Node ESM runtime, so it is not an option.
 */
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isRelative = moduleName.startsWith('./') || moduleName.startsWith('../');
  if (isRelative && moduleName.endsWith('.js')) {
    try {
      return context.resolveRequest(
        context,
        moduleName.slice(0, -'.js'.length),
        platform,
      );
    } catch {
      // A genuine .js file on disk. Fall through to the normal resolver rather
      // than turning a real module into a confusing rewrite failure.
    }
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
