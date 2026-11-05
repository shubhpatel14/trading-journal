package com.tradeforge.journal.data.model

import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class Trade(
    val id: String = "",
    val accountId: String = "",
    val setupId: String? = null,
    val setup: String = "BoS Downside",
    val setupRuleSnapshot: List<String>? = null,
    val setupRuleChecks: Map<String, Boolean>? = null,
    val setupRuleScore: Int? = null,
    val setupRuleMaxScore: Int? = null,
    val date: String = "", // YYYY-MM-DD
    val time: String = "", // HH:MM
    val openTime: String? = null,
    val closeTime: String? = null,
    val source: String? = null,
    val asset: String = "XAUUSD",
    val direction: String = "BUY", // BUY, SELL
    val entryPrice: Double = 0.0,
    val exitPrice: Double = 0.0,
    val size: Double = 1.0,
    val sl: Double = 0.0,
    val tp: Double = 0.0,
    val pnl: Double = 0.0,
    val commission: Double? = null,
    val swap: Double? = null,
    val fee: Double? = null,
    val status: String = "WIN", // WIN, LOSS, BREAKEVEN, OPEN
    val session: String = "LONDON", // LONDON, NEW YORK, ASIA
    val mistakes: List<String> = emptyList(),
    val notes: String = "",
    val tradeGrade: String? = null, // A+, A, B, C, Gamble
    val ltfScreenshot: String = "",
    val htfScreenshot: String = "",
    val fifteenMinuteScreenshot: String = "",
    val oneHourScreenshot: String = "",
    val fourHourScreenshot: String = "",
    val dxyScreenshot: String = "",
    val journalingStatus: String = "COMPLETE", // COMPLETE, PENDING
    val reviewedAt: String? = null
)
