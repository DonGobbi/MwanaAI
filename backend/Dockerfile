# Development image for the MwanaAI Express backend.
FROM node:20-alpine

WORKDIR /app

# yt-dlp (Python) powers reliable YouTube transcript fetching for the AI
# lesson/quiz generator. It stays current with YouTube's changes far better
# than hand-rolled scraping.
RUN apk add --no-cache python3 py3-pip ffmpeg \
    && pip install --no-cache-dir --break-system-packages yt-dlp

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
