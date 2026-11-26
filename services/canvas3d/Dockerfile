FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app/services/canvas3d
COPY services/canvas3d/package*.json ./
RUN npm ci --omit=dev --no-audit
COPY services/canvas3d/*.cjs ./
COPY src/features/canvas/table3d/*.cjs /app/src/features/canvas/table3d/
COPY src/features/canvas/table3d/gamePieces.js src/features/canvas/table3d/gameSightMask.js /app/src/features/canvas/table3d/
COPY public/canvas3d/ /app/public/canvas3d/
COPY public/scenery/ /app/public/scenery/
USER node
CMD ["node", "server.cjs"]
