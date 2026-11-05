package com.tradeforge.journal.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tradeforge.journal.data.model.DailyReview
import com.tradeforge.journal.data.model.PerformanceMetrics
import com.tradeforge.journal.data.model.SetupDefinition
import com.tradeforge.journal.data.model.Trade
import com.tradeforge.journal.data.model.TradePlan
import com.tradeforge.journal.data.model.TradingAccount
import com.tradeforge.journal.data.model.WeeklyReview
import com.tradeforge.journal.data.remote.AuthService
import com.tradeforge.journal.data.remote.FirestoreService
import com.tradeforge.journal.data.repository.AccountRepository
import com.tradeforge.journal.data.repository.PlanRepository
import com.tradeforge.journal.data.repository.SetupRepository
import com.tradeforge.journal.data.repository.TradeRepository
import com.tradeforge.journal.domain.Calculations
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class MainViewModel(
    private val authService: AuthService = AuthService(),
    private val firestoreService: FirestoreService = FirestoreService()
) : ViewModel() {

    private val tradeRepository = TradeRepository(firestoreService)
    private val accountRepository = AccountRepository(firestoreService)
    private val setupRepository = SetupRepository(firestoreService)
    private val planRepository = PlanRepository(firestoreService)

    private val _isGuest = MutableStateFlow(false)
    val isGuest: StateFlow<Boolean> = _isGuest.asStateFlow()

    private val _authError = MutableStateFlow<String?>(null)
    val authError: StateFlow<String?> = _authError.asStateFlow()

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    // Filters
    val selectedAccountId = MutableStateFlow("ALL")
    val searchQuery = MutableStateFlow("")
    val filterStatus = MutableStateFlow<String?>(null) // WIN, LOSS, etc.
    val filterSession = MutableStateFlow<String?>(null) // LONDON, NEW YORK, ASIA
    val filterSetup = MutableStateFlow<String?>(null)
    val filterDate = MutableStateFlow<String?>(null)

    // Current authenticated user flow
    val currentUser = authService.getAuthStateFlow().stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = authService.currentUser
    )

    // Combine user & guest status into a single key
    private val authState = combine(currentUser, _isGuest) { user, guest ->
        Pair(user?.uid, guest)
    }

    // Dynamic reactive accounts list
    val accounts: StateFlow<List<TradingAccount>> = authState.flatMapLatest { (uid, guest) ->
        accountRepository.getAccounts(uid, guest)
    }.stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    // Dynamic reactive trades list
    val allTrades: StateFlow<List<Trade>> = authState.flatMapLatest { (uid, guest) ->
        tradeRepository.getTrades(uid, guest)
    }.stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    // Filter parameters combining state
    private data class FilterParams(
        val accId: String = "ALL",
        val query: String = "",
        val status: String? = null,
        val session: String? = null
    )

    private val filterCriteria = combine(
        selectedAccountId,
        searchQuery,
        filterStatus,
        filterSession
    ) { accId, query, status, session ->
        FilterParams(accId, query, status, session)
    }

    // Filtered trades
    val filteredTrades: StateFlow<List<Trade>> = combine(
        allTrades,
        filterCriteria,
        filterSetup,
        filterDate
    ) { trades, criteria, setup, date ->
        trades.filter { trade ->
            val matchAccount = (criteria.accId == "ALL" || trade.accountId == criteria.accId)
            val matchQuery = if (criteria.query.isBlank()) true else {
                trade.asset.contains(criteria.query, ignoreCase = true) ||
                        trade.setup.contains(criteria.query, ignoreCase = true) ||
                        trade.notes.contains(criteria.query, ignoreCase = true)
            }
            val matchStatus = if (criteria.status.isNullOrBlank()) true else trade.status.equals(criteria.status, ignoreCase = true)
            val matchSession = if (criteria.session.isNullOrBlank()) true else trade.session.equals(criteria.session, ignoreCase = true)
            val matchSetup = if (setup.isNullOrBlank()) true else trade.setup.equals(setup, ignoreCase = true)
            val matchDate = if (date.isNullOrBlank()) true else trade.date == date
            matchAccount && matchQuery && matchStatus && matchSession && matchSetup && matchDate
        }
    }.stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    // Dynamic reactive setups list
    val setups: StateFlow<List<SetupDefinition>> = authState.flatMapLatest { (uid, guest) ->
        setupRepository.getSetups(uid, guest)
    }.stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    // Dynamic reactive plans list
    val plans: StateFlow<List<TradePlan>> = authState.flatMapLatest { (uid, guest) ->
        planRepository.getPlans(uid, guest)
    }.stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    // Dynamic reactive daily reviews
    val dailyReviews: StateFlow<List<DailyReview>> = authState.flatMapLatest { (uid, guest) ->
        planRepository.getDailyReviews(uid, guest)
    }.stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    // Dynamic reactive weekly reviews
    val weeklyReviews: StateFlow<List<WeeklyReview>> = authState.flatMapLatest { (uid, guest) ->
        planRepository.getWeeklyReviews(uid, guest)
    }.stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    // Active performance metrics
    val metrics: StateFlow<PerformanceMetrics> = combine(filteredTrades, accounts, selectedAccountId) { trades, accs, accId ->
        val initialCapital = if (accId != "ALL") {
            accs.find { it.id == accId }?.initialBalance ?: 100000.0
        } else {
            accs.sumOf { it.initialBalance }.let { if (it > 0) it else 100000.0 }
        }
        val rate = accs.find { it.id == accId }?.commissionPerLot ?: 7.0
        Calculations.calculatePerformanceMetrics(trades, initialCapital, rate)
    }.stateIn(viewModelScope, SharingStarted.Lazily, PerformanceMetrics())

    // -------------------------------------------------------------
    // TRADE MUTATIONS (Bidirectional Firestore Sync)
    // -------------------------------------------------------------
    fun saveTrade(trade: Trade) {
        viewModelScope.launch {
            _isSyncing.value = true
            try {
                val uid = currentUser.value?.uid
                tradeRepository.saveTrade(uid, _isGuest.value, trade)
            } catch (e: Exception) {
                _authError.value = e.message
            } finally {
                _isSyncing.value = false
            }
        }
    }

    fun deleteTrade(tradeId: String) {
        viewModelScope.launch {
            _isSyncing.value = true
            try {
                val uid = currentUser.value?.uid
                tradeRepository.deleteTrade(uid, _isGuest.value, tradeId)
            } catch (e: Exception) {
                _authError.value = e.message
            } finally {
                _isSyncing.value = false
            }
        }
    }

    fun saveSetup(setup: SetupDefinition) {
        viewModelScope.launch {
            try {
                setupRepository.saveSetup(currentUser.value?.uid, _isGuest.value, setup)
            } catch (e: Exception) {
                _authError.value = e.message
            }
        }
    }

    fun deleteSetup(setupId: String) {
        viewModelScope.launch {
            try {
                setupRepository.deleteSetup(currentUser.value?.uid, _isGuest.value, setupId)
            } catch (e: Exception) {
                _authError.value = e.message
            }
        }
    }

    fun savePlan(plan: TradePlan) {
        viewModelScope.launch {
            try {
                planRepository.savePlan(currentUser.value?.uid, _isGuest.value, plan)
            } catch (e: Exception) {
                _authError.value = e.message
            }
        }
    }

    fun deletePlan(planId: String) {
        viewModelScope.launch {
            try {
                planRepository.deletePlan(currentUser.value?.uid, _isGuest.value, planId)
            } catch (e: Exception) {
                _authError.value = e.message
            }
        }
    }

    fun saveAccount(account: TradingAccount) {
        viewModelScope.launch {
            try {
                accountRepository.saveAccount(currentUser.value?.uid, _isGuest.value, account)
            } catch (e: Exception) {
                _authError.value = e.message
            }
        }
    }

    // -------------------------------------------------------------
    // AUTHENTICATION
    // -------------------------------------------------------------
    fun signInEmail(email: String, pass: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _authError.value = null
            _isSyncing.value = true
            try {
                authService.signInWithEmail(email, pass)
                _isGuest.value = false
                onSuccess()
            } catch (e: Exception) {
                _authError.value = e.localizedMessage ?: "Failed to sign in"
            } finally {
                _isSyncing.value = false
            }
        }
    }

    fun signUpEmail(email: String, pass: String, name: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _authError.value = null
            _isSyncing.value = true
            try {
                authService.signUpWithEmail(email, pass, name)
                _isGuest.value = false
                onSuccess()
            } catch (e: Exception) {
                _authError.value = e.localizedMessage ?: "Failed to create account"
            } finally {
                _isSyncing.value = false
            }
        }
    }

    fun enterGuestMode(onSuccess: () -> Unit) {
        _isGuest.value = true
        _authError.value = null
        onSuccess()
    }

    fun signOut() {
        authService.signOut()
        _isGuest.value = false
    }

    fun clearAuthError() {
        _authError.value = null
    }
}
