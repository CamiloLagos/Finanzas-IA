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
    
    // Seed default demo data if localStorage is completely empty
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
      { name: 'Visa Bancolombia', limit: 4500000, balance: 650000, cutoffDay: 15, paymentDay: 5 },
      { name: 'Mastercard Nubank', limit: 2000000, balance: 120000, cutoffDay: 20, paymentDay: 30 }
    ];
    const demoVehicles = [
      { name: 'Crédito Chevrolet Tracker', totalAmount: 42000000, balance: 35400000, monthlyPayment: 680000, interestRate: 14.2 }
    ];
    const demoFriends = [
      { name: 'Juan Pérez', type: 'por_cobrar', balance: 150000 },
      { name: 'Carlos Gómez', type: 'por_pagar', balance: 80000 }
    ];
    const demoTransactions = [
      { id: '1', type: 'income', amount: 3200000, category: 'Ingresos', description: 'Pago Nómina Mayo', date: '2026-05-15', targetName: '' },
      { id: '2', type: 'expense', amount: 150000, category: 'Alimentación', description: 'Mercado de la semana', date: '2026-05-16', targetName: '' },
      { id: '3', type: 'expense', amount: 650000, category: 'Otros', description: 'Compra tiquetes aéreos', date: '2026-05-18', targetName: 'Visa Bancolombia' },
      { id: '4', type: 'expense', amount: 120000, category: 'Compras', description: 'Zapatos deportivos', date: '2026-05-19', targetName: 'Mastercard Nubank' },
      { id: '5', type: 'expense', amount: 45000, category: 'Transporte', description: 'Gasolina', date: '2026-05-20', targetName: '' },
      { id: '6', type: 'loan_payment', amount: 680000, category: 'Transporte', description: 'Pago cuota Crédito Vehículo: Chevrolet Tracker', date: '2026-05-22', targetName: 'Crédito Chevrolet Tracker' }
    ];

    setBalance(demoBalance);
    setCards(demoCards);
    setVehicleLoans(demoVehicles);
    setFriends(demoFriends);
    setTransactions(demoTransactions);
    
    // Seed initial message if chat is empty
    setChatHistory([
      { sender: 'ai', text: '¡Hola! He cargado tus datos demo para que pruebes las funcionalidades. \n\nTienes un crédito de vehículo Chevrolet, dos tarjetas y préstamos activos con Juan y Carlos. ¿En qué puedo ayudarte hoy?' }
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
    setCards(importedState.cards);
    setVehicleLoans(importedState.vehicleLoans);
    setFriends(importedState.friends);
    if (importedState.chatHistory) setChatHistory(importedState.chatHistory);
  };

  // ADD MANUAL TRANSACTION CALLBACK
  const handleAddTransaction = (tx) => {
    // 1. Apply financial impact based on transaction type
    if (tx.type === 'expense') {
      if (tx.targetName) {
        // Cargar a tarjeta de crédito
        setCards(prev => prev.map(c => 
          c.name === tx.targetName ? { ...c, balance: c.balance + tx.amount } : c
        ));
      } else {
        // Restar de saldo disponible
        setBalance(prev => prev - tx.amount);
      }
    } else if (tx.type === 'income') {
      // Sumar a saldo disponible
      setBalance(prev => prev + tx.amount);
    }

    // 2. Add to transaction list
    setTransactions(prev => [tx, ...prev]);
  };

  // REMOVE TRANSACTION CALLBACK (REVERTS ITS VALUE)
  const handleRemoveTransaction = (id) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    if (tx.type === 'expense') {
      if (tx.targetName) {
        // Deduct from card balance
        setCards(prev => prev.map(c => 
          c.name === tx.targetName ? { ...c, balance: Math.max(0, c.balance - tx.amount) } : c
        ));
      } else {
        // Add back to available balance
        setBalance(prev => prev + tx.amount);
      }
    } else if (tx.type === 'income') {
      // Deduct from available balance
      setBalance(prev => Math.max(0, prev - tx.amount));
    } else if (tx.type === 'card_payment') {
      // Return money back to available balance, and add debt back to card balance
      setBalance(prev => prev + tx.amount);
      setCards(prev => prev.map(c => 
        c.name === tx.targetName ? { ...c, balance: c.balance + tx.amount } : c
      ));
    } else if (tx.type === 'loan_payment') {
      // Return money to balance, add debt back to vehicle loan balance
      setBalance(prev => prev + tx.amount);
      setVehicleLoans(prev => prev.map(v => 
        v.name === tx.targetName ? { ...v, balance: v.balance + tx.amount } : v
      ));
    } else if (tx.type === 'friend_lend') {
      // Return money to available balance, and reduce friend debt
      setBalance(prev => prev + tx.amount);
      setFriends(prev => prev.map(f => 
        f.name === tx.targetName ? { ...f, balance: Math.max(0, f.balance - tx.amount) } : f
      ));
    } else if (tx.type === 'friend_borrow') {
      // Subtract from available balance, reduce friend debt
      setBalance(prev => Math.max(0, prev - tx.amount));
      setFriends(prev => prev.map(f => 
        f.name === tx.targetName ? { ...f, balance: Math.max(0, f.balance - tx.amount) } : f
      ));
    } else if (tx.type === 'friend_payback') {
      // Give money back to balance, add debt back to friend
      setBalance(prev => prev + tx.amount);
      setFriends(prev => prev.map(f => 
        f.name === tx.targetName ? { ...f, balance: f.balance + tx.amount } : f
      ));
    } else if (tx.type === 'friend_receive_payback') {
      // Subtract money from available balance, add debt back to friend
      setBalance(prev => Math.max(0, prev - tx.amount));
      setFriends(prev => prev.map(f => 
        f.name === tx.targetName ? { ...f, balance: f.balance + tx.amount } : f
      ));
    }

    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // CARD MANAGEMENT
  const handleAddCard = (newCard) => {
    setCards(prev => [...prev, newCard]);
  };

  const handleRemoveCard = (cardName) => {
    setCards(prev => prev.filter(c => c.name !== cardName));
  };

  const handlePayCard = (cardName, amount) => {
    setBalance(prev => Math.max(0, prev - amount));
    setCards(prev => prev.map(c => 
      c.name === cardName ? { ...c, balance: Math.max(0, c.balance - amount) } : c
    ));
    
    // Add transaction log
    const tx = {
      id: Date.now().toString(),
      type: 'card_payment',
      amount,
      category: 'Servicios',
      description: `Pago Tarjeta: ${cardName}`,
      date: new Date().toISOString().split('T')[0],
      targetName: cardName
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

    // Add transaction log
    const tx = {
      id: Date.now().toString(),
      type: 'loan_payment',
      amount,
      category: 'Transporte',
      description: `Pago cuota Crédito Vehículo: ${loanName}`,
      date: new Date().toISOString().split('T')[0],
      targetName: loanName
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
      // Yo le pago a mi amigo (mi saldo disminuye, mi deuda disminuye)
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
        targetName: friendName
      };
      setTransactions(prev => [tx, ...prev]);
    } else {
      // Mi amigo me paga a mí (mi saldo aumenta, su deuda conmigo disminuye)
      setBalance(prev => prev + amount);
      setFriends(prev => prev.map(f => 
        f.name === friendName ? { ...f, balance: Math.max(0, f.balance - amount) } : f
      ));

      const tx = {
        id: Date.now().toString(),
        type: 'friend_receive_payback',
        amount,
        category: 'Otros',
        description: `${friendName} pagó deuda`,
        date: new Date().toISOString().split('T')[0],
        targetName: friendName
      };
      setTransactions(prev => [tx, ...prev]);
    }
  };

  // REGISTER TRANSACTION PARSED BY AI/TELEGRAM/SIMULATOR
  const handleRegisterParsedTransaction = (result) => {
    if (!result || !result.success) return;

    const tx = {
      id: Date.now().toString(),
      type: result.type,
      amount: result.amount,
      category: result.category || 'Otros',
      description: result.description || 'Transacción registrada',
      date: new Date().toISOString().split('T')[0],
      targetName: result.targetName || ''
    };

    if (result.type === 'expense') {
      if (result.targetName) {
        // Cargar a tarjeta de crédito. Si no existe la crea.
        setCards(prev => {
          const exists = prev.find(c => c.name.toLowerCase() === result.targetName.toLowerCase());
          if (exists) {
            return prev.map(c => c.name.toLowerCase() === result.targetName.toLowerCase() ? { ...c, balance: c.balance + result.amount } : c);
          } else {
            // Crea una tarjeta Visa/Mastercard temporal
            return [...prev, { name: result.targetName, limit: 3000000, balance: result.amount, cutoffDay: 15, paymentDay: 30 }];
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
          // Actualiza a tipo por cobrar y suma balance
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
          // Actualiza a tipo por pagar y suma balance
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
    
    // Conector que le pasaremos al polling service
    const onMessage = async (msg) => {
      let result;
      // Get state snapshots immediately to avoid stale closures
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
        // Ejecutar en React
        handleRegisterParsedTransaction(result);
        
        // Responder en Telegram
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

  // Global Context Packet for Advisor
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
