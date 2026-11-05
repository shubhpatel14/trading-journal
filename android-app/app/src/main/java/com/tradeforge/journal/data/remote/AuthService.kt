package com.tradeforge.journal.data.remote

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.UserProfileChangeRequest
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class AuthService {

    private val auth: FirebaseAuth = FirebaseAuth.getInstance()

    val currentUser: FirebaseUser?
        get() = auth.currentUser

    fun getAuthStateFlow(): Flow<FirebaseUser?> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            trySend(firebaseAuth.currentUser)
        }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }

    suspend fun signInWithEmail(email: String, pass: String): FirebaseUser? {
        val result = auth.signInWithEmailAndPassword(email.trim(), pass).await()
        return result.user
    }

    suspend fun signUpWithEmail(email: String, pass: String, displayName: String?): FirebaseUser? {
        val result = auth.createUserWithEmailAndPassword(email.trim(), pass).await()
        val user = result.user
        if (user != null && !displayName.isNullOrBlank()) {
            val profileUpdates = UserProfileChangeRequest.Builder()
                .setDisplayName(displayName)
                .build()
            user.updateProfile(profileUpdates).await()
        }
        return user
    }

    suspend fun signInAnonymously(): FirebaseUser? {
        val result = auth.signInAnonymously().await()
        return result.user
    }

    fun signOut() {
        auth.signOut()
    }
}
