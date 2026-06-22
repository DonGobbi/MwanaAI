# Development image for the MwanaAI React frontend.
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package*.json ./
RUN npm install

# Copy the source (overridden by a bind mount in docker-compose for live reload).
COPY . .

EXPOSE 3000
ENV BROWSER=none

CMD ["npm", "start"]
