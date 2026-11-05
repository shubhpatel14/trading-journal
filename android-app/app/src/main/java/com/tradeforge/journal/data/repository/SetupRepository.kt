package com.tradeforge.journal.data.repository

import com.tradeforge.journal.data.model.SetupDefinition
import com.tradeforge.journal.data.remote.FirestoreService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class SetupRepository(private val firestoreService: FirestoreService) {

    private val guestSetups = MutableStateFlow<List<SetupDefinition>>(
        listOf(
            SetupDefinition(
                id = "setup-1",
                name = "BoS Downside",
                description = "Break of structure in the direction of the higher timeframe bearish bias followed by a return to origin supply.",
                preferredAssets = listOf("XAUUSD", "EURUSD"),
                preferredSessions = listOf("LONDON", "NEW YORK"),
                direction = "SELL",
                entryRules = listOf(
                    "HTF 1H trend is bearish",
                    "15M clear break of structure and displacement",
                    "Pullback into premium 50%-61.8% FVG or orderblock",
                    "Rejection confirmation candle on 5M"
                ),
                invalidationRules = listOf(
                    "Price closes above 1H swing high",
                    "High impact red-folder news within 10 minutes"
                ),
                managementRules = listOf(
                    "Move SL to Breakeven at 1:1 RR",
                    "Take 50% partial at key liquidity level",
                    "Trail remainder using swing highs"
                ),
                tags = listOf("Trend Following", "SMC", "Breakout"),
                status = "ACTIVE"
            ),
            SetupDefinition(
                id = "setup-2",
                name = "EMA Rejection",
                description = "Mean reversion pullback to dynamic support/resistance along the 50 exponential moving average.",
                preferredAssets = listOf("EURUSD", "GBPUSD"),
                preferredSessions = listOf("LONDON"),
                direction = "BOTH",
                entryRules = listOf(
                    "Clear directional slope on 50 EMA",
                    "First touch or wick test into the EMA band",
                    "Candlestick rejection pattern"
                ),
                invalidationRules = listOf("Full body candle close on wrong side of EMA"),
                managementRules = listOf("Fixed 1:2 Risk to Reward target"),
                tags = listOf("Pullback", "Indicators"),
                status = "ACTIVE"
            ),
            SetupDefinition(
                id = "setup-3",
                name = "Liquidity Sweep",
                description = "Raid of previous session high/low or equal highs/lows followed by aggressive displacement in the opposite direction.",
                preferredAssets = listOf("XAUUSD", "BTCUSD"),
                preferredSessions = listOf("LONDON", "NEW YORK"),
                direction = "BOTH",
                entryRules = listOf(
                    "Raid of key session liquidity level",
                    "Immediate displacement with volume",
                    "Market structure shift (MSS) on 5M timeframe"
                ),
                invalidationRules = listOf("Acceptance and continuation outside the swept level"),
                managementRules = listOf("Target opposing liquidity pool"),
                tags = listOf("Liquidity", "Reversal", "SMC"),
                status = "ACTIVE"
            )
        )
    )

    fun getSetups(userId: String?, isGuest: Boolean): Flow<List<SetupDefinition>> {
        return if (!isGuest && !userId.isNullOrEmpty()) {
            firestoreService.getSetupsFlow(userId)
        } else {
            guestSetups.asStateFlow()
        }
    }

    suspend fun saveSetup(userId: String?, isGuest: Boolean, setup: SetupDefinition) {
        if (!isGuest && !userId.isNullOrEmpty()) {
            firestoreService.saveSetup(userId, setup)
        } else {
            val current = guestSetups.value.toMutableList()
            val setupId = setup.id.ifEmpty { "setup-${System.currentTimeMillis()}" }
            val index = current.indexOfFirst { it.id == setupId }
            if (index >= 0) {
                current[index] = setup.copy(id = setupId)
            } else {
                current.add(setup.copy(id = setupId))
            }
            guestSetups.value = current
        }
    }

    suspend fun deleteSetup(userId: String?, isGuest: Boolean, setupId: String) {
        if (!isGuest && !userId.isNullOrEmpty()) {
            firestoreService.deleteSetup(userId, setupId)
        } else {
            guestSetups.value = guestSetups.value.filter { it.id != setupId }
        }
    }
}
