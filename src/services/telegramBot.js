// Servicio de Bot de Telegram por Long Polling en el Cliente

let pollingActive = false;
let lastUpdateId = 0;
let pollingTimeoutId = null;

/**
 * Detiene la escucha activa del bot de Telegram
 */
export function stopTelegramPolling() {
  pollingActive = false;
  if (pollingTimeoutId) {
    clearTimeout(pollingTimeoutId);
    pollingTimeoutId = null;
  }
  console.log("Poller de Telegram detenido.");
}

/**
 * Inicia la escucha activa del bot de Telegram
 * @param {string} token - Token del bot de Telegram de @BotFather
 * @param {Function} onTransactionMessage - Callback cuando llega un mensaje de transacción
 * @param {Function} onStatusChange - Callback para informar sobre el estado de la conexión
 */
export function startTelegramPolling(token, onTransactionMessage, onStatusChange) {
  if (!token) {
    onStatusChange({ status: 'error', message: 'Token de Telegram no proporcionado.' });
    return;
  }

  // Si ya estaba activo, primero lo apagamos para no duplicar pollers
  stopTelegramPolling();

  pollingActive = true;
  lastUpdateId = parseInt(localStorage.getItem('telegram_last_update_id') || '0', 10);
  
  onStatusChange({ status: 'connecting', message: 'Conectando con la API de Telegram...' });
  console.log("Iniciando poller de Telegram...");

  // Función interna para realizar el sondeo (polling) de actualizaciones
  async function poll() {
    if (!pollingActive) return;

    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=15`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          throw new Error("Token inválido. Por favor revisa que el token de @BotFather sea correcto.");
        }
        throw new Error(`Error de red de Telegram: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ok && data.result.length > 0) {
        onStatusChange({ status: 'connected', message: 'Escuchando mensajes en Telegram...' });
        
        for (const update of data.result) {
          // Asegurar que no procesemos actualizaciones repetidas
          if (update.update_id > lastUpdateId) {
            lastUpdateId = update.update_id;
            localStorage.setItem('telegram_last_update_id', lastUpdateId.toString());

            // Procesar el mensaje si es de texto
            if (update.message && update.message.text) {
              const message = update.message;
              const text = message.text;
              const chatId = message.chat.id;
              const senderName = message.from.first_name || message.from.username || "Usuario";

              // Si es un comando de inicio
              if (text.startsWith('/start')) {
                await sendTelegramMessage(token, chatId, 
                  `👋 ¡Hola ${senderName}! Soy Aura, tu copiloto de finanzas personales.\n\n` +
                  `Ya he enlazado este chat con tu panel web. A partir de ahora, puedes enviarme mensajes de texto libre para registrar tus movimientos, por ejemplo:\n` +
                  `• "Gasté 15000 en un almuerzo"\n` +
                  `• "Ingreso de 800000 por mi trabajo"\n` +
                  `• "Compré zapatos por 120000 con mi tarjeta Visa"\n` +
                  `• "Le pagué 50000 de la deuda a Carlos"\n` +
                  `• "Le presté 30000 a Juan"\n\n` +
                  `¡Escríbeme un gasto o ingreso para probar!`
                );
              } else {
                // Notificar al App Component para que parsee e inserte la transacción
                onTransactionMessage({
                  text: text,
                  chatId: chatId,
                  senderName: senderName,
                  token: token
                });
              }
            }
          }
        }
      } else {
        onStatusChange({ status: 'connected', message: 'Escuchando mensajes en Telegram...' });
      }
    } catch (error) {
      console.error("Error en polling de Telegram:", error);
      onStatusChange({ status: 'error', message: error.message || 'Error en la conexión.' });
      
      // Detener en caso de token inválido para evitar ciclos infinitos de error 401
      if (error.message.includes("Token inválido")) {
        pollingActive = false;
        return;
      }
    }

    // Programar la siguiente llamada si sigue activo
    if (pollingActive) {
      pollingTimeoutId = setTimeout(poll, 1000);
    }
  }

  // Iniciar ciclo de polling
  poll();
}

/**
 * Envía un mensaje a un chat de Telegram
 */
export async function sendTelegramMessage(token, chatId, text) {
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });

    if (!response.ok) {
      console.error(`Error enviando mensaje a Telegram (${response.status})`);
    }
  } catch (error) {
    console.error("Error al enviar mensaje a Telegram:", error);
  }
}
