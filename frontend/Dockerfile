# Etapa 1: compila o React/TypeScript
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
COPY img ./img
RUN npm run build

# Etapa 2: serve os arquivos estáticos (acesso externo só pelo Nginx principal)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
