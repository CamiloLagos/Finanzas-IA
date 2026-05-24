// Servicio de procesamiento de lenguaje natural para transacciones financieras en español

/**
 * Normaliza y limpia texto en español
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .trim();
}

/**
 * Analizador local basado en reglas heurísticas y expresiones regulares
 */
export function parseTransactionTextLocal(text, financialState) {
  const norm = normalizeText(text);
  const result = {
    success: false,
    type: 'expense', // 'expense', 'income', 'card_payment', 'loan_payment', 'friend_lend', 'friend_borrow', 'friend_payback', 'friend_receive_payback'
    amount: 0,
    category: 'Otros',
    description: '',
    targetName: '',
    replyMessage: ''
  };

  // 1. Extraer Monto
  // Busca números como 15.000, 15000, 15k, $15000
  const amountRegex = /(?:(?:\$|usd|eur|cop)?\s*)(\d+(?:\.\d{3})*(?:,\d+)?)(?:\s*(?:k|mil))?/i;
  const matchAmount = norm.match(amountRegex);
  
  if (matchAmount) {
    let numStr = matchAmount[1].replace(/\./g, '').replace(',', '.');
    let amount = parseFloat(numStr);
    
    // Si contiene 'k' o 'mil' al final del número (ej: 15k, 15 mil)
    const afterAmount = norm.substring(matchAmount.index + matchAmount[0].length);
    if (/^\s*(k|mil)\b/i.test(afterAmount) || /k\b/i.test(matchAmount[0])) {
      if (amount < 1000) amount *= 1000;
    }
    result.amount = amount;
  } else {
    // Buscar cualquier número suelto si falló el regex principal
    const fallbackNumbers = norm.match(/\d+/);
    if (fallbackNumbers) {
      result.amount = parseFloat(fallbackNumbers[0]);
    }
  }

  if (!result.amount || isNaN(result.amount)) {
    return {
      success: false,
      replyMessage: "No pude identificar el monto de la transacción. Intenta escribir el número claramente, por ejemplo: 'Gasté 15000 en comida'."
    };
  }

  // 2. Identificar el tipo de operación y destinatarios (Tarjetas, Créditos, Amigos)
  const cards = financialState?.cards || [];
  const vehicleLoans = financialState?.vehicleLoans || [];
  const friends = financialState?.friends || [];

  // Buscar coincidencia de tarjetas
  let foundCard = null;
  for (const card of cards) {
    if (norm.includes(normalizeText(card.name)) || (card.name.toLowerCase() === 'visa' && norm.includes('visa')) || (card.name.toLowerCase() === 'mastercard' && norm.includes('mastercard'))) {
      foundCard = card;
      break;
    }
  }

  // Buscar coincidencia de créditos de vehículo
  let foundVehicle = null;
  for (const loan of vehicleLoans) {
    if (norm.includes(normalizeText(loan.name)) || norm.includes('carro') || norm.includes('vehiculo') || norm.includes('auto')) {
      foundVehicle = loan;
      break;
    }
  }

  // Buscar coincidencia de amigos
  let foundFriend = null;
  for (const friend of friends) {
    if (norm.includes(normalizeText(friend.name))) {
      foundFriend = friend;
      break;
    }
  }

  // Determinar Tipo de Operación
  if (norm.includes('pague') || norm.includes('abono') || norm.includes('abonar') || norm.includes('pago')) {
    if (foundCard) {
      result.type = 'card_payment';
      result.targetName = foundCard.name;
      result.category = 'Servicios';
      result.description = `Abono a Tarjeta ${foundCard.name}`;
    } else if (foundVehicle) {
      result.type = 'loan_payment';
      result.targetName = foundVehicle.name;
      result.category = 'Transporte';
      result.description = `Pago cuota Crédito Vehículo: ${foundVehicle.name}`;
    } else if (foundFriend) {
      // Si dice "Le pagué a Juan" es que le estoy devolviendo dinero
      result.type = 'friend_payback';
      result.targetName = foundFriend.name;
      result.category = 'Otros';
      result.description = `Pago de deuda a ${foundFriend.name}`;
    } else {
      // Pago general de tarjeta o cuota si no se especifica el nombre exacto
      if (norm.includes('tarjeta')) {
        result.type = 'card_payment';
        result.targetName = cards[0]?.name || '';
        result.description = 'Pago de tarjeta de crédito';
      } else {
        result.type = 'expense';
        result.description = 'Pago general';
      }
    }
  } else if (norm.includes('preste') || norm.includes('prestado a')) {
    result.type = 'friend_lend';
    result.targetName = foundFriend ? foundFriend.name : (friends[0]?.name || 'Amigo');
    result.category = 'Otros';
    result.description = `Préstamo realizado a ${result.targetName}`;
  } else if (norm.includes('me presto') || norm.includes('debiendo a') || norm.includes('debo a')) {
    result.type = 'friend_borrow';
    result.targetName = foundFriend ? foundFriend.name : (friends[0]?.name || 'Amigo');
    result.category = 'Otros';
    result.description = `Préstamo recibido de ${result.targetName}`;
  } else if (norm.includes('me pago') || norm.includes('me devolvio')) {
    result.type = 'friend_receive_payback';
    result.targetName = foundFriend ? foundFriend.name : (friends[0]?.name || 'Amigo');
    result.category = 'Otros';
    result.description = `${result.targetName} me pagó deuda`;
  } else if (norm.includes('recibi') || norm.includes('gane') || norm.includes('ingreso') || norm.includes('sueldo') || norm.includes('nomina') || norm.includes('pago de')) {
    result.type = 'income';
    result.category = 'Ingresos';
    result.description = 'Ingreso de dinero';
  } else {
    // Por defecto es un gasto
    result.type = 'expense';
    if (foundCard) {
      result.targetName = foundCard.name;
      result.description = 'Compra con tarjeta';
    } else {
      result.description = 'Gasto registrado';
    }
  }

  // 3. Categorización del gasto
  if (result.type === 'expense' || (result.type === 'expense' && foundCard)) {
    if (norm.includes('comida') || norm.includes('almuerzo') || norm.includes('cena') || norm.includes('restaurante') || norm.includes('mercado') || norm.includes('supermercado') || norm.includes('cafe') || norm.includes('desayuno')) {
      result.category = 'Alimentación';
    } else if (norm.includes('uber') || norm.includes('taxi') || norm.includes('gasolina') || norm.includes('transporte') || norm.includes('bus') || norm.includes('peaje') || norm.includes('parqueadero') || norm.includes('metro')) {
      result.category = 'Transporte';
    } else if (norm.includes('cine') || norm.includes('rumba') || norm.includes('fiesta') || norm.includes('netflix') || norm.includes('cerveza') || norm.includes('bar') || norm.includes('concierto') || norm.includes('juego')) {
      result.category = 'Entretenimiento';
    } else if (norm.includes('luz') || norm.includes('agua') || norm.includes('internet') || norm.includes('gas') || norm.includes('arriendo') || norm.includes('alquiler') || norm.includes('suscripcion') || norm.includes('celular') || norm.includes('telefono')) {
      result.category = 'Servicios';
    } else if (norm.includes('ropa') || norm.includes('camisa') || norm.includes('zapatos') || norm.includes('mall') || norm.includes('amazon') || norm.includes('compras') || norm.includes('regalo')) {
      result.category = 'Compras';
    } else if (norm.includes('medico') || norm.includes('droga') || norm.includes('farmacia') || norm.includes('salud') || norm.includes('doctor') || norm.includes('clinica')) {
      result.category = 'Salud';
    } else if (norm.includes('curso') || norm.includes('libro') || norm.includes('colegio') || norm.includes('universidad') || norm.includes('educacion')) {
      result.category = 'Educación';
    }
  }

  // 4. Perfeccionar descripción
  // Quitar el monto y verbos comunes de la descripción original
  let descRaw = text.replace(amountRegex, '').replace(/\b(gaste|pague|recibi|gane|preste|abone|ingreso|gasto|comprando|compre|con la|con mi|en mi)\b/gi, '').trim();
  if (descRaw.length > 3) {
    // Capitalizar primera letra
    result.description = descRaw.charAt(0).toUpperCase() + descRaw.slice(1);
  }

  result.success = true;

  // Formateador de moneda
  const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  // Crear mensaje de respuesta amigable en base al tipo de operación
  const formattedAmount = formatMoney(result.amount);
  switch (result.type) {
    case 'expense':
      if (result.targetName) {
        result.replyMessage = `✅ Registrado gasto de ${formattedAmount} en "${result.category}" (${result.description}) pagado con tu tarjeta de crédito ${result.targetName}.`;
      } else {
        result.replyMessage = `✅ Registrado gasto de ${formattedAmount} en "${result.category}" (${result.description}).`;
      }
      break;
    case 'income':
      result.replyMessage = `💵 ¡Excelente! Registrado un nuevo ingreso de ${formattedAmount} (${result.description}).`;
      break;
    case 'card_payment':
      result.replyMessage = `💳 Registrado abono de ${formattedAmount} a tu tarjeta de crédito ${result.targetName || 'de crédito'}. ¡Tu deuda disminuye!`;
      break;
    case 'loan_payment':
      result.replyMessage = `🚗 Registrado pago de cuota de ${formattedAmount} al crédito de vehículo ${result.targetName}. ¡Un paso más cerca de pagarlo por completo!`;
      break;
    case 'friend_lend':
      result.replyMessage = `🤝 Registrado préstamo de ${formattedAmount} realizado a ${result.targetName}. Se ha creado una cuenta por cobrar.`;
      break;
    case 'friend_borrow':
      result.replyMessage = `⚠️ Registrada deuda de ${formattedAmount} que te prestó ${result.targetName}. Se ha creado una cuenta por pagar.`;
      break;
    case 'friend_payback':
      result.replyMessage = `👍 Registrado abono/pago de ${formattedAmount} a la deuda que tenías con ${result.targetName}.`;
      break;
    case 'friend_receive_payback':
      result.replyMessage = `🤑 ¡Genial! Registrado pago de ${formattedAmount} que te debía ${result.targetName}. Tu cuenta por cobrar se redujo.`;
      break;
  }

  return result;
}

/**
 * Analizador avanzado usando la API de Gemini
 */
export async function parseTransactionTextGemini(text, apiKey, financialState) {
  if (!apiKey) {
    return parseTransactionTextLocal(text, financialState);
  }

  const cardsList = (financialState?.cards || []).map(c => `- ${c.name} (Límite: ${c.limit}, Deuda actual: ${c.balance})`).join('\n');
  const vehiclesList = (financialState?.vehicleLoans || []).map(v => `- ${v.name} (Saldo pendiente: ${v.balance}, Cuota: ${v.monthlyPayment})`).join('\n');
  const friendsList = (financialState?.friends || []).map(f => `- ${f.name} (Tipo: ${f.type === 'por_cobrar' ? 'Me debe' : 'Le debo'}, Saldo: ${f.balance})`).join('\n');
  const currentBalance = financialState?.balance || 0;

  const prompt = `Actúa como un procesador y extractor de transacciones financieras personales en español de alta precisión.
Tu tarea es analizar el siguiente texto enviado por un usuario y clasificarlo dentro de sus finanzas.

TEXTO DEL USUARIO: "${text}"

ESTADO FINANCIERO ACTUAL DEL USUARIO:
- Saldo en cuenta (débito/efectivo): $${currentBalance}
- Tarjetas de crédito existentes:
${cardsList || 'Ninguna tarjeta configurada.'}
- Créditos de vehículo existentes:
${vehiclesList || 'Ningún crédito de vehículo configurado.'}
- Deudas con amigos/conocidos:
${friendsList || 'Ninguna deuda con amigos configurada.'}

Categorías válidas de gastos: "Alimentación", "Transporte", "Entretenimiento", "Servicios", "Compras", "Salud", "Educación", "Otros".

Tipos de operación válidos:
- "expense": Un gasto común (se resta del saldo disponible, a menos que sea con tarjeta de crédito, en cuyo caso aumenta el saldo utilizado de la tarjeta).
- "income": Un ingreso de dinero (se suma al saldo disponible).
- "card_payment": El usuario paga/abona a su tarjeta de crédito (resta de su saldo disponible y disminuye la deuda de la tarjeta).
- "loan_payment": El usuario paga la cuota de su crédito de vehículo (resta de su saldo disponible y disminuye el saldo pendiente del crédito).
- "friend_lend": El usuario le presta dinero a un amigo (se resta del saldo disponible y crea/aumenta una cuenta por cobrar).
- "friend_borrow": Un amigo le presta dinero al usuario (se suma al saldo disponible y crea/aumenta una cuenta por pagar).
- "friend_payback": El usuario le paga/devuelve dinero que le debía a un amigo (resta del saldo disponible y disminuye la cuenta por pagar).
- "friend_receive_payback": Un amigo le paga/devuelve al usuario dinero que le debía (suma al saldo disponible y disminuye la cuenta por cobrar).

INSTRUCCIONES EXTRA:
1. Si el usuario menciona una tarjeta de crédito (ej. "Visa", "tarjeta", "Mastercard") o a un amigo, asócialo al nombre de tarjeta o amigo más cercano que tenga registrado en su estado financiero. Si no existe, pon el nombre sugerido en "targetName".
2. Si el texto no representa una transacción financiera legible, pon "success": false.
3. Devuelve una respuesta JSON estrictamente con la estructura indicada abajo, sin añadir explicaciones fuera del JSON.

ESTRUCTURA DE RESPUESTA REQUERIDA (JSON):
{
  "success": true,
  "type": "expense" | "income" | "card_payment" | "loan_payment" | "friend_lend" | "friend_borrow" | "friend_payback" | "friend_receive_payback",
  "amount": number,
  "category": "NombreCategoria",
  "description": "concepto claro y corto",
  "targetName": "Nombre exacto de la tarjeta de crédito, crédito de vehículo o amigo (si aplica)",
  "replyMessage": "Un mensaje corto de confirmación súper amigable y dinámico en español, comentando el efecto financiero."
}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (responseText) {
      const resultObj = JSON.parse(responseText);
      return resultObj;
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
  }

  // Fallback a local si hay error en la llamada o parseo de Gemini
  return parseTransactionTextLocal(text, financialState);
}

/**
 * Chat interactivo con el asesor financiero
 * Recibe el historial de chat y el estado financiero actual del usuario para dar consejos detallados
 */
export async function getFinancialAdvisorResponse(chatHistory, apiKey, financialState) {
  if (!apiKey) {
    return "⚠️ Para recibir análisis financieros personalizados y de nivel profesional con Inteligencia Artificial, configura tu Gemini API Key en los Ajustes de la aplicación. \n\nPor el momento, te recomiendo mantener bajo control el cupo utilizado de tus tarjetas de crédito y programar abonos a tus deudas activas.";
  }

  const cardsList = (financialState?.cards || []).map(c => `- Tarjeta ${c.name}: Límite de ${c.limit}, Deuda actual de ${c.balance}, Día de corte el ${c.cutoffDay}, Día de pago el ${c.paymentDay}`).join('\n');
  const vehiclesList = (financialState?.vehicleLoans || []).map(v => `- Crédito de ${v.name}: Saldo pendiente de ${v.balance}, Cuota mensual de ${v.monthlyPayment}, Tasa de ${v.interestRate}%`).join('\n');
  const friendsList = (financialState?.friends || []).map(f => `- Con ${f.name}: Tipo "${f.type === 'por_cobrar' ? 'Él me debe' : 'Yo le debo'}", Saldo de ${f.balance}`).join('\n');
  const transactionsList = (financialState?.transactions || []).slice(0, 30).map(t => `- [${t.date}] [${t.type}] ${t.category}: $${t.amount} (${t.description})`).join('\n');
  const currentBalance = financialState?.balance || 0;

  const systemInstructions = `Actúa como Aura, una asesora financiera inteligente, experta en finanzas personales, reducción de deudas y optimización del dinero en español.
Tu tono es motivador, profesional, claro y empático. Usa emojis de manera sutil para hacer el texto más amigable y estructurado.

ESTADO FINANCIERO DEL USUARIO EN TIEMPO REAL:
- Saldo Disponible en Débito/Efectivo: $${currentBalance}
- Tarjetas de Crédito Activas:
${cardsList || 'Ninguna tarjeta configurada.'}
- Créditos de Vehículo Activos:
${vehiclesList || 'Ningún crédito de vehículo configurado.'}
- Préstamos con Amigos/Terceros:
${friendsList || 'Ningún préstamo configurado.'}
- Últimos 30 Movimientos Registrados:
${transactionsList || 'Sin transacciones recientes.'}

INSTRUCCIONES DE RESPUESTA:
1. Responde a la pregunta del usuario analizando con detalle y precisión matemática su estado financiero.
2. Da consejos accionables de cómo optimizar su saldo, ahorrar, pagar menos intereses, amortizar créditos o cobrar deudas.
3. Si el usuario te pregunta sobre sus deudas de amigos, tarjetas o cuotas del carro, dale cifras exactas basadas en su estado.
4. Mantén las respuestas fluidas, claras y bien estructuradas en markdown, sin ser excesivamente largas (máximo 3-4 párrafos o listas cortas).`;

  try {
    const apiContents = [
      { role: "user", parts: [{ text: systemInstructions }] }
    ];

    // Mapear historial al formato de Gemini API
    // Gemini roles: "user" y "model"
    chatHistory.forEach(msg => {
      apiContents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: apiContents,
        generationConfig: {
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (responseText) {
      return responseText;
    }
  } catch (error) {
    console.error("Error getting AI advisor response:", error);
    return "Lo siento, tuve un problema al conectarme con la IA de Gemini. Por favor, verifica tu API Key y tu conexión de red.";
  }

  return "No pude obtener una respuesta de la IA en este momento.";
}
