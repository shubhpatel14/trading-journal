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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.tradeforge.journal.data.model.TimeframeAnalysis
import com.tradeforge.journal.data.model.TradePlan
import com.tradeforge.journal.ui.components.ClaySurface
import com.tradeforge.journal.ui.theme.ClayAccent
import com.tradeforge.journal.ui.theme.ClayCanvas
import com.tradeforge.journal.ui.theme.ClayDanger
import com.tradeforge.journal.ui.theme.ClayMuted
import com.tradeforge.journal.ui.theme.ClaySuccess
import com.tradeforge.journal.ui.viewmodel.MainViewModel

@Composable
fun PlansScreen(viewModel: MainViewModel) {
    val plans by viewModel.plans.collectAsState()
    var showAddDialog by remember { mutableStateOf(false) }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = ClayAccent,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Trade Plan")
            }
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
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Column {
                    Text(
                        text = "SESSION TRADE PLANNING",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = ClayMuted,
                        letterSpacing = 1.5.sp
                    )
                    Text(
                        text = "Multi-Timeframe Plans (${plans.size})",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            items(plans.size) { index ->
                val plan = plans[index]
                val isBullish = plan.bias == "BULLISH"
                val isBearish = plan.bias == "BEARISH"
                val biasColor = if (isBullish) ClaySuccess else if (isBearish) ClayDanger else ClayMuted

                ClaySurface(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "${plan.asset} • ${plan.date}",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Black
                            )

                            Box(
                                modifier = Modifier
                                    .background(
                                        if (isBullish) Color(0xFFDCFCE7) else if (isBearish) Color(0xFFFFE4E6) else Color(0xFFF1F5F9),
                                        RoundedCornerShape(6.dp)
                                    )
                                    .padding(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = plan.bias,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace,
                                    color = biasColor
                                )
                            }
                        }

                        if (plan.macroNotes.isNotBlank()) {
                            Text(
                                text = "Macro Context: ${plan.macroNotes}",
                                fontSize = 12.sp,
                                color = ClayMuted
                            )
                        }

                        if (plan.triggers.isNotBlank()) {
                            Text(
                                text = "Execution Triggers: ${plan.triggers}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        // Timeframes
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFF8FAFC), RoundedCornerShape(8.dp))
                                .padding(10.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            if (plan.fourHour.text.isNotBlank()) {
                                Text(text = "4H: ${plan.fourHour.text}", fontSize = 11.sp, color = ClayMuted)
                            }
                            if (plan.oneHour.text.isNotBlank()) {
                                Text(text = "1H: ${plan.oneHour.text}", fontSize = 11.sp, color = ClayMuted)
                            }
                            if (plan.fifteenMin.text.isNotBlank()) {
                                Text(text = "15M: ${plan.fifteenMin.text}", fontSize = 11.sp, color = ClayMuted)
                            }
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }

    if (showAddDialog) {
        var asset by remember { mutableStateOf("XAUUSD") }
        var date by remember { mutableStateOf("2026-04-10") }
        var bias by remember { mutableStateOf("BULLISH") }
        var macro by remember { mutableStateOf("") }
        var triggers by remember { mutableStateOf("") }

        Dialog(onDismissRequest = { showAddDialog = false }) {
            ClaySurface(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(text = "New Trade Plan", fontSize = 16.sp, fontWeight = FontWeight.Bold)

                    OutlinedTextField(
                        value = asset,
                        onValueChange = { asset = it.uppercase() },
                        label = { Text("Asset Ticker") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    OutlinedTextField(
                        value = macro,
                        onValueChange = { macro = it },
                        label = { Text("Macro / News Notes") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = triggers,
                        onValueChange = { triggers = it },
                        label = { Text("Execution Triggers") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = { showAddDialog = false }) {
                            Text("Cancel")
                        }
                        Button(
                            onClick = {
                                if (asset.isNotBlank()) {
                                    val p = TradePlan(
                                        id = "plan-${System.currentTimeMillis()}",
                                        date = date,
                                        asset = asset.trim(),
                                        bias = bias,
                                        macroNotes = macro.trim(),
                                        triggers = triggers.trim()
                                    )
                                    viewModel.savePlan(p)
                                    showAddDialog = false
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = ClayAccent)
                        ) {
                            Text("Save Plan")
                        }
                    }
                }
            }
        }
    }
}
