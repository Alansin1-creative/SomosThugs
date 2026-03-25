# Railway / Docker: API Node en carpeta `server` (el `npm start` de la raíz es Expo — no usar para este servicio).
FROM node:20-alpine

WORKDIR /app

COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev

COPY server/ .

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "index.js"]
