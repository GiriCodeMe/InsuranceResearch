FROM node:20-alpine
WORKDIR /repo
COPY . .
RUN npm install
RUN npm run build --workspace=@insurance-kb/mock-evidence-store
CMD ["node", "apps/mock-evidence-store/dist/server.js"]
