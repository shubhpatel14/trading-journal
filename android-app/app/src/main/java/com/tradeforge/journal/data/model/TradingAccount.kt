package com.tradeforge.journal.data.model

import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class TradingAccount(
    val id: String = "",
    val name: String = "",
    val broker: String = "",
    val initialBalance: Double = 100000.0,
    val currency: String = "USD",
    val commissionPerLot: Double? = 7.0,
    val isActive: Boolean? = true,
    val isPrimary: Boolean? = false,
    val lastSync: String? = null,
    val primarySetAt: String? = null
)
