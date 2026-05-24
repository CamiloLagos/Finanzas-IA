#!/bin/bash

# Script de automatización de despliegue para FinAI en Azure Static Web Apps
# Guarda los logs de salida en deploy.log

LOG_FILE="deploy.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=========================================================="
echo "🚀 INICIANDO DESPLIEGUE DE FINAI - $(date)"
echo "=========================================================="

# Paso 1: Aplicar Terraform
echo ""
echo "Step 1: Aplicando Terraform para crear la infraestructura en Azure..."
cd terraform

echo "Running: terraform init"
terraform init
if [ $? -ne 0 ]; then
    echo "❌ Error al inicializar Terraform. Revisa los logs de arriba."
    exit 1
fi

echo "Running: terraform apply"
terraform apply -auto-approve
if [ $? -ne 0 ]; then
    echo "❌ Error al aplicar la configuración de Terraform. Revisa los logs."
    exit 1
fi

# Obtener valores de salida de Terraform
DEPLOYMENT_TOKEN=$(terraform output -raw static_web_app_api_key)
WEB_URL=$(terraform output -raw static_web_app_url)

cd ..

if [ -z "$DEPLOYMENT_TOKEN" ]; then
    echo "❌ No se pudo recuperar el token de despliegue de Azure Static Web Apps."
    exit 1
fi

echo "✅ Infraestructura creada con éxito."
echo "🔗 URL asignada por Azure: http://$WEB_URL"

# Paso 2: Compilar el Frontend de React
echo ""
echo "Step 2: Compilando la aplicación de React..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error al compilar la aplicación de React (npm run build)."
    exit 1
fi
echo "✅ Compilación completada con éxito."

# Paso 3: Desplegar en Azure Static Web Apps
echo ""
echo "Step 3: Subiendo el build a Azure..."
npx @azure/static-web-apps-cli deploy ./dist --env production --deployment-token "$DEPLOYMENT_TOKEN"
if [ $? -ne 0 ]; then
    echo "❌ Error al subir la aplicación a Azure."
    exit 1
fi

echo ""
echo "=========================================================="
echo "🎉 ¡DESPLIEGUE COMPLETADO CON ÉXITO!"
echo "🔗 URL del sitio: http://$WEB_URL"
echo "📂 Todos los logs guardados en: $LOG_FILE"
echo "=========================================================="
