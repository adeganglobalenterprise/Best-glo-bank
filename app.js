// Banking Application - JavaScript

// Global State Management
const AppState = {
    currentUser: null,
    isLoggedIn: false,
    isAdmin: false,
    balances: {
        USD: 0,
        EUR: 0,
        GBP: 0,
        CNY: 0,
        NGN: 0,
        BTC: 0,
        TRX: 0,
        TON: 0,
        ETH: 0
    },
    mining: {
        currencies: {},
        crypto: {},
        addresses: []
    },
    trading: {
        robotActive: false,
        capital: 0,
        profit: 0
    },
    transactions: [],
    notifications: [],
    wallets: {
        BTC: [],
        TRX: [],
        TON: [],
        ETH: []
    }
};

// Initialize Application
function initApp() {
    loadFromStorage();
    setupEventListeners();
    checkAuth();
    initializeMining();
    startMiningProcess();
    updateUI();
}

// Storage Management
function saveToStorage() {
    localStorage.setItem('bankingApp', JSON.stringify(AppState));
}

function loadFromStorage() {
    const saved = localStorage.getItem('bankingApp');
    if (saved) {
        const data = JSON.parse(saved);
        Object.assign(AppState, data);
    }
}

// Authentication
function checkAuth() {
    if (AppState.isLoggedIn) {
        showDashboard();
    } else {
        showLogin();
    }
}

function login(username, password, isAdmin = false) {
    // Simple authentication (in production, use proper backend)
    if (username && password) {
        AppState.currentUser = {
            username: username,
            isAdmin: isAdmin,
            name: username,
            photo: 'https://ui-avatars.com/api/?name=' + username + '&background=667eea&color=fff',
            dob: '1990-01-01',
            sex: 'Not Specified',
            country: 'Nigeria'
        };
        AppState.isLoggedIn = true;
        AppState.isAdmin = isAdmin;
        saveToStorage();
        showDashboard();
        showNotification('Welcome back, ' + username + '!', 'success');
    } else {
        showNotification('Please enter valid credentials', 'error');
    }
}

function logout() {
    AppState.currentUser = null;
    AppState.isLoggedIn = false;
    AppState.isAdmin = false;
    saveToStorage();
    showLogin();
    showNotification('Logged out successfully', 'success');
}

// Dashboard Management
function showDashboard() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    updateUserInfo();
    updateBalances();
    updateMiningDisplay();
    
    // Show admin button if user is admin
    if (AppState.isAdmin) {
        document.getElementById('adminNavBtn').style.display = 'block';
        document.getElementById('userRole').textContent = 'Administrator';
    }
}

function showLogin() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Update navigation
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('active');
    });
}

// User Interface Updates
function updateUserInfo() {
    if (AppState.currentUser) {
        document.getElementById('userName').textContent = AppState.currentUser.name;
        document.getElementById('userAvatar').src = AppState.currentUser.photo;
    }
}

function updateBalances() {
    Object.keys(AppState.balances).forEach(currency => {
        const element = document.getElementById('balance-' + currency);
        if (element) {
            element.textContent = formatCurrency(AppState.balances[currency], currency);
        }
    });
}

function formatCurrency(amount, currency) {
    const symbols = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        CNY: '¥',
        NGN: '₦',
        BTC: '₿',
        TRX: 'TRX',
        TON: 'TON',
        ETH: 'ETH'
    };
    
    if (['BTC', 'TRX', 'TON', 'ETH'].includes(currency)) {
        return amount.toFixed(8) + ' ' + currency;
    }
    
    return symbols[currency] + amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Balance Management
function editBalance(currency) {
    const amount = prompt('Enter new balance for ' + currency + ':');
    if (amount !== null && !isNaN(amount)) {
        AppState.balances[currency] = parseFloat(amount);
        saveToStorage();
        updateBalances();
        showNotification(currency + ' balance updated successfully', 'success');
    }
}

// Transaction Functions
function sendMoney() {
    const currency = document.getElementById('sendCurrency').value;
    const amount = parseFloat(document.getElementById('sendAmount').value);
    const recipient = document.getElementById('sendRecipient').value;
    
    if (amount > 0 && recipient) {
        if (AppState.balances[currency] >= amount) {
            AppState.balances[currency] -= amount;
            
            const transaction = {
                id: Date.now(),
                type: 'send',
                currency: currency,
                amount: amount,
                recipient: recipient,
                date: new Date().toISOString(),
                status: 'completed'
            };
            
            AppState.transactions.unshift(transaction);
            saveToStorage();
            updateBalances();
            updateTransactionHistory();
            sendAlert('Transaction Alert: You sent ' + formatCurrency(amount, currency) + ' to ' + recipient);
            showNotification('Transaction successful!', 'success');
        } else {
            showNotification('Insufficient balance', 'error');
        }
    } else {
        showNotification('Please enter valid amount and recipient', 'error');
    }
}

function receiveMoney() {
    const currency = document.getElementById('receiveCurrency').value;
    const amount = parseFloat(document.getElementById('receiveAmount').value);
    const sender = document.getElementById('receiveSender').value;
    
    if (amount > 0 && sender) {
        AppState.balances[currency] += amount;
        
        const transaction = {
            id: Date.now(),
            type: 'receive',
            currency: currency,
            amount: amount,
            sender: sender,
            date: new Date().toISOString(),
            status: 'completed'
        };
        
        AppState.transactions.unshift(transaction);
        saveToStorage();
        updateBalances();
        updateTransactionHistory();
        sendAlert('Transaction Alert: You received ' + formatCurrency(amount, currency) + ' from ' + sender);
        showNotification('Payment received successfully!', 'success');
    } else {
        showNotification('Please enter valid amount and sender', 'error');
    }
}

function transferBetweenAccounts() {
    const fromCurrency = document.getElementById('transferFrom').value;
    const toCurrency = document.getElementById('transferTo').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    
    if (amount > 0 && fromCurrency !== toCurrency) {
        if (AppState.balances[fromCurrency] >= amount) {
            AppState.balances[fromCurrency] -= amount;
            
            // Simple conversion (in production, use real exchange rates)
            const conversionRates = {
                'USD-EUR': 0.92,
                'USD-GBP': 0.79,
                'USD-CNY': 7.24,
                'USD-NGN': 1550,
                'EUR-USD': 1.09,
                'GBP-USD': 1.27,
                'CNY-USD': 0.14,
                'NGN-USD': 0.00065
            };
            
            const key = fromCurrency + '-' + toCurrency;
            const convertedAmount = amount * (conversionRates[key] || 1);
            
            AppState.balances[toCurrency] += convertedAmount;
            
            const transaction = {
                id: Date.now(),
                type: 'transfer',
                fromCurrency: fromCurrency,
                toCurrency: toCurrency,
                amount: amount,
                convertedAmount: convertedAmount,
                date: new Date().toISOString(),
                status: 'completed'
            };
            
            AppState.transactions.unshift(transaction);
            saveToStorage();
            updateBalances();
            updateTransactionHistory();
            showNotification('Transfer successful! Converted ' + formatCurrency(amount, fromCurrency) + ' to ' + formatCurrency(convertedAmount, toCurrency), 'success');
        } else {
            showNotification('Insufficient balance', 'error');
        }
    } else {
        showNotification('Please enter valid transfer details', 'error');
    }
}

function updateTransactionHistory() {
    const historyContainer = document.getElementById('transactionHistory');
    if (historyContainer) {
        const tbody = historyContainer.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '';
            
            if (AppState.transactions.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No transactions yet</td></tr>';
                return;
            }
            
            AppState.transactions.slice(0, 20).forEach(transaction => {
                const row = document.createElement('tr');
                
                let typeIcon = transaction.type === 'send' || transaction.type === 'crypto_send' ? '↑' : (transaction.type === 'receive' ? '↓' : '↔');
                let typeLabel = transaction.type === 'crypto_send' ? 'Crypto Send' : transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
                
                if (transaction.type === 'transfer') {
                    row.innerHTML = `
                        <td>${new Date(transaction.date).toLocaleDateString()}</td>
                        <td>${typeIcon} Transfer</td>
                        <td>${formatCurrency(transaction.amount, transaction.fromCurrency)} → ${formatCurrency(transaction.convertedAmount, transaction.toCurrency)}</td>
                        <td><span style="background: #fef3c7; color: #92400e; padding: 5px 10px; border-radius: 20px; font-size: 0.8rem;">Completed</span></td>
                    `;
                } else {
                    row.innerHTML = `
                        <td>${new Date(transaction.date).toLocaleDateString()}</td>
                        <td>${typeIcon} ${typeLabel}</td>
                        <td>${formatCurrency(transaction.amount, transaction.currency)}</td>
                        <td><span style="background: #d1fae5; color: #065f46; padding: 5px 10px; border-radius: 20px; font-size: 0.8rem;">Completed</span></td>
                    `;
                }
                
                tbody.appendChild(row);
            });
        }
    }
}

// Crypto Functions
function generateCryptoAddress(currency) {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let address = '';
    
    const prefixes = {
        BTC: 'bc1',
        TRX: 'T',
        TON: 'UQ',
        ETH: '0x'
    };
    
    address = prefixes[currency];
    
    for (let i = 0; i < 40; i++) {
        address += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return address;
}

function createNewWallet() {
    const currency = document.getElementById('walletCurrency').value;
    const address = generateCryptoAddress(currency);
    
    const wallet = {
        address: address,
        currency: currency,
        balance: 0,
        createdAt: new Date().toISOString()
    };
    
    AppState.wallets[currency].push(wallet);
    saveToStorage();
    
    document.getElementById('newWalletAddress').textContent = address;
    document.getElementById('newWalletAddress').classList.remove('hidden');
    
    showNotification('New ' + currency + ' wallet created: ' + address, 'success');
    updateWalletDisplay();
}

function sendCrypto() {
    const currency = document.getElementById('cryptoSendCurrency').value;
    const amount = parseFloat(document.getElementById('cryptoSendAmount').value);
    const recipientAddress = document.getElementById('cryptoSendAddress').value;
    
    if (amount > 0 && recipientAddress) {
        if (AppState.balances[currency] >= amount) {
            AppState.balances[currency] -= amount;
            
            const transaction = {
                id: Date.now(),
                type: 'crypto_send',
                currency: currency,
                amount: amount,
                recipient: recipientAddress,
                date: new Date().toISOString(),
                status: 'completed'
            };
            
            AppState.transactions.unshift(transaction);
            saveToStorage();
            updateBalances();
            updateTransactionHistory();
            sendAlert('Crypto Transaction Alert: You sent ' + formatCurrency(amount, currency) + ' to ' + recipientAddress);
            showNotification('Crypto transaction successful!', 'success');
        } else {
            showNotification('Insufficient ' + currency + ' balance', 'error');
        }
    } else {
        showNotification('Please enter valid amount and wallet address', 'error');
    }
}

function updateWalletDisplay() {
    const walletContainer = document.getElementById('walletList');
    if (walletContainer) {
        walletContainer.innerHTML = '';
        
        let hasWallets = false;
        Object.keys(AppState.wallets).forEach(currency => {
            AppState.wallets[currency].forEach((wallet, index) => {
                hasWallets = true;
                const walletCard = document.createElement('div');
                walletCard.className = 'card';
                walletCard.style.marginBottom = '15px';
                walletCard.innerHTML = `
                    <div style="padding: 20px;">
                        <h5 style="margin-bottom: 10px;">${currency} Wallet #${index + 1}</h5>
                        <div class="wallet-address">${wallet.address}</div>
                        <p style="margin: 10px 0;">Balance: ${formatCurrency(wallet.balance, currency)}</p>
                        <small style="color: #64748b;">Created: ${new Date(wallet.createdAt).toLocaleDateString()}</small>
                    </div>
                `;
                walletContainer.appendChild(walletCard);
            });
        });
        
        if (!hasWallets) {
            walletContainer.innerHTML = '<p style="text-align: center; color: #64748b; padding: 20px;">No wallets created yet</p>';
        }
    }
}

// Mining System
function initializeMining() {
    // Initialize currency mining
    ['USD', 'EUR', 'GBP', 'CNY', 'NGN'].forEach(currency => {
        AppState.mining.currencies[currency] = {
            progress: 0,
            target: 1000,
            lastUpdate: Date.now()
        };
    });
    
    // Initialize crypto mining
    ['BTC', 'TRX', 'TON', 'ETH'].forEach(currency => {
        AppState.mining.crypto[currency] = {
            progress: 0,
            target: 1,
            lastUpdate: Date.now()
        };
    });
}

function startMiningProcess() {
    // Currency mining - runs every hour
    setInterval(() => {
        mineCurrencies();
    }, 3600000); // 1 hour
    
    // Crypto mining - runs every hour
    setInterval(() => {
        mineCrypto();
    }, 3600000); // 1 hour
    
    // Address generation - runs every second
    setInterval(() => {
        generateAddresses();
    }, 1000); // 1 second
    
    // Update mining display every 5 seconds
    setInterval(() => {
        updateMiningDisplay();
    }, 5000);
}

function mineCurrencies() {
    ['USD', 'EUR', 'GBP', 'CNY', 'NGN'].forEach(currency => {
        AppState.balances[currency] += 1000;
        AppState.mining.currencies[currency].progress = 0;
        showNotification('Mining complete! Added 1000 ' + currency + ' to your balance', 'success');
    });
    saveToStorage();
    updateBalances();
}

function mineCrypto() {
    ['BTC', 'TRX', 'TON', 'ETH'].forEach(currency => {
        if (currency === 'BTC') {
            AppState.balances[currency] += 1;
        } else {
            AppState.balances[currency] += 100;
        }
        AppState.mining.crypto[currency].progress = 0;
        showNotification('Mining complete! Added ' + (currency === 'BTC' ? '1' : '100') + ' ' + currency + ' to your balance', 'success');
    });
    saveToStorage();
    updateBalances();
}

function generateAddresses() {
    const currencies = ['BTC', 'TRX', 'TON', 'ETH'];
    
    for (let i = 0; i < 10; i++) {
        const currency = currencies[Math.floor(Math.random() * currencies.length)];
        const address = generateCryptoAddress(currency);
        
        AppState.mining.addresses.push({
            address: address,
            currency: currency,
            timestamp: Date.now()
        });
        
        // Keep only last 100 addresses
        if (AppState.mining.addresses.length > 100) {
            AppState.mining.addresses.shift();
        }
    }
    
    saveToStorage();
}

function updateMiningDisplay() {
    // Update currency mining display
    Object.keys(AppState.mining.currencies).forEach(currency => {
        const progressElement = document.getElementById('mining-progress-' + currency);
        if (progressElement) {
            const elapsed = (Date.now() - AppState.mining.currencies[currency].lastUpdate) / 3600000;
            const progress = Math.min(elapsed * 100, 100);
            progressElement.style.width = progress + '%';
            progressElement.textContent = Math.floor(progress) + '%';
        }
    });
    
    // Update crypto mining display
    Object.keys(AppState.mining.crypto).forEach(currency => {
        const progressElement = document.getElementById('crypto-mining-progress-' + currency);
        if (progressElement) {
            const elapsed = (Date.now() - AppState.mining.crypto[currency].lastUpdate) / 3600000;
            const progress = Math.min(elapsed * 100, 100);
            progressElement.style.width = progress + '%';
            progressElement.textContent = Math.floor(progress) + '%';
        }
    });
    
    // Update address count
    const addressCountElement = document.getElementById('addressCount');
    if (addressCountElement) {
        addressCountElement.textContent = AppState.mining.addresses.length;
    }
}

// Trading Robot
function toggleTradingRobot() {
    AppState.trading.robotActive = !AppState.trading.robotActive;
    
    if (AppState.trading.robotActive) {
        startTradingRobot();
        showNotification('Trading robot activated', 'success');
    } else {
        showNotification('Trading robot deactivated', 'warning');
    }
    
    saveToStorage();
    updateTradingDisplay();
}

function startTradingRobot() {
    if (!AppState.trading.robotActive) return;
    
    setInterval(() => {
        if (AppState.trading.robotActive) {
            // Simulate trading
            const profit = Math.random() * 100;
            
            if (AppState.trading.capital > 0) {
                AppState.trading.profit += profit;
                showNotification('Trading robot generated ' + profit.toFixed(2) + ' USD profit', 'success');
            }
            
            saveToStorage();
            updateTradingDisplay();
        }
    }, 60000); // Run every minute
}

function updateTradingDisplay() {
    const robotStatusElement = document.getElementById('robotStatus');
    if (robotStatusElement) {
        robotStatusElement.textContent = AppState.trading.robotActive ? 'Active' : 'Inactive';
        robotStatusElement.className = AppState.trading.robotActive ? 'badge bg-success' : 'badge bg-danger';
    }
    
    const capitalElement = document.getElementById('tradingCapital');
    if (capitalElement) {
        capitalElement.textContent = formatCurrency(AppState.trading.capital, 'USD');
    }
    
    const profitElement = document.getElementById('tradingProfit');
    if (profitElement) {
        profitElement.textContent = formatCurrency(AppState.trading.profit, 'USD');
    }
}

// Alert System
function sendAlert(message) {
    // Simulate SMS alert
    console.log('SMS Alert:', message);
    
    // Simulate email alert
    console.log('Email Alert:', message);
    
    // Add to notifications
    const notification = {
        id: Date.now(),
        message: message,
        type: 'alert',
        timestamp: new Date().toISOString(),
        read: false
    };
    
    AppState.notifications.unshift(notification);
    saveToStorage();
    updateNotificationDisplay();
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:1.2rem;">×</button>
    `;
    
    // Add to container
    const container = document.getElementById('notificationContainer');
    if (container) {
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

function updateNotificationDisplay() {
    const notificationList = document.getElementById('notificationList');
    if (notificationList) {
        notificationList.innerHTML = '';
        
        AppState.notifications.slice(0, 10).forEach(notification => {
            const item = document.createElement('div');
            item.className = `notification ${notification.type}`;
            item.innerHTML = `
                <div>
                    <strong>${new Date(notification.timestamp).toLocaleString()}</strong>
                    <p>${notification.message}</p>
                </div>
            `;
            notificationList.appendChild(item);
        });
    }
}

// Event Listeners
function setupEventListeners() {
    // Login forms
    document.getElementById('customerLoginForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('customerUsername').value;
        const password = document.getElementById('customerPassword').value;
        login(username, password, false);
    });
    
    document.getElementById('adminLoginForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;
        login(username, password, true);
    });
    
    // Transaction forms
    document.getElementById('sendMoneyForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        sendMoney();
    });
    
    document.getElementById('receiveMoneyForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        receiveMoney();
    });
    
    document.getElementById('transferForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        transferBetweenAccounts();
    });
    
    // Crypto forms
    document.getElementById('createWalletBtn')?.addEventListener('click', createNewWallet);
    document.getElementById('sendCryptoForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        sendCrypto();
    });
    
    // Trading robot
    document.getElementById('toggleRobotBtn')?.addEventListener('click', toggleTradingRobot);
}

// UI Update Function
function updateUI() {
    updateBalances();
    updateTransactionHistory();
    updateWalletDisplay();
    updateMiningDisplay();
    updateTradingDisplay();
    updateNotificationDisplay();
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);