FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY index.js .
COPY auth.js .
COPY cors.js .
COPY config/ ./config
COPY controllers/ ./controllers
COPY helpers/ ./helpers
COPY middlewares/ ./middlewares
COPY models/ ./models
COPY routes/ ./routes
EXPOSE 4003
CMD ["node", "index.js"]