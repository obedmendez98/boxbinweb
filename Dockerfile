# ---- Build Stage ----
FROM node:18-alpine AS builder

WORKDIR /app
    
# Instalamos dependencias
COPY package*.json ./
#RUN npm ci
#RUN npm install nombre-del-paquete-problemático --force
RUN npm install --force

# Copiamos el código y construimos
COPY . .
# Copia el archivo de entorno de producción
#COPY .env.production .env
RUN npm run build
    
# ---- Production Stage ----
FROM nginx:stable-alpine
    
# Copiamos el build generado al directorio de NGINX
COPY --from=builder /app/dist /usr/share/nginx/html
    
# Copiamos configuración de NGINX para SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf
    
# Exponemos el puerto 80
EXPOSE 80
    
# Arrancamos NGINX
CMD ["nginx", "-g", "daemon off;"]
    