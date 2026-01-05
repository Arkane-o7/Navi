/// <reference types="vite/client" />

declare global {
  interface Window {
    navi: {
      hide: () => void;
      resize: (height: number) => void;
      openExternal: (url: string) => void;
      getTheme: () => Promise<boolean>;
      onShow: (fn: () => void) => () => void;
      onHide: (fn: () => void) => () => void;
    };
  }
}

export {};
