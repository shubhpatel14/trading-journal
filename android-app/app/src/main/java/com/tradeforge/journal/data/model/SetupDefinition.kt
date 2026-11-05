package com.tradeforge.journal.data.model

import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class SetupDefinition(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val preferredAssets: List<String> = emptyList(),
    val preferredSessions: List<String> = emptyList(),
    val direction: String = "BOTH", // BUY, SELL, BOTH
    val marketConditions: String = "",
    val entryRules: List<String> = emptyList(),
    val invalidationRules: List<String> = emptyList(),
    val managementRules: List<String> = emptyList(),
    val tags: List<String> = emptyList(),
    val minChecklistScore: Int? = null,
    val riskPerTrade: Double? = null,
    val maxTradesPerDay: Int? = null,
    val status: String = "ACTIVE", // ACTIVE, ARCHIVED
    val createdAt: String = "",
    val updatedAt: String = ""
)
