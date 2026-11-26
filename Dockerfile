FROM node:22-alpine

WORKDIR /app

# najpierw same zależności - ta warstwa jest brana z cache, dopóki nie zmieni się package*.json
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

# exec: node zostaje procesem PID 1 i sam dostaje SIGTERM (graceful shutdown)
CMD ["sh", "-c", "npx knex migrate:latest && exec node src/server.js"]
