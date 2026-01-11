module.exports = {
  packagerConfig: {
    name: 'Navi',
    executableName: 'navi',
    asar: true,
    icon: './assets/icon',  // Electron will look for icon.png, icon.ico, icon.icns
    appBundleId: 'com.navi.app',
    appCategoryType: 'public.app-category.productivity',
    darwinDarkModeSupport: true,
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
        iconUrl: 'https://raw.githubusercontent.com/your-repo/assets/icon.ico',
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
};
