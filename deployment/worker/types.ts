export interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface D1DatabaseBinding {
  prepare(query: string): D1PreparedStatement;
}

export interface Env {
  ASSETS: AssetFetcher;
  DB: D1DatabaseBinding;
  SEPAY_WEBHOOK_API_KEY?: string;
}

export interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export type State = Record<string, any>;
export type User = Record<string, any>;
