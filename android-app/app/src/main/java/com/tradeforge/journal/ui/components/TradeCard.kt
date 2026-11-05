package com.tradeforge.journal.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tradeforge.journal.data.model.Trade
import com.tradeforge.journal.domain.Calculations
import com.tradeforge.journal.ui.theme.ClayAccent
import com.tradeforge.journal.ui.theme.ClayDanger
import com.tradeforge.journal.ui.theme.ClayMuted
import com.tradeforge.journal.ui.theme.ClaySky
import com.tradeforge.journal.ui.theme.ClaySuccess
import com.tradeforge.journal.ui.theme.ClayWarning
import java.util.Locale

@Composable
fun TradeCard(
    trade: Trade,
    onClick: () -> Unit
) {
    val netPnl = Calculations.getTradeNetPnl(trade)
    val isWin = netPnl > 0
    val isLoss = netPnl < 0
    val pnlColor = if (isWin) ClaySuccess else if (isLoss) ClayDanger else ClayWarning
    val formattedPnl = (if (netPnl >= 0) "+$" else "-$") + String.format(Locale.US, "%.2f", Math.abs(netPnl))
    val rr = Calculations.calculateRiskReward(trade)

    ClaySurface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Top Row: Asset, Direction Badge, Setup, Grade
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = trade.asset,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.ExtraBold
                    )

                    // Direction Badge
                    val isBuy = trade.direction.equals("BUY", ignoreCase = true)
                    Box(
                        modifier = Modifier
                            .background(
                                color = if (isBuy) Color(0xFFDCFCE7) else Color(0xFFFFE4E6),
                                shape = RoundedCornerShape(6.dp)
                            )
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = if (isBuy) "BUY" else "SELL",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace,
                            color = if (isBuy) Color(0xFF166534) else Color(0xFF9F1239)
                        )
                    }

                    // Setup badge
                    if (trade.setup.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .background(Color(0xFFF1F5F9), RoundedCornerShape(6.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = trade.setup,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = ClayMuted
                            )
                        }
                    }
                }

                // Grade badge
                if (!trade.tradeGrade.isNullOrBlank()) {
                    Box(
                        modifier = Modifier
                            .border(1.dp, ClayAccent, RoundedCornerShape(8.dp))
                            .background(Color(0xFFFAF5FF), RoundedCornerShape(8.dp))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = trade.tradeGrade,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace,
                            color = ClayAccent
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Middle Row: Net PnL & RR & Status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = formattedPnl,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.Monospace,
                        color = pnlColor
                    )
                    Text(
                        text = "Net PnL (after fees)",
                        fontSize = 10.sp,
                        color = ClayMuted
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (rr != null) {
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "${String.format(Locale.US, "%.2f", rr)} R",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                            Text(
                                text = "Planned R:R",
                                fontSize = 10.sp,
                                color = ClayMuted
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .background(
                                color = if (isWin) Color(0xFFDCFCE7) else if (isLoss) Color(0xFFFFE4E6) else Color(0xFFFEF3C7),
                                shape = RoundedCornerShape(8.dp)
                            )
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = trade.status,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace,
                            color = if (isWin) Color(0xFF166534) else if (isLoss) Color(0xFF9F1239) else Color(0xFF92400E)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Bottom Row: Date, Time, Session tag, Size
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "${trade.date} • ${trade.time.ifEmpty { "00:00" }}",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = ClayMuted
                    )

                    // Session
                    if (trade.session.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .background(Color(0xFFE0F2FE), RoundedCornerShape(4.dp))
                                .padding(horizontal = 5.dp, vertical = 1.dp)
                        ) {
                            Text(
                                text = trade.session,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = ClaySky
                            )
                        }
                    }
                }

                Text(
                    text = "${String.format(Locale.US, "%.2f", trade.size)} Lots",
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Medium,
                    color = ClayMuted
                )
            }
        }
    }
}
