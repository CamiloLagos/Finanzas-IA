output "static_web_app_url" {
  value       = azurerm_static_web_app.static_web_app.default_host_name
  description = "La URL generada por Azure para acceder a la aplicación web"
}

output "static_web_app_api_key" {
  value       = azurerm_static_web_app.static_web_app.api_key
  description = "El token de despliegue necesario para subir el build desde GitHub Actions o Azure Pipelines"
  sensitive   = true
}
