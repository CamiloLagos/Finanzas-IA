import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, Car, Users, Settings as SettingsIcon, MessageSquare, Bot, HelpCircle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import DebtsManager from './components/DebtsManager';
import Transactions from './components/Transactions';
import AiChat from './components/AiChat';
import IntegrationPanel from './components/IntegrationPanel';
import Settings from './components/Settings';
import { startTelegramPolling, stopTelegramPolling, sendTelegramMessage } from './services/telegramBot';
import { parseTransactionTextLocal, parseTransactionTextGemini } from './services/aiParser';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Financial State
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [vehicleLoans, setVehicleLoans] = useState([]);
  const [friends, setFriends] = useState([]);
  
  // Settings / Keys
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramStatus, setTelegramStatus] = useState({ status: 'inactive', message: '' });
  
  // Chat History
  const [chatHistory, setChatHistory] = useState([]);

  // 1. LOAD STATE FROM LOCALSTORAGE ON MOUNT
  useEffect(() => {
    const localBalance = localStorage.getItem('fin_balance');
    const localTransactions = localStorage.getItem('fin_transactions');
    const localCards = localStorage.getItem('fin_cards');
    const localVehicles = localStorage.getItem('fin_vehicles');
    const localFriends = localStorage.getItem('fin_friends');
    const localGeminiKey = localStorage.getItem('fin_gemini_key');
    const localTelegramToken = localStorage.getItem('fin_telegram_token');
    const localChatHistory = localStorage.getItem('fin_chat_history');

    if (localBalance) setBalance(parseFloat(localBalance));
    if (localTransactions) setTransactions(JSON.parse(localTransactions));
    if (localCards) setCards(JSON.parse(localCards));
    if (localVehicles) setVehicleLoans(JSON.parse(localVehicles));
    if (localFriends) setFriends(JSON.parse(localFriends));
    if (localGeminiKey) setGeminiApiKey(localGeminiKey);
    if (localTelegramToken) setTelegramToken(localTelegramToken);
    if (localChatHistory) setChatHistory(JSON.parse(localChatHistory));
    
    if (!localBalance && !localTransactions && !localCards && !localVehicles && !localFriends) {
      loadDemoData();
    }
  }, []);

  // 2. SAVE STATE TO LOCALSTORAGE WHEN IT CHANGES
  useEffect(() => {
    localStorage.setItem('fin_balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('fin_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('fin_cards', JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem('fin_vehicles', JSON.stringify(vehicleLoans));
  }, [vehicleLoans]);

  useEffect(() => {
    localStorage.setItem('fin_friends', JSON.stringify(friends));
  }, [friends]);

  useEffect(() => {
    localStorage.setItem('fin_gemini_key', geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    localStorage.setItem('fin_telegram_token', telegramToken);
  }, [telegramToken]);

  useEffect(() => {
    localStorage.setItem('fin_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Clean up Telegram Bot Polling when app unmounts
  useEffect(() => {
    return () => {
      stopTelegramPolling();
    };
  }, []);

  // DEMO DATA SEEDER
  const loadDemoData = () => {
    const demoBalance = 2450000;
    const demoCards = [
      { 
        name: 'Visa Bancolombia', 
        limit: 4500000, 
        balance: 650000, 
        cutoffDay: 15, 
        paymentDay: 5,
        deferredPurchases: [
          {
            id: 'demo-deferred-1',
            description: 'Compra tiquetes aéreos',
            amount: 650000,
            installments: 6,
            remainingInstallments: 5,
            interestRate: 1.8,
            date: '2026-05-18'
          }
        ]
      },
      { 
        name: 'Mastercard Nubank', 
        limit: 2000000, 
        balance: 120000, 
        cutoffDay: 20, 
        paymentDay: 30,
        deferredPurchases: []
      }
    ];
    const demoVehicles = [
      { name: 'Crédito Chevrolet Tracker', totalAmount: 42000000, balance: 35400000, monthlyPayment: 680000, interestRate: 14.2 }
    ];
    const demoFriends = [
      { name: 'Juan Pérez', type: 'por_cobrar', balance: 150000 },
      { name: 'Carlos Gómez', type: 'por_pagar', balance: 80000 }
    ];
    const demoTransactions = [
      { id: '1', type: 'income', amount: 3200000, category: 'Ingresos', description: 'Pago Nómina Mayo', date: '2026-05-15', targetName: '', installments: 1, interestRate: 0 },
      { id: '2', type: 'expense', amount: 150000, category: 'Alimentación', description: 'Mercado de la semana', date: '2026-05-16', targetName: '', installments: 1, interestRate: 0 },
      { id: '3', type: 'expense', amount: 650000, category: 'Otros', description: 'Compra tiquetes aéreos', date: '2026-05-18', targetName: 'Visa Bancolombia', installments: 6, interestRate: 1.8 },
      { id: '4', type: 'expense', amount: 120000, category: 'Compras', description: 'Zapatos deportivos', date: '2026-05-19', targetName: 'Mastercard Nubank', installments: 1, interestRate: 0 },
      { id: '5', type: 'expense', amount: 45000, category: 'Transporte', description: 'Gasolina', date: '2026-05-20', targetName: '', installments: 1, interestRate: 0 },
      { id: '6', type: 'loan_payment', amount: 680000, category: 'Transporte', description: 'Pago cuota Crédito Vehículo: Chevrolet Tracker', date: '2026-05-22', targetName: 'Crédito Chevrolet Tracker', installments: 1, interestRate: 0 }
    ];

    setBalance(demoBalance);
    setCards(demoCards);
    setVehicleLoans(demoVehicles);
    setFriends(demoFriends);
    setTransactions(demoTransactions);
    
    setChatHistory([
      { sender: 'ai', text: '¡Hola! He cargado tus datos demo para que pruebes las deudas diferidas a cuotas.\n\nTienes una compra diferida en tu tarjeta Visa de unos tiquetes aéreos a 6 cuotas con 1.8% de interés. ¿En qué te puedo asesorar hoy?' }
    ]);
  };

  const clearAllData = () => {
    setBalance(0);
    setTransactions([]);
    setCards([]);
    setVehicleLoans([]);
    setFriends([]);
    setChatHistory([]);
    localStorage.removeItem('telegram_last_update_id');
    stopTelegramPolling();
    setTelegramStatus({ status: 'inactive', message: '' });
  };

  const importData = (importedState) => {
    setBalance(importedState.balance);
    setTransactions(importedState.transactions);
    setCards(importedState.cards.map(c => ({ ...c, deferredPurchases: c.deferredPurchases || [] })));
    setVehicleLoans(importedState.vehicleLoans);
    setFriends(importedState.friends);
    if (importedState.chatHistory) setChatHistory(importedState.chatHistory);
  };

  // ADD MANUAL TRANSACTION CALLBACK (Updated with Installments)
  const handleAddTransaction = (tx) => {
    const installments = tx.installments || 1;
    const interestRate = tx.interestRate || 0;

    if (tx.type === 'expense') {
      if (tx.targetName) {
        // Cargar a tarjeta de crédito
        setCards(prev => prev.map(c => {
          if (c.name === tx.targetName) {
            const updatedDeferred = [...(c.deferredPurchases || [])];
            
            // Si tiene cuotas, registrarla en diferidos
            if (installments > 1) {
              updatedDeferred.push({
                id: tx.id || Date.now().toString(),
                description: tx.description,
                amount: tx.amount,
                installments: installments,
                remainingInstallments: installments,
                interestRate: interestRate,
                date: tx.date || new Date().toISOString().split('T')[0]
              });
            }

            return {
              ...c,
              balance: c.balance + tx.amount,
              deferredPurchases: updatedDeferred
            };
          }
          return c;
        }));
      } else {
        // Restar de saldo disponible en efectivo
        setBalance(prev => prev - tx.amount);
      }
    } else if (tx.type === 'income') {
      // Sumar a saldo disponible
      setBalance(prev => prev + tx.amount);
    }

    // Guardar transacción
    const txToSave = {
      ...tx,
      installments,
      interestRate
    };
    setTransactions(prev => [txToSave, ...prev]);
  };

  // REMOVE TRANSACTION CALLBACK
  const handleRemoveTransaction = (id) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    if (tx.type === 'expense') {
      if (tx.targetName) {
        setCards(prev => prev.map(c => {
          if (c.name === tx.targetName) {
            return {
              ...c,
              balance: Math.max(0, c.balance - tx.amount),
              deferredPurchases: (c.deferredPurchases || []).filter(d => d.id !== id)
            };
          }
          return c;
        }));
      } else {
        setBalance(prev => prev + tx.amount);
      }
    } else if (tx.type === 'income') {
      setBalance(prev => Math.max(0, prev - tx.amount));
    } else if (tx.type === 'card_payment') {
      setBalance(prev => prev + tx.amount);
      setCards(prev => prev.map(c => 
        c.name === tx.targetName ? { ...c, balance: c.balance + tx.amount } : c
      ));
    } else if (tx.type === 'loan_payment') {
      setBalance(prev => prev + tx.amount);
      setVehicleLoans(prev => prev.map(v => 
        v.name === tx.targetName ? { ...v, balance: v.balance + tx.amount } : v
      ));
    } else if (tx.type === 'friend_lend') {
      setBalance(prev => prev + tx.amount);
      setFriends(prev => prev.map(f => 
        f.name === tx.targetName ? { ...f, balance: Math.max(0, f.balance - tx.amount) } : f
      ));
    } else if (tx.type === 'friend_borrow') {
      setBalance(prev => Math.max(0, prev - tx.amount));
      setFriends(prev => prev.map(f => 
        f.name === tx.targetName ? { ...f, balance: Math.max(0, f.balance - tx.amount) } : f
      ));
    } else if (tx.type === 'friend_payback') {
      setBalance(prev => prev + tx.amount);
      setFriends(prev => prev.map(f => 
        f.name === tx.targetName ? { ...f, balance: f.balance + tx.amount } : f
      ));
    } else if (tx.type === 'friend_receive_payback') {
      setBalance(prev => Math.max(0, prev - tx.amount));
      setFriends(prev => prev.map(f => 
        f.name === tx.targetName ? { ...f, balance: f.balance + tx.amount } : f
      ));
    }

    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // CARD MANAGEMENT
  const handleAddCard = (newCard) => {
    const cardWithDeferred = {
      ...newCard,
      deferredPurchases: newCard.deferredPurchases || []
    };
    setCards(prev => [...prev, cardWithDeferred]);
  };

  const handleRemoveCard = (cardName) => {
    setCards(prev => prev.filter(c => c.name !== cardName));
  };

  const handlePayCard = (cardName, amount) => {
    setBalance(prev => Math.max(0, prev - amount));
    setCards(prev => prev.map(c => 
      c.name === cardName ? { ...c, balance: Math.max(0, c.balance - amount) } : c
    ));
    
    const tx = {
      id: Date.now().toString(),
      type: 'card_payment',
      amount,
      category: 'Servicios',
      description: `Pago Tarjeta: ${cardName}`,
      date: new Date().toISOString().split('T')[0],
      targetName: cardName,
      installments: 1,
      interestRate: 0
    };
    setTransactions(prev => [tx, ...prev]);
  };

  // NEW: PROCESS MONTHLY CARD BILLING (Abono de Cuotas Diferidas)
  const handleProcessMonthlyBilling = (cardName) => {
    const card = cards.find(c => c.name === cardName);
    if (!card) return;

    let totalPrincipalPaid = 0;
    let totalInterestPaid = 0;
    const updatedDeferredPurchases = [];

    // Calcular cuotas de compras diferidas
    (card.deferredPurchases || []).forEach(d => {
      const remaining = d.remainingInstallments;
      if (remaining > 0) {
        // Calcular cuota del mes usando amortización fija de capital + intereses sobre saldo restante
        const principalMonth = d.amount / d.installments;
        const interestMonth = (d.amount - (principalMonth * (d.installments - remaining))) * (d.interestRate / 100);
        
        totalPrincipalPaid += principalMonth;
        totalInterestPaid += interestMonth;

        const nextRemaining = remaining - 1;
        if (nextRemaining > 0) {
          updatedDeferredPurchases.push({
            ...d,
            remainingInstallments: nextRemaining
          });
        }
      }
    });

    const totalToPay = totalPrincipalPaid + totalInterestPaid;
    if (totalToPay <= 0) return;

    // Actualizar balances
    setBalance(prev => Math.max(0, prev - totalToPay));
    setCards(prev => prev.map(c => 
      c.name === cardName ? {
        ...c,
        balance: Math.max(0, c.balance - totalPrincipalPaid),
        deferredPurchases: updatedDeferredPurchases
      } : c
    ));

    // Guardar transacción
    const tx = {
      id: Date.now().toString(),
      type: 'card_payment',
      amount: totalToPay,
      category: 'Servicios',
      description: `Pago mensualidad tarjeta: ${cardName} (Abono a diferidos)`,
      date: new Date().toISOString().split('T')[0],
      targetName: cardName,
      installments: 1,
      interestRate: 0
    };
    setTransactions(prev => [tx, ...prev]);
  };

  // VEHICLE LOAN MANAGEMENT
  const handleAddVehicleLoan = (newLoan) => {
    setVehicleLoans(prev => [...prev, newLoan]);
  };

  const handleRemoveVehicleLoan = (loanName) => {
    setVehicleLoans(prev => prev.filter(v => v.name !== loanName));
  };

  const handlePayVehicleLoan = (loanName, amount) => {
    setBalance(prev => Math.max(0, prev - amount));
    setVehicleLoans(prev => prev.map(v => 
      v.name === loanName ? { ...v, balance: Math.max(0, v.balance - amount) } : v
    ));

    const tx = {
      id: Date.now().toString(),
      type: 'loan_payment',
      amount,
      category: 'Transporte',
      description: `Pago cuota Crédito Vehículo: ${loanName}`,
      date: new Date().toISOString().split('T')[0],
      targetName: loanName,
      installments: 1,
      interestRate: 0
    };
    setTransactions(prev => [tx, ...prev]);
  };

  // FRIENDS DEBT MANAGEMENT
  const handleAddFriendDebt = (newFriend) => {
    setFriends(prev => {
      const exists = prev.find(f => f.name.toLowerCase() === newFriend.name.toLowerCase());
      if (exists) {
        return prev.map(f => f.name.toLowerCase() === newFriend.name.toLowerCase() 
          ? { ...f, balance: f.balance + newFriend.balance } : f
        );
      }
      return [...prev, newFriend];
    });
  };

  const handleRemoveFriendDebt = (friendName) => {
    setFriends(prev => prev.filter(f => f.name !== friendName));
  };

  const handlePayFriendDebt = (friendName, amount) => {
    const friend = friends.find(f => f.name === friendName);
    if (!friend) return;

    if (friend.type === 'por_pagar') {
      setBalance(prev => Math.max(0, prev - amount));
      setFriends(prev => prev.map(f => 
        f.name === friendName ? { ...f, balance: Math.max(0, f.balance - amount) } : f
      ));
      
      const tx = {
        id: Date.now().toString(),
        type: 'friend_payback',
        amount,
        category: 'Otros',
        description: `Pago de deuda a ${friendName}`,
        date: new Date().toISOString().split('T')[0],
        targetName: friendName,
        installments: 1,
        interestRate: 0
      };
      setTransactions(prev => [tx, ...prev]);
    } else {
      setBalance(prev => prev + amount);
      setFriends(prev => prev.map(f => 
        f.name === friendName ? { ...f, balance: Math.max(0, f.balance - amount) } : f
      ));

      const tx = {
        id: Date.now().toString(),
        type: 'friend_receive_payback',
        amount,
        category: 'Otros',
        description: `${friendName} pagó de deuda`,
        date: new Date().toISOString().split('T')[0],
        targetName: friendName,
        installments: 1,
        interestRate: 0
      };
      setTransactions(prev => [tx, ...prev]);
    }
  };

  // REGISTER PARSED TRANSACTION FROM CHAT/TELEGRAM
  const handleRegisterParsedTransaction = (result) => {
    if (!result || !result.success) return;

    const tx = {
      id: Date.now().toString(),
      type: result.type,
      amount: result.amount,
      category: result.category || 'Otros',
      description: result.description || 'Transacción registrada',
      date: new Date().toISOString().split('T')[0],
      targetName: result.targetName || '',
      installments: result.installments || 1,
      interestRate: result.interestRate || 0
    };

    // Aplicar lógica
    if (result.type === 'expense') {
      if (result.targetName) {
        setCards(prev => {
          const exists = prev.find(c => c.name.toLowerCase() === result.targetName.toLowerCase());
          if (exists) {
            return prev.map(c => {
              if (c.name.toLowerCase() === result.targetName.toLowerCase()) {
                const updatedDeferred = [...(c.deferredPurchases || [])];
                if (tx.installments > 1) {
                  updatedDeferred.push({
                    id: tx.id,
                    description: tx.description,
                    amount: tx.amount,
                    installments: tx.installments,
                    remainingInstallments: tx.installments,
                    interestRate: tx.interestRate,
                    date: tx.date
                  });
                }
                return {
                  ...c,
                  balance: c.balance + tx.amount,
                  deferredPurchases: updatedDeferred
                };
              }
              return c;
            });
          } else {
            // Tarjeta nueva
            const newCard = {
              name: result.targetName,
              limit: 3000000,
              balance: tx.amount,
              cutoffDay: 15,
              paymentDay: 30,
              deferredPurchases: tx.installments > 1 ? [{
                id: tx.id,
                description: tx.description,
                amount: tx.amount,
                installments: tx.installments,
                remainingInstallments: tx.installments,
                interestRate: tx.interestRate,
                date: tx.date
              }] : []
            };
            return [...prev, newCard];
          }
        });
      } else {
        setBalance(prev => prev - result.amount);
      }
    } else if (result.type === 'income') {
      setBalance(prev => prev + result.amount);
    } else if (result.type === 'card_payment') {
      setBalance(prev => Math.max(0, prev - result.amount));
      setCards(prev => prev.map(c => 
        c.name.toLowerCase() === result.targetName.toLowerCase() ? { ...c, balance: Math.max(0, c.balance - result.amount) } : c
      ));
    } else if (result.type === 'loan_payment') {
      setBalance(prev => Math.max(0, prev - result.amount));
      setVehicleLoans(prev => prev.map(v => 
        v.name.toLowerCase() === result.targetName.toLowerCase() ? { ...v, balance: Math.max(0, v.balance - result.amount) } : v
      ));
    } else if (result.type === 'friend_lend') {
      setBalance(prev => Math.max(0, prev - result.amount));
      setFriends(prev => {
        const exists = prev.find(f => f.name.toLowerCase() === result.targetName.toLowerCase());
        if (exists) {
          return prev.map(f => f.name.toLowerCase() === result.targetName.toLowerCase() 
            ? { ...f, type: 'por_cobrar', balance: f.balance + result.amount } : f
          );
        }
        return [...prev, { name: result.targetName, type: 'por_cobrar', balance: result.amount }];
      });
    } else if (result.type === 'friend_borrow') {
      setBalance(prev => prev + result.amount);
      setFriends(prev => {
        const exists = prev.find(f => f.name.toLowerCase() === result.targetName.toLowerCase());
        if (exists) {
          return prev.map(f => f.name.toLowerCase() === result.targetName.toLowerCase() 
            ? { ...f, type: 'por_pagar', balance: f.balance + result.amount } : f
          );
        }
        return [...prev, { name: result.targetName, type: 'por_pagar', balance: result.amount }];
      });
    } else if (result.type === 'friend_payback') {
      setBalance(prev => Math.max(0, prev - result.amount));
      setFriends(prev => prev.map(f => 
        f.name.toLowerCase() === result.targetName.toLowerCase() ? { ...f, balance: Math.max(0, f.balance - result.amount) } : f
      ));
    } else if (result.type === 'friend_receive_payback') {
      setBalance(prev => prev + result.amount);
      setFriends(prev => prev.map(f => 
        f.name.toLowerCase() === result.targetName.toLowerCase() ? { ...f, balance: Math.max(0, f.balance - result.amount) } : f
      ));
    }

    setTransactions(prev => [tx, ...prev]);
  };

  // TELEGRAM BOT RUNNER CONTROLLERS
  const handleStartTelegram = (token) => {
    setTelegramToken(token);
    
    const onMessage = async (msg) => {
      let result;
      const currentFinancialState = {
        balance: parseFloat(localStorage.getItem('fin_balance') || '0'),
        transactions: JSON.parse(localStorage.getItem('fin_transactions') || '[]'),
        cards: JSON.parse(localStorage.getItem('fin_cards') || '[]'),
        vehicleLoans: JSON.parse(localStorage.getItem('fin_vehicles') || '[]'),
        friends: JSON.parse(localStorage.getItem('fin_friends') || '[]')
      };

      if (geminiApiKey) {
        result = await parseTransactionTextGemini(msg.text, geminiApiKey, currentFinancialState);
      } else {
        result = parseTransactionTextLocal(msg.text, currentFinancialState);
      }

      if (result && result.success) {
        handleRegisterParsedTransaction(result);
        await sendTelegramMessage(msg.token, msg.chatId, `🤖 *Aura AI:*\n\n${result.replyMessage}`);
      } else {
        await sendTelegramMessage(msg.token, msg.chatId, 
          `❌ No logré registrar el movimiento. \n\nIntenta escribirlo de nuevo con montos y conceptos claros, por ejemplo:\n` +
          `• "gasto 12000 en bus"\n` +
          `• "le presté 40000 a Juan"`
        );
      }
    };

    const onStatus = (statusUpdate) => {
      setTelegramStatus(statusUpdate);
    };

    startTelegramPolling(token, onMessage, onStatus);
  };

  const handleStopTelegram = () => {
    stopTelegramPolling();
    setTelegramStatus({ status: 'inactive', message: 'Detenido por el usuario.' });
  };

  const financialState = {
    balance,
    transactions,
    cards,
    vehicleLoans,
    friends
  };

  return (
    <div className="app-container">
      {/* Cabecera */}
      <header className="app-header">
        <div className="logo-container">
          <Bot size={28} className="logo-icon" />
          <span className="logo-text">FinAI</span>
        </div>
        <nav className="nav-links">
          <button 
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Wallet size={16} /> Dashboard
          </button>
          <button 
            className={`nav-btn ${activeTab === 'debts' ? 'active' : ''}`}
            onClick={() => setActiveTab('debts')}
          >
            <CreditCard size={16} /> Deudas y Créditos
          </button>
          <button 
            className={`nav-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <Users size={16} /> Movimientos
          </button>
          <button 
            className={`nav-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={16} /> Asesor Aura IA
          </button>
          <button 
            className={`nav-btn ${activeTab === 'integrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('integrations')}
          >
            <Bot size={16} /> Integración Telegram
          </button>
          <button 
            className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={16} /> Ajustes
          </button>
        </nav>
      </header>

      {/* Contenido Principal */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard 
            transactions={transactions} 
            cards={cards} 
            vehicleLoans={vehicleLoans} 
            friends={friends} 
            balance={balance}
          />
        )}
        
        {activeTab === 'debts' && (
          <DebtsManager
            cards={cards}
            vehicleLoans={vehicleLoans}
            friends={friends}
            balance={balance}
            onAddCard={handleAddCard}
            onRemoveCard={handleRemoveCard}
            onPayCard={handlePayCard}
            onAddVehicleLoan={handleAddVehicleLoan}
            onRemoveVehicleLoan={handleRemoveVehicleLoan}
            onPayVehicleLoan={handlePayVehicleLoan}
            onAddFriendDebt={handleAddFriendDebt}
            onRemoveFriendDebt={handleRemoveFriendDebt}
            onPayFriendDebt={handlePayFriendDebt}
            onProcessMonthlyBilling={handleProcessMonthlyBilling} // NUEVO: Callback de liquidación
          />
        )}

        {activeTab === 'transactions' && (
          <Transactions 
            transactions={transactions}
            cards={cards}
            onAddTransaction={handleAddTransaction}
            onRemoveTransaction={handleRemoveTransaction}
          />
        )}

        {activeTab === 'chat' && (
          <AiChat 
            chatHistory={chatHistory}
            onSendMessage={(msg) => setChatHistory(prev => [...prev, msg])}
            geminiApiKey={geminiApiKey}
            financialState={financialState}
          />
        )}

        {activeTab === 'integrations' && (
          <IntegrationPanel
            telegramToken={telegramToken}
            telegramStatus={telegramStatus}
            onStartTelegram={handleStartTelegram}
            onStopTelegram={handleStopTelegram}
            onRegisterParsedTransaction={handleRegisterParsedTransaction}
            geminiApiKey={geminiApiKey}
            financialState={financialState}
          />
        )}

        {activeTab === 'settings' && (
          <Settings 
            geminiApiKey={geminiApiKey}
            onSaveApiKey={(key) => setGeminiApiKey(key)}
            onLoadDemoData={loadDemoData}
            onClearAllData={clearAllData}
            onImportData={importData}
            financialState={financialState}
          />
        )}
      </main>
    </div>
  );
}
