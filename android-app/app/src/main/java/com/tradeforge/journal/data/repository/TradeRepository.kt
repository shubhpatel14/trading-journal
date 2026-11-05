package com.tradeforge.journal.data.repository

import com.tradeforge.journal.data.model.Trade
import com.tradeforge.journal.data.remote.FirestoreService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class TradeRepository(private val firestoreService: FirestoreService) {

    // Demo/Guest fallback data matching mockData.ts
    private val guestTrades = MutableStateFlow<List<Trade>>(
        listOf(
            Trade(
                id = "trade-1",
                accountId = "acc-1",
                setup = "BoS Downside",
                date = "2026-04-10",
                time = "08:30",
                asset = "XAUUSD",
                direction = "SELL",
                entryPrice = 2345.50,
                exitPrice = 2332.10,
                size = 1.0,
                sl = 2351.0,
                tp = 2330.0,
                pnl = 1340.0,
                commission = 7.0,
                swap = 0.0,
                fee = 0.0,
                status = "WIN",
                session = "LONDON",
                mistakes = emptyList(),
                notes = "Clean London open breakout after 15M fair value gap retest.",
                tradeGrade = "A+",
                journalingStatus = "COMPLETE"
            ),
            Trade(
                id = "trade-2",
                accountId = "acc-1",
                setup = "EMA Rejection",
                date = "2026-04-09",
                time = "14:15",
                asset = "EURUSD",
                direction = "BUY",
                entryPrice = 1.0850,
                exitPrice = 1.0825,
                size = 2.0,
                sl = 1.0825,
                tp = 1.0910,
                pnl = -500.0,
                commission = 14.0,
                swap = 0.0,
                fee = 0.0,
                status = "LOSS",
                session = "NEW YORK",
                mistakes = listOf("FOMO"),
                notes = "Chased the New York continuation before candle close.",
                tradeGrade = "C",
                journalingStatus = "COMPLETE"
            ),
            Trade(
                id = "trade-3",
                accountId = "acc-1",
                setup = "Liquidity Sweep",
                date = "2026-04-08",
                time = "09:00",
                asset = "BTCUSD",
                direction = "BUY",
                entryPrice = 68400.0,
                exitPrice = 69850.0,
                size = 0.5,
                sl = 67900.0,
                tp = 70000.0,
                pnl = 725.0,
                commission = 3.5,
                swap = 0.0,
                fee = 0.0,
                status = "WIN",
                session = "LONDON",
                mistakes = emptyList(),
                notes = "Asia low swept during London session, strong displacement.",
                tradeGrade = "A",
                journalingStatus = "COMPLETE"
            )
        )
    )

    fun getTrades(userId: String?, isGuest: Boolean): Flow<List<Trade>> {
        return if (!isGuest && !userId.isNullOrEmpty()) {
            firestoreService.getTradesFlow(userId)
        } else {
            guestTrades.asStateFlow()
        }
    }

    suspend fun saveTrade(userId: String?, isGuest: Boolean, trade: Trade) {
        if (!isGuest && !userId.isNullOrEmpty()) {
            firestoreService.saveTrade(userId, trade)
        } else {
            val current = guestTrades.value.toMutableList()
            val tradeId = trade.id.ifEmpty { "trade-${System.currentTimeMillis()}" }
            val index = current.indexOfFirst { it.id == tradeId }
            if (index >= 0) {
                current[index] = trade.copy(id = tradeId)
            } else {
                current.add(0, trade.copy(id = tradeId))
            }
            guestTrades.value = current
        }
    }

    suspend fun deleteTrade(userId: String?, isGuest: Boolean, tradeId: String) {
        if (!isGuest && !userId.isNullOrEmpty()) {
            firestoreService.deleteTrade(userId, tradeId)
        } else {
            val current = guestTrades.value.filter { it.id != tradeId }
            guestTrades.value = current
        }
    }
}
