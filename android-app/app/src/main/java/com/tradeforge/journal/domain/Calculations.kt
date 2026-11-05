package com.tradeforge.journal.domain

import com.tradeforge.journal.data.model.PerformanceMetrics
import com.tradeforge.journal.data.model.Trade
import kotlin.math.abs
import kotlin.math.round

object Calculations {

    fun getTradeCommission(size: Double, commissionOverride: Double?, accountRate: Double = 7.0): Double {
        if (commissionOverride != null && !commissionOverride.isNaN()) {
            return abs(commissionOverride)
        }
        return round(size * accountRate * 100.0) / 100.0
    }

    fun getTradeTotalFees(trade: Trade, defaultRate: Double = 7.0): Double {
        val size = trade.size
        val comm = if (trade.commission != null) abs(trade.commission) else size * defaultRate
        val swap = abs(trade.swap ?: 0.0)
        val fee = abs(trade.fee ?: 0.0)
        return round((comm + swap + fee) * 100.0) / 100.0
    }

    fun getTradeNetPnl(trade: Trade, defaultRate: Double = 7.0): Double {
        val fees = getTradeTotalFees(trade, defaultRate)
        return round((trade.pnl - fees) * 100.0) / 100.0
    }

    fun calculateRiskReward(trade: Trade): Double? {
        if (trade.entryPrice > 0 && trade.sl > 0 && trade.tp > 0) {
            val risk = abs(trade.entryPrice - trade.sl)
            val reward = abs(trade.tp - trade.entryPrice)
            if (risk > 0.0000001) {
                return round((reward / risk) * 100.0) / 100.0
            }
        }
        return null
    }

    fun calculatePerformanceMetrics(
        trades: List<Trade>,
        initialCapital: Double = 100000.0,
        defaultCommissionRate: Double = 7.0
    ): PerformanceMetrics {
        val totalTrades = trades.size
        if (totalTrades == 0) {
            return PerformanceMetrics()
        }

        var totalNetPnl = 0.0
        var totalGrossPnl = 0.0
        var totalFees = 0.0
        var winCount = 0
        var lossCount = 0
        var totalWinsPnl = 0.0
        var totalLossesPnl = 0.0
        var totalRrRatioSum = 0.0
        var validRrCount = 0

        var rollingBalance = initialCapital
        var peak = rollingBalance
        var maxDdUSD = 0.0

        // Sort trades chronologically
        val sortedTrades = trades.sortedWith(compareBy({ it.date }, { it.time.ifEmpty { "00:00" } }))

        for (trade in sortedTrades) {
            val netPnl = getTradeNetPnl(trade, defaultCommissionRate)
            val fees = getTradeTotalFees(trade, defaultCommissionRate)

            totalNetPnl += netPnl
            totalGrossPnl += trade.pnl
            totalFees += fees
            rollingBalance += netPnl

            if (rollingBalance > peak) {
                peak = rollingBalance
            }

            val currentDd = peak - rollingBalance
            if (currentDd > maxDdUSD) {
                maxDdUSD = currentDd
            }

            if (netPnl > 0) {
                winCount++
                totalWinsPnl += netPnl
            } else if (netPnl < 0) {
                lossCount++
                totalLossesPnl += abs(netPnl)
            }

            val rr = calculateRiskReward(trade)
            if (rr != null) {
                totalRrRatioSum += rr
                validRrCount++
            }
        }

        val winRate = if (totalTrades > 0) (winCount.toDouble() / totalTrades.toDouble()) * 100.0 else 0.0
        val profitFactor = when {
            totalLossesPnl > 0.0 -> totalWinsPnl / totalLossesPnl
            totalWinsPnl > 0.0 -> 99.9
            else -> 0.0
        }
        val riskRewardRatio = if (validRrCount > 0) totalRrRatioSum / validRrCount else 0.0
        val maxDrawdownPct = if (peak > 0.0) (maxDdUSD / peak) * 100.0 else 0.0

        return PerformanceMetrics(
            totalTrades = totalTrades,
            winRate = round(winRate * 100.0) / 100.0,
            profitFactor = round(profitFactor * 100.0) / 100.0,
            riskRewardRatio = round(riskRewardRatio * 100.0) / 100.0,
            maxDrawdown = round(maxDrawdownPct * 100.0) / 100.0,
            totalPnl = round(totalNetPnl * 100.0) / 100.0,
            totalFees = round(totalFees * 100.0) / 100.0,
            grossPnl = round(totalGrossPnl * 100.0) / 100.0,
            avgWin = if (winCount > 0) round((totalWinsPnl / winCount) * 100.0) / 100.0 else 0.0,
            avgLoss = if (lossCount > 0) round((totalLossesPnl / lossCount) * 100.0) / 100.0 else 0.0,
            winCount = winCount,
            lossCount = lossCount
        )
    }
}
