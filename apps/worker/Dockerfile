FROM node:20-alpine
WORKDIR /repo
COPY . .
RUN npm install
RUN npm run build --workspace=@insurance-kb/worker
CMD ["node", "apps/worker/dist/index.js"]
