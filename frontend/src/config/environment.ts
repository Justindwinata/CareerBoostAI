export type FrontendConfig = {
  apiBaseUrl: string;
};

export const frontendConfig: FrontendConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
};
