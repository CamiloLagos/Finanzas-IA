# Configuración del proveedor de Azure
terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# 1. Crear un Grupo de Recursos
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

# 2. Crear la Azure Static Web App en el Plan Gratuito
resource "azurerm_static_web_app" "static_web_app" {
  name                = var.static_web_app_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.location_static_web_app
  sku_tier            = "Free"
  sku_size            = "Free"

  tags = var.tags
}
