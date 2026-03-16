FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY shared/package.json ./shared/
RUN npm ci

FROM node:22-alpine AS client-build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY client/ ./client/
COPY shared/ ./shared/
RUN npm run build:client

FROM node:22-alpine AS server-build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY server/ ./server/
COPY shared/ ./shared/
COPY prisma/ ./prisma/
RUN npx prisma generate
RUN npm run build:server

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache tini
COPY --from=deps /app/node_modules ./node_modules
COPY --from=client-build /app/client/dist ./public
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/src/generated ./server/src/generated
COPY prisma/ ./prisma/
COPY package.json ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
RUN mkdir -p /data/photos
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["./docker-entrypoint.sh"]
