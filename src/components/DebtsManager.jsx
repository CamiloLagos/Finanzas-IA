import React, { useState } from 'react';
import { CreditCard as CardIcon, Car, Users, Plus, Trash2, CheckCircle2, DollarSign } from 'lucide-react';

export default function DebtsManager({
  cards,
  vehicleLoans,
  friends,
  balance,
  onAddCard,
  onRemoveCard,
  onPayCard,
  onAddVehicleLoan,
  onRemoveVehicleLoan,
  onPayVehicleLoan,
  onAddFriendDebt,
  onRemoveFriendDebt,
  onPayFriendDebt
}) {
  const [activeTab, setActiveTab] = useState('cards'); // 'cards', 'vehicle', 'friends'

  // Card Form State
  const [cardName, setCardName] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [cardBalance, setCardBalance] = useState('');
  const [cardCutoff, setCardCutoff] = useState('');
  const [cardPayment, setCardPayment] = useState('');

  // Vehicle Form State
  const [vehName, setVehName] = useState('');
  const [vehTotal, setVehTotal] = useState('');
  const [vehBalance, setVehBalance] = useState('');
  const [vehQuota, setVehQuota] = useState('');
  const [vehRate, setVehRate] = useState('');

  // Friend Form State
  const [friendName, setFriendName] = useState('');
  const [friendType, setFriendType] = useState('por_cobrar');
  const [friendBalance, setFriendBalance] = useState('');

  // Payment states
  const [payTargetName, setPayTargetName] = useState(null); // { type: 'card'|'vehicle'|'friend', name: string }
  const [paymentAmount, setPaymentAmount] = useState('');

  // Format Helper
  const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  // Form Submissions
  const handleCardSubmit = (e) => {
    e.preventDefault();
    if (!cardName || !cardLimit) return;
    onAddCard({
      name: cardName,
      limit: parseFloat(cardLimit),
      balance: parseFloat(cardBalance || 0),
      cutoffDay: parseInt(cardCutoff || 1),
      paymentDay: parseInt(cardPayment || 10)
    });
    // Reset Form
    setCardName(''); setCardLimit(''); setCardBalance(''); setCardCutoff(''); setCardPayment('');
  };

  const handleVehicleSubmit = (e) => {
    e.preventDefault();
    if (!vehName || !vehTotal || !vehBalance || !vehQuota) return;
    onAddVehicleLoan({
      name: vehName,
      totalAmount: parseFloat(vehTotal),
      balance: parseFloat(vehBalance),
      monthlyPayment: parseFloat(vehQuota),
      interestRate: parseFloat(vehRate || 0)
    });
    // Reset Form
    setVehName(''); setVehTotal(''); setVehBalance(''); setVehQuota(''); setVehRate('');
  };

  const handleFriendSubmit = (e) => {
    e.preventDefault();
    if (!friendName || !friendBalance) return;
    onAddFriendDebt({
      name: friendName,
      type: friendType,
      balance: parseFloat(friendBalance)
    });
    // Reset Form
    setFriendName(''); setFriendBalance('');
  };

  // Payment actions
  const openPaymentModal = (type, name) => {
    setPayTargetName({ type, name });
    setPaymentAmount('');
  };

  const executePayment = (e) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0 || !payTargetName) return;
    const amount = parseFloat(paymentAmount);

    if (payTargetName.type === 'card') {
      onPayCard(payTargetName.name, amount);
    } else if (payTargetName.type === 'vehicle') {
      onPayVehicleLoan(payTargetName.name, amount);
    } else if (payTargetName.type === 'friend') {
      onPayFriendDebt(payTargetName.name, amount);
    }

    setPayTargetName(null);
  };

  return (
    <div style={{ animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      {/* Selector de Pestañas */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
        <button 
          className={`nav-btn ${activeTab === 'cards' ? 'active' : ''}`}
          onClick={() => { setActiveTab('cards'); setPayTargetName(null); }}
        >
          <CardIcon size={16} />
          Tarjetas de Crédito
        </button>
        <button 
          className={`nav-btn ${activeTab === 'vehicle' ? 'active' : ''}`}
          onClick={() => { setActiveTab('vehicle'); setPayTargetName(null); }}
        >
          <Car size={16} />
          Créditos de Vehículos
        </button>
        <button 
          className={`nav-btn ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => { setActiveTab('friends'); setPayTargetName(null); }}
        >
          <Users size={16} />
          Préstamos de Amigos
        </button>
      </div>

      {/* Grid: Formulario a un lado, Lista al otro */}
      <div className="dashboard-grid">
        
        {/* LADO DE LISTADOS */}
        <div>
          {activeTab === 'cards' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>Mis Tarjetas de Crédito</h2>
              {cards.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Aún no has registrado ninguna tarjeta de crédito.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {cards.map((card, index) => {
                    const percentUsed = card.limit > 0 ? (card.balance / card.limit) * 100 : 0;
                    return (
                      <div key={index} className="credit-card-item">
                        <div>
                          <div className="flex-between">
                            <span className="credit-card-name">{card.name}</span>
                            <Trash2 
                              size={16} 
                              style={{ cursor: 'pointer', opacity: 0.7 }}
                              onClick={() => onRemoveCard(card.name)}
                            />
                          </div>
                          <div className="credit-card-chip"></div>
                          <div className="credit-card-number">•••• •••• •••• {index + 1}234</div>
                        </div>
                        <div>
                          <div className="flex-between" style={{ fontSize: '13px', margin: '4px 0' }}>
                            <span>Utilizado: {formatMoney(card.balance)}</span>
                            <span>Límite: {formatMoney(card.limit)}</span>
                          </div>
                          <div className="progress-bar-container" style={{ background: 'rgba(255,255,255,0.2)' }}>
                            <div 
                              className="progress-bar-fill" 
                              style={{ 
                                width: `${Math.min(100, percentUsed)}%`,
                                background: percentUsed > 80 ? 'var(--color-red)' : 'white' 
                              }}
                            ></div>
                          </div>
                          <div className="credit-card-limit-info" style={{ marginTop: '10px' }}>
                            <span>Corte: Día {card.cutoffDay} | Pago: Día {card.paymentDay}</span>
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '4px 10px', fontSize: '11px', background: 'white', color: 'var(--color-purple)' }}
                              onClick={() => openPaymentModal('card', card.name)}
                            >
                              Abonar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'vehicle' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>Mis Créditos de Vehículos</h2>
              {vehicleLoans.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Aún no has registrado ningún crédito de vehículo.
                </div>
              ) : (
                <div>
                  {vehicleLoans.map((loan, index) => {
                    const progress = loan.totalAmount > 0 ? ((loan.totalAmount - loan.balance) / loan.totalAmount) * 100 : 0;
                    return (
                      <div key={index} className="auto-loan-item">
                        <div className="flex-between" style={{ marginBottom: '10px' }}>
                          <span style={{ fontSize: '18px', fontWeight: '700' }}>{loan.name}</span>
                          <Trash2 
                            size={16} 
                            style={{ cursor: 'pointer', opacity: 0.7 }}
                            onClick={() => onRemoveVehicleLoan(loan.name)}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', fontSize: '14px', marginBottom: '15px' }}>
                          <div>
                            <div style={{ opacity: 0.8, fontSize: '12px' }}>Saldo Restante</div>
                            <div style={{ fontSize: '16px', fontWeight: '700' }}>{formatMoney(loan.balance)}</div>
                          </div>
                          <div>
                            <div style={{ opacity: 0.8, fontSize: '12px' }}>Cuota Mensual</div>
                            <div style={{ fontSize: '16px', fontWeight: '700' }}>{formatMoney(loan.monthlyPayment)}</div>
                          </div>
                          <div>
                            <div style={{ opacity: 0.8, fontSize: '12px' }}>Financiado Total</div>
                            <div style={{ fontSize: '16px', fontWeight: '700' }}>{formatMoney(loan.totalAmount)}</div>
                          </div>
                        </div>
                        <div style={{ margin: '10px 0' }}>
                          <div className="flex-between" style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>
                            <span>Progreso de Pago: {progress.toFixed(1)}%</span>
                            <span>Tasa de interés: {loan.interestRate}% EA</span>
                          </div>
                          <div className="progress-bar-container" style={{ background: 'rgba(255,255,255,0.2)' }}>
                            <div className="progress-bar-fill" style={{ width: `${progress}%`, background: 'white' }}></div>
                          </div>
                        </div>
                        <div className="flex-between" style={{ marginTop: '15px' }}>
                          <span style={{ fontSize: '12px', opacity: 0.8 }}>Pago automático restará de tu Saldo Disponible.</span>
                          <button 
                            className="btn" 
                            style={{ padding: '6px 12px', fontSize: '12px', background: 'white', color: 'var(--color-orange)', border: 'none', fontWeight: '600' }}
                            onClick={() => openPaymentModal('vehicle', loan.name)}
                          >
                            Pagar Cuota ({formatMoney(loan.monthlyPayment)})
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'friends' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>Préstamos de Amigos / Conocidos</h2>
              {friends.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Aún no tienes deudas registradas con amigos.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '15px' }}>
                  {friends.map((friend, index) => (
                    <div key={index} className="glass-card" style={{ borderLeft: `5px solid ${friend.type === 'por_cobrar' ? 'var(--color-green)' : 'var(--color-red)'}` }}>
                      <div className="flex-between">
                        <div>
                          <h3 style={{ fontSize: '16px' }}>{friend.name}</h3>
                          <span className={`badge ${friend.type === 'por_cobrar' ? 'badge-income' : 'badge-expense'}`} style={{ marginTop: '4px', display: 'inline-block' }}>
                            {friend.type === 'por_cobrar' ? 'Cuentas por Cobrar (Me debe)' : 'Cuentas por Pagar (Le debo)'}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: friend.type === 'por_cobrar' ? 'var(--color-green)' : 'var(--color-red)' }}>
                            {formatMoney(friend.balance)}
                          </div>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn" 
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                              onClick={() => openPaymentModal('friend', friend.name)}
                            >
                              Abonar
                            </button>
                            <button 
                              className="btn btn-red" 
                              style={{ padding: '4px 10px', fontSize: '11px', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--color-red)' }}
                              onClick={() => onRemoveFriendDebt(friend.name)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* LADO DE FORMULARIOS / MODAL DE PAGO */}
        <div>
          {payTargetName ? (
            <div className="glass-card" style={{ border: '1px solid var(--color-teal)' }}>
              <div className="flex-between" style={{ marginBottom: '15px' }}>
                <h3 style={{ fontSize: '18px' }}>Registrar Pago / Abono</h3>
                <button className="btn" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => setPayTargetName(null)}>
                  Cancelar
                </button>
              </div>
              <p style={{ marginBottom: '15px', fontSize: '13px' }}>
                Registra un pago para: <strong>{payTargetName.name}</strong>. Esto deducirá el monto de tu Saldo Disponible ({formatMoney(balance)}) y reducirá la deuda correspondiente.
              </p>
              <form onSubmit={executePayment}>
                <div className="form-group">
                  <label>Monto del Abono (COP)</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                    <input
                      type="number"
                      className="form-control"
                      style={{ paddingLeft: '32px' }}
                      placeholder="Ej: 50000"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  <CheckCircle2 size={16} /> Confirmar Pago
                </button>
              </form>
            </div>
          ) : (
            <div className="glass-card">
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="var(--color-teal)" />
                Agregar Nuevo Registro
              </h3>

              {activeTab === 'cards' && (
                <form onSubmit={handleCardSubmit}>
                  <div className="form-group">
                    <label>Nombre de la Tarjeta</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ej: Visa Bancolombia, Mastercard..." 
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Límite de Crédito (Cupo Total COP)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="Ej: 5000000" 
                      value={cardLimit}
                      onChange={e => setCardLimit(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Cupo Utilizado Actual (Deuda Actual COP)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="Ej: 450000 (Opcional)" 
                      value={cardBalance}
                      onChange={e => setCardBalance(e.target.value)}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Día de Corte</label>
                      <input 
                        type="number" 
                        min="1" max="31" 
                        className="form-control" 
                        placeholder="Ej: 15" 
                        value={cardCutoff}
                        onChange={e => setCardCutoff(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Día de Pago</label>
                      <input 
                        type="number" 
                        min="1" max="31" 
                        className="form-control" 
                        placeholder="Ej: 5" 
                        value={cardPayment}
                        onChange={e => setCardPayment(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                    Crear Tarjeta
                  </button>
                </form>
              )}

              {activeTab === 'vehicle' && (
                <form onSubmit={handleVehicleSubmit}>
                  <div className="form-group">
                    <label>Nombre del Crédito</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ej: Crédito Chevrolet tracker, Moto..." 
                      value={vehName}
                      onChange={e => setVehName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Monto Total Financiado</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="Ej: 40000000" 
                        value={vehTotal}
                        onChange={e => setVehTotal(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Saldo Pendiente Actual</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="Ej: 35000000" 
                        value={vehBalance}
                        onChange={e => setVehBalance(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Cuota Mensual (COP)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="Ej: 600000" 
                        value={vehQuota}
                        onChange={e => setVehQuota(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Tasa Interés Anual (%)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="form-control" 
                        placeholder="Ej: 14.5" 
                        value={vehRate}
                        onChange={e => setVehRate(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                    Crear Crédito de Vehículo
                  </button>
                </form>
              )}

              {activeTab === 'friends' && (
                <form onSubmit={handleFriendSubmit}>
                  <div className="form-group">
                    <label>Nombre del Amigo / Conocido</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ej: Juan Pérez, Carlos..." 
                      value={friendName}
                      onChange={e => setFriendName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Tipo de Cuenta</label>
                    <select 
                      className="form-control"
                      value={friendType}
                      onChange={e => setFriendType(e.target.value)}
                    >
                      <option value="por_cobrar">Cuentas por Cobrar (Me debe dinero)</option>
                      <option value="por_pagar">Cuentas por Pagar (Le debo dinero)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Monto de la Deuda (COP)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="Ej: 150000" 
                      value={friendBalance}
                      onChange={e => setFriendBalance(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                    Agregar Registro
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
