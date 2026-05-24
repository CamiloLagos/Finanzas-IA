import React, { useState } from 'react';
import { Key, Download, Upload, RefreshCw, Trash2, ShieldAlert, Sparkles, Check } from 'lucide-react';

export default function Settings({
  geminiApiKey,
  onSaveApiKey,
  onLoadDemoData,
  onClearAllData,
  onImportData,
  financialState
}) {
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  const handleSaveKey = (e) => {
    e.preventDefault();
    onSaveApiKey(apiKeyInput.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(financialState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `FinAI_Data_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = (e) => {
    const fileReader = new FileReader();
    const file = e.target.files[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const importedState = JSON.parse(event.target.result);
        
        // Basic validation
        if (
          typeof importedState.balance !== 'number' ||
          !Array.isArray(importedState.transactions) ||
          !Array.isArray(importedState.cards) ||
          !Array.isArray(importedState.vehicleLoans) ||
          !Array.isArray(importedState.friends)
        ) {
          throw new Error("El archivo JSON no contiene el formato financiero válido de FinAI.");
        }

        onImportData(importedState);
        setImportSuccess(true);
        setImportError('');
        setTimeout(() => setImportSuccess(false), 3000);
      } catch (err) {
        setImportError(err.message || "Error al parsear el archivo JSON.");
        setImportSuccess(false);
      }
    };
    fileReader.readAsText(file);
  };

  return (
    <div style={{ animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} className="dashboard-grid">
      
      {/* Columna Izquierda: Configuración de IA y Claves */}
      <div className="glass-card">
        <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key size={22} color="var(--color-teal)" />
          Configuración de Inteligencia Artificial
        </h2>
        <p style={{ marginBottom: '20px', fontSize: '13.5px' }}>
          Configura tu clave de API de Gemini para habilitar el motor conversacional avanzado y el análisis financiero inteligente profundo.
        </p>

        <form onSubmit={handleSaveKey} style={{ marginBottom: '25px' }}>
          <div className="form-group">
            <label>Google Gemini API Key</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="AIzaSy..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            {saveSuccess ? (
              <>
                <Check size={16} /> ¡Clave Guardada!
              </>
            ) : (
              <>
                <Sparkles size={16} /> Guardar API Key
              </>
            )}
          </button>
        </form>

        <div style={{ fontSize: '12.5px', background: 'rgba(0, 242, 254, 0.03)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(0, 242, 254, 0.08)' }}>
          <h4 style={{ fontSize: '13px', color: 'var(--color-teal)', marginBottom: '6px' }}>
            ¿Cómo obtener una clave API de Gemini gratis?
          </h4>
          <ol style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
            <li>Visita <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-teal)', fontWeight: '600' }}>Google AI Studio</a>.</li>
            <li>Inicia sesión con tu cuenta de Google.</li>
            <li>Haz clic en el botón <strong>"Get API key"</strong> en el panel lateral.</li>
            <li>Crea una clave API en un proyecto nuevo y pégala aquí. ¡Es 100% gratuita para uso personal!</li>
          </ol>
        </div>
      </div>

      {/* Columna Derecha: Gestión de Datos e Importar/Exportar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Backup */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} color="var(--color-teal)" />
            Copia de Seguridad (Backup)
          </h3>
          <p style={{ marginBottom: '15px', fontSize: '13px' }}>
            Exporta tus datos en formato JSON para guardarlos localmente o importarlos en otro navegador.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn" onClick={handleExport} style={{ flex: 1 }}>
              <Download size={15} /> Exportar Datos JSON
            </button>
            
            <label className="btn" style={{ flex: 1, justifyContent: 'center', cursor: 'pointer', margin: 0 }}>
              <Upload size={15} /> Importar Datos JSON
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImport} 
                style={{ display: 'none' }}
              />
            </label>
          </div>
          {importSuccess && <div style={{ color: 'var(--color-green)', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>✅ Datos importados correctamente.</div>}
          {importError && <div style={{ color: 'var(--color-red)', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>❌ {importError}</div>}
        </div>

        {/* Demo Data & Reset */}
        <div className="glass-card" style={{ border: '1px solid rgba(239, 68, 68, 0.15)' }}>
          <h3 style={{ marginBottom: '15px', color: 'var(--color-orange)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="var(--color-orange)" />
            Zona de Administración
          </h3>
          <p style={{ marginBottom: '15px', fontSize: '13px' }}>
            ¿Quieres probar la aplicación de inmediato con datos ficticios? Puedes sembrar datos de prueba con tarjetas, un crédito de vehículo y deudas de amigos preestablecidas.
          </p>

          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <button 
              className="btn" 
              style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)', color: 'var(--color-orange)', justifyContent: 'center' }}
              onClick={onLoadDemoData}
            >
              <RefreshCw size={15} /> Cargar Datos de Demostración
            </button>
            
            <button 
              className="btn btn-red" 
              style={{ justifyContent: 'center' }}
              onClick={() => {
                if (window.confirm("¿Estás seguro de que deseas borrar absolutamente todos tus datos financieros de FinAI? Esta acción no se puede deshacer.")) {
                  onClearAllData();
                }
              }}
            >
              <Trash2 size={15} /> Borrar Todos los Datos
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
