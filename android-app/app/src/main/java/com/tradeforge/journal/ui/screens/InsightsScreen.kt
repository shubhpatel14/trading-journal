package com.tradeforge.journal.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tradeforge.journal.domain.Calculations
import com.tradeforge.journal.ui.components.ClaySurface
import com.tradeforge.journal.ui.components.KpiCard
import com.tradeforge.journal.ui.theme.ClayAccent
import com.tradeforge.journal.ui.theme.ClayCanvas
import com.tradeforge.journal.ui.theme.ClayDanger
import com.tradeforge.journal.ui.theme.ClayMuted
import com.tradeforge.journal.ui.theme.ClaySuccess
import com.tradeforge.journal.ui.theme.ClayWarning
import com.tradeforge.journal.ui.viewmodel.MainViewModel
import java.util.Locale

@Composable
fun InsightsScreen(viewModel: MainViewModel) {
    val metrics by viewModel.metrics.collectAsState()
    val allTrades by viewModel.allTrades.collectAsState()

    // Session breakdown
    val londonTrades = allTrades.filter { it.session.equals("LONDON", ignoreCase = true) }
    val nyTrades = allTrades.filter { it.session.equals("NEW YORK", ignoreCase = true) }
    val asiaTrades = allTrades.filter { it.session.equals("ASIA", ignoreCase = true) }

    val londonPnl = londonTrades.sumOf { Calculations.getTradeNetPnl(it) }
    val nyPnl = nyTrades.sumOf { Calculations.getTradeNetPnl(it) }
    val asiaPnl = asiaTrades.sumOf { Calculations.getTradeNetPnl(it) }

    // Mistakes breakdown
    val mistakesMap = mutableMapOf<String, Int>()
    allTrades.forEach { trade ->
        trade.mistakes.forEach { m ->
            if (m.isNotBlank() && !m.equals("None", ignoreCase = true)) {
                mistakesMap[m] = (mistakesMap[m] ?: 0) + 1
            }
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(ClayCanvas)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Column {
                Text(
                    text = "QUANTITATIVE ANALYTICS",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = ClayMuted,
                    letterSpacing = 1.5.sp
                )
                Text(
                    text = "Tactical Performance Audit",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black
                )
            }
        }

        // Expected Value and Core Metrics
        item {
            val ev = if (metrics.totalTrades > 0) metrics.totalPnl / metrics.totalTrades.toDouble() else 0.0
            ClaySurface(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "EXPECTED VALUE (EV) PER TRADE",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = ClayMuted
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = (if (ev >= 0) "+$" else "-$") + String.format(Locale.US, "%.2f", Math.abs(ev)),
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.Monospace,
                        color = if (ev >= 0) ClaySuccess else ClayDanger
                    )
                    Text(
                        text = "Average statistical edge extracted per closed execution",
                        fontSize = 11.sp,
                        color = ClayMuted
                    )
                }
            }
        }

        // Average Win vs Average Loss
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                KpiCard(
                    modifier = Modifier.weight(1f),
                    title = "Average Win",
                    value = "+$" + String.format(Locale.US, "%.2f", metrics.avgWin),
                    valueColor = ClaySuccess,
                    subtitle = "Across ${metrics.winCount} wins"
                )
                KpiCard(
                    modifier = Modifier.weight(1f),
                    title = "Average Loss",
                    value = "-$" + String.format(Locale.US, "%.2f", metrics.avgLoss),
                    valueColor = ClayDanger,
                    subtitle = "Across ${metrics.lossCount} losses"
                )
            }
        }

        // Session Performance Breakdown
        item {
            ClaySurface(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "SESSION EDGE DISTRIBUTION",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = ClayMuted
                    )

                    // London
                    SessionRow(name = "London Session", count = londonTrades.size, pnl = londonPnl)
                    // New York
                    SessionRow(name = "New York Session", count = nyTrades.size, pnl = nyPnl)
                    // Asia
                    SessionRow(name = "Asia Session", count = asiaTrades.size, pnl = asiaPnl)
                }
            }
        }

        // Psychological Pitfalls / Mistakes Analysis
        item {
            ClaySurface(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Default.Psychology, contentDescription = null, tint = ClayWarning)
                        Text(
                            text = "BEHAVIORAL MISTAKE ANALYSIS",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = ClayMuted
                        )
                    }

                    if (mistakesMap.isEmpty()) {
                        Text(
                            text = "No psychological rule violations logged! Pristine execution discipline.",
                            fontSize = 12.sp,
                            color = ClaySuccess,
                            fontWeight = FontWeight.SemiBold
                        )
                    } else {
                        mistakesMap.entries.sortedByDescending { it.value }.forEach { (mistake, count) ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(text = mistake, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                Text(
                                    text = "$count times",
                                    fontSize = 13.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    color = ClayDanger
                                )
                            }
                        }
                    }
                }
            }
        }

        // AI Performance Coach Card
        item {
            ClaySurface(
                modifier = Modifier.fillMaxWidth(),
                backgroundColor = Color(0xFFFBF9FE)
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = ClayAccent)
                        Text(
                            text = "INSTITUTIONAL RISK AUDIT",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = ClayAccent
                        )
                    }
                    Text(
                        text = if (metrics.winRate >= 50.0 && metrics.profitFactor >= 1.5)
                            "Strong directional edge confirmed. Your average win exceeds average loss with controlled drawdown. Continue enforcing 1:2+ R:R minimums on playbook entries."
                        else if (metrics.totalTrades == 0)
                            "No closed trades recorded yet. Log your completed executions in the Journal tab to generate automated risk insights."
                        else
                            "Focus on eliminating FOMO and premature exits. Tighten your stop loss invalidation rules to prevent outsized losses from eroding your win streak equity.",
                        fontSize = 12.sp,
                        lineHeight = 18.sp,
                        color = ClayMuted
                    )
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
private fun SessionRow(name: String, count: Int, pnl: Double) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(text = name, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            Text(text = "$count trades logged", fontSize = 11.sp, color = ClayMuted)
        }
        Text(
            text = (if (pnl >= 0) "+$" else "-$") + String.format(Locale.US, "%.2f", Math.abs(pnl)),
            fontSize = 14.sp,
            fontWeight = FontWeight.Black,
            fontFamily = FontFamily.Monospace,
            color = if (pnl >= 0) ClaySuccess else ClayDanger
        )
    }
}
