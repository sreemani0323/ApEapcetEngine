# ═══════════════════════════════════════════════════════
# Dockerfile — Express Frontend Static Server
# Target: Node 22 Alpine (LTS)
# ═══════════════════════════════════════════════════════

FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production

# Copy package configurations
COPY package.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application files
COPY server.js ./
COPY public ./public

# Healthcheck to verify the server is running on port 5173
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:5173/ || exit 1

EXPOSE 5173

ENV PORT=5173
CMD ["node", "server.js"]
