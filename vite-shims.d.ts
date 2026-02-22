declare module 'vite' {
  export function defineConfig(config: any): any;
  export function loadEnv(mode: string, root: string, prefix?: string): Record<string, string>;
}

declare module '@vitejs/plugin-react' {
  const react: any;
  export default react;
}
