import React from 'react';
import { Wallet, CreditCard, Car, Users, TrendingUp, TrendingDown, DollarSign, Landmark, ArrowUpRight } from 'lucide-react';

export default function Dashboard({ transactions, cards, vehicleLoans, friends, balance, fixedSalary, onAddTransaction }) {
  
  // Format money helper
  const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  // Calculate stats
  const totalIncome = transactions
    .filter(t => t.type === 'income' || t.type === 'friend_receive_payback')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const activeCardsDebt = cards.reduce((acc, c) => acc + c.balance, 0);
  const totalVehicleDebt = vehicleLoans.reduce((acc, v) => acc + v.balance, 0);
  
  const friendsToReceive = friends.filter(f => f.type === 'por_cobrar').reduce((acc, f) => acc + f.balance, 0);
  const friendsToPay = friends.filter(f => f.type === 'por_pagar').reduce((acc, f) => acc + f.balance, 0);
  const netFriendsBalance = friendsToReceive - friendsToPay;

  const netAssetValue = balance - activeCardsDebt - totalVehicleDebt + netFriendsBalance;

  // Category chart calculations
  const expensesByCategory = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    });

  const categoryColors = {
    'Alimentación': '#00f2fe',
    'Transporte': '#f59e0b',
    'Entretenimiento': '#9d4edd',
    'Servicios': '#3b82f6',
    'Compras': '#e100ff',
    'Salud': '#ef4444',
    'Educación': '#10b981',
    'Otros': '#6b7280'
  };

  const categoryData = Object.keys(expensesByCategory).map(cat => ({
    name: cat,
    value: expensesByCategory[cat],
    color: categoryColors[cat] || '#ffffff'
  })).sort((a, b) => b.value - a.value);

  const totalCatExpenses = categoryData.reduce((acc, c) => acc + c.value, 0);

  // SVG Donut calculations
  let accumulatedPercent = 0;
  const donutSlices = categoryData.map(slice => {
    const percent = totalCatExpenses > 0 ? (slice.value / totalCatExpenses) : 0;
    const startPercent = accumulatedPercent;
    accumulatedPercent += percent;

    const getCoordinatesForPercent = (p) => {
      const x = Math.cos(2 * Math.PI * p);
      const y = Math.sin(2 * Math.PI * p);
      return [x, y];
    };

    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(accumulatedPercent);
    const largeArcFlag = percent > 0.5 ? 1 : 0;

    const pathData = totalCatExpenses > 0 && percent < 1
      ? `M ${startX * 80} ${startY * 80} A 80 80 0 ${largeArcFlag} 1 ${endX * 80} ${endY * 80} L 0 0`
      : totalCatExpenses > 0 && percent >= 1
        ? `M 0 -80 A 80 80 0 1 1 -0.01 -80 Z`
        : '';

    return {
      ...slice,
      pathData,
      percent: (percent * 100).toFixed(1)
    };
  });

  const handleRegisterSalary = () => {
    if (!fixedSalary || fixedSalary <= 0) return;
    
    onAddTransaction({
      id: Date.now().toString(),
      type: 'income',
      amount: fixedSalary,
      category: 'Ingresos',
      description: 'Pago Salario Fijo',
      date: new Date().toISOString().split('T')[0],
      targetName: '',
      installments: 1,
      interestRate: 0
    });

    alert(`¡Salario de ${formatMoney(fixedSalary)} registrado con éxito en tu Saldo Disponible!`);
  };

  return (
    <div style={{ animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      {/* 4 Summary Stat Cards */}
      <div className="summary-grid">
        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Patrimonio Neto</span>
            <div className="stat-icon icon-teal">
              <Wallet size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value" style={{ color: netAssetValue >= 0 ? '#10b981' : '#ef4444' }}>
              {formatMoney(netAssetValue)}
            </div>
            <div className="stat-footer">
              <DollarSign size={14} />
              <span>Saldo disponible + deudas amigos - pasivos</span>
            </div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Saldo Disponible</span>
            <div className="stat-icon icon-green">
              <TrendingUp size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">{formatMoney(balance)}</div>
            <div className="stat-footer">
              <span style={{ color: 'var(--color-green)' }}>Efectivo / Débito disponible</span>
            </div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Deuda de Tarjetas</span>
            <div className="stat-icon icon-red">
              <CreditCard size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">{formatMoney(activeCardsDebt)}</div>
            <div className="stat-footer">
              <span>Cupo total utilizado en tus tarjetas</span>
            </div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Crédito de Vehículo</span>
            <div className="stat-icon icon-orange">
              <Car size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value">{formatMoney(totalVehicleDebt)}</div>
            <div className="stat-footer">
              <span>Saldo total de financiamiento activo</span>
            </div>
          </div>
        </div>
      </div>

      {/* NUEVO: Banner de Salario Fijo */}
      {fixedSalary > 0 && (
        <div className="glass-card" style={{ 
          marginBottom: '30px', 
          background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.05) 0%, rgba(127, 0, 255, 0.05) 100%)', 
          border: '1px solid rgba(0, 242, 254, 0.15)',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: 'rgba(0, 242, 254, 0.15)', padding: '10px', borderRadius: '12px', color: 'var(--color-teal)' }}>
              <Landmark size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: '700' }}>Salario Mensual Recurrente</h4>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Tienes un salario fijo mensual de <strong>{formatMoney(fixedSalary)}</strong> configurado.
              </p>
            </div>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={handleRegisterSalary}
          >
            <ArrowUpRight size={16} /> Registrar Pago de Nómina
          </button>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Visual Charts */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={18} color="var(--color-teal)" />
            Distribución de Gastos por Categoría
          </h3>

          {totalCatExpenses === 0 ? (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Aún no tienes gastos registrados para mostrar en el gráfico.
            </div>
          ) : (
            <div className="donut-chart-container">
              <div style={{ position: 'relative', width: '220px', height: '220px' }}>
                <svg width="220" height="220" viewBox="-100 -100 200 200" style={{ transform: 'rotate(-90deg)' }}>
                  {donutSlices.map((slice, index) => (
                    <path
                      key={index}
                      d={slice.pathData}
                      fill={slice.color}
                      style={{ transition: 'all 0.3s' }}
                    />
                  ))}
                  <circle cx="0" cy="0" r="50" fill="var(--bg-secondary)" />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Gastos</div>
                  <div style={{ fontSize: '16px', fontWeight: '700' }}>{formatMoney(totalCatExpenses)}</div>
                </div>
              </div>

              <div className="legend-list">
                {donutSlices.map((slice, index) => (
                  <div key={index} className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: slice.color }}></span>
                    <span style={{ fontWeight: '500' }}>{slice.name}:</span>
                    <span style={{ color: 'var(--text-muted)' }}>{formatMoney(slice.value)} ({slice.percent}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flow Chart */}
          <div style={{ marginTop: '40px' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--color-green)" />
              Comparativa de Flujo Mensual
            </h3>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', height: '180px', padding: '10px 40px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  height: totalIncome > 0 ? `${Math.min(100, (totalIncome / Math.max(totalIncome, totalExpenses)) * 120)}px` : '4px',
                  width: '40px',
                  background: 'var(--grad-green)',
                  borderRadius: '6px 6px 0 0',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)',
                  transition: 'height 0.5s ease'
                }}></div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ingresos</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-green)' }}>{formatMoney(totalIncome)}</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  height: totalExpenses > 0 ? `${Math.min(100, (totalExpenses / Math.max(totalIncome, totalExpenses)) * 120)}px` : '4px',
                  width: '40px',
                  background: 'var(--grad-orange)',
                  borderRadius: '6px 6px 0 0',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)',
                  transition: 'height 0.5s ease'
                }}></div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gastos</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-orange)' }}>{formatMoney(totalExpenses)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel: Debts Summary Widget */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Credit Cards list preview */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
              <CreditCard size={18} color="var(--color-purple)" />
              Tarjetas de Crédito
            </h3>
            {cards.length === 0 ? (
              <p style={{ color: 'var(--text-dark)', fontSize: '13px' }}>No hay tarjetas configuradas.</p>
            ) : (
              cards.map((card, i) => {
                const percentUsed = card.limit > 0 ? (card.balance / card.limit) * 100 : 0;
                return (
                  <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '10px' }}>
                    <div className="flex-between" style={{ marginBottom: '6px' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>{card.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Corte: Día {card.cutoffDay}</span>
                    </div>
                    <div className="flex-between" style={{ fontSize: '13px', margin: '4px 0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Utilizado: {formatMoney(card.balance)}</span>
                      <span>Disponible: {formatMoney(card.limit - card.balance)}</span>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${Math.min(100, percentUsed)}%`,
                          background: percentUsed > 80 ? 'var(--color-red)' : percentUsed > 50 ? 'var(--color-orange)' : 'var(--color-purple)' 
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Vehicle loans list preview */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
              <Car size={18} color="var(--color-orange)" />
              Crédito de Vehículos
            </h3>
            {vehicleLoans.length === 0 ? (
              <p style={{ color: 'var(--text-dark)', fontSize: '13px' }}>No hay créditos de vehículo configurados.</p>
            ) : (
              vehicleLoans.map((loan, i) => {
                const progress = loan.totalAmount > 0 ? ((loan.totalAmount - loan.balance) / loan.totalAmount) * 100 : 0;
                return (
                  <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '10px' }}>
                    <div className="flex-between" style={{ marginBottom: '6px' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>{loan.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Cuota: {formatMoney(loan.monthlyPayment)}</span>
                    </div>
                    <div className="flex-between" style={{ fontSize: '13px', margin: '4px 0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Saldo: {formatMoney(loan.balance)}</span>
                      <span>Pagado: {progress.toFixed(0)}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${progress}%`,
                          background: 'var(--grad-orange)' 
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Friends debts summary widget */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
              <Users size={18} color="var(--color-teal)" />
              Amigos y Conocidos
            </h3>
            <div className="flex-between" style={{ fontSize: '12px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--card-border)' }}>
              <span style={{ color: 'var(--color-green)' }}>Me deben: {formatMoney(friendsToReceive)}</span>
              <span style={{ color: 'var(--color-red)' }}>Les debo: {formatMoney(friendsToPay)}</span>
            </div>
            {friends.length === 0 ? (
              <p style={{ color: 'var(--text-dark)', fontSize: '13px' }}>No hay cuentas con amigos configuradas.</p>
            ) : (
              friends.map((friend, i) => (
                <div key={i} className={`friend-debt-item ${friend.type === 'por_cobrar' ? 'to-receive' : 'to-pay'}`}>
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '13px' }}>{friend.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {friend.type === 'por_cobrar' ? 'Cuenta por Cobrar' : 'Cuenta por Pagar'}
                    </div>
                  </div>
                  <span style={{ 
                    fontWeight: '600', 
                    fontSize: '13.5px',
                    color: friend.type === 'por_cobrar' ? 'var(--color-green)' : 'var(--color-red)'
                  }}>
                    {formatMoney(friend.balance)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
