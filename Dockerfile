# Optional: the rules allow submitting Docker / docker-compose files. (Not tested in the build sandbox: test locally.)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
# Applies migrations (idempotent) then starts the app.
CMD ["sh", "-c", "node scripts/migrate.mjs && npm start"]
