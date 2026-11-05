package com.tradeforge.journal.data.model

data class PerformanceMetrics(
    val totalTrades: Int = 0,
    val winRate: Double = 0.0,
    val profitFactor: Double = 0.0,
    val riskRewardRatio: Double = 0.0,
    val maxDrawdown: Double = 0.0,
    val totalPnl: Double = 0.0,
    val totalFees: Double = 0.0,
    val grossPnl: Double = 0.0,
    val avgWin: Double = 0.0,
    val avgLoss: Double = 0.0,
    val winCount: Int = 0,
    val lossCount: Int = 0
)
