import React, { useState } from 'react';
import { Wallet, CreditCard, Car, Users, TrendingUp, TrendingDown, DollarSign, Landmark, ArrowUpRight, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

export default function Dashboard({ 
  transactions, 
  cards, 
  vehicleLoans, 
  friends, 
  balance, 
  fixedSalary, 
  onAddTransaction,
  onProcessMonthlyBilling, // Propiedades necesarias para pagar desde el checklist
  onPayVehicleLoan,
  recurringBills = []
}) {
  
  // Format money helper
  const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  // 1. OBTENER MESES DEL AÑO ACTUAL Y CON TRANSACCIONES
  const getMonthsList = () => {
    const months = new Set();
    const currentYear = new Date().getFullYear();
    
    // Generar todos los meses del año actual (ej. 2026-01 a 2026-12)
    for (let m = 1; m <= 12; m++) {
      const monthStr = `${currentYear}-${String(m).padStart(2, '0')}`;
      months.add(monthStr);
    }
    
    // Añadir mes actual por si acaso difiere del año actual
    const nowStr = new Date().toISOString().substring(0, 7);
    months.add(nowStr);
    
    // Añadir meses de transacciones existentes
    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        months.add(t.date.substring(0, 7));
      }
    });

    return Array.from(months).sort().reverse(); // Orden descendente (más recientes primero)
  };

  const monthsList = getMonthsList();
  
  // Estado para el mes seleccionado (inicializa en el mes calendario actual)
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7));

  // Formateador de nombres de meses en español
  const formatMonthName = (yearMonthStr) => {
    const [year, month] = yearMonthStr.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    const name = date.toLocaleString('es-CO', { month: 'long' });
    return `${name.charAt(0).toUpperCase() + name.slice(1)} ${year}`;
  };

  // 2. FILTRAR TRANSACCIONES POR EL MES SELECCIONADO
  const monthlyTransactions = transactions.filter(t => t.date && t.date.startsWith(selectedMonth));

  // 3. CALCULAR MÉTRICAS DEL MES SELECCIONADO
  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'income' || t.type === 'friend_receive_payback')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const monthlyExpenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const activeCardsDebt = cards.reduce((acc, c) => acc + c.balance, 0);
  const totalVehicleDebt = vehicleLoans.reduce((acc, v) => acc + v.balance, 0);
  
  const friendsToReceive = friends.filter(f => f.type === 'por_cobrar').reduce((acc, f) => acc + f.balance, 0);
  const friendsToPay = friends.filter(f => f.type === 'por_pagar').reduce((acc, f) => acc + f.balance, 0);
  const netFriendsBalance = friendsToReceive - friendsToPay;

  // El patrimonio neto es global y acumulativo (no mensual)
  const netAssetValue = balance - activeCardsDebt - totalVehicleDebt + netFriendsBalance;

  // 4. DISTRIBUCIÓN DE GASTOS DEL MES SELECCIONADO POR CATEGORÍA
  const expensesByCategory = {};
  monthlyTransactions
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

  // Donut slices
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

  // 5. DETERMINAR PENDIENTES Y OBLIGACIONES DEL MES
  const getObligationsList = () => {
    const list = [];
    const dateTodayStr = new Date().toISOString().substring(0, 10);

    // A. Verificar Salario Fijo
    if (fixedSalary > 0) {
      const isSalaryPaid = monthlyTransactions.some(t => 
        t.type === 'income' && (t.description.toLowerCase().includes('salario') || t.description.toLowerCase().includes('nomina'))
      );
      list.push({
        id: 'salary',
        name: 'Ingreso Salario Fijo',
        amount: fixedSalary,
        type: 'income',
        isPaid: isSalaryPaid,
        action: () => {
          onAddTransaction({
            id: Date.now().toString(),
            type: 'income',
            amount: fixedSalary,
            category: 'Ingresos',
            description: 'Pago Salario Fijo',
            date: `${selectedMonth}-28`, // Simular día de pago
            targetName: ''
          });
        }
      });
    }

    // B. Verificar Crédito de Vehículos
    vehicleLoans.forEach(loan => {
      const isPaid = monthlyTransactions.some(t => 
        t.type === 'loan_payment' && t.targetName === loan.name
      );
      list.push({
        id: `loan-${loan.name}`,
        name: `Cuota Crédito: ${loan.name}`,
        amount: loan.monthlyPayment,
        type: 'loan_payment',
        isPaid: isPaid,
        action: () => {
          if (window.confirm(`¿Deseas pagar la cuota de tu crédito ${loan.name} por ${formatMoney(loan.monthlyPayment)}? Esto deducirá el valor de tu saldo disponible y reducirá la deuda.`)) {
            onPayVehicleLoan(loan.name, loan.monthlyPayment, selectedMonth);
          }
        }
      });
    });

    // C. Verificar Cuotas de Tarjetas de Crédito (Diferidos del mes)
    cards.forEach(card => {
      const deferredItems = card.deferredPurchases || [];
      if (deferredItems.length > 0) {
        let cardInstallmentAmount = 0;
        deferredItems.forEach(item => {
          const principal = item.amount / item.installments;
          const remainingVal = item.amount - (principal * (item.installments - item.remainingInstallments));
          const interest = remainingVal * (item.interestRate / 100);
          cardInstallmentAmount += principal + interest;
        });

        // Buscar si ya se liquidó la tarjeta este mes
        const isPaid = monthlyTransactions.some(t => 
          t.type === 'card_payment' && t.description.toLowerCase().includes('abono a diferidos') && t.targetName === card.name
        );

        list.push({
          id: `card-${card.name}`,
          name: `Cuotas Diferidas: Tarjeta ${card.name}`,
          amount: cardInstallmentAmount,
          type: 'card_payment',
          isPaid: isPaid,
          action: () => {
            if (window.confirm(`¿Deseas pagar la cuota de diferidos de la tarjeta ${card.name} por ${formatMoney(cardInstallmentAmount)}? Esto deducirá el valor de tu saldo disponible y avanzará las cuotas de tus compras diferidas.`)) {
              onProcessMonthlyBilling(card.name, selectedMonth);
            }
          }
        });
      }
    });

    // D. Servicios Fijos Recurrentes (Hogar) - dinámicos
    const billsToProcess = recurringBills || [];

    billsToProcess.forEach(bill => {
      const isPaid = monthlyTransactions.some(t => 
        t.type === 'expense' && t.description.toLowerCase().includes(bill.keyword.toLowerCase())
      );

      list.push({
        id: `bill-${bill.keyword}`,
        name: bill.name,
        amount: bill.amount,
        type: 'expense',
        isPaid: isPaid,
        action: () => {
          onAddTransaction({
            id: Date.now().toString(),
            type: 'expense',
            amount: bill.amount,
            category: bill.category,
            description: bill.name,
            date: `${selectedMonth}-05`,
            targetName: ''
          });
        }
      });
    });

    return list;
  };

  const obligations = getObligationsList();
  
  // Totales de obligaciones pendientes
  const pendingObligationsCount = obligations.filter(o => !o.isPaid && o.type !== 'income').length;
  const pendingObligationsAmount = obligations
    .filter(o => !o.isPaid && o.type !== 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const pendingInflow = obligations
    .filter(o => !o.isPaid && o.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const pendingOutflow = pendingObligationsAmount;
  const projectedEndBalance = balance + pendingInflow - pendingOutflow;

  return (
    <div style={{ animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      
      {/* 0. SELECTOR DE MES Y AÑO A NIVEL GLOBAL */}
      <div className="flex-between" style={{ marginBottom: '25px', background: 'rgba(255,255,255,0.02)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={20} color="var(--color-teal)" />
          <h2 style={{ fontSize: '18px' }}>Periodo de Consulta</h2>
        </div>
        <select 
          className="form-control" 
          style={{ width: '220px', fontSize: '14px', fontWeight: '600', borderColor: 'var(--color-teal)' }}
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {monthsList.map((m, idx) => (
            <option key={idx} value={m}>
              {formatMonthName(m)}
            </option>
          ))}
        </select>
      </div>

      {/* 4 Summary Stat Cards (Contexto del Mes Seleccionado) */}
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
              <span>Balance Global Acumulado</span>
            </div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Ingresos ({formatMonthName(selectedMonth).split(' ')[0]})</span>
            <div className="stat-icon icon-green">
              <TrendingUp size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--color-green)' }}>
              {formatMoney(monthlyIncome)}
            </div>
            <div className="stat-footer">
              <span>Registrados en el mes</span>
            </div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Gastos ({formatMonthName(selectedMonth).split(' ')[0]})</span>
            <div className="stat-icon icon-red">
              <TrendingDown size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--color-red)' }}>
              {formatMoney(monthlyExpenses)}
            </div>
            <div className="stat-footer">
              <span>Registrados en el mes</span>
            </div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <span className="stat-title">Pendiente por Pagar</span>
            <div className="stat-icon icon-orange">
              <CreditCard size={20} />
            </div>
          </div>
          <div>
            <div className="stat-value" style={{ color: pendingObligationsCount > 0 ? 'var(--color-orange)' : 'var(--color-green)' }}>
              {formatMoney(pendingObligationsAmount)}
            </div>
            <div className="stat-footer">
              <span>{pendingObligationsCount} pagos pendientes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Central */}
      <div className="dashboard-grid">
        
        {/* LADO IZQUIERDO: PENDIENTES Y OBLIGACIONES DEL MES */}
        <div className="glass-card">
          <div className="flex-between" style={{ marginBottom: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Landmark size={20} color="var(--color-teal)" />
              Pendientes y Obligaciones: {formatMonthName(selectedMonth)}
            </h3>
            {pendingObligationsCount === 0 ? (
              <span className="badge badge-income" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> Todo al día
              </span>
            ) : (
              <span className="badge badge-expense" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} /> {pendingObligationsCount} por pagar
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {obligations.map((ob, idx) => (
              <div 
                key={ob.id || idx} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: ob.isPaid ? 'rgba(16, 185, 129, 0.03)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${ob.isPaid ? 'rgba(16, 185, 129, 0.15)' : 'var(--card-border)'}`,
                  borderRadius: '12px',
                  transition: 'all 0.2s'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14.5px', color: ob.isPaid ? 'var(--text-muted)' : 'var(--text-main)' }}>
                    {ob.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Monto estimado: {formatMoney(ob.amount)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {ob.isPaid ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-green)', fontSize: '13px', fontWeight: '600' }}>
                      <CheckCircle2 size={16} /> {ob.type === 'income' ? 'Recibido' : 'Pagado'}
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-orange)', fontSize: '13px', fontWeight: '600' }}>
                        <AlertCircle size={16} /> Pendiente
                      </div>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '11.5px', background: ob.type === 'income' ? 'var(--grad-green)' : 'var(--grad-teal)' }}
                        onClick={ob.action}
                      >
                        {ob.type === 'income' ? 'Recibir' : 'Pagar Ahora'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LADO DERECHO: GRÁFICO DE GASTOS Y CATEGORÍAS */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={18} color="var(--color-teal)" />
            Gastos por Categoría ({formatMonthName(selectedMonth).split(' ')[0]})
          </h3>

          {totalCatExpenses === 0 ? (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Sin gastos en este mes.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              {/* Custom SVG Donut Chart */}
              <div style={{ position: 'relative', width: '160px', height: '160px' }}>
                <svg width="160" height="160" viewBox="-100 -100 200 200" style={{ transform: 'rotate(-90deg)' }}>
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
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Gastos</div>
                  <div style={{ fontSize: '14px', fontWeight: '700' }}>{formatMoney(totalCatExpenses)}</div>
                </div>
              </div>

              {/* Legend List */}
              <div style={{ width: '100%' }}>
                {donutSlices.map((slice, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: slice.color }}></span>
                      <span>{slice.name}</span>
                    </div>
                    <span style={{ fontWeight: '600' }}>
                      {formatMoney(slice.value)} ({slice.percent}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparativa */}
          <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid var(--card-border)' }}>
            <h4 style={{ fontSize: '13.5px', marginBottom: '15px' }}>Resumen del Flujo</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Ingresado</span>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-green)', marginTop: '4px' }}>{formatMoney(monthlyIncome)}</div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Gastado</span>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-red)', marginTop: '4px' }}>{formatMoney(monthlyExpenses)}</div>
              </div>
            </div>
          </div>

          {/* Pronóstico de Flujo de Caja */}
          <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid var(--card-border)' }}>
            <h4 style={{ fontSize: '13.5px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={16} color="var(--color-teal)" />
              Pronóstico de Fin de Mes
            </h4>
            
            <div style={{ display: 'grid', gap: '10px', fontSize: '13px', marginBottom: '15px' }}>
              <div className="flex-between">
                <span style={{ color: 'var(--text-muted)' }}>Saldo Disponible actual:</span>
                <span style={{ fontWeight: '600' }}>{formatMoney(balance)}</span>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-muted)' }}>(+) Ingresos por cobrar:</span>
                <span style={{ fontWeight: '600', color: 'var(--color-green)' }}>{formatMoney(pendingInflow)}</span>
              </div>
              <div className="flex-between">
                <span style={{ color: 'var(--text-muted)' }}>(-) Pagos pendientes:</span>
                <span style={{ fontWeight: '600', color: 'var(--color-orange)' }}>{formatMoney(pendingOutflow)}</span>
              </div>
              <div className="flex-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px', fontSize: '14px' }}>
                <strong>Saldo Final Proyectado:</strong>
                <strong style={{ color: projectedEndBalance >= 0 ? 'var(--color-green)' : 'var(--color-red)', fontSize: '15px' }}>
                  {formatMoney(projectedEndBalance)}
                </strong>
              </div>
            </div>

            {/* Mensajes de Asesoría Contextual */}
            <div style={{ 
              padding: '12px', 
              borderRadius: '10px', 
              fontSize: '12px', 
              lineHeight: '1.5',
              background: projectedEndBalance < 0 
                ? 'rgba(239, 68, 68, 0.05)' 
                : projectedEndBalance < 200000 
                  ? 'rgba(245, 158, 11, 0.05)' 
                  : 'rgba(16, 185, 129, 0.05)',
              border: `1px solid ${
                projectedEndBalance < 0 
                  ? 'rgba(239, 68, 68, 0.15)' 
                  : projectedEndBalance < 200000 
                    ? 'rgba(245, 158, 11, 0.15)' 
                    : 'rgba(16, 185, 129, 0.15)'
              }`,
              color: projectedEndBalance < 0 
                ? 'var(--color-red)' 
                : projectedEndBalance < 200000 
                  ? 'var(--color-orange)' 
                  : 'var(--text-main)'
            }}>
              {projectedEndBalance < 0 ? (
                <span>
                  <strong>⚠️ Peligro de sobregiro:</strong> Tus obligaciones pendientes superan tu saldo disponible e ingresos por <strong>{formatMoney(Math.abs(projectedEndBalance))}</strong>. Te aconsejamos pausar gastos opcionales o refinanciar cuotas para evitar deudas de emergencia.
                </span>
              ) : projectedEndBalance < 200000 ? (
                <span>
                  <strong>⚠️ Flujo ajustado:</strong> Terminarás el mes con solo <strong>{formatMoney(projectedEndBalance)}</strong> libres. Evita gastos no planificados para no tener que recurrir a tarjetas de crédito.
                </span>
              ) : (
                <span style={{ color: 'var(--text-main)' }}>
                  <strong>✅ Excedente Proyectado:</strong> Terminarás el mes con un excedente de <strong style={{ color: 'var(--color-green)' }}>{formatMoney(projectedEndBalance)}</strong> libres. Dado que estás en proceso de salir de deudas, te sugerimos usar este excedente para hacer un <strong>abono extraordinario</strong> a la tarjeta de crédito o deuda con mayor tasa de interés (método avalancha) para ahorrar en intereses a largo plazo.
                </span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
