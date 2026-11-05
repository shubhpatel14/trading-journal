package com.tradeforge.journal.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
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
import com.tradeforge.journal.ui.components.TradeCard
import com.tradeforge.journal.ui.theme.ClayAccent
import com.tradeforge.journal.ui.theme.ClayCanvas
import com.tradeforge.journal.ui.theme.ClayMuted
import com.tradeforge.journal.ui.viewmodel.MainViewModel

@Composable
fun JournalScreen(
    viewModel: MainViewModel,
    onAddTrade: () -> Unit,
    onEditTrade: (Trade) -> Unit
) {
    val trades by viewModel.filteredTrades.collectAsState()
    val accounts by viewModel.accounts.collectAsState()
    val selectedAccountId by viewModel.selectedAccountId.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val filterStatus by viewModel.filterStatus.collectAsState()
    val filterSession by viewModel.filterSession.collectAsState()

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = onAddTrade,
                containerColor = ClayAccent,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Trade", modifier = Modifier.size(28.dp))
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(ClayCanvas)
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            // Header Title
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "TRADE LOG JOURNAL",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = ClayMuted,
                        letterSpacing = 1.5.sp
                    )
                    Text(
                        text = "Execution History (${trades.size})",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { viewModel.searchQuery.value = it },
                placeholder = { Text("Search asset, setup, or notes...", fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = ClayMuted) },
                trailingIcon = {
                    if (searchQuery.isNotBlank()) {
                        IconButton(onClick = { viewModel.searchQuery.value = "" }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear", tint = ClayMuted)
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Filter Chips Horizontal Scroll
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Status Filters
                FilterChip(
                    selected = filterStatus == null,
                    onClick = { viewModel.filterStatus.value = null },
                    label = { Text("All Results", fontSize = 11.sp) },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = ClayAccent, selectedLabelColor = Color.White)
                )
                FilterChip(
                    selected = filterStatus == "WIN",
                    onClick = { viewModel.filterStatus.value = if (filterStatus == "WIN") null else "WIN" },
                    label = { Text("Wins Only", fontSize = 11.sp) },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF166534), selectedLabelColor = Color.White)
                )
                FilterChip(
                    selected = filterStatus == "LOSS",
                    onClick = { viewModel.filterStatus.value = if (filterStatus == "LOSS") null else "LOSS" },
                    label = { Text("Losses Only", fontSize = 11.sp) },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF9F1239), selectedLabelColor = Color.White)
                )

                // Session Filters
                FilterChip(
                    selected = filterSession == "LONDON",
                    onClick = { viewModel.filterSession.value = if (filterSession == "LONDON") null else "LONDON" },
                    label = { Text("London", fontSize = 11.sp) }
                )
                FilterChip(
                    selected = filterSession == "NEW YORK",
                    onClick = { viewModel.filterSession.value = if (filterSession == "NEW YORK") null else "NEW YORK" },
                    label = { Text("New York", fontSize = 11.sp) }
                )
                FilterChip(
                    selected = filterSession == "ASIA",
                    onClick = { viewModel.filterSession.value = if (filterSession == "ASIA") null else "ASIA" },
                    label = { Text("Asia", fontSize = 11.sp) }
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Trades List
            if (trades.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(bottom = 80.dp),
                    contentAlignment = Alignment.Center
                ) {
                    ClaySurface(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.FilterList, contentDescription = null, tint = ClayMuted, modifier = Modifier.size(36.dp))
                            Text(
                                text = "No matching trades found",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Try clearing filters or tap (+) to log a new execution.",
                                fontSize = 12.sp,
                                color = ClayMuted
                            )
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(trades.size) { index ->
                        val trade = trades[index]
                        TradeCard(trade = trade, onClick = { onEditTrade(trade) })
                    }
                    item {
                        Spacer(modifier = Modifier.height(80.dp))
                    }
                }
            }
        }
    }
}
