export interface ServiceMetadata {
  name: string;
  version: string;
  environment: string;
}

export type ReadinessState = "ready" | "not_ready";

export function buildStartupMetadata(
  service: ServiceMetadata,
  port: number,
  readiness: ReadinessState,
) {
  return {
    event: "startup",
    service: service.name,
    version: service.version,
    environment: service.environment,
    port,
    readiness,
  };
}
