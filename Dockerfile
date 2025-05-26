FROM node:alpine
WORKDIR /app
# against cache of package.json
COPY package.json ./
RUN npm i
COPY . ./
CMD ["node", "--import", "tsx", "src/Server.ts"]