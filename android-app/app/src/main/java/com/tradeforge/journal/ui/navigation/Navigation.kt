package com.tradeforge.journal.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.LibraryBooks
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val label: String, val icon: ImageVector) {
    object Dashboard : Screen("dashboard", "Dashboard", Icons.Default.Dashboard)
    object Journal : Screen("journal", "Journal", Icons.Default.Book)
    object Setups : Screen("setups", "Setups", Icons.Default.LibraryBooks)
    object Plans : Screen("plans", "Plans", Icons.Default.CalendarMonth)
    object Insights : Screen("insights", "Insights", Icons.Default.AutoAwesome)
}

val BottomNavItems = listOf(
    Screen.Dashboard,
    Screen.Journal,
    Screen.Setups,
    Screen.Plans,
    Screen.Insights
)
