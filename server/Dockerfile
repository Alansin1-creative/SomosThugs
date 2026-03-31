# Docker con contexto solo en /server (p. ej. Root Directory = server en el hosting).
# Si el build es desde la raíz del repo, usa el Dockerfile de la raíz del proyecto.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .
EXPOSE 4000

CMD ["node", "index.js"]
