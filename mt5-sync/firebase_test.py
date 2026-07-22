import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

cred = credentials.Certificate("firebase-key.json")

firebase_admin.initialize_app(cred)

db = firestore.client()

doc = {
    "message": "Hello from Python!",
    "status": "working"
}

db.collection("test").document("python").set(doc)

print("✅ Firestore Connected!")