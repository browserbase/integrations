declare module 'openclaw/plugin-sdk' {
  export interface OpenClawLogger {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string, ...args: unknown[]) => void;
    debug: (msg: string) => void;
  }

  export interface OpenClawPluginApi {
    pluginConfig: unknown;
    config?: unknown;
    logger: OpenClawLogger;
    registerCli: (
      handler: ({ program }: { program: any }) => void,
      options?: any
    ) => void;
    registerService?: (service: {
      id: string;
      start?: () => void | Promise<void>;
      stop?: () => void | Promise<void>;
    }) => void;
  }
}
