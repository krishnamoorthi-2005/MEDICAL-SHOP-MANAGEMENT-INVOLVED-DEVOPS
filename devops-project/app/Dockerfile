FROM node:20-alpine AS builder

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm ci --only=production || npm install --production

# Bundle app source
COPY . .

# Expose port 3000
EXPOSE 3000

# Start the app
CMD [ "npm", "start" ]
