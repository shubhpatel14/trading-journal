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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.MenuBook
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
import com.tradeforge.journal.data.model.SetupDefinition
import com.tradeforge.journal.domain.Calculations
import com.tradeforge.journal.ui.components.ClaySurface
import com.tradeforge.journal.ui.theme.ClayAccent
import com.tradeforge.journal.ui.theme.ClayCanvas
import com.tradeforge.journal.ui.theme.ClayDanger
import com.tradeforge.journal.ui.theme.ClayMuted
import com.tradeforge.journal.ui.theme.ClaySuccess
import com.tradeforge.journal.ui.viewmodel.MainViewModel
import java.util.Locale

@Composable
fun SetupsScreen(viewModel: MainViewModel) {
    val setups by viewModel.setups.collectAsState()
    val allTrades by viewModel.allTrades.collectAsState()

    var showAddDialog by remember { mutableStateOf(false) }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = ClayAccent,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Playbook Setup")
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
                        text = "PLAYBOOK SETUP LIBRARY",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = ClayMuted,
                        letterSpacing = 1.5.sp
                    )
                    Text(
                        text = "Execution Playbooks (${setups.size})",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            items(setups.size) { index ->
                val setup = setups[index]
                val matchingTrades = allTrades.filter { it.setup.equals(setup.name, ignoreCase = true) }
                val totalSetupTrades = matchingTrades.size
                val winCount = matchingTrades.count { Calculations.getTradeNetPnl(it) > 0 }
                val setupWinRate = if (totalSetupTrades > 0) (winCount.toDouble() / totalSetupTrades.toDouble()) * 100.0 else 0.0
                val setupNetPnl = matchingTrades.sumOf { Calculations.getTradeNetPnl(it) }

                ClaySurface(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Header
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = setup.name,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Black
                            )

                            // Direction Badge
                            Box(
                                modifier = Modifier
                                    .background(Color(0xFFEDE9FE), RoundedCornerShape(6.dp))
                                    .padding(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = setup.direction,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace,
                                    color = ClayAccent
                                )
                            }
                        }

                        if (setup.description.isNotBlank()) {
                            Text(
                                text = setup.description,
                                fontSize = 12.sp,
                                color = ClayMuted,
                                lineHeight = 16.sp
                            )
                        }

                        // Performance row
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFF8FAFC), RoundedCornerShape(8.dp))
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "$totalSetupTrades Executions",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = ClayMuted
                            )
                            Text(
                                text = "${String.format(Locale.US, "%.1f", setupWinRate)}% Win Rate",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = if (setupWinRate >= 50.0) ClaySuccess else ClayDanger
                            )
                            Text(
                                text = (if (setupNetPnl >= 0) "+$" else "-$") + String.format(Locale.US, "%.2f", Math.abs(setupNetPnl)),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = if (setupNetPnl >= 0) ClaySuccess else ClayDanger
                            )
                        }

                        // Entry Rules
                        if (setup.entryRules.isNotEmpty()) {
                            Text(
                                text = "CORE ENTRY RULES:",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = ClayMuted
                            )
                            setup.entryRules.forEach { rule ->
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = ClaySuccess, modifier = Modifier.size(14.dp))
                                    Text(text = rule, fontSize = 12.sp)
                                }
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
        var newName by remember { mutableStateOf("") }
        var newDesc by remember { mutableStateOf("") }
        var newDirection by remember { mutableStateOf("BOTH") }
        var newRule by remember { mutableStateOf("") }

        Dialog(onDismissRequest = { showAddDialog = false }) {
            ClaySurface(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(text = "Add Playbook Setup", fontSize = 16.sp, fontWeight = FontWeight.Bold)

                    OutlinedTextField(
                        value = newName,
                        onValueChange = { newName = it },
                        label = { Text("Setup Name (e.g. BoS Downside)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    OutlinedTextField(
                        value = newDesc,
                        onValueChange = { newDesc = it },
                        label = { Text("Setup Description") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2
                    )

                    OutlinedTextField(
                        value = newRule,
                        onValueChange = { newRule = it },
                        label = { Text("Primary Entry Rule") },
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
                                if (newName.isNotBlank()) {
                                    val s = SetupDefinition(
                                        id = "setup-${System.currentTimeMillis()}",
                                        name = newName.trim(),
                                        description = newDesc.trim(),
                                        direction = newDirection,
                                        entryRules = if (newRule.isNotBlank()) listOf(newRule.trim()) else emptyList()
                                    )
                                    viewModel.saveSetup(s)
                                    showAddDialog = false
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = ClayAccent)
                        ) {
                            Text("Save Playbook")
                        }
                    }
                }
            }
        }
    }
}
