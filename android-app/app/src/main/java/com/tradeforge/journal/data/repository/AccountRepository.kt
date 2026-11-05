package com.tradeforge.journal.data.repository

import com.tradeforge.journal.data.model.TradingAccount
import com.tradeforge.journal.data.remote.FirestoreService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class AccountRepository(private val firestoreService: FirestoreService) {

    private val guestAccounts = MutableStateFlow<List<TradingAccount>>(
        listOf(
            TradingAccount(
                id = "acc-1",
                name = "Apex 50k Funded",
                broker = "Rithmic / Tradovate",
                initialBalance = 50000.0,
                currency = "USD",
                commissionPerLot = 7.0,
                isActive = true,
                isPrimary = true
            ),
            TradingAccount(
                id = "acc-2",
                name = "FTMO 100k Swing",
                broker = "FTMO",
                initialBalance = 100000.0,
                currency = "USD",
                commissionPerLot = 7.0,
                isActive = true,
                isPrimary = false
            )
        )
    )

    fun getAccounts(userId: String?, isGuest: Boolean): Flow<List<TradingAccount>> {
        return if (!isGuest && !userId.isNullOrEmpty()) {
            firestoreService.getAccountsFlow(userId)
        } else {
            guestAccounts.asStateFlow()
        }
    }

    suspend fun saveAccount(userId: String?, isGuest: Boolean, account: TradingAccount) {
        if (!isGuest && !userId.isNullOrEmpty()) {
            firestoreService.saveAccount(userId, account)
        } else {
            val current = guestAccounts.value.toMutableList()
            val accId = account.id.ifEmpty { "acc-${System.currentTimeMillis()}" }
            val index = current.indexOfFirst { it.id == accId }
            if (index >= 0) {
                current[index] = account.copy(id = accId)
            } else {
                current.add(account.copy(id = accId))
            }
            guestAccounts.value = current
        }
    }
}
