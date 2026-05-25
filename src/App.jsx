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
import { saveStateToCosmos, loadStateFromCosmos } from './services/cosmosSync';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  // Financial State
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [vehicleLoans, setVehicleLoans] = useState([]);
  const [friends, setFriends] = useState([]);
  const [fixedSalary, setFixedSalary] = useState(0);
  
  // Settings / Keys
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramStatus, setTelegramStatus] = useState({ status: 'inactive', message: '' });
  
  // NUEVO: Credenciales por defecto cargadas de variables de entorno locales (seguras)
  const DEFAULT_COSMOS_ENDPOINT = import.meta.env.VITE_COSMOS_ENDPOINT || '';
  const DEFAULT_COSMOS_KEY = import.meta.env.VITE_COSMOS_KEY || '';
  const DEFAULT_COSMOS_USERID = import.meta.env.VITE_COSMOS_USERID || 'hogar-lagos';

  const [cosmosEndpoint, setCosmosEndpoint] = useState('');
  const [cosmosKey, setCosmosKey] = useState('');
  const [cosmosUserId, setCosmosUserId] = useState('hogar-lagos');

  // Chat History
  const [chatHistory, setChatHistory] = useState([]);

  // 1. LOAD STATE FROM LOCALSTORAGE ON MOUNT & AUTO SYNC WITH COSMOS
  useEffect(() => {
    const localBalance = localStorage.getItem('fin_balance');
    const localTransactions = localStorage.getItem('fin_transactions');
    const localCards = localStorage.getItem('fin_cards');
    const localVehicles = localStorage.getItem('fin_vehicles');
    const localFriends = localStorage.getItem('fin_friends');
    const localGeminiKey = localStorage.getItem('fin_gemini_key');
    const localTelegramToken = localStorage.getItem('fin_telegram_token');
    const localChatHistory = localStorage.getItem('fin_chat_history');
    const localFixedSalary = localStorage.getItem('fin_fixed_salary');
    
    // Cargar credenciales guardadas o usar las de Azure por defecto
    const localCosmosEndpoint = localStorage.getItem('fin_cosmos_endpoint') || DEFAULT_COSMOS_ENDPOINT;
    const localCosmosKey = localStorage.getItem('fin_cosmos_key') || DEFAULT_COSMOS_KEY;
    const localCosmosUserId = localStorage.getItem('fin_cosmos_user_id') || DEFAULT_COSMOS_USERID;

    if (localBalance) setBalance(parseFloat(localBalance));
    if (localTransactions) setTransactions(JSON.parse(localTransactions));
    if (localCards) setCards(JSON.parse(localCards));
    if (localVehicles) setVehicleLoans(JSON.parse(localVehicles));
    if (localFriends) setFriends(JSON.parse(localFriends));
    if (localGeminiKey) setGeminiApiKey(localGeminiKey);
    if (localTelegramToken) setTelegramToken(localTelegramToken);
    if (localChatHistory) setChatHistory(JSON.parse(localChatHistory));
    if (localFixedSalary) setFixedSalary(parseFloat(localFixedSalary));
    
    setCosmosEndpoint(localCosmosEndpoint);
    setCosmosKey(localCosmosKey);
    setCosmosUserId(localCosmosUserId);
    
    if (!localBalance && !localTransactions && !localCards && !localVehicles && !localFriends) {
      loadDemoData();
    }
    
    // NUEVO: Cargar los datos desde Azure Cosmos DB automáticamente al iniciar
    loadInitialDataFromCloud(localCosmosEndpoint, localCosmosKey, localCosmosUserId);

    setInitialLoadDone(true);
  }, []);

  // Carga inicial asíncrona desde Azure Cosmos DB
  const loadInitialDataFromCloud = async (endpoint, key, userId) => {
    if (!endpoint || !key) return;
    try {
      console.log("Cargando datos iniciales desde Azure Cosmos DB...");
      const result = await loadStateFromCosmos(endpoint, key, userId);
      if (result.success) {
        setBalance(result.state.balance);
        setTransactions(result.state.transactions);
        setCards(result.state.cards.map(c => ({ ...c, deferredPurchases: c.deferredPurchases || [] })));
        setVehicleLoans(result.state.vehicleLoans);
        setFriends(result.state.friends);
        if (result.state.fixedSalary) setFixedSalary(result.state.fixedSalary);
        console.log("✅ Datos sincronizados desde la base de datos de Azure.");
      } else {
        console.log("No se detectaron datos en Azure Cosmos DB, usando almacenamiento local.");
      }
    } catch (error) {
      console.error("Error al realizar la sincronización inicial con Cosmos DB:", error);
    }
  };

  // 2. SAVE STATE TO LOCALSTORAGE WHEN IT CHANGES
  useEffect(() => {
    if (!initialLoadDone) return;
    localStorage.setItem('fin_balance', balance.toString());
  }, [balance, initialLoadDone]);

  useEffect(() => {
    if (!initialLoadDone) return;
    localStorage.setItem('fin_transactions', JSON.stringify(transactions));
  }, [transactions, initialLoadDone]);

  useEffect(() => {
    if (!initialLoadDone) return;
    localStorage.setItem('fin_cards', JSON.stringify(cards));
  }, [cards, initialLoadDone]);

  useEffect(() => {
    if (!initialLoadDone) return;
    localStorage.setItem('fin_vehicles', JSON.stringify(vehicleLoans));
  }, [vehicleLoans, initialLoadDone]);

  useEffect(() => {
    if (!initialLoadDone) return;
    localStorage.setItem('fin_friends', JSON.stringify(friends));
  }, [friends, initialLoadDone]);

  useEffect(() => {
    if (!initialLoadDone) return;
    localStorage.setItem('fin_gemini_key', geminiApiKey);
  }, [geminiApiKey, initialLoadDone]);

  useEffect(() => {
    if (!initialLoadDone) return;
    localStorage.setItem('fin_telegram_token', telegramToken);
  }, [telegramToken, initialLoadDone]);

  useEffect(() => {
    if (!initialLoadDone) return;
    localStorage.setItem('fin_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory, initialLoadDone]);

  useEffect(() => {
    if (!initialLoadDone) return;
    localStorage.setItem('fin_fixed_salary', fixedSalary.toString());
  }, [fixedSalary, initialLoadDone]);

  // Persistir configs de Cosmos DB
  useEffect(() => {
    if (!initialLoadDone) return;
    localStorage.setItem('fin_cosmos_endpoint', cosmosEndpoint);
  }, [cosmosEndpoint, initialLoadDone]);

  useEffect(() => {
    if (!initialLoadDone) return;
    localStorage.setItem('fin_cosmos_key', cosmosKey);
  }, [cosmosKey, initialLoadDone]);

  useEffect(() => {
    if (!initialLoadDone) return;
    localStorage.setItem('fin_cosmos_user_id', cosmosUserId);
  }, [cosmosUserId, initialLoadDone]);

  // Sincronización automática de cambios a Cosmos DB (Debounced 1.2s)
  useEffect(() => {
    if (!initialLoadDone) return;
    if (!cosmosEndpoint || !cosmosKey || !cosmosUserId) return;

    const timer = setTimeout(async () => {
      console.log("Sincronizando cambios con Azure Cosmos DB...");
      try {
        await saveStateToCosmos(cosmosEndpoint, cosmosKey, cosmosUserId, {
          balance,
          transactions,
          cards,
          vehicleLoans,
          friends,
          fixedSalary
        });
      } catch (err) {
        console.error("Auto-sync error Cosmos DB:", err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [balance, transactions, cards, vehicleLoans, friends, fixedSalary, cosmosEndpoint, cosmosKey, cosmosUserId, initialLoadDone]);

  // Clean up Telegram Bot Polling when app unmounts
  useEffect(() => {
    return () => {
      stopTelegramPolling();
    };
  }, []);

  // DEMO DATA SEEDER
  const loadDemoData = () => {
    const demoBalance = 2450000;
    const demoSalary = 3800000;
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
      { id: '1', type: 'income', amount: 3800000, category: 'Ingresos', description: 'Pago Salario Fijo', date: '2026-05-15', targetName: '', installments: 1, interestRate: 0 },
      { id: '2', type: 'expense', amount: 150000, category: 'Alimentación', description: 'Mercado de la semana', date: '2026-05-16', targetName: '', installments: 1, interestRate: 0 },
      { id: '3', type: 'expense', amount: 650000, category: 'Otros', description: 'Compra tiquetes aéreos', date: '2026-05-18', targetName: 'Visa Bancolombia', installments: 6, interestRate: 1.8 },
      { id: '4', type: 'expense', amount: 120000, category: 'Compras', description: 'Zapatos deportivos', date: '2026-05-19', targetName: 'Mastercard Nubank', installments: 1, interestRate: 0 },
      { id: '5', type: 'expense', amount: 45000, category: 'Transporte', description: 'Gasolina', date: '2026-05-20', targetName: '', installments: 1, interestRate: 0 },
      { id: '6', type: 'loan_payment', amount: 680000, category: 'Transporte', description: 'Pago cuota Crédito Vehículo: Chevrolet Tracker', date: '2026-05-22', targetName: 'Crédito Chevrolet Tracker', installments: 1, interestRate: 0 }
    ];

    setBalance(demoBalance);
    setFixedSalary(demoSalary);
    setCards(demoCards);
    setVehicleLoans(demoVehicles);
    setFriends(demoFriends);
    setTransactions(demoTransactions);
    
    setChatHistory([
      { sender: 'ai', text: '¡Hola! He cargado tus datos demo para que pruebes las deudas diferidas a cuotas.\n\nTienes un salario fijo configurado de $3.800.000 COP y una compra diferida en tu tarjeta Visa. ¿En qué te puedo asesorar hoy?' }
    ]);
  };

  const clearAllData = () => {
    setBalance(0);
    setFixedSalary(0);
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
    if (importedState.fixedSalary) setFixedSalary(importedState.fixedSalary);
    if (importedState.chatHistory) setChatHistory(importedState.chatHistory);
  };

  const handleSaveCosmosConfig = (config) => {
    setCosmosEndpoint(config.endpoint);
    setCosmosKey(config.key);
    setCosmosUserId(config.userId);
  };

  // ADD MANUAL TRANSACTION CALLBACK
  const handleAddTransaction = (tx) => {
    const installments = tx.installments || 1;
    const interestRate = tx.interestRate || 0;

    if (tx.type === 'expense') {
      if (tx.targetName) {
        setCards(prev => {
          const exists = prev.find(c => c.name.toLowerCase() === tx.targetName.toLowerCase());
          if (exists) {
            return prev.map(c => {
              if (c.name.toLowerCase() === tx.targetName.toLowerCase()) {
                const updatedDeferred = [...(c.deferredPurchases || [])];
                
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
            });
          } else {
            const newCard = {
              name: tx.targetName,
              limit: 3000000,
              balance: tx.amount,
              cutoffDay: 15,
              paymentDay: 30,
              deferredPurchases: installments > 1 ? [{
                id: tx.id || Date.now().toString(),
                description: tx.description,
                amount: tx.amount,
                installments: installments,
                remainingInstallments: installments,
                interestRate: interestRate,
                date: tx.date || new Date().toISOString().split('T')[0]
              }] : []
            };
            return [...prev, newCard];
          }
        });
      } else {
        setBalance(prev => prev - tx.amount);
      }
    } else if (tx.type === 'income') {
      setBalance(prev => prev + tx.amount);
    } else if (tx.type === 'card_payment') {
      setBalance(prev => Math.max(0, prev - tx.amount));
      setCards(prev => prev.map(c => 
        c.name.toLowerCase() === tx.targetName.toLowerCase() ? { ...c, balance: Math.max(0, c.balance - tx.amount) } : c
      ));
    } else if (tx.type === 'loan_payment') {
      setBalance(prev => Math.max(0, prev - tx.amount));
      setVehicleLoans(prev => prev.map(v => 
        v.name.toLowerCase() === tx.targetName.toLowerCase() ? { ...v, balance: Math.max(0, v.balance - tx.amount) } : v
      ));
    } else if (tx.type === 'friend_lend') {
      setBalance(prev => Math.max(0, prev - tx.amount));
      setFriends(prev => {
        const exists = prev.find(f => f.name.toLowerCase() === tx.targetName.toLowerCase());
        if (exists) {
          return prev.map(f => f.name.toLowerCase() === tx.targetName.toLowerCase() 
            ? { ...f, type: 'por_cobrar', balance: f.balance + tx.amount } : f
          );
        }
        return [...prev, { name: tx.targetName, type: 'por_cobrar', balance: tx.amount }];
      });
    } else if (tx.type === 'friend_borrow') {
      setBalance(prev => prev + tx.amount);
      setFriends(prev => {
        const exists = prev.find(f => f.name.toLowerCase() === tx.targetName.toLowerCase());
        if (exists) {
          return prev.map(f => f.name.toLowerCase() === tx.targetName.toLowerCase() 
            ? { ...f, type: 'por_pagar', balance: f.balance + tx.amount } : f
          );
        }
        return [...prev, { name: tx.targetName, type: 'por_pagar', balance: tx.amount }];
      });
    } else if (tx.type === 'friend_payback') {
      setBalance(prev => Math.max(0, prev - tx.amount));
      setFriends(prev => prev.map(f => 
        f.name.toLowerCase() === tx.targetName.toLowerCase() ? { ...f, balance: Math.max(0, f.balance - tx.amount) } : f
      ));
    } else if (tx.type === 'friend_receive_payback') {
      setBalance(prev => prev + tx.amount);
      setFriends(prev => prev.map(f => 
        f.name.toLowerCase() === tx.targetName.toLowerCase() ? { ...f, balance: Math.max(0, f.balance - tx.amount) } : f
      ));
    }

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

  // PROCESS MONTHLY CARD BILLING
  const handleProcessMonthlyBilling = (cardName, customMonth = null) => {
    const card = cards.find(c => c.name === cardName);
    if (!card) return;

    let totalPrincipalPaid = 0;
    let totalInterestPaid = 0;
    const updatedDeferredPurchases = [];

    (card.deferredPurchases || []).forEach(d => {
      const remaining = d.remainingInstallments;
      if (remaining > 0) {
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

    setBalance(prev => Math.max(0, prev - totalToPay));
    setCards(prev => prev.map(c => 
      c.name === cardName ? {
        ...c,
        balance: Math.max(0, c.balance - totalPrincipalPaid),
        deferredPurchases: updatedDeferredPurchases
      } : c
    ));

    const dateStr = customMonth 
      ? `${customMonth}-${String(card.paymentDay || 10).padStart(2, '0')}` 
      : new Date().toISOString().split('T')[0];

    const tx = {
      id: Date.now().toString(),
      type: 'card_payment',
      amount: totalToPay,
      category: 'Servicios',
      description: `Pago mensualidad tarjeta: ${cardName} (Abono a diferidos)`,
      date: dateStr,
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

  const handlePayVehicleLoan = (loanName, amount, customMonth = null) => {
    setBalance(prev => Math.max(0, prev - amount));
    setVehicleLoans(prev => prev.map(v => 
      v.name === loanName ? { ...v, balance: Math.max(0, v.balance - amount) } : v
    ));

    const dateStr = customMonth 
      ? `${customMonth}-10` 
      : new Date().toISOString().split('T')[0];

    const tx = {
      id: Date.now().toString(),
      type: 'loan_payment',
      amount,
      category: 'Transporte',
      description: `Pago cuota Crédito Vehículo: ${loanName}`,
      date: dateStr,
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

    handleAddTransaction(tx);
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
        friends: JSON.parse(localStorage.getItem('fin_friends') || '[]'),
        fixedSalary: parseFloat(localStorage.getItem('fin_fixed_salary') || '0')
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
    friends,
    fixedSalary
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
            fixedSalary={fixedSalary}
            onAddTransaction={handleAddTransaction}
            onProcessMonthlyBilling={handleProcessMonthlyBilling}
            onPayVehicleLoan={handlePayVehicleLoan}
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
            onProcessMonthlyBilling={handleProcessMonthlyBilling}
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
            // Props de Cosmos DB
            cosmosEndpoint={cosmosEndpoint}
            cosmosKey={cosmosKey}
            cosmosUserId={cosmosUserId}
            onSaveCosmosConfig={handleSaveCosmosConfig}
            // Props de Salario
            fixedSalary={fixedSalary}
            onSaveFixedSalary={(val) => setFixedSalary(val)}
          />
        )}
      </main>
    </div>
  );
}
