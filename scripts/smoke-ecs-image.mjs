import { execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import process from "node:process";
import { setTimeout } from "node:timers/promises";

const image = "aws-course-ecs-api:local";
const container = `aws-course-ecs-smoke-${randomUUID()}`;
const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const encodedPublicKey = Buffer.from(
  publicKey.export({ type: "spki", format: "pem" }),
).toString("base64");

try {
  execFileSync(
    "docker",
    [
      "run",
      "--detach",
      "--name",
      container,
      "--publish",
      "127.0.0.1::4000",
      "--health-interval",
      "1s",
      "--health-timeout",
      "2s",
      "--health-start-period",
      "0s",
      "--health-retries",
      "5",
      "--env",
      "PORT=4000",
      "--env",
      "SERVICE_NAME=ecs-api",
      "--env",
      "SERVICE_VERSION=local",
      "--env",
      "APP_ENVIRONMENT=local",
      "--env",
      "CORS_ALLOWED_ORIGINS=https://learner.example",
      "--env",
      `JWT_PUBLIC_KEY_BASE64=${encodedPublicKey}`,
      "--env",
      "JWT_ISSUER=https://issuer.example.com",
      "--env",
      "JWT_AUDIENCE=aws-course-api",
      image,
    ],
    { stdio: "ignore" },
  );

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const status = execFileSync(
      "docker",
      ["inspect", "--format", "{{.State.Health.Status}}", container],
      { encoding: "utf8" },
    ).trim();

    if (status === "healthy") {
      const published = execFileSync(
        "docker",
        ["port", container, "4000/tcp"],
        {
          encoding: "utf8",
        },
      ).trim();
      const hostPort = published.slice(published.lastIndexOf(":") + 1);
      const baseUrl = `http://127.0.0.1:${hostPort}`;

      const live = await globalThis.fetch(`${baseUrl}/health/live`, {
        headers: { Origin: "https://learner.example" },
      });
      if (
        !live.ok ||
        (await live.json()).status !== "ok" ||
        live.headers.get("access-control-allow-origin") !==
          "https://learner.example"
      ) {
        throw new Error("Liveness or allowed-origin CORS smoke failed.");
      }

      const ready = await globalThis.fetch(`${baseUrl}/health/ready`);
      if (!ready.ok || (await ready.json()).status !== "ok") {
        throw new Error("Readiness smoke failed.");
      }

      const unauthorized = await globalThis.fetch(`${baseUrl}/hello`);
      if (unauthorized.status !== 401) {
        throw new Error("Unauthenticated route did not return 401.");
      }

      const disallowed = await globalThis.fetch(`${baseUrl}/health/live`, {
        headers: { Origin: "https://attacker.example" },
      });
      if (disallowed.headers.has("access-control-allow-origin")) {
        throw new Error("Disallowed origin received a CORS allow header.");
      }

      process.stdout.write(
        "ECS image live, ready, auth, and CORS smoke tests passed.\n",
      );
      process.exitCode = 0;
      break;
    }

    if (status === "unhealthy") {
      throw new Error("ECS image became unhealthy.");
    }

    await setTimeout(500);
  }

  if (process.exitCode !== 0) {
    throw new Error("ECS image did not become healthy within 10 seconds.");
  }
} catch (error) {
  try {
    execFileSync("docker", ["logs", container], { stdio: "inherit" });
  } catch {
    // The container may not have started.
  }
  throw error;
} finally {
  try {
    execFileSync("docker", ["rm", "--force", container], { stdio: "ignore" });
  } catch {
    // Nothing to clean up when docker run failed.
  }
}
