import { CosmosClient } from '@azure/cosmos';

const DATABASE_ID = 'finanzas-db';
const CONTAINER_ID = 'financial-state';

/**
 * Crea un cliente de Cosmos DB
 */
function getClient(endpoint, key) {
  if (!endpoint || !key) return null;
  return new CosmosClient({
    endpoint: endpoint.trim(),
    key: key.trim(),
    connectionPolicy: {
      enableEndpointDiscovery: false
    }
  });
}

/**
 * Guarda el estado financiero en Azure Cosmos DB
 * @param {string} endpoint - Endpoint de Cosmos DB
 * @param {string} key - Clave principal
 * @param {string} userId - ID de Hogar / Familia (Partition Key y ID del documento)
 * @param {Object} state - Estado financiero (balance, transactions, cards, etc.)
 */
export async function saveStateToCosmos(endpoint, key, userId, state) {
  const client = getClient(endpoint, key);
  if (!client) return { success: false, error: 'Credenciales de Cosmos DB incompletas.' };

  try {
    const database = client.database(DATABASE_ID);
    const container = database.container(CONTAINER_ID);

    // Preparar el documento
    const doc = {
      id: userId,
      userId: userId,
      balance: state.balance || 0,
      transactions: state.transactions || [],
      cards: state.cards || [],
      vehicleLoans: state.vehicleLoans || [],
      friends: state.friends || [],
      updatedAt: new Date().toISOString()
    };

    // Realizar un upsert (crear o reemplazar)
    const { resource } = await container.items.upsert(doc);
    return { success: true, resource };
  } catch (error) {
    console.error("Error guardando en Cosmos DB:", error);
    return { 
      success: false, 
      error: error.message || 'Error de red o permisos CORS al conectar con Cosmos DB.' 
    };
  }
}

/**
 * Carga el estado financiero desde Azure Cosmos DB
 * @param {string} endpoint - Endpoint de Cosmos DB
 * @param {string} key - Clave principal
 * @param {string} userId - ID de Hogar / Familia
 */
export async function loadStateFromCosmos(endpoint, key, userId) {
  const client = getClient(endpoint, key);
  if (!client) return { success: false, error: 'Credenciales de Cosmos DB incompletas.' };

  try {
    const database = client.database(DATABASE_ID);
    const container = database.container(CONTAINER_ID);

    const { resource } = await container.item(userId, userId).read();
    
    if (resource) {
      return { 
        success: true, 
        state: {
          balance: resource.balance,
          transactions: resource.transactions,
          cards: resource.cards,
          vehicleLoans: resource.vehicleLoans,
          friends: resource.friends
        }
      };
    } else {
      return { success: false, error: 'Documento no encontrado (se creará uno nuevo al guardar).' };
    }
  } catch (error) {
    // Si da un error de recurso no encontrado (404), es normal si es la primera vez
    if (error.code === 404) {
      return { success: false, error: 'no_found' };
    }
    console.error("Error leyendo de Cosmos DB:", error);
    return { 
      success: false, 
      error: error.message || 'Error de conexión con Cosmos DB.' 
    };
  }
}
