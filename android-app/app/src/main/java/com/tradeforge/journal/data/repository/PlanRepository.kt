package com.tradeforge.journal.data.repository

import com.tradeforge.journal.data.model.DailyReview
import com.tradeforge.journal.data.model.TimeframeAnalysis
import com.tradeforge.journal.data.model.TradePlan
import com.tradeforge.journal.data.model.WeeklyReview
import com.tradeforge.journal.data.remote.FirestoreService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class PlanRepository(private val firestoreService: FirestoreService) {

    private val guestPlans = MutableStateFlow<List<TradePlan>>(
        listOf(
            TradePlan(
                id = "plan-1",
                date = "2026-04-10",
                asset = "XAUUSD",
                setupId = "setup-1",
                bias = "BEARISH",
                fourHour = TimeframeAnalysis("Strong bearish rejection at 2380 daily order block", "BEARISH"),
                oneHour = TimeframeAnalysis("Break of structure downside at 2355, holding below 50 EMA", "BEARISH"),
                fifteenMin = TimeframeAnalysis("FVG formation between 2348 - 2352", "BEARISH"),
                fiveMin = TimeframeAnalysis("Waiting for London open liquidity sweep before entering short", "BEARISH"),
                macroNotes = "US CPI expected higher, USD index showing strength.",
                triggers = "5M displacement following liquidity grab",
                status = "ACTIVE"
            )
        )
    )

    private val guestDailyReviews = MutableStateFlow<List<DailyReview>>(emptyList())
    private val guestWeeklyReviews = MutableStateFlow<List<WeeklyReview>>(emptyList())

    fun getPlans(userId: String?, isGuest: Boolean): Flow<List<TradePlan>> {
        return if (!isGuest && !userId.isNullOrEmpty()) {
            firestoreService.getPlansFlow(userId)
        } else {
            guestPlans.asStateFlow()
        }
    }

    suspend fun savePlan(userId: String?, isGuest: Boolean, plan: TradePlan) {
        if (!isGuest && !userId.isNullOrEmpty()) {
            firestoreService.savePlan(userId, plan)
        } else {
            val current = guestPlans.value.toMutableList()
            val planId = plan.id.ifEmpty { "plan-${System.currentTimeMillis()}" }
            val index = current.indexOfFirst { it.id == planId }
            if (index >= 0) {
                current[index] = plan.copy(id = planId)
            } else {
                current.add(0, plan.copy(id = planId))
            }
            guestPlans.value = current
        }
    }

    suspend fun deletePlan(userId: String?, isGuest: Boolean, planId: String) {
        if (!isGuest && !userId.isNullOrEmpty()) {
            firestoreService.deletePlan(userId, planId)
        } else {
            guestPlans.value = guestPlans.value.filter { it.id != planId }
        }
    }

    fun getDailyReviews(userId: String?, isGuest: Boolean): Flow<List<DailyReview>> {
        return if (!isGuest && !userId.isNullOrEmpty()) {
            firestoreService.getDailyReviewsFlow(userId)
        } else {
            guestDailyReviews.asStateFlow()
        }
    }

    fun getWeeklyReviews(userId: String?, isGuest: Boolean): Flow<List<WeeklyReview>> {
        return if (!isGuest && !userId.isNullOrEmpty()) {
            firestoreService.getWeeklyReviewsFlow(userId)
        } else {
            guestWeeklyReviews.asStateFlow()
        }
    }
}
