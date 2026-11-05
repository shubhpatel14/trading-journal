package com.tradeforge.journal.data.model

import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class DailyReview(
    val id: String = "",
    val date: String = "",
    val rating: Int = 5,
    val ruleAdherence: String = "FULL", // FULL, PARTIAL, VIOLATED
    val whatWentWell: String = "",
    val improvementsNeeded: String = "",
    val mistakesAnalyzed: List<String> = emptyList(),
    val actionItems: String = "",
    val chartScreenshot: String = "",
    val createdAt: String = ""
)

@IgnoreExtraProperties
data class WeeklyReview(
    val id: String = "",
    val weekStartDate: String = "",
    val weekEndDate: String = "",
    val grade: String = "A", // A+, A, B, C, D, F
    val keyLessons: String = "",
    val focusGoalsNextWeek: String = "",
    val topMistakes: List<String> = emptyList(),
    val weeklyNotes: String = "",
    val weeklyScreenshot: String = "",
    val createdAt: String = ""
)
