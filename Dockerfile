# Use a standard Debian-based Node image
FROM node:24-bullseye-slim

# Install the native compilers for the polyglot platform
RUN apt-get update && apt-get install -y \
    python3 \
    gcc \
    g++ \
    golang \
    default-jdk \
    curl \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Rust toolchain
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install pnpm globally
RUN npm install -g pnpm

# Set the workspace root as the working directory
WORKDIR /app

# Copy the entire monorepo package structure
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY lib/ ./lib/
COPY artifacts/ ./artifacts/

# Install workspace dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Navigate to the API Server and build it
WORKDIR /app/artifacts/api-server
RUN pnpm run build

# Default environment variables
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Run the compiled backend directly
CMD ["node", "./dist/index.mjs"]
