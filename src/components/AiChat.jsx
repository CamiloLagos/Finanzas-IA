import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, User, HelpCircle } from 'lucide-react';
import { getFinancialAdvisorResponse } from '../services/aiParser';

export default function AiChat({ chatHistory, onSendMessage, geminiApiKey, financialState }) {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    if (!textToSend) setInputText('');

    // 1. Add user message to history
    onSendMessage({ sender: 'user', text });
    setLoading(true);

    try {
      // 2. Prepare context and request AI response
      const updatedHistory = [...chatHistory, { sender: 'user', text }];
      const reply = await getFinancialAdvisorResponse(updatedHistory, geminiApiKey, financialState);
      
      // 3. Add AI message to history
      onSendMessage({ sender: 'ai', text: reply });
    } catch (e) {
      console.error(e);
      onSendMessage({ sender: 'ai', text: "Ocurrió un error inesperado al comunicarme con la IA. Inténtalo de nuevo." });
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "¿Cómo puedo ahorrar un 15% más?",
    "Analiza el estado de mis tarjetas y deudas",
    "¿Cuánto dinero tengo en préstamos con amigos?",
    "Dame consejos para mi crédito de vehículo",
    "Analiza mis gastos de esta semana"
  ];

  return (
    <div style={{ animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} className="dashboard-grid">
      
      {/* Lado Izquierdo: Ventana de Chat */}
      <div className="glass-card chat-window" style={{ height: '580px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
          <div style={{ background: 'var(--grad-teal)', padding: '6px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={22} color="var(--bg-primary)" />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Aura <Sparkles size={14} color="var(--color-teal)" style={{ fill: 'var(--color-teal)' }} />
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Asesora de Finanzas Inteligente</span>
          </div>
        </div>

        {/* Mensajes del Chat */}
        <div className="chat-messages" style={{ flex: 1 }}>
          {chatHistory.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', padding: '0 20px' }}>
              <Bot size={40} color="var(--color-teal)" style={{ marginBottom: '15px', opacity: 0.8 }} />
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>¡Hola! Soy Aura, tu asesora personal.</p>
              <p style={{ fontSize: '12px' }}>Puedo analizar tu saldo, tus tarjetas, deudas de amigos y darte consejos para ahorrar. ¿De qué te gustaría hablar hoy?</p>
            </div>
          ) : (
            chatHistory.map((msg, index) => (
              <div 
                key={index} 
                className={`message-bubble ${msg.sender}`} 
                style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  alignItems: 'flex-start',
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                {msg.sender === 'ai' && (
                  <div style={{ background: 'rgba(0, 242, 254, 0.1)', padding: '4px', borderRadius: '6px', marginTop: '2px' }}>
                    <Bot size={14} color="var(--color-teal)" />
                  </div>
                )}
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                </div>
                {msg.sender === 'user' && (
                  <div style={{ background: 'rgba(0, 0, 0, 0.15)', padding: '4px', borderRadius: '6px', marginTop: '2px' }}>
                    <User size={14} color="var(--bg-primary)" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="message-bubble ai" style={{ alignSelf: 'flex-start', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ background: 'rgba(0, 242, 254, 0.1)', padding: '4px', borderRadius: '6px' }}>
                <Bot size={14} color="var(--color-teal)" />
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px' }}>Aura está analizando tus finanzas</span>
                <span className="dot-pulse" style={{ display: 'flex', gap: '3px' }}>
                  <span style={{ width: '4px', height: '4px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }}></span>
                  <span style={{ width: '4px', height: '4px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }}></span>
                  <span style={{ width: '4px', height: '4px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }}></span>
                </span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
          className="chat-input-area"
        >
          <input 
            type="text" 
            className="form-control"
            placeholder="Pregúntale a Aura..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* Lado Derecho: Sugerencias e Instrucciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-card">
          <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
            <HelpCircle size={18} color="var(--color-teal)" />
            Preguntas Frecuentes
          </h3>
          <p style={{ fontSize: '13px', marginBottom: '15px' }}>
            Haz clic en cualquiera de estas sugerencias para consultarle a Aura sobre tu situación actual:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                className="btn"
                style={{ textAlign: 'left', display: 'block', fontSize: '12.5px', padding: '10px 14px' }}
                onClick={() => handleSend(prompt)}
                disabled={loading}
              >
                💡 {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ background: 'rgba(127, 0, 255, 0.03)', border: '1px solid rgba(127, 0, 255, 0.1)' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--color-purple)', marginBottom: '10px' }}>
            ¿Cómo funciona el Asesor?
          </h3>
          <p style={{ fontSize: '12.5px', lineHeight: '1.6' }}>
            Aura recibe todo el estado financiero que ves en la pantalla de control de forma confidencial. Al realizar tus preguntas, ella calcula el impacto de tus deudas, presupuestos y gastos mensuales, ayudándote a crear estrategias de ahorro o consolidación de pasivos en tiempo real.
          </p>
        </div>
      </div>

      {/* Animación del Typing Indicator */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
      `}</style>
    </div>
  );
}
