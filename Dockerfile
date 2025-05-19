FROM node:alpine
WORKDIR /app
# against cache of package.json
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
CMD ["node", "--import", "tsx", "src/Server.ts"]