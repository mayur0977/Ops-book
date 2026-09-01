/// <reference types="nativewind/types" />

// The global stylesheet is a side-effect import that NativeWind's Babel
// transform consumes. Declaring it stops tsc treating the import as missing.
declare module '*.css';
