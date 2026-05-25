import React, { useState } from 'react';
import { Plus, Search, Filter, Trash2, Calendar, FileText, ArrowUpRight, ArrowDownLeft, Upload, Sparkles, CheckCircle, RefreshCw } from 'lucide-react';
import { parseDocumentWithGemini } from '../services/aiParser';

export default function Transactions({ 
  transactions, 
  cards, 
  onAddTransaction, 
  onRemoveTransaction,
  geminiApiKey,
  financialState
}) {
  
  // Form state
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentación');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCard, setSelectedCard] = useState('');
  const [installments, setInstallments] = useState(1);
  const [interestRate, setInterestRate] = useState(0);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Scanner state
  const [activeMode, setActiveMode] = useState('manual'); // 'manual' or 'ai_scan'
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBase64, setFileBase64] = useState('');
  const [fileText, setFileText] = useState('');
  const [isTextFile, setIsTextFile] = useState(false);
  const [mimeType, setMimeType] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [previewTransactions, setPreviewTransactions] = useState([]);

  // Handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setScanError('');
    setPreviewTransactions([]);

    // Verificar si el PDF está protegido con contraseña
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const checkReader = new FileReader();
      checkReader.onload = (checkEvent) => {
        const data = new Uint8Array(checkEvent.target.result);
        let pdfHeader = '';
        for (let i = 0; i < Math.min(data.length, 8192); i++) {
          pdfHeader += String.fromCharCode(data[i]);
        }
        const isEncrypted = /\/Encrypt\s*\d+\s+\d+\s+R/.test(pdfHeader) || pdfHeader.includes('/Encrypt');
        if (isEncrypted) {
          setScanError("⚠️ El archivo PDF está protegido con contraseña (encriptado). Aura no puede leer documentos protegidos. Por favor, remueve la contraseña del PDF antes de cargarlo, o sube una captura de pantalla/imagen del documento.");
        }
      };
      checkReader.readAsArrayBuffer(file);
    }

    const reader = new FileReader();
    const isText = file.name.endsWith('.csv') || file.name.endsWith('.txt');
    setIsTextFile(isText);

    let typeOfFile = file.type;
    if (!typeOfFile) {
      if (file.name.endsWith('.pdf')) typeOfFile = 'application/pdf';
      else if (file.name.endsWith('.png')) typeOfFile = 'image/png';
      else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) typeOfFile = 'image/jpeg';
      else if (file.name.endsWith('.webp')) typeOfFile = 'image/webp';
      else if (file.name.endsWith('.csv')) typeOfFile = 'text/csv';
      else if (file.name.endsWith('.txt')) typeOfFile = 'text/plain';
    }
    setMimeType(typeOfFile);

    reader.onload = (event) => {
      if (isText) {
        setFileText(event.target.result);
      } else {
        const dataUrl = event.target.result;
        const base64 = dataUrl.split(',')[1];
        setFileBase64(base64);
      }
    };

    if (isText) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const handleScanDocument = async () => {
    if (!selectedFile || scanning) return;
    if (scanError && scanError.includes("protegido")) return;
    
    if (!geminiApiKey) {
      setScanError("⚠️ Por favor configura tu clave de Gemini API en la pestaña Ajustes para poder escanear con IA.");
      return;
    }

    setScanning(true);
    setScanError('');

    try {
      const dataToSend = isTextFile ? fileText : fileBase64;
      const extracted = await parseDocumentWithGemini(dataToSend, mimeType, isTextFile, geminiApiKey, financialState);
      
      if (extracted && extracted.length > 0) {
        setPreviewTransactions(extracted.map((tx, idx) => ({
          ...tx,
          id: Date.now().toString() + idx,
          checked: true
        })));
      } else {
        setScanError("No se encontraron transacciones en el documento. Asegúrate de que los montos e ingresos/gastos estén legibles.");
      }
    } catch (err) {
      console.error(err);
      setScanError(err.message || "Error al procesar el archivo. Intenta con otra imagen o PDF.");
    } finally {
      setScanning(false);
    }
  };

  const handleImportTransactions = () => {
    const selectedTxs = previewTransactions.filter(t => t.checked);
    if (selectedTxs.length === 0) return;

    selectedTxs.forEach(t => {
      onAddTransaction({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        type: t.type,
        amount: t.amount,
        category: t.category || 'Otros',
        description: t.description || 'Gasto importado',
        date: t.date || new Date().toISOString().split('T')[0],
        targetName: t.targetName || '',
        installments: t.installments || 1,
        interestRate: t.interestRate || 0
      });
    });

    setSelectedFile(null);
    setPreviewTransactions([]);
    alert(`¡Se importaron ${selectedTxs.length} transacciones correctamente!`);
  };

  // Format Helper
  const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || !description) return;

    const isCard = type === 'expense' && selectedCard !== '';

    onAddTransaction({
      id: Date.now().toString(),
      type,
      amount: parseFloat(amount),
      category: type === 'income' ? 'Ingresos' : category,
      description,
      date,
      targetName: type === 'expense' ? selectedCard : '',
      installments: isCard ? parseInt(installments, 10) : 1,
      interestRate: isCard ? parseFloat(interestRate) : 0
    });

    // Reset Form
    setAmount('');
    setDescription('');
    setSelectedCard('');
    setInstallments(1);
    setInterestRate(0);
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <div style={{ animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} className="dashboard-grid">
      
      {/* Lado Izquierdo: Formulario Manual vs Escáner IA */}
      <div className="glass-card" style={{ height: 'fit-content' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button 
            type="button" 
            className={`btn ${activeMode === 'manual' ? 'btn-primary' : ''}`}
            style={{ flex: 1, padding: '8px', fontSize: '13px' }}
            onClick={() => setActiveMode('manual')}
          >
            Registro Manual
          </button>
          <button 
            type="button" 
            className={`btn ${activeMode === 'ai_scan' ? 'btn-primary' : ''}`}
            style={{ flex: 1, padding: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={() => setActiveMode('ai_scan')}
          >
            <Sparkles size={14} /> Escanear con IA
          </button>
        </div>

        {activeMode === 'manual' ? (
          <>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} color="var(--color-teal)" />
              Registrar Movimiento Manual
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tipo de Operación</label>
                <select 
                  className="form-control"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="expense">Gasto</option>
                  <option value="income">Ingreso</option>
                </select>
              </div>

              <div className="form-group">
                <label>Monto (COP)</label>
                <input 
                  type="number" 
                  className="form-control"
                  placeholder="Ej: 25000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              {type === 'expense' && (
                <>
                  <div className="form-group">
                    <label>Categoría</label>
                    <select 
                      className="form-control"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Alimentación">Alimentación</option>
                      <option value="Transporte">Transporte</option>
                      <option value="Entretenimiento">Entretenimiento</option>
                      <option value="Servicios">Servicios</option>
                      <option value="Compras">Compras</option>
                      <option value="Salud">Salud</option>
                      <option value="Educación">Educación</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Método de Pago (Cargar a)</label>
                    <select 
                      className="form-control"
                      value={selectedCard}
                      onChange={(e) => setSelectedCard(e.target.value)}
                    >
                      <option value="">Saldo Disponible (Efectivo/Débito)</option>
                      {cards.map((card, idx) => (
                        <option key={idx} value={card.name}>
                          Tarjeta de Crédito: {card.name} (Cupo disp: {formatMoney(card.limit - card.balance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCard !== '' && (
                    <div className="form-row" style={{ animation: 'slideIn 0.2s ease-out' }}>
                      <div className="form-group">
                        <label>Diferir a cuotas</label>
                        <input 
                          type="number" 
                          min="1" 
                          className="form-control" 
                          value={installments}
                          onChange={(e) => setInstallments(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Interés mensual %</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          className="form-control" 
                          placeholder="Ej: 1.8"
                          value={interestRate}
                          onChange={(e) => setInterestRate(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="form-group">
                <label>Concepto / Descripción</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Ej: Almuerzo ejecutivo, Pago nómina..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Fecha</label>
                <input 
                  type="date" 
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Registrar Movimiento
              </button>
            </form>
          </>
        ) : (
          <>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--color-teal)" />
              Escanear Factura o Extracto
            </h3>
            
            <div className="form-group" style={{ 
              textAlign: 'center', 
              border: '2px dashed rgba(0, 242, 254, 0.2)', 
              padding: '30px 20px', 
              borderRadius: '12px', 
              cursor: 'pointer', 
              background: 'rgba(255,255,255,0.01)', 
              position: 'relative',
              transition: 'all 0.2s'
            }}>
              <input 
                type="file" 
                accept="image/*,application/pdf,.csv,.txt"
                onChange={handleFileChange} 
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              />
              <Upload size={36} color="var(--color-teal)" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
              {selectedFile ? (
                <div>
                  <strong style={{ fontSize: '13.5px', color: 'var(--text-main)' }}>{selectedFile.name}</strong>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB | Tipo: {selectedFile.type || 'Desconocido'}
                  </div>
                </div>
              ) : (
                <div>
                  <strong style={{ fontSize: '13.5px', display: 'block', marginBottom: '4px', color: 'var(--text-main)' }}>Arrastra o selecciona tu archivo</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Soporta fotos (JPG/PNG), PDF, CSV o TXT</span>
                </div>
              )}
            </div>

            {selectedFile && (
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={handleScanDocument}
                disabled={scanning || (scanError && scanError.includes("protegido"))}
              >
                {scanning ? (
                  <>
                    <RefreshCw size={15} style={{ animation: 'spin 1.5s linear infinite' }} /> Aura está leyendo tu documento...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> Analizar con Aura IA
                  </>
                )}
              </button>
            )}

            {scanError && (
              <div style={{ marginTop: '15px', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', fontSize: '12.5px', color: 'var(--color-red)' }}>
                {scanError}
              </div>
            )}

            {previewTransactions.length > 0 && (
              <div style={{ marginTop: '25px', borderTop: '1px solid var(--card-border)', paddingTop: '15px' }}>
                <h4 style={{ fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '15px', color: 'var(--color-green)' }}>
                  <CheckCircle size={16} /> Movimientos Detectados por la IA
                </h4>
                
                <div style={{ display: 'grid', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px', marginBottom: '15px' }}>
                  {previewTransactions.map((tx, idx) => (
                    <div key={tx.id || idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '8px', fontSize: '12.5px' }}>
                      <input 
                        type="checkbox" 
                        checked={tx.checked} 
                        onChange={(e) => {
                          setPreviewTransactions(prev => prev.map(item => item.id === tx.id ? { ...item, checked: e.target.checked } : item));
                        }} 
                        style={{ marginTop: '3px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div className="flex-between">
                          <strong style={{ color: 'var(--text-main)' }}>{tx.description}</strong>
                          <span style={{ fontWeight: '700', color: tx.type === 'income' ? 'var(--color-green)' : 'var(--color-red)' }}>
                            {formatMoney(tx.amount)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          <span>Mes: {tx.date.substring(0, 7)}</span>
                          <span>Cat: {tx.category}</span>
                          {tx.targetName && <span style={{ color: 'var(--color-purple)' }}>{tx.targetName}</span>}
                          {tx.installments > 1 && <span>({tx.installments} cuotas)</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ width: '100%', background: 'var(--grad-green)' }}
                  onClick={handleImportTransactions}
                >
                  Confirmar e Importar {previewTransactions.filter(t => t.checked).length} Movimientos
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lado Derecho: Historial */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '20px' }}>Historial de Movimientos</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-control"
              style={{ paddingLeft: '32px' }}
              placeholder="Buscar por descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Filter size={14} style={{ position: 'absolute', left: '10px', top: '13px', color: 'var(--text-muted)' }} />
            <select 
              className="form-control"
              style={{ paddingLeft: '28px' }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Tipos</option>
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
              <option value="card_payment">Pago Tarjeta</option>
              <option value="loan_payment">Pago Vehículo</option>
              <option value="friend_lend">Préstamo dado</option>
              <option value="friend_borrow">Deuda recibida</option>
              <option value="friend_payback">Abono deuda</option>
              <option value="friend_receive_payback">Cobro deuda</option>
            </select>
          </div>

          <select 
            className="form-control"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">Categorías</option>
            <option value="Alimentación">Alimentación</option>
            <option value="Transporte">Transporte</option>
            <option value="Entretenimiento">Entretenimiento</option>
            <option value="Servicios">Servicios</option>
            <option value="Compras">Compras</option>
            <option value="Salud">Salud</option>
            <option value="Educación">Educación</option>
            <option value="Ingresos">Ingresos</option>
            <option value="Otros">Otros</option>
          </select>
        </div>

        {filteredTransactions.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            No se encontraron movimientos con los filtros aplicados.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Monto</th>
                  <th>Cuenta/Método</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx, idx) => (
                  <tr key={tx.id || idx}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} color="var(--text-muted)" />
                        {tx.date}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>
                        {tx.description}
                        {tx.installments > 1 && (
                          <span style={{ fontSize: '11px', color: 'var(--color-purple)', marginLeft: '8px', fontWeight: 'bold' }}>
                            ({tx.installments} cuotas {tx.interestRate > 0 ? `@ ${tx.interestRate}%` : ''})
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${tx.type === 'income' || tx.type === 'friend_receive_payback' ? 'income' : tx.type === 'expense' ? 'expense' : 'payment'}`}>
                        {tx.category}
                      </span>
                    </td>
                    <td>
                      <div style={{ 
                        fontWeight: '600', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        color: tx.type === 'income' || tx.type === 'friend_receive_payback' ? 'var(--color-green)' : 'var(--color-red)'
                      }}>
                        {tx.type === 'income' || tx.type === 'friend_receive_payback' ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <ArrowDownLeft size={14} />
                        )}
                        {formatMoney(tx.amount)}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {tx.targetName ? `Tarjeta: ${tx.targetName}` : 'Efectivo / Débito'}
                      </span>
                    </td>
                    <td>
                      <Trash2 
                        size={15} 
                        style={{ cursor: 'pointer', color: 'var(--color-red)', opacity: 0.7 }}
                        onClick={() => onRemoveTransaction(tx.id || idx)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
