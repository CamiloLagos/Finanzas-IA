// Servicio de procesamiento de lenguaje natural para transacciones financieras en español (Con soporte de compras diferidas)

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
 * Realiza peticiones a la API de Gemini intentando múltiples modelos de forma secuencial en caso de error 404.
 */
async function callGeminiAPI(apiKey, contents, generationConfig = {}) {
  const models = [
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-2.5-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-2.0-flash',
    'gemini-1.5-pro'
  ];

  let lastError = null;

  for (const model of models) {
    try {
      console.log(`Intentando conectar con el modelo Gemini: ${model}...`);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig
        })
      });

      if (response.status === 404) {
        console.warn(`El modelo ${model} retornó 404 (No Encontrado). Intentando el siguiente...`);
        lastError = new Error(`El modelo ${model} no está disponible en tu región/cuenta (404).`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error en la API (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText !== undefined) {
        return responseText;
      }
    } catch (error) {
      console.error(`Error con el modelo ${model}:`, error);
      lastError = error;
    }
  }

  throw lastError || new Error("No se pudo obtener respuesta de ningún modelo de Gemini.");
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
    installments: 1,      // NUEVO: Número de cuotas (por defecto 1)
    interestRate: 0,      // NUEVO: Tasa de interés mensual (por defecto 0)
    replyMessage: ''
  };

  // 1. Extraer Monto
  const amountRegex = /(?:(?:\$|usd|eur|cop)?\s*)(\d+(?:\.\d{3})*(?:,\d+)?)(?:\s*(?:k|mil))?/i;
  const matchAmount = norm.match(amountRegex);
  
  if (matchAmount) {
    let numStr = matchAmount[1].replace(/\./g, '').replace(',', '.');
    let amount = parseFloat(numStr);
    
    const afterAmount = norm.substring(matchAmount.index + matchAmount[0].length);
    if (/^\s*(k|mil)\b/i.test(afterAmount) || /k\b/i.test(matchAmount[0])) {
      if (amount < 1000) amount *= 1000;
    }
    result.amount = amount;
  } else {
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

  // NUEVO: Extraer Cuotas (ej: "a 12 cuotas", "a 6 meses")
  const installmentsRegex = /\ba\s*(\d+)\s*(?:cuotas|meses)\b/i;
  const matchInstallments = norm.match(installmentsRegex);
  if (matchInstallments) {
    result.installments = parseInt(matchInstallments[1], 10);
  }

  // NUEVO: Extraer Tasa de Interés (ej: "con interes del 2.5%", "con 2% de interes", "tasa del 1.8%")
  const interestRegex = /(?:interes\s*(?:del)?\s*|tasa\s*(?:del)?\s*|con\s*)(\d+(?:\.\d+)?)\s*%/i;
  const matchInterest = norm.match(interestRegex);
  if (matchInterest) {
    result.interestRate = parseFloat(matchInterest[1]);
  }

  // 2. Identificar el tipo de operación y destinatarios (Tarjetas, Créditos, Amigos)
  const cards = financialState?.cards || [];
  const vehicleLoans = financialState?.vehicleLoans || [];
  const friends = financialState?.friends || [];

  let foundCard = null;
  for (const card of cards) {
    if (norm.includes(normalizeText(card.name)) || (card.name.toLowerCase() === 'visa' && norm.includes('visa')) || (card.name.toLowerCase() === 'mastercard' && norm.includes('mastercard'))) {
      foundCard = card;
      break;
    }
  }

  let foundVehicle = null;
  for (const loan of vehicleLoans) {
    if (norm.includes(normalizeText(loan.name)) || norm.includes('carro') || norm.includes('vehiculo') || norm.includes('auto')) {
      foundVehicle = loan;
      break;
    }
  }

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
      result.type = 'friend_payback';
      result.targetName = foundFriend.name;
      result.category = 'Otros';
      result.description = `Pago de deuda a ${foundFriend.name}`;
    } else {
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
  let descRaw = text.replace(amountRegex, '')
    .replace(installmentsRegex, '')
    .replace(interestRegex, '')
    .replace(/\b(gaste|pague|recibi|gane|preste|abone|ingreso|gasto|comprando|compre|con la|con mi|en mi)\b/gi, '')
    .trim();
  if (descRaw.length > 3) {
    result.description = descRaw.charAt(0).toUpperCase() + descRaw.slice(1);
  }

  result.success = true;

  const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  const formattedAmount = formatMoney(result.amount);

  switch (result.type) {
    case 'expense':
      if (result.targetName) {
        if (result.installments > 1) {
          result.replyMessage = `✅ Registrado gasto diferido de ${formattedAmount} en "${result.category}" (${result.description}) con tarjeta ${result.targetName} a ${result.installments} cuotas${result.interestRate > 0 ? ` con ${result.interestRate}% de interés` : ''}.`;
        } else {
          result.replyMessage = `✅ Registrado gasto de ${formattedAmount} en "${result.category}" (${result.description}) pagado con tu tarjeta ${result.targetName}.`;
        }
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
- "card_payment": El usuario paga/abona a su tarjeta de crédito.
- "loan_payment": El usuario paga la cuota de su crédito de vehículo.
- "friend_lend": El usuario le presta dinero a un amigo.
- "friend_borrow": Un amigo le presta dinero al usuario.
- "friend_payback": El usuario le devuelve dinero a un amigo.
- "friend_receive_payback": Un amigo le devuelve dinero al usuario.

INSTRUCCIONES EXTRA:
1. Si el usuario menciona una tarjeta de crédito o a un amigo, asócialo al nombre registrado. Si no existe, pon el nombre sugerido en "targetName".
2. Si la compra es con tarjeta de crédito y especifica diferir a cuotas (ej: "a 12 cuotas", "a 6 meses"), extrae el número de cuotas en "installments" y la tasa de interés mensual (si la menciona, ej: "interés del 2.1%") en "interestRate".
3. Si el texto no representa una transacción, pon "success": false.
4. Devuelve una respuesta JSON estrictamente con la estructura indicada abajo, sin añadir texto externo.

ESTRUCTURA DE RESPUESTA REQUERIDA (JSON):
{
  "success": true,
  "type": "expense" | "income" | "card_payment" | "loan_payment" | "friend_lend" | "friend_borrow" | "friend_payback" | "friend_receive_payback",
  "amount": number,
  "category": "NombreCategoria",
  "description": "concepto claro y corto",
  "targetName": "Nombre exacto de la tarjeta de crédito, crédito de vehículo o amigo (si aplica)",
  "installments": number (por defecto 1),
  "interestRate": number (tasa mensual %, ej: 2.1. Por defecto 0),
  "replyMessage": "Un mensaje corto de confirmación súper amigable y dinámico en español, comentando el efecto financiero y cuotas si aplica."
}`;

  try {
    const responseText = await callGeminiAPI(apiKey, [{ parts: [{ text: prompt }] }], {
      responseMimeType: "application/json",
      temperature: 0.1
    });

    if (responseText) {
      const resultObj = JSON.parse(responseText);
      return resultObj;
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
  }

  return parseTransactionTextLocal(text, financialState);
}

/**
 * Chat interactivo con el asesor financiero
 */
export async function getFinancialAdvisorResponse(chatHistory, apiKey, financialState) {
  if (!apiKey) {
    return "⚠️ Para recibir análisis financieros personalizados y de nivel profesional con Inteligencia Artificial, configura tu Gemini API Key en los Ajustes de la aplicación. \n\nPor el momento, te recomiendo mantener bajo control el cupo utilizado de tus tarjetas de crédito y programar abonos a tus deudas activas.";
  }

  const cardsList = (financialState?.cards || []).map(c => {
    const deferredList = (c.deferredPurchases || []).map(d => `  - Compra deferred: ${d.description}, Saldo: ${d.amount}, Cuotas restantes: ${d.remainingInstallments}, Interés: ${d.interestRate}%`).join('\n');
    return `- Tarjeta ${c.name}: Límite: ${c.limit}, Deuda actual: ${c.balance}, Corte: Día ${c.cutoffDay}, Pago: Día ${c.paymentDay}\n${deferredList || '  No tiene compras diferidas.'}`;
  }).join('\n');
  
  const vehiclesList = (financialState?.vehicleLoans || []).map(v => `- Crédito de ${v.name}: Saldo pendiente de ${v.balance}, Cuota mensual de ${v.monthlyPayment}, Tasa de ${v.interestRate}%`).join('\n');
  const friendsList = (financialState?.friends || []).map(f => `- Con ${f.name}: Tipo "${f.type === 'por_cobrar' ? 'Él me debe' : 'Yo le debo'}", Saldo de ${f.balance}`).join('\n');
  const transactionsList = (financialState?.transactions || []).slice(0, 30).map(t => `- [${t.date}] [${t.type}] ${t.category}: $${t.amount} (${t.description}) ${t.installments > 1 ? `(A ${t.installments} cuotas)` : ''}`).join('\n');
  const currentBalance = financialState?.balance || 0;

  const systemInstructions = `Actúa como Aura, una asesora financiera inteligente, experta en finanzas personales, reducción de deudas y optimización del dinero en español.
Tu tono es motivador, profesional, claro y empático.

ESTADO FINANCIERO DEL USUARIO EN TIEMPO REAL:
- Saldo Disponible en Débito/Efectivo: $${currentBalance}
- Tarjetas de Crédito Activas (con sus compras diferidas a cuotas si tienen):
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
3. Si el usuario te pregunta sobre sus compras diferidas a cuotas, explícale la cuota mensual aproximada y el efecto de los intereses (utilizando el interés mensual de cada tarjeta si existe).
4. Mantén las respuestas fluidas, claras y bien estructuradas en markdown, sin ser excesivamente largas.`;

  try {
    const apiContents = [
      { role: "user", parts: [{ text: systemInstructions }] }
    ];

    chatHistory.forEach(msg => {
      apiContents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    });

    const responseText = await callGeminiAPI(apiKey, apiContents, {
      temperature: 0.7
    });

    if (responseText) {
      return responseText;
    }
  } catch (error) {
    console.error(error);
    return "Lo siento, tuve un problema al conectarme con la IA de Gemini. Por favor, verifica tu API Key y tu conexión de red.";
  }
}

/**
 * Analizador multimodal de documentos (recibos en imagen, extractos en PDF o archivos CSV/texto)
 */
export async function parseDocumentWithGemini(fileData, mimeType, isText, apiKey, financialState) {
  if (!apiKey) {
    throw new Error("Se requiere una API Key de Gemini.");
  }

  const cardsList = (financialState?.cards || []).map(c => `- ${c.name}`).join('\n');
  
  const prompt = `Analiza el documento adjunto (puede ser un extracto bancario, factura, recibo o CSV) y extrae todas las transacciones financieras que encuentres.
  
  ESTADO FINANCIERO:
  - Tarjetas de crédito existentes para mapear si aplica:
  ${cardsList || 'Ninguna'}
  
  Categorías válidas de gastos: "Alimentación", "Transporte", "Entretenimiento", "Servicios", "Compras", "Salud", "Educación", "Otros".
  
  Tipos de operación válidos:
  - "expense": Gasto.
  - "income": Ingreso.
  - "card_payment": Pago de tarjeta.
  - "loan_payment": Pago de cuota de vehículo.
  
  INSTRUCCIONES:
  1. Si encuentras múltiples transacciones, extráelas todas.
  2. Para cada transacción, determina el tipo, monto, categoría, descripción (concepto corto) y nombre de la tarjeta/crédito si aplica (mapeado de las existentes).
  3. Establece la fecha de la transacción de forma lógica basada en el documento en formato YYYY-MM-DD. Si no tiene fecha, usa la fecha de hoy.
  4. Devuelve la información estrictamente como un arreglo JSON con objetos transacciones, usando el siguiente esquema JSON:
  {
    "transactions": [
      {
        "type": "expense" | "income" | "card_payment" | "loan_payment",
        "amount": number,
        "category": "NombreCategoria",
        "description": "concepto corto",
        "targetName": "Nombre de la tarjeta (si aplica)",
        "date": "YYYY-MM-DD",
        "installments": number (por defecto 1),
        "interestRate": number (por defecto 0)
      }
    ]
  }
  No incluyas explicaciones externas, markdown (ej. \`\`\`json), solo el JSON puro.`;

  let parts = [];
  if (isText) {
    parts.push({ text: prompt + "\n\nCONTENIDO DEL ARCHIVO:\n" + fileData });
  } else {
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: fileData // base64
      }
    });
    parts.push({ text: prompt });
  }

  const responseText = await callGeminiAPI(apiKey, [{ parts: parts }], {
    responseMimeType: "application/json",
    temperature: 0.1
  });

  if (!responseText) {
    throw new Error("No se pudo obtener una respuesta legible de la IA.");
  }

  // Limpiar si el modelo de todas formas retorna con tags ```json
  let cleanText = responseText.trim();
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.substring(7);
  }
  if (cleanText.endsWith("```")) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }

  const result = JSON.parse(cleanText.trim());
  return result.transactions || [];
}
