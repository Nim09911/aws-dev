import { describe, expect, it } from "vitest";

import { buildStartupMetadata } from "../src/startup.js";

describe("ECS startup metadata", () => {
  it("includes service identity, environment, port, and readiness state", () => {
    expect(
      buildStartupMetadata(
        {
          name: "ecs-api",
          version: "0123456789abcdef0123456789abcdef01234567",
          environment: "dev",
        },
        3000,
        "ready",
      ),
    ).toEqual({
      event: "startup",
      service: "ecs-api",
      version: "0123456789abcdef0123456789abcdef01234567",
      environment: "dev",
      port: 3000,
      readiness: "ready",
    });
  });
});
