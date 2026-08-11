FROM node:20-alpine
WORKDIR /repo
COPY . .
RUN npm install
RUN npm run build --workspace=@insurance-kb/mock-graph-api
CMD ["node", "apps/mock-graph-api/dist/server.js"]
