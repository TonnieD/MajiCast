# Stage 1: Build the Next.js app
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Declare build-time env vars BEFORE COPY so cache invalidates when they change
ARG NEXT_PUBLIC_INFERENCE_API_URL
ENV NEXT_PUBLIC_INFERENCE_API_URL=$NEXT_PUBLIC_INFERENCE_API_URL
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

COPY . .

RUN npm run build

# Stage 2: Run the Next.js app
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
# Copy data directory so /api/data can read environmental.csv at runtime
COPY --from=builder /app/data ./data

EXPOSE 3000

# Railway injects $PORT; local Docker defaults to 3000
CMD ["sh", "-c", "npm start -- -H 0.0.0.0 -p ${PORT:-3000}"]
