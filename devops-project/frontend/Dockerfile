# Stage 1: Build the React Application
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
# For this template to build successfully globally without package.json, we will conditionally run install
RUN if [ -f "package.json" ]; then npm ci; fi
COPY . .
# We assume the build command outputs to /app/dist or /app/build.
RUN if [ -f "package.json" ]; then npm run build; else mkdir -p build && echo "<h1>Welcome to the Medical Shop App</h1>" > build/index.html; fi

# Stage 2: Serve the application with Nginx
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
# Expose port 80 for the Nginx server
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
