package com.tradeforge.journal

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings

class TradeForgeApp : Application() {

    override fun onCreate() {
        super.onCreate()

        // Initialize Firebase if not automatically initialized
        if (FirebaseApp.getApps(this).isEmpty()) {
            val options = FirebaseOptions.Builder()
                .setApplicationId("1:648615464927:android:0a99480ccb4fd7eafafe6a")
                .setApiKey("AIzaSyC5EpZZdyGJQoYy914hlHVJvQyXz3guTuM")
                .setProjectId("tradingjournalapp-4ed16")
                .setStorageBucket("tradingjournalapp-4ed16.firebasestorage.app")
                .build()
            FirebaseApp.initializeApp(this, options)
        }

        try {
            // Enable Firestore offline persistence for bidirectional sync and offline support
            val firestore = FirebaseFirestore.getInstance()
            val settings = FirebaseFirestoreSettings.Builder()
                .setPersistenceEnabled(true)
                .build()
            firestore.firestoreSettings = settings
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
