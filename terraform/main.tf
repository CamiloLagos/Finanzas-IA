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

# 3. Crear Cuenta de Azure Cosmos DB (Plan Gratis)
resource "azurerm_cosmosdb_account" "cosmos_account" {
  name                = "cosmos-finanzas-ia-${random_string.suffix.result}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB" # SQL/NoSQL API

  # Activar la capa gratuita de Cosmos DB (una por suscripción)
  free_tier_enabled = true

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.rg.location
    failover_priority = 0
  }

  # Regla CORS para permitir conexiones directas desde el navegador (SPA client-side)
  cors_rule {
    allowed_origins    = ["*"]
    allowed_methods    = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"]
    allowed_headers    = ["*"]
    exposed_headers    = ["*"]
    max_age_in_seconds = 86400
  }

  tags = var.tags
}

# 4. Crear Base de Datos SQL en Cosmos DB
resource "azurerm_cosmosdb_sql_database" "cosmos_db" {
  name                = "finanzas-db"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos_account.name
}

# 5. Crear Contenedor SQL en Cosmos DB
resource "azurerm_cosmosdb_sql_container" "cosmos_container" {
  name                = "financial-state"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos_account.name
  database_name       = azurerm_cosmosdb_sql_database.cosmos_db.name
  partition_key_path  = "/userId"

  # Para el plan gratuito, podemos configurar la indexación por defecto
  indexing_policy {
    indexing_mode = "consistent"
  }
}

# Generar un sufijo aleatorio para asegurar la unicidad del nombre de Cosmos DB
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}
