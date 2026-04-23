// Polyfill array for Reanimated and Expo
if (typeof (global as any).__reanimatedLoggerConfig === 'undefined') {
  (global as any).__reanimatedLoggerConfig = {
    logLevel: 0,
    strict: false,
  };
}
