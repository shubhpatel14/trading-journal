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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CloudSync
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import com.tradeforge.journal.data.model.Trade
import com.tradeforge.journal.ui.components.ClaySurface
import com.tradeforge.journal.ui.components.KpiCard
import com.tradeforge.journal.ui.components.TradeCard
import com.tradeforge.journal.ui.theme.ClayAccent
import com.tradeforge.journal.ui.theme.ClayCanvas
import com.tradeforge.journal.ui.theme.ClayDanger
import com.tradeforge.journal.ui.theme.ClayForeground
import com.tradeforge.journal.ui.theme.ClayMuted
import com.tradeforge.journal.ui.theme.ClaySuccess
import com.tradeforge.journal.ui.theme.ClayWarning
import com.tradeforge.journal.ui.viewmodel.MainViewModel
import java.util.Locale

@Composable
fun DashboardScreen(
    viewModel: MainViewModel,
    onNavigateToJournal: () -> Unit,
    onNavigateToNewTrade: () -> Unit,
    onEditTrade: (Trade) -> Unit
) {
    val metrics by viewModel.metrics.collectAsState()
    val trades by viewModel.filteredTrades.collectAsState()
    val accounts by viewModel.accounts.collectAsState()
    val selectedAccountId by viewModel.selectedAccountId.collectAsState()
    val isGuest by viewModel.isGuest.collectAsState()

    val currentAccount = accounts.find { it.id == selectedAccountId }
    val initialCapital = if (selectedAccountId != "ALL") {
        currentAccount?.initialBalance ?: 100000.0
    } else {
        accounts.sumOf { it.initialBalance }.let { if (it > 0) it else 100000.0 }
    }
    val currentEquity = initialCapital + metrics.totalPnl

    val recentTrades = trades.take(4)

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(ClayCanvas)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(8.dp))

            // Sync Status Pill & Title
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "EXECUTIVE DASHBOARD",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = ClayMuted,
                        letterSpacing = 1.5.sp
                    )
                    Text(
                        text = if (selectedAccountId == "ALL") "All Trading Portfolios" else currentAccount?.name ?: "Portfolio",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black
                    )
                }

                // Cloud Status Pill
                Box(
                    modifier = Modifier
                        .background(if (isGuest) Color(0xFFFEF3C7) else Color(0xFFDCFCE7), RoundedCornerShape(20.dp))
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(if (isGuest) ClayWarning else ClaySuccess, CircleShape)
                        )
                        Icon(
                            imageVector = Icons.Default.CloudSync,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = if (isGuest) Color(0xFF92400E) else Color(0xFF166534)
                        )
                        Text(
                            text = if (isGuest) "Guest Sandbox" else "Cloud Synced",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = if (isGuest) Color(0xFF92400E) else Color(0xFF166534)
                        )
                    }
                }
            }
        }

        // Hero Net PnL Card
        item {
            val isWin = metrics.totalPnl >= 0
            val pnlColor = if (isWin) ClaySuccess else ClayDanger

            ClaySurface(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "NET PROFIT & LOSS",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = ClayMuted,
                            letterSpacing = 1.sp
                        )
                        Text(
                            text = "EQUITY: $${String.format(Locale.US, "%,.2f", currentEquity)}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = ClayAccent
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = (if (isWin) "+$" else "-$") + String.format(Locale.US, "%,.2f", Math.abs(metrics.totalPnl)),
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.Monospace,
                        color = pnlColor
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Secondary stats row: Win Rate & Profit Factor
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "WIN RATE",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = ClayMuted
                            )
                            Text(
                                text = "${String.format(Locale.US, "%.1f", metrics.winRate)}%",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.ExtraBold,
                                fontFamily = FontFamily.Monospace,
                                color = if (metrics.winRate >= 50.0) ClaySuccess else ClayDanger
                            )
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "PROFIT FACTOR",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = ClayMuted
                            )
                            val pfStr = if (metrics.profitFactor >= 99.9) "∞" else String.format(Locale.US, "%.2f", metrics.profitFactor)
                            Text(
                                text = pfStr,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.ExtraBold,
                                fontFamily = FontFamily.Monospace,
                                color = if (metrics.profitFactor >= 1.5) ClaySuccess else ClayForeground
                            )
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "WIN / LOSS",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = ClayMuted
                            )
                            Text(
                                text = "${metrics.winCount}W / ${metrics.lossCount}L",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.ExtraBold,
                                fontFamily = FontFamily.Monospace,
                                color = ClayForeground
                            )
                        }
                    }
                }
            }
        }

        // 2x2 Grid of KPIs
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                KpiCard(
                    modifier = Modifier.weight(1f),
                    title = "Avg Risk : Reward",
                    value = "${String.format(Locale.US, "%.2f", metrics.riskRewardRatio)} R",
                    valueColor = ClayForeground,
                    subtitle = "Planned target ratio"
                )
                KpiCard(
                    modifier = Modifier.weight(1f),
                    title = "Max Drawdown",
                    value = "${String.format(Locale.US, "%.1f", metrics.maxDrawdown)}%",
                    valueColor = if (metrics.maxDrawdown > 10.0) ClayDanger else ClayForeground,
                    subtitle = "Peak-to-valley dip"
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                KpiCard(
                    modifier = Modifier.weight(1f),
                    title = "Gross PnL",
                    value = (if (metrics.grossPnl >= 0) "+$" else "-$") + String.format(Locale.US, "%,.2f", Math.abs(metrics.grossPnl)),
                    valueColor = if (metrics.grossPnl >= 0) ClaySuccess else ClayDanger,
                    subtitle = "Before commissions"
                )
                KpiCard(
                    modifier = Modifier.weight(1f),
                    title = "Broker Fees Paid",
                    value = "-$" + String.format(Locale.US, "%,.2f", metrics.totalFees),
                    valueColor = ClayWarning,
                    subtitle = "Commissions & Swaps"
                )
            }
        }

        // Quick Action Button
        item {
            Button(
                onClick = onNavigateToNewTrade,
                colors = ButtonDefaults.buttonColors(containerColor = ClayAccent),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Text("Log New Trade in Journal", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
            }
        }

        // Recent Trades Section Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "RECENT EXECUTIONS",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.ExtraBold,
                    fontFamily = FontFamily.Monospace,
                    letterSpacing = 1.sp
                )
                Button(
                    onClick = onNavigateToJournal,
                    colors = ButtonDefaults.textButtonColors(),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("View All (${trades.size})", color = ClayAccent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Recent Trades Cards
        if (recentTrades.isEmpty()) {
            item {
                ClaySurface(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "No trades logged yet",
                            fontWeight = FontWeight.Bold,
                            color = ClayMuted
                        )
                        Text(
                            text = "Tap 'Log New Trade' above to create your first execution record.",
                            fontSize = 12.sp,
                            color = ClayMuted
                        )
                    }
                }
            }
        } else {
            items(recentTrades.size) { index ->
                val trade = recentTrades[index]
                TradeCard(trade = trade, onClick = { onEditTrade(trade) })
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
