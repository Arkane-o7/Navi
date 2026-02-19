const hasNotarizationSecrets = Boolean(
  process.env.APPLE_ID
    && process.env.APPLE_APP_SPECIFIC_PASSWORD
    && process.env.APPLE_TEAM_ID,
);

const macOsSignConfig = hasNotarizationSecrets
  ? {
      // Use Developer ID when release secrets are available.
      identity: process.env.APPLE_SIGN_IDENTITY || 'Developer ID Application',
      hardenedRuntime: true,
      entitlements: './entitlements.mac.plist',
      entitlementsInherit: './entitlements.mac.plist',
      'gatekeeper-assess': false,
    }
  : {
      // Local/dev fallback: ad-hoc signing.
      identity: '-',
    };

const macOsNotarizeConfig = hasNotarizationSecrets
  ? {
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    }
  : undefined;

module.exports = {
  packagerConfig: {
    name: 'Navi',
    executableName: 'navi',
    asar: true,
    icon: './assets/icon',  // Electron will look for icon.png, icon.ico, icon.icns
    appBundleId: 'com.navi.app',
    appCategoryType: 'public.app-category.productivity',
    darwinDarkModeSupport: true,
    // Production: Developer ID signing + notarization (when secrets are present).
    // Local/dev: ad-hoc signing fallback.
    osxSign: macOsSignConfig,
    osxNotarize: macOsNotarizeConfig,
    // Copy assets to resources folder for production tray icons
    extraResource: ['./assets'],
    // Register navi:// URL scheme for deep linking (OAuth callbacks)
    protocols: [
      {
        name: 'Navi',
        schemes: ['navi']
      }
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'Navi',
        authors: 'Arkane-o7',
        iconUrl: 'https://raw.githubusercontent.com/Arkane-o7/Navi/main/apps/electron/assets/icon.ico',
        setupIcon: './assets/icon.ico',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'Navi',
        icon: './assets/icon.icns',
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        build: [
          {
            entry: 'src/main/index.ts',
            config: 'vite.main.config.ts',
            target: 'main',
          },
          {
            entry: 'src/preload/index.ts',
            config: 'vite.preload.config.ts',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.ts',
          },
          {
            name: 'settings_window',
            config: 'vite.settings.config.ts',
          },
        ],
      },
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'Arkane-o7',
          name: 'Navi',
        },
        prerelease: false,
        draft: false, // Auto-publish releases
      },
    },
  ],
};
