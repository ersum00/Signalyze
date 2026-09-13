# Builds the Astro landing and serves it with nginx. Build context: repository root.
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/signals/package.json packages/signals/
COPY apps/landing/package.json apps/landing/
COPY apps/extension/package.json apps/extension/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @signalyze/landing... --ignore-scripts
COPY packages ./packages
COPY docs ./docs
COPY CHANGELOG.md ./
COPY apps/landing ./apps/landing
RUN pnpm --filter @signalyze/landing build

FROM nginx:1.27-alpine
COPY deploy/nginx/landing.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/landing/dist /usr/share/nginx/html
EXPOSE 80
