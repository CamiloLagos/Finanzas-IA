import React, { useState } from 'react';
import { Key, Download, Upload, RefreshCw, Trash2, ShieldAlert, Sparkles, Check, Database, AlertTriangle, Landmark, PiggyBank } from 'lucide-react';
import { loadStateFromCosmos, saveStateToCosmos } from '../services/cosmosSync';

export default function Settings({
  geminiApiKey,
  onSaveApiKey,
  onLoadDemoData,
  onClearAllData,
  onImportData,
  financialState,
  // Props para Cosmos DB
  cosmosEndpoint,
  cosmosKey,
  cosmosUserId,
  onSaveCosmosConfig,
  // Props para Salario Fijo
  fixedSalary,
  onSaveFixedSalary
}) {
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  // Estados de Cosmos DB
  const [endpointInput, setEndpointInput] = useState(cosmosEndpoint || '');
  const [keyInput, setKeyInput] = useState(cosmosKey || '');
  const [userIdInput, setUserIdInput] = useState(cosmosUserId || 'hogar-lagos');
  const [cosmosLoading, setCosmosLoading] = useState(false);
  const [cosmosMsg, setCosmosMsg] = useState({ type: '', text: '' });

  // Estados de Salario Fijo
  const [salaryInput, setSalaryInput] = useState(fixedSalary || '');
  const [salarySuccess, setSalarySuccess] = useState(false);

  const handleSaveKey = (e) => {
    e.preventDefault();
    onSaveApiKey(apiKeyInput.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveSalary = (e) => {
    e.preventDefault();
    onSaveFixedSalary(parseFloat(salaryInput || 0));
    setSalarySuccess(true);
    setTimeout(() => setSalarySuccess(false), 3000);
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

  const handleConnectCosmos = async (e) => {
    e.preventDefault();
    if (!endpointInput.trim() || !keyInput.trim() || !userIdInput.trim()) {
      setCosmosMsg({ type: 'error', text: 'Por favor, llena todos los campos de Cosmos DB.' });
      return;
    }

    setCosmosLoading(true);
    setCosmosMsg({ type: '', text: '' });

    try {
      const result = await loadStateFromCosmos(endpointInput, keyInput, userIdInput);
      
      if (result.success) {
        onImportData(result.state);
        onSaveCosmosConfig({
          endpoint: endpointInput.trim(),
          key: keyInput.trim(),
          userId: userIdInput.trim()
        });
        setCosmosMsg({ type: 'success', text: '✅ Conectado y datos descargados correctamente desde Azure Cosmos DB.' });
      } else if (result.error === 'no_found') {
        onSaveCosmosConfig({
          endpoint: endpointInput.trim(),
          key: keyInput.trim(),
          userId: userIdInput.trim()
        });
        setCosmosMsg({ type: 'success', text: '✅ Conectado con éxito. No se encontraron datos previos; se creará un registro nuevo en tu próximo movimiento.' });
      } else {
        setCosmosMsg({ type: 'error', text: `❌ ${result.error}` });
      }
    } catch (err) {
      setCosmosMsg({ type: 'error', text: '❌ Error de red al intentar conectar.' });
    } finally {
      setCosmosLoading(false);
    }
  };

  const handlePushToCosmos = async () => {
    if (!cosmosEndpoint || !cosmosKey) {
      setCosmosMsg({ type: 'error', text: 'Primero debes guardar y vincular la base de datos.' });
      return;
    }

    setCosmosLoading(true);
    setCosmosMsg({ type: '', text: '' });

    try {
      const result = await saveStateToCosmos(cosmosEndpoint, cosmosKey, cosmosUserId, financialState);
      if (result.success) {
        setCosmosMsg({ type: 'success', text: '✅ Datos subidos y respaldados correctamente en Azure Cosmos DB.' });
      } else {
        setCosmosMsg({ type: 'error', text: `❌ ${result.error}` });
      }
    } catch (err) {
      setCosmosMsg({ type: 'error', text: '❌ Error al subir los datos.' });
    } finally {
      setCosmosLoading(false);
    }
  };

  return (
    <div style={{ animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} className="dashboard-grid">
      
      {/* Columna Izquierda: Configuración de Claves y Cosmos DB */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* NUEVO: Configuración de Salario y Presupuesto */}
        <div className="glass-card">
          <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PiggyBank size={22} color="var(--color-teal)" />
            Presupuesto e Ingresos
          </h2>
          <p style={{ marginBottom: '20px', fontSize: '13.5px' }}>
            Registra tu salario mensual recurrente. Esto habilitará un botón de registro rápido en tu dashboard y permitirá a la IA evaluar tus metas de ahorro mensuales.
          </p>

          <form onSubmit={handleSaveSalary} style={{ marginBottom: '10px' }}>
            <div className="form-group">
              <label>Salario Fijo Mensual (COP)</label>
              <div style={{ position: 'relative' }}>
                <Landmark size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="number" 
                  className="form-control" 
                  style={{ paddingLeft: '32px' }}
                  placeholder="Ej: 3500000"
                  value={salaryInput}
                  onChange={(e) => setSalaryInput(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              {salarySuccess ? (
                <>
                  <Check size={16} /> ¡Salario Guardado!
                </>
              ) : (
                <>
                  <Check size={16} /> Guardar Salario
                </>
              )}
            </button>
          </form>
        </div>

        {/* Gemini API Card */}
        <div className="glass-card">
          <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={22} color="var(--color-teal)" />
            Inteligencia Artificial (Gemini)
          </h2>
          <p style={{ marginBottom: '20px', fontSize: '13.5px' }}>
            Configura tu clave de API de Gemini para habilitar el motor conversacional avanzado y el análisis financiero inteligente profundo.
          </p>

          <form onSubmit={handleSaveKey} style={{ marginBottom: '20px' }}>
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

          <div style={{ fontSize: '12px', background: 'rgba(0, 242, 254, 0.03)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(0, 242, 254, 0.08)' }}>
            <span style={{ color: 'var(--color-teal)', fontWeight: '600' }}>Tip:</span> Consigue tu clave API gratis en <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-teal)' }}>Google AI Studio</a>.
          </div>
        </div>

        {/* Azure Cosmos DB Sync Card */}
        <div className="glass-card">
          <h2 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={22} color="var(--color-purple)" />
            Base de Datos en la Nube (Azure Cosmos DB)
          </h2>
          <p style={{ marginBottom: '15px', fontSize: '13.5px' }}>
            Conéctate a tu base de datos Cosmos DB gratuita en Azure. Permite sincronizar tus datos en tiempo real entre múltiples dispositivos y compartirlos con tu esposa.
          </p>

          <form onSubmit={handleConnectCosmos}>
            <div className="form-group">
              <label>Cosmos DB Endpoint URI</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="https://cosmos-finanzas-ia-...documents.azure.com:443/"
                value={endpointInput}
                onChange={(e) => setEndpointInput(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Clave Principal (Primary Key)</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="Clave primaria de Cosmos DB..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>ID del Hogar / Familia (Partition Key)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Ej: hogar-lagos"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, background: 'var(--grad-purple)', boxShadow: '0 4px 15px rgba(127,0,255,0.2)' }} disabled={cosmosLoading}>
                {cosmosLoading ? 'Conectando...' : 'Vincular y Descargar'}
              </button>
              {cosmosEndpoint && (
                <button type="button" className="btn" style={{ flex: 1 }} onClick={handlePushToCosmos} disabled={cosmosLoading}>
                  Subir Datos
                </button>
              )}
            </div>
          </form>

          {cosmosMsg.text && (
            <div style={{ 
              marginTop: '15px', 
              padding: '10px 12px', 
              borderRadius: '8px', 
              fontSize: '12.5px',
              background: cosmosMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: cosmosMsg.type === 'success' ? 'var(--color-green)' : 'var(--color-red)',
              border: `1px solid ${cosmosMsg.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
            }}>
              {cosmosMsg.text}
            </div>
          )}

          {cosmosEndpoint && (
            <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-green)', fontWeight: '600' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-green)', display: 'inline-block', boxShadow: '0 0 6px var(--color-green)' }}></span>
              Nube Conectada | Canal: {cosmosUserId}
            </div>
          )}
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

        {/* Advertencia sobre CORS */}
        {endpointInput && (
          <div className="glass-card" style={{ background: 'rgba(245, 158, 11, 0.03)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
            <h4 style={{ fontSize: '13px', color: 'var(--color-orange)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={15} /> Nota de Conectividad Cosmos DB
            </h4>
            <p style={{ fontSize: '11.5px', lineHeight: '1.5', color: 'var(--text-muted)' }}>
              Por defecto, el script de Terraform habilita CORS para cualquier origen. Si cambias la configuración en Azure, asegúrate de añadir <code>https://lively-mushroom-0ce55270f.7.azurestaticapps.net</code> en la sección de CORS de tu cuenta de Cosmos DB para permitir el acceso directo desde el navegador.
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
