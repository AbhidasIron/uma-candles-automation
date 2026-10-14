# Must match the @playwright/test version in package-lock.json
FROM mcr.microsoft.com/playwright:v1.64.0-noble

WORKDIR /app
ENV CI=true

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

CMD ["npm", "test"]
