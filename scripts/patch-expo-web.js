const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const nodeModulesRoot = path.join(projectRoot, 'node_modules');

function patchFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    return { filePath, patched: false, reason: 'missing' };
  }

  const original = fs.readFileSync(filePath, 'utf8');
  let updated = original;
  let patched = false;

  for (const { from, to } of replacements) {
    if (updated.includes(from)) {
      updated = updated.replace(from, to);
      patched = true;
    }
  }

  if (patched && updated !== original) {
    fs.writeFileSync(filePath, updated);
  }

  return { filePath, patched };
}

const patches = [
  {
    filePath: path.join(
      nodeModulesRoot,
      '@expo',
      'cli',
      'build',
      'src',
      'start',
      'server',
      'metro',
      'createExpoFallbackResolver.js',
    ),
    replacements: [
      {
        from: "    packageMeta = typeof context.getPackage === 'function' ? context.getPackage(filePath) : null;\n",
        to: "    packageMeta = typeof (context == null ? void 0 : context.getPackage) === 'function' ? context.getPackage(filePath) : null;\n",
      },
      {
        from: '    return function requestFallbackModule() {\n        return null;\n    };\n',
        to: '',
      },
    ],
  },
  {
    filePath: path.join(nodeModulesRoot, 'metro-resolver', 'src', 'resolve.js'),
    replacements: [
      {
        from: '    const pkg = typeof context.getPackageForModule === "function" ? context.getPackageForModule(context.originModulePath) : null;\n',
        to: '    const pkg = typeof (context == null ? void 0 : context.getPackageForModule) === "function" ? context.getPackageForModule(context.originModulePath) : null;\n',
      },
      {
        from: '    packageJson: typeof context.getPackage === "function" ? context.getPackage(packageJsonPath) ?? {} : {},\n',
        to: '    packageJson: typeof (context == null ? void 0 : context.getPackage) === "function" ? context.getPackage(packageJsonPath) ?? {} : {},\n',
      },
    ],
  },
  {
    filePath: path.join(nodeModulesRoot, 'metro-resolver', 'src', 'PackageResolve.js'),
    replacements: [
      {
        from: '  const { getPackageForModule, mainFields, originModulePath } = context;\n',
        to: '  const { getPackageForModule, mainFields, originModulePath } = context ?? {};\n',
      },
    ],
  },
  {
    filePath: path.join(
      nodeModulesRoot,
      '@expo',
      'metro',
      'node_modules',
      'metro',
      'src',
      'node-haste',
      'DependencyGraph.js',
    ),
    replacements: [
      {
        from: '      getHasteModulePath: (name, platform) =>\n        this._hasteMap.getModule(name, platform, true),\n',
        to: '      getHasteModulePath: (name, platform) =>\n        this._hasteMap?.getModule(name, platform, true) ?? null,\n',
      },
      {
        from: '      getHastePackagePath: (name, platform) =>\n        this._hasteMap.getPackage(name, platform, true),\n',
        to: '      getHastePackagePath: (name, platform) =>\n        this._hasteMap?.getPackage(name, platform, true) ?? null,\n',
      },
    ],
  },
  {
    filePath: path.join(
      nodeModulesRoot,
      'metro',
      'src',
      'node-haste',
      'DependencyGraph.js',
    ),
    replacements: [
      {
        from: '      getHasteModulePath: (name, platform) =>\n        this._hasteMap.getModule(name, platform, true),\n',
        to: '      getHasteModulePath: (name, platform) =>\n        this._hasteMap?.getModule(name, platform, true) ?? null,\n',
      },
      {
        from: '      getHastePackagePath: (name, platform) =>\n        this._hasteMap.getPackage(name, platform, true),\n',
        to: '      getHastePackagePath: (name, platform) =>\n        this._hasteMap?.getPackage(name, platform, true) ?? null,\n',
      },
    ],
  },
];

const results = patches.map(({ filePath, replacements }) =>
  patchFile(filePath, replacements),
);

const patchedCount = results.filter((result) => result.patched).length;

if (patchedCount > 0) {
  console.log(`[patch-expo-web] Patched ${patchedCount} file(s).`);
}
