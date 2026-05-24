import React, { useState, useRef, useEffect } from 'react';
import { Bot, MessageSquare, ShieldCheck, Play, Square, AlertCircle, RefreshCw, Send, Check } from 'lucide-react';
import { parseTransactionTextLocal, parseTransactionTextGemini } from '../services/aiParser';

export default function IntegrationPanel({
  telegramToken,
  telegramStatus,
  onStartTelegram,
  onStopTelegram,
  onRegisterParsedTransaction,
  geminiApiKey,
  financialState
}) {
  const [activeSim, setActiveSim] = useState('whatsapp'); // 'whatsapp', 'telegram'
  const [tokenInput, setTokenInput] = useState(telegramToken || '');
  const [simText, setSimText] = useState('');
  const [simMessages, setSimMessages] = useState([
    { sender: 'ai', text: '¡Hola! Soy tu asistente de FinAI. Escríbeme cualquier gasto o ingreso, por ejemplo: "Gasto de 15000 en almuerzo" o "Visa gasté 120000 en compras".', time: '12:00' }
  ]);
  const [simLoading, setSimLoading] = useState(false);
  const simEndRef = useRef(null);

  useEffect(() => {
    simEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [simMessages]);

  const handleStartTelegram = (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    onStartTelegram(tokenInput.trim());
  };

  const handleSimSend = async (e) => {
    e.preventDefault();
    if (!simText.trim() || simLoading) return;

    const userText = simText;
    setSimText('');
    
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add user message to simulator chat
    setSimMessages(prev => [...prev, { sender: 'user', text: userText, time: now }]);
    setSimLoading(true);

    // Process the text using the AI Parser
    setTimeout(async () => {
      try {
        let result;
        if (geminiApiKey) {
          result = await parseTransactionTextGemini(userText, geminiApiKey, financialState);
        } else {
          result = parseTransactionTextLocal(userText, financialState);
        }

        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (result && result.success) {
          // Register transaction in global state
          onRegisterParsedTransaction(result);
          
          setSimMessages(prev => [...prev, { 
            sender: 'ai', 
            text: result.replyMessage || `Registrado con éxito: ${result.description} por $${result.amount}`, 
            time: replyTime 
          }]);
        } else {
          setSimMessages(prev => [...prev, { 
            sender: 'ai', 
            text: result.replyMessage || "No entendí la transacción. Intenta algo como: 'Gasté 15000 en taxi con mi tarjeta Visa' o 'Le presté 50000 a Juan'.", 
            time: replyTime 
          }]);
        }
      } catch (err) {
        console.error("Error simulator:", err);
      } finally {
        setSimLoading(false);
      }
    }, 800); // Small delay to simulate network/processing
  };

  return (
    <div style={{ animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} className="dashboard-grid">
      
      {/* Lado Izquierdo: Configuración del Bot Real de Telegram */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifySelf: 'stretch' }}>
        <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={22} color="var(--color-teal)" />
          Bot de Telegram Real
        </h2>
        <p style={{ marginBottom: '20px', fontSize: '13.5px' }}>
          Conecta un Bot de Telegram real a tu aplicación. El sondeo de mensajes se ejecuta 100% de forma segura en tu navegador y actualiza tu panel web en vivo.
        </p>

        <form onSubmit={handleStartTelegram} style={{ marginBottom: '20px' }}>
          <div className="form-group">
            <label>Token del Bot de Telegram (HTTP API)</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Ej: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              disabled={telegramStatus.status === 'connected' || telegramStatus.status === 'connecting'}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {telegramStatus.status !== 'connected' && telegramStatus.status !== 'connecting' ? (
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                <Play size={15} /> Iniciar Escucha
              </button>
            ) : (
              <button 
                type="button" 
                className="btn btn-red" 
                style={{ flex: 1 }}
                onClick={onStopTelegram}
              >
                <Square size={15} /> Detener Escucha
              </button>
            )}
          </div>
        </form>

        {/* Estado de la Conexión */}
        <div style={{ 
          padding: '12px 16px', 
          borderRadius: '10px', 
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--card-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          {telegramStatus.status === 'connected' ? (
            <>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-green)', boxShadow: '0 0 8px var(--color-green)' }}></span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-green)' }}>Bot Activo</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{telegramStatus.message}</div>
              </div>
            </>
          ) : telegramStatus.status === 'connecting' ? (
            <>
              <RefreshCw size={16} className="logo-icon" style={{ animation: 'spin 2s linear infinite' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>Conectando...</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{telegramStatus.message}</div>
              </div>
            </>
          ) : telegramStatus.status === 'error' ? (
            <>
              <AlertCircle size={18} color="var(--color-red)" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-red)' }}>Error en Bot</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{telegramStatus.message}</div>
              </div>
            </>
          ) : (
            <>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--text-dark)' }}></span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Inactivo</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>La escucha está apagada. Introduce el token y haz clic en Iniciar.</div>
              </div>
            </>
          )}
        </div>

        {/* Instrucciones de Configuración */}
        <div style={{ fontSize: '12.5px', background: 'rgba(255,255,255,0.01)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
          <h4 style={{ fontSize: '13.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} color="var(--color-teal)" />
            ¿Cómo crear tu bot de Telegram?
          </h4>
          <ol style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-muted)' }}>
            <li>Abre la app de <strong>Telegram</strong> en tu móvil u ordenador.</li>
            <li>Busca a <strong>@BotFather</strong> (el bot oficial verificado).</li>
            <li>Escribe el comando <code>/newbot</code>. Elige un nombre y un usuario.</li>
            <li>Copia el <strong>Token HTTP API</strong> que te proporciona y pégalo arriba.</li>
            <li>¡Haz clic en <strong>Iniciar Escucha</strong>, busca tu bot en Telegram, presiona <strong>/start</strong> y escríbele un gasto!</li>
          </ol>
        </div>
      </div>

      {/* Lado Derecho: Simulador Interactivo de WhatsApp / Telegram */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="flex-between" style={{ marginBottom: '15px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={22} color="var(--color-teal)" />
            Simulador de Chat IA
          </h2>
          <div style={{ display: 'flex', gap: '5px', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '6px' }}>
            <button 
              onClick={() => setActiveSim('whatsapp')}
              style={{
                fontSize: '11px', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                background: activeSim === 'whatsapp' ? '#075e54' : 'transparent',
                color: 'white', fontWeight: '500'
              }}
            >
              WhatsApp
            </button>
            <button 
              onClick={() => setActiveSim('telegram')}
              style={{
                fontSize: '11px', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                background: activeSim === 'telegram' ? '#0088cc' : 'transparent',
                color: 'white', fontWeight: '500'
              }}
            >
              Telegram
            </button>
          </div>
        </div>
        <p style={{ marginBottom: '15px', fontSize: '13px' }}>
          Prueba el procesamiento en lenguaje natural de la IA de inmediato. Todo lo que registres en este chat simulado se agregará instantáneamente a tu panel web.
        </p>

        {/* Caja del Simulador */}
        <div className="simulator-box">
          {/* Cabecera del Simulador */}
          <div className={`simulator-header ${activeSim}`}>
            <div style={{ 
              width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
            }}>
              A
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '600' }}>Aura AI Copilot</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>En línea (FinAI)</div>
            </div>
          </div>

          {/* Cuerpo de Mensajes */}
          <div className="simulator-body" style={{ background: activeSim === 'whatsapp' ? '#0b141a' : '#0e1621' }}>
            {simMessages.map((msg, i) => (
              <div 
                key={i} 
                className={`sim-message ${msg.sender === 'user' ? 'sent' : 'received'} ${activeSim}`}
              >
                <div style={{ fontSize: '13px' }}>{msg.text}</div>
                <div style={{ 
                  fontSize: '9px', textAlign: 'right', marginTop: '4px', opacity: 0.6,
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px'
                }}>
                  {msg.time}
                  {msg.sender === 'user' && <Check size={10} color="#34b7f1" />}
                </div>
              </div>
            ))}
            {simLoading && (
              <div className={`sim-message received ${activeSim}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div className="sim-dot-pulse" style={{ display: 'flex', gap: '2px' }}>
                  <span style={{ width: '5px', height: '5px', background: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }}></span>
                  <span style={{ width: '5px', height: '5px', background: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }}></span>
                  <span style={{ width: '5px', height: '5px', background: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={simEndRef} />
          </div>

          {/* Input del Simulador */}
          <form 
            onSubmit={handleSimSend}
            style={{ 
              display: 'flex', padding: '10px', 
              background: activeSim === 'whatsapp' ? '#1f2c34' : '#17212b',
              borderTop: activeSim === 'whatsapp' ? 'none' : '1px solid rgba(255,255,255,0.05)'
            }}
          >
            <input 
              type="text" 
              placeholder="Escribe un mensaje de gasto o ingreso..." 
              className="form-control"
              style={{ 
                borderRadius: '20px', 
                background: activeSim === 'whatsapp' ? '#2a3942' : '#24303f', 
                border: 'none',
                color: 'white',
                padding: '8px 16px',
                fontSize: '13px'
              }}
              value={simText}
              onChange={(e) => setSimText(e.target.value)}
              disabled={simLoading}
            />
            <button 
              type="submit" 
              style={{
                marginLeft: '8px', width: '36px', height: '36px', borderRadius: '50%',
                background: activeSim === 'whatsapp' ? '#00a884' : '#2ea6da',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white'
              }}
              disabled={simLoading}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
