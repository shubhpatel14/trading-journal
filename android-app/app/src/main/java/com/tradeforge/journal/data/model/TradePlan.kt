package com.tradeforge.journal.data.model

import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class TimeframeAnalysis(
    val text: String = "",
    val bias: String = "NEUTRAL", // BULLISH, BEARISH, NEUTRAL
    val imageUrl: String = ""
)

@IgnoreExtraProperties
data class TradePlan(
    val id: String = "",
    val date: String = "",
    val asset: String = "XAUUSD",
    val setupId: String? = null,
    val bias: String = "NEUTRAL", // BULLISH, BEARISH, NEUTRAL
    val fourHour: TimeframeAnalysis = TimeframeAnalysis(),
    val oneHour: TimeframeAnalysis = TimeframeAnalysis(),
    val fifteenMin: TimeframeAnalysis = TimeframeAnalysis(),
    val fiveMin: TimeframeAnalysis = TimeframeAnalysis(),
    val macroNotes: String = "",
    val triggers: String = "",
    val status: String = "ACTIVE", // ACTIVE, ARCHIVED
    val createdAt: String = ""
)
