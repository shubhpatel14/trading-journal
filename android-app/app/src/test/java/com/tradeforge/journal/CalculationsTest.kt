package com.tradeforge.journal

import com.tradeforge.journal.data.model.Trade
import com.tradeforge.journal.domain.Calculations
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class CalculationsTest {

    @Test
    fun testCommissionDefaultRate() {
        val commission = Calculations.getTradeCommission(size = 2.0, commissionOverride = null, accountRate = 7.0)
        assertEquals(14.0, commission, 0.001)
    }

    @Test
    fun testCommissionOverride() {
        val commission = Calculations.getTradeCommission(size = 2.0, commissionOverride = -10.5, accountRate = 7.0)
        assertEquals(10.5, commission, 0.001)
    }

    @Test
    fun testTotalFeesCalculation() {
        val trade = Trade(
            size = 1.0,
            commission = 7.0,
            swap = 2.5,
            fee = 1.0
        )
        val fees = Calculations.getTradeTotalFees(trade, defaultRate = 7.0)
        assertEquals(10.5, fees, 0.001)
    }

    @Test
    fun testNetPnlCalculation() {
        val winningTrade = Trade(
            size = 1.0,
            pnl = 500.0,
            commission = 7.0,
            swap = 3.0,
            fee = 0.0
        )
        val netPnl = Calculations.getTradeNetPnl(winningTrade)
        assertEquals(490.0, netPnl, 0.001)
    }

    @Test
    fun testRiskRewardCalculation() {
        val trade = Trade(
            entryPrice = 2000.0,
            sl = 1990.0,
            tp = 2030.0
        )
        val rr = Calculations.calculateRiskReward(trade)
        assertNotNull(rr)
        assertEquals(3.0, rr!!, 0.001)
    }

    @Test
    fun testPerformanceMetricsAggregations() {
        val trade1 = Trade(
            id = "t1",
            date = "2026-04-01",
            time = "10:00",
            size = 1.0,
            pnl = 300.0,
            commission = 7.0,
            swap = 0.0,
            fee = 0.0,
            entryPrice = 2000.0,
            sl = 1990.0,
            tp = 2020.0
        ) // Net PnL = 293.0 (Win)
        val trade2 = Trade(
            id = "t2",
            date = "2026-04-02",
            time = "11:00",
            size = 1.0,
            pnl = -100.0,
            commission = 7.0,
            swap = 0.0,
            fee = 0.0,
            entryPrice = 2000.0,
            sl = 1990.0,
            tp = 2020.0
        ) // Net PnL = -107.0 (Loss)

        val metrics = Calculations.calculatePerformanceMetrics(listOf(trade1, trade2), initialCapital = 10000.0)

        assertEquals(2, metrics.totalTrades)
        assertEquals(1, metrics.winCount)
        assertEquals(1, metrics.lossCount)
        assertEquals(50.0, metrics.winRate, 0.01)
        assertEquals(186.0, metrics.totalPnl, 0.01) // 293 - 107
        assertEquals(2.74, metrics.profitFactor, 0.02) // 293 / 107 = ~2.738
    }

    @Test
    fun testProfitFactorZeroLosses() {
        val trade = Trade(
            id = "t1",
            date = "2026-04-01",
            size = 1.0,
            pnl = 200.0,
            commission = 7.0
        )
        val metrics = Calculations.calculatePerformanceMetrics(listOf(trade))
        assertEquals(99.9, metrics.profitFactor, 0.01)
    }
}
