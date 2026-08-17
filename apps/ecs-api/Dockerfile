FROM node:24-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY apps/ecs-api/package.json apps/ecs-api/package.json
COPY apps/lambda-api/package.json apps/lambda-api/package.json
COPY apps/sqs-worker/package.json apps/sqs-worker/package.json
COPY apps/event-worker/package.json apps/event-worker/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/data-access/package.json packages/data-access/package.json
RUN npm ci

COPY apps/ecs-api apps/ecs-api
RUN npx tsc -b apps/ecs-api
RUN npm prune --omit=dev

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /workspace

COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/ecs-api/package.json ./apps/ecs-api/package.json
COPY --from=build /workspace/apps/ecs-api/dist ./apps/ecs-api/dist

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||'3000')+'/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/ecs-api/dist/src/main.js"]
