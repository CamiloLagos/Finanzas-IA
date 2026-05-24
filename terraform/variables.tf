variable "resource_group_name" {
  type        = string
  description = "Nombre del Grupo de Recursos en Azure"
  default     = "rg-finanzas-ia"
}

variable "location" {
  type        = string
  description = "Región de Azure para el Grupo de Recursos"
  default     = "eastus2"
}

variable "location_static_web_app" {
  type        = string
  description = "Región específica para Azure Static Web Apps (ej: eastus2, centralus, westeurope, eastasia)"
  default     = "eastus2"
}

variable "static_web_app_name" {
  type        = string
  description = "Nombre de la Azure Static Web App"
  default     = "aswa-finanzas-ia"
}

variable "tags" {
  type        = map(string)
  description = "Etiquetas (Tags) para asociar a los recursos creados"
  default = {
    Environment = "Production"
    Project     = "FinAI"
    ManagedBy   = "Terraform"
  }
}
