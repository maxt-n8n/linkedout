# Use Node.js 18 as the base image
FROM node:18-alpine AS builder

# Set working directory for the monorepo
WORKDIR /monorepo

# Copy the entire monorepo
COPY . .

# Install dependencies at the monorepo root
RUN yarn install

# Build the frontend application
WORKDIR /monorepo/frontend
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN yarn build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy necessary files from builder
COPY --from=builder /monorepo/frontend/next.config.js ./
COPY --from=builder /monorepo/frontend/public ./public
COPY --from=builder /monorepo/frontend/.next ./.next
COPY --from=builder /monorepo/node_modules ./node_modules
COPY --from=builder /monorepo/frontend/package.json ./package.json

# Expose the port
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]