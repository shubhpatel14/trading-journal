package com.tradeforge.journal

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tradeforge.journal.data.model.Trade
import com.tradeforge.journal.ui.navigation.BottomNavItems
import com.tradeforge.journal.ui.navigation.Screen
import com.tradeforge.journal.ui.screens.AuthScreen
import com.tradeforge.journal.ui.screens.DashboardScreen
import com.tradeforge.journal.ui.screens.InsightsScreen
import com.tradeforge.journal.ui.screens.JournalScreen
import com.tradeforge.journal.ui.screens.PlansScreen
import com.tradeforge.journal.ui.screens.SetupsScreen
import com.tradeforge.journal.ui.screens.TradeEditScreen
import com.tradeforge.journal.ui.theme.ClayAccent
import com.tradeforge.journal.ui.theme.ClayCanvas
import com.tradeforge.journal.ui.theme.ClayMuted
import com.tradeforge.journal.ui.theme.TradeForgeTheme
import com.tradeforge.journal.ui.viewmodel.MainViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            TradeForgeTheme {
                val currentUser by viewModel.currentUser.collectAsState()
                val isGuest by viewModel.isGuest.collectAsState()

                var currentTab by remember { mutableStateOf<Screen>(Screen.Dashboard) }
                var editingTrade by remember { mutableStateOf<Trade?>(null) }
                var isCreatingNewTrade by remember { mutableStateOf(false) }

                // Authentication Barrier
                if (currentUser == null && !isGuest) {
                    AuthScreen(
                        viewModel = viewModel,
                        onAuthSuccess = {
                            currentTab = Screen.Dashboard
                        }
                    )
                } else if (isCreatingNewTrade || editingTrade != null) {
                    // Full-screen Trade Add / Edit Mode
                    TradeEditScreen(
                        viewModel = viewModel,
                        existingTrade = editingTrade,
                        onNavigateBack = {
                            editingTrade = null
                            isCreatingNewTrade = false
                        }
                    )
                } else {
                    // Main Tabbed Navigation Scaffold
                    Scaffold(
                        topBar = {
                            TopAppBar(
                                title = {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = Icons.Default.Shield,
                                            contentDescription = null,
                                            tint = ClayAccent,
                                            modifier = Modifier.size(24.dp)
                                        )
                                        Column(modifier = Modifier.padding(start = 8.dp)) {
                                            Text(
                                                text = "TRADEFORGE",
                                                fontSize = 15.sp,
                                                fontWeight = FontWeight.Black,
                                                letterSpacing = 0.5.sp
                                            )
                                            Text(
                                                text = if (isGuest) "Guest Mode" else currentUser?.email ?: "Synced",
                                                fontSize = 10.sp,
                                                fontFamily = FontFamily.Monospace,
                                                color = ClayMuted
                                            )
                                        }
                                    }
                                },
                                actions = {
                                    IconButton(onClick = { viewModel.signOut() }) {
                                        Icon(
                                            imageVector = Icons.Default.ExitToApp,
                                            contentDescription = "Sign Out",
                                            tint = ClayMuted
                                        )
                                    }
                                },
                                colors = TopAppBarDefaults.topAppBarColors(containerColor = ClayCanvas)
                            )
                        },
                        bottomBar = {
                            NavigationBar(
                                containerColor = Color.White,
                                tonalElevation = 8.dp
                            ) {
                                BottomNavItems.forEach { screen ->
                                    val isSelected = currentTab.route == screen.route
                                    NavigationBarItem(
                                        selected = isSelected,
                                        onClick = { currentTab = screen },
                                        icon = {
                                            Icon(
                                                imageVector = screen.icon,
                                                contentDescription = screen.label
                                            )
                                        },
                                        label = {
                                            Text(
                                                text = screen.label,
                                                fontSize = 10.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                            )
                                        },
                                        colors = NavigationBarItemDefaults.colors(
                                            selectedIconColor = ClayAccent,
                                            selectedTextColor = ClayAccent,
                                            indicatorColor = Color(0xFFEDE9FE),
                                            unselectedIconColor = ClayMuted,
                                            unselectedTextColor = ClayMuted
                                        )
                                    )
                                }
                            }
                        }
                    ) { innerPadding ->
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(innerPadding)
                        ) {
                            when (currentTab) {
                                Screen.Dashboard -> DashboardScreen(
                                    viewModel = viewModel,
                                    onNavigateToJournal = { currentTab = Screen.Journal },
                                    onNavigateToNewTrade = { isCreatingNewTrade = true },
                                    onEditTrade = { trade -> editingTrade = trade }
                                )
                                Screen.Journal -> JournalScreen(
                                    viewModel = viewModel,
                                    onAddTrade = { isCreatingNewTrade = true },
                                    onEditTrade = { trade -> editingTrade = trade }
                                )
                                Screen.Setups -> SetupsScreen(viewModel = viewModel)
                                Screen.Plans -> PlansScreen(viewModel = viewModel)
                                Screen.Insights -> InsightsScreen(viewModel = viewModel)
                            }
                        }
                    }
                }
            }
        }
    }
}
