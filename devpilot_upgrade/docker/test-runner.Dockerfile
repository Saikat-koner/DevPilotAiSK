# Build in a trusted CI environment after generating and committing package-lock.json.
FROM node:22-bookworm-slim
WORKDIR /workspace
COPY package*.json ./
RUN npm ci --ignore-scripts=false
COPY --chown=node:node . .
ENV CI=1 NO_COLOR=1
USER node
CMD ["npm", "test", "--", "--runInBand"]
