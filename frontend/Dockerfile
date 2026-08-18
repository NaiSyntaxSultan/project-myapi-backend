# Stage 1: Build React/Vite App
FROM node:20-alpine as build
WORKDIR /app

# ก๊อปปี้ package.json มาติดตั้งก่อน
COPY package*.json ./
RUN npm install

# ก๊อปปี้โค้ดทั้งหมดแล้วสั่ง build
COPY . .
RUN npm run build

# Stage 2: Serve ด้วย Nginx
FROM nginx:alpine

# นำไฟล์หน้าเว็บไปใส่ใน Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# นำคอนฟิก Nginx เพื่อรองรับ React Router เข้าไป
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]