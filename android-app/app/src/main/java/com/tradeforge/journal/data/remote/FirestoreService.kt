package com.tradeforge.journal.data.remote

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.tradeforge.journal.data.model.DailyReview
import com.tradeforge.journal.data.model.SetupDefinition
import com.tradeforge.journal.data.model.Trade
import com.tradeforge.journal.data.model.TradePlan
import com.tradeforge.journal.data.model.TradingAccount
import com.tradeforge.journal.data.model.WeeklyReview
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class FirestoreService {

    private val db: FirebaseFirestore = FirebaseFirestore.getInstance()

    // -------------------------------------------------------------
    // TRADES
    // -------------------------------------------------------------
    fun getTradesFlow(userId: String): Flow<List<Trade>> = callbackFlow {
        val ref = db.collection("users").document(userId).collection("trades")
        val registration = ref.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val list = snapshot.documents.mapNotNull { doc ->
                    val trade = doc.toObject(Trade::class.java)
                    trade?.copy(id = doc.id)
                }
                trySend(list)
            }
        }
        awaitClose { registration.remove() }
    }

    suspend fun saveTrade(userId: String, trade: Trade) {
        val tradeId = trade.id.ifEmpty { "trade-${System.currentTimeMillis()}" }
        val toSave = trade.copy(id = tradeId)
        db.collection("users")
            .document(userId)
            .collection("trades")
            .document(tradeId)
            .set(toSave, SetOptions.merge())
            .await()
    }

    suspend fun deleteTrade(userId: String, tradeId: String) {
        db.collection("users")
            .document(userId)
            .collection("trades")
            .document(tradeId)
            .delete()
            .await()
    }

    // -------------------------------------------------------------
    // ACCOUNTS
    // -------------------------------------------------------------
    fun getAccountsFlow(userId: String): Flow<List<TradingAccount>> = callbackFlow {
        val ref = db.collection("users").document(userId).collection("accounts")
        val registration = ref.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val list = snapshot.documents.mapNotNull { doc ->
                    val acc = doc.toObject(TradingAccount::class.java)
                    acc?.copy(id = doc.id)
                }
                trySend(list)
            }
        }
        awaitClose { registration.remove() }
    }

    suspend fun saveAccount(userId: String, account: TradingAccount) {
        val accId = account.id.ifEmpty { "acc-${System.currentTimeMillis()}" }
        val toSave = account.copy(id = accId)
        db.collection("users")
            .document(userId)
            .collection("accounts")
            .document(accId)
            .set(toSave, SetOptions.merge())
            .await()
    }

    // -------------------------------------------------------------
    // PLAYBOOK SETUPS
    // -------------------------------------------------------------
    fun getSetupsFlow(userId: String): Flow<List<SetupDefinition>> = callbackFlow {
        val ref = db.collection("users").document(userId).collection("setups")
        val registration = ref.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val list = snapshot.documents.mapNotNull { doc ->
                    val s = doc.toObject(SetupDefinition::class.java)
                    s?.copy(id = doc.id)
                }
                trySend(list)
            }
        }
        awaitClose { registration.remove() }
    }

    suspend fun saveSetup(userId: String, setup: SetupDefinition) {
        val setupId = setup.id.ifEmpty { "setup-${System.currentTimeMillis()}" }
        val toSave = setup.copy(id = setupId)
        db.collection("users")
            .document(userId)
            .collection("setups")
            .document(setupId)
            .set(toSave, SetOptions.merge())
            .await()
    }

    suspend fun deleteSetup(userId: String, setupId: String) {
        db.collection("users")
            .document(userId)
            .collection("setups")
            .document(setupId)
            .delete()
            .await()
    }

    // -------------------------------------------------------------
    // TRADE PLANS
    // -------------------------------------------------------------
    fun getPlansFlow(userId: String): Flow<List<TradePlan>> = callbackFlow {
        val ref = db.collection("users").document(userId).collection("plans")
        val registration = ref.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val list = snapshot.documents.mapNotNull { doc ->
                    val p = doc.toObject(TradePlan::class.java)
                    p?.copy(id = doc.id)
                }
                trySend(list)
            }
        }
        awaitClose { registration.remove() }
    }

    suspend fun savePlan(userId: String, plan: TradePlan) {
        val planId = plan.id.ifEmpty { "plan-${System.currentTimeMillis()}" }
        val toSave = plan.copy(id = planId)
        db.collection("users")
            .document(userId)
            .collection("plans")
            .document(planId)
            .set(toSave, SetOptions.merge())
            .await()
    }

    suspend fun deletePlan(userId: String, planId: String) {
        db.collection("users")
            .document(userId)
            .collection("plans")
            .document(planId)
            .delete()
            .await()
    }

    // -------------------------------------------------------------
    // DAILY & WEEKLY REVIEWS
    // -------------------------------------------------------------
    fun getDailyReviewsFlow(userId: String): Flow<List<DailyReview>> = callbackFlow {
        val ref = db.collection("users").document(userId).collection("daily_reviews")
        val registration = ref.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val list = snapshot.documents.mapNotNull { doc ->
                    val r = doc.toObject(DailyReview::class.java)
                    r?.copy(id = doc.id)
                }
                trySend(list)
            }
        }
        awaitClose { registration.remove() }
    }

    fun getWeeklyReviewsFlow(userId: String): Flow<List<WeeklyReview>> = callbackFlow {
        val ref = db.collection("users").document(userId).collection("weekly_reviews")
        val registration = ref.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val list = snapshot.documents.mapNotNull { doc ->
                    val r = doc.toObject(WeeklyReview::class.java)
                    r?.copy(id = doc.id)
                }
                trySend(list)
            }
        }
        awaitClose { registration.remove() }
    }
}
