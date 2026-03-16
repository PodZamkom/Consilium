# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
# We keep package.json for the server if we want to run a custom server, 
# but for now we'll just use 'serve' as it's a simple static app.
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
