import React, { useState } from 'react';
import { Plus, Search, Filter, Trash2, Calendar, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function Transactions({ transactions, cards, onAddTransaction, onRemoveTransaction }) {
  
  // Form state
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentación');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCard, setSelectedCard] = useState('');
  const [installments, setInstallments] = useState(1);      // NUEVO: Estado de cuotas
  const [interestRate, setInterestRate] = useState(0);      // NUEVO: Estado de interés

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

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
      
      {/* Lado Izquierdo: Formulario Manual */}
      <div className="glass-card" style={{ height: 'fit-content' }}>
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

              {/* NUEVO: Campos dinámicos de diferimiento cuando se selecciona tarjeta */}
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
