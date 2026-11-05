package com.tradeforge.journal.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tradeforge.journal.data.model.Trade
import com.tradeforge.journal.domain.Calculations
import com.tradeforge.journal.ui.components.ClaySurface
import com.tradeforge.journal.ui.theme.ClayAccent
import com.tradeforge.journal.ui.theme.ClayCanvas
import com.tradeforge.journal.ui.theme.ClayDanger
import com.tradeforge.journal.ui.theme.ClayMuted
import com.tradeforge.journal.ui.theme.ClaySuccess
import com.tradeforge.journal.ui.viewmodel.MainViewModel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TradeEditScreen(
    viewModel: MainViewModel,
    existingTrade: Trade?,
    onNavigateBack: () -> Unit
) {
    val isEditing = existingTrade != null

    val setups by viewModel.setups.collectAsState()
    val accounts by viewModel.accounts.collectAsState()

    val dateFormat = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US) }
    val timeFormat = remember { SimpleDateFormat("HH:mm", Locale.US) }
    val now = remember { Date() }

    var asset by remember { mutableStateOf(existingTrade?.asset ?: "XAUUSD") }
    var direction by remember { mutableStateOf(existingTrade?.direction ?: "BUY") }
    var setupName by remember { mutableStateOf(existingTrade?.setup ?: (setups.firstOrNull()?.name ?: "BoS Downside")) }
    var date by remember { mutableStateOf(existingTrade?.date ?: dateFormat.format(now)) }
    var time by remember { mutableStateOf(existingTrade?.time ?: timeFormat.format(now)) }
    var entryPrice by remember { mutableStateOf(existingTrade?.entryPrice?.takeIf { it > 0 }?.toString() ?: "") }
    var exitPrice by remember { mutableStateOf(existingTrade?.exitPrice?.takeIf { it > 0 }?.toString() ?: "") }
    var size by remember { mutableStateOf(existingTrade?.size?.takeIf { it > 0 }?.toString() ?: "1.0") }
    var sl by remember { mutableStateOf(existingTrade?.sl?.takeIf { it > 0 }?.toString() ?: "") }
    var tp by remember { mutableStateOf(existingTrade?.tp?.takeIf { it > 0 }?.toString() ?: "") }
    var pnl by remember { mutableStateOf(existingTrade?.pnl?.toString() ?: "0.0") }
    var commission by remember { mutableStateOf(existingTrade?.commission?.toString() ?: "") }
    var session by remember { mutableStateOf(existingTrade?.session ?: "LONDON") }
    var status by remember { mutableStateOf(existingTrade?.status ?: "WIN") }
    var tradeGrade by remember { mutableStateOf(existingTrade?.tradeGrade ?: "A") }
    var notes by remember { mutableStateOf(existingTrade?.notes ?: "") }
    var selectedMistakes by remember { mutableStateOf(existingTrade?.mistakes ?: emptyList()) }

    var showDeleteConfirm by remember { mutableStateOf(false) }

    // Live calculation previews
    val numSize = size.toDoubleOrNull() ?: 1.0
    val numPnl = pnl.toDoubleOrNull() ?: 0.0
    val numEntry = entryPrice.toDoubleOrNull() ?: 0.0
    val numSl = sl.toDoubleOrNull() ?: 0.0
    val numTp = tp.toDoubleOrNull() ?: 0.0
    val numComm = commission.toDoubleOrNull()

    val dummyTrade = remember(numSize, numPnl, numComm, numEntry, numSl, numTp) {
        Trade(
            size = numSize,
            pnl = numPnl,
            commission = numComm,
            entryPrice = numEntry,
            sl = numSl,
            tp = numTp
        )
    }

    val liveNetPnl = Calculations.getTradeNetPnl(dummyTrade)
    val liveRR = Calculations.calculateRiskReward(dummyTrade)

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = if (isEditing) "Edit Trade Execution" else "Log New Trade",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (isEditing) {
                        IconButton(onClick = { showDeleteConfirm = true }) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete Trade", tint = ClayDanger)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = ClayCanvas)
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(ClayCanvas)
                .padding(paddingValues)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Live Preview Card
            item {
                ClaySurface(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "LIVE ESTIMATED NET PNL",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace,
                                    color = ClayMuted
                                )
                                Text(
                                    text = (if (liveNetPnl >= 0) "+$" else "-$") + String.format(Locale.US, "%.2f", Math.abs(liveNetPnl)),
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Black,
                                    fontFamily = FontFamily.Monospace,
                                    color = if (liveNetPnl >= 0) ClaySuccess else ClayDanger
                                )
                            }
                            if (liveRR != null) {
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "ESTIMATED R:R",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        fontFamily = FontFamily.Monospace,
                                        color = ClayMuted
                                    )
                                    Text(
                                        text = "${String.format(Locale.US, "%.2f", liveRR)} R",
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.Black,
                                        fontFamily = FontFamily.Monospace,
                                        color = ClayAccent
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Asset & Direction
            item {
                ClaySurface(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(text = "Instrument & Direction", fontWeight = FontWeight.Bold, fontSize = 14.sp)

                        OutlinedTextField(
                            value = asset,
                            onValueChange = { asset = it.uppercase() },
                            label = { Text("Asset / Ticker (e.g. XAUUSD, EURUSD)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        // BUY / SELL Toggle
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Button(
                                onClick = { direction = "BUY" },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (direction == "BUY") Color(0xFF166534) else Color(0xFFE2E8F0),
                                    contentColor = if (direction == "BUY") Color.White else ClayMuted
                                ),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("BUY (Long)", fontWeight = FontWeight.Bold)
                            }

                            Button(
                                onClick = { direction = "SELL" },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (direction == "SELL") Color(0xFF9F1239) else Color(0xFFE2E8F0),
                                    contentColor = if (direction == "SELL") Color.White else ClayMuted
                                ),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("SELL (Short)", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // Prices & Risk Parameters
            item {
                ClaySurface(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(text = "Execution Pricing & Lots", fontWeight = FontWeight.Bold, fontSize = 14.sp)

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            OutlinedTextField(
                                value = entryPrice,
                                onValueChange = { entryPrice = it },
                                label = { Text("Entry Price") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                modifier = Modifier.weight(1f),
                                singleLine = true
                            )
                            OutlinedTextField(
                                value = exitPrice,
                                onValueChange = { exitPrice = it },
                                label = { Text("Exit Price") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                modifier = Modifier.weight(1f),
                                singleLine = true
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            OutlinedTextField(
                                value = sl,
                                onValueChange = { sl = it },
                                label = { Text("Stop Loss (SL)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                modifier = Modifier.weight(1f),
                                singleLine = true
                            )
                            OutlinedTextField(
                                value = tp,
                                onValueChange = { tp = it },
                                label = { Text("Take Profit (TP)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                modifier = Modifier.weight(1f),
                                singleLine = true
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            OutlinedTextField(
                                value = size,
                                onValueChange = { size = it },
                                label = { Text("Size (Lots)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                modifier = Modifier.weight(1f),
                                singleLine = true
                            )
                            OutlinedTextField(
                                value = pnl,
                                onValueChange = {
                                    pnl = it
                                    val n = it.toDoubleOrNull() ?: 0.0
                                    status = if (n > 0) "WIN" else if (n < 0) "LOSS" else "BREAKEVEN"
                                },
                                label = { Text("Gross PnL ($)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                modifier = Modifier.weight(1f),
                                singleLine = true
                            )
                        }

                        OutlinedTextField(
                            value = commission,
                            onValueChange = { commission = it },
                            label = { Text("Commission Override ($ optional)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }
                }
            }

            // Setup, Session, and Status
            item {
                ClaySurface(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(text = "Playbook & Context", fontWeight = FontWeight.Bold, fontSize = 14.sp)

                        OutlinedTextField(
                            value = setupName,
                            onValueChange = { setupName = it },
                            label = { Text("Setup Name (e.g. BoS Downside)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        // Session Row
                        Text(text = "Trading Session", fontSize = 12.sp, color = ClayMuted, fontWeight = FontWeight.Bold)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf("LONDON", "NEW YORK", "ASIA").forEach { s ->
                                FilterChip(
                                    selected = session == s,
                                    onClick = { session = s },
                                    label = { Text(s, fontSize = 11.sp) }
                                )
                            }
                        }

                        // Status Row
                        Text(text = "Outcome Status", fontSize = 12.sp, color = ClayMuted, fontWeight = FontWeight.Bold)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf("WIN", "LOSS", "BREAKEVEN", "OPEN").forEach { st ->
                                FilterChip(
                                    selected = status == st,
                                    onClick = { status = st },
                                    label = { Text(st, fontSize = 11.sp) }
                                )
                            }
                        }

                        // Execution Grade Row
                        Text(text = "Execution Grade", fontSize = 12.sp, color = ClayMuted, fontWeight = FontWeight.Bold)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf("A+", "A", "B", "C", "Gamble").forEach { g ->
                                FilterChip(
                                    selected = tradeGrade == g,
                                    onClick = { tradeGrade = g },
                                    label = { Text(g, fontSize = 11.sp) }
                                )
                            }
                        }
                    }
                }
            }

            // Psychological Mistakes
            item {
                ClaySurface(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(text = "Psychological Pitfalls / Mistakes", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        val allMistakes = listOf("FOMO", "Overtrading", "Left Early", "Revenge Trading", "Moved SL")
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            allMistakes.take(3).forEach { m ->
                                val selected = selectedMistakes.contains(m)
                                FilterChip(
                                    selected = selected,
                                    onClick = {
                                        selectedMistakes = if (selected) selectedMistakes - m else selectedMistakes + m
                                    },
                                    label = { Text(m, fontSize = 11.sp) }
                                )
                            }
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            allMistakes.drop(3).forEach { m ->
                                val selected = selectedMistakes.contains(m)
                                FilterChip(
                                    selected = selected,
                                    onClick = {
                                        selectedMistakes = if (selected) selectedMistakes - m else selectedMistakes + m
                                    },
                                    label = { Text(m, fontSize = 11.sp) }
                                )
                            }
                        }
                    }
                }
            }

            // Notes
            item {
                ClaySurface(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(text = "Execution Notes & Observations", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        OutlinedTextField(
                            value = notes,
                            onValueChange = { notes = it },
                            placeholder = { Text("Enter trade reflection, entry trigger context...") },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 3
                        )
                    }
                }
            }

            // Submit Button
            item {
                Button(
                    onClick = {
                        val finalTrade = Trade(
                            id = existingTrade?.id ?: "trade-${System.currentTimeMillis()}",
                            accountId = existingTrade?.accountId ?: (accounts.firstOrNull()?.id ?: "acc-1"),
                            date = date,
                            time = time,
                            asset = asset.trim(),
                            direction = direction,
                            setup = setupName.trim(),
                            entryPrice = numEntry,
                            exitPrice = numExitPrice(exitPrice, numEntry),
                            size = numSize,
                            sl = numSl,
                            tp = numTp,
                            pnl = numPnl,
                            commission = numComm,
                            status = status,
                            session = session,
                            tradeGrade = tradeGrade,
                            mistakes = selectedMistakes,
                            notes = notes.trim(),
                            journalingStatus = "COMPLETE"
                        )
                        viewModel.saveTrade(finalTrade)
                        onNavigateBack()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = ClayAccent),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Save, contentDescription = null)
                        Text(
                            text = if (isEditing) "Save Trade & Sync Cloud" else "Create Trade & Sync Cloud",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(30.dp))
            }
        }
    }

    if (showDeleteConfirm && existingTrade != null) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Delete Trade?") },
            text = { Text("Are you sure you want to permanently delete this trade from your journal and Firebase backend?") },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteTrade(existingTrade.id)
                        showDeleteConfirm = false
                        onNavigateBack()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = ClayDanger)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

private fun numExitPrice(exitStr: String, fallbackEntry: Double): Double {
    return exitStr.toDoubleOrNull() ?: fallbackEntry
}
