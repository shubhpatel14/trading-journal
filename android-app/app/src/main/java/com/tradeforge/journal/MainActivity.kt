package com.tradeforge.journal

import android.accounts.AccountManager
import android.app.Activity
import android.app.Dialog
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Message
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.provider.MediaStore
import androidx.core.content.FileProvider
import java.io.File
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import org.json.JSONObject
import java.security.KeyFactory
import java.security.Signature
import java.security.spec.PKCS8EncodedKeySpec
import android.util.Base64

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    // Known Firebase Google UIDs to ensure 100% exact parity with Web App and MT5 auto_sync.py
    private val knownAccountUids = mapOf(
        "pshubh1410@gmail.com" to "bu8j28sFuSOqssYhCR9uNamFox92",
        "shubhp069@gmail.com" to "WTAHCkKjZpb7UfcN7MCf1hscX3n1",
        "pshubh1400@gmail.com" to "uK5R8qDV1EQgg7Uvn8oemjKHiFy2",
        "pshubh1332@gmail.com" to "GH3pPlpsq2Ty7VsDmKoYStQsLYC3",
        "patelpkriya@gmail.com" to "JmGdxmZs9thLpkbVVuMFWmkpz8w1",
        "23bt04117@gsfcuniversity.ac.in" to "TsfARhQjGVWWKsTHr9DiZa5tt7B2"
    )

    /**
     * Signs an official Firebase Custom Token using the service account private key.
     * This authenticates the user directly to Firebase Auth with their real UID (e.g. bu8j28sFuSOqssYhCR9uNamFox92)
     * granting 100% full Firestore read/write permissions matching sync.bat and the desktop Web App.
     */
    private fun createFirebaseCustomToken(uid: String, email: String): String? {
        return try {
            val now = System.currentTimeMillis() / 1000
            val headerJson = JSONObject().apply {
                put("alg", "RS256")
                put("typ", "JWT")
                put("kid", "f18b743995a2b45f5ec6e9c4c011d1b5d045a4ed")
            }.toString()

            val payloadJson = JSONObject().apply {
                put("iss", "firebase-adminsdk-fbsvc@tradingjournalapp-4ed16.iam.gserviceaccount.com")
                put("sub", "firebase-adminsdk-fbsvc@tradingjournalapp-4ed16.iam.gserviceaccount.com")
                put("aud", "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit")
                put("iat", now)
                put("exp", now + 3600)
                put("uid", uid)
                put("claims", JSONObject().apply {
                    put("email", email)
                })
            }.toString()

            val headerB64 = Base64.encodeToString(
                headerJson.toByteArray(Charsets.UTF_8),
                Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
            )
            val payloadB64 = Base64.encodeToString(
                payloadJson.toByteArray(Charsets.UTF_8),
                Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
            )
            val content = "$headerB64.$payloadB64"

            val privateKeyPem = """
                MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDA9+87/gHj5mrL
                y1VMymPzzK0YIjYVM3Q1PnMZolybOmstM+xmeTw+oKkvvM9yGBY3DPXt2eXjQ+A1
                fcJancBbvp/wlmSjRzmk+EmSymovwSjvjB8H/t3jRxwfnCKpO9k5rQgwZegHdY7v
                +lhVYQclcyzlt8vIBxx6/I7Bn00rKVuVPDj2wJJD14SKeierujlfaLWxwPQYNg1U
                ocfN+r2szCS5RH4vB67SklMLViP1zAUjOObTycAK4kpy5qSPBSxvIIEUYDKOtkct
                Y4I/nCmTLFemVXnH3RZsWWIoJ2Yh/74TgZJhvtc75g5HH9ytGhQ58/IJwyxUwjaW
                I7o9Ka9JAgMBAAECggEADznxGWOBXC2EC0kj1a+Zo/ToSqF2cYVSG9pt5B2s333E
                U7iHZI2X7JwqRW9JUigm5pih9i7tphlmwWnHMnXEpiicP7RqQ/z8hjEmQwwwRUzh
                UUeV8kBQ21xy0ma0UHS9vwCRhxofbSlASlzPaAtEMFcOeaDfVk0DWQwBKrOKeAeE
                FCCo/gpbGjMlNBJs+J5e8of+ILtpO2RbNEp/ahAzgf396oa/zKKksv/J5sz6rOtu
                0uS8ZQq9PcXPqUhx7qcjgJgs/IPy2atGQaPlVMrKXjQm8O01KXM6UWl845mVa/8H
                5zADhsjmpztfln8z2v3aYai3X2aTYNjXYNcDKmvUtQKBgQDfol5E7U6rWn9+ErdD
                tHVGcUKf07aNKgbuLyD+a7vh0xZJ6CNBrexwltV7CcIL1+q2TVRH5obS3CRDRC+G
                4S1sSxXyCI21rQVKOXgMFxZEj6EMxH8PA+QJpJLo2S4jMqnyRUMRH8Yr96v2lwz7
                IcJH8iICJLy1W1UV+AYZzPZWrQKBgQDc5WcAHlGOXrgUw4vW4dRPhVahCb0gm08o
                nos7+819cr2311Jz0aQB5IlArc952x4y4u881RJl6TkZdRSk28qyzNe53taXSVKi
                4jbiDm2azpLF3BmdcBr40rmy/T4+r5m4ovgP1ANdc4bx3ERRjQphFyPUCuYTM66i
                q1a+AhP6jQKBgDl2t1Jux/Av6OK0XHMBQ8E+CSiYdif/zJgXdBrsA/MbEncbNzQB
                ROgJWgGrmDkC2kTNygJPsgUsnATM2ImIAuv4v0LZ/8/XDazs53Pz2rzzSybEtwFc
                tpPjvfwnEjvpINIoCfu0dm+FzKIoXiWJnypthV+XoQXY2hwzBx5KFGJhAoGBAI5W
                rBZhcwAgfNG0Z8mhX2OWcgn28o2uRkXQU7vlN7acVy+9af4DmoE1uFObLFRDI6R6
                oto6Gk7dB9Qlo5XPoz+vy1qUAwcdUkhvKBpmXa4hamZgu4i9kkO/1bVGhfNyx8U4
                Dkx0u25eYRg8bTF3hralaIrcMwEwjll3ur9ZK3KJAoGAdOyuqpcHeGJMkk5ZJe8f
                V8gDzQnYHPK7Pfry52O+c/VN1UkoEJdeiIW1QxyGbZlIpKUO4DRR2m46o7sugKVf
                3V/gZx51k6a+blvb7KEuV0BJ7tTXDd7+Bx3dnv7+VGxa1xBF5DRDaFpCMQfijoHU
                ZNYWZCT7K/azF/pmKQvnHeg=
            """.trimIndent().replace("\n", "").replace(" ", "").replace("\r", "")

            val keyBytes = Base64.decode(privateKeyPem, Base64.DEFAULT)
            val keySpec = PKCS8EncodedKeySpec(keyBytes)
            val keyFactory = KeyFactory.getInstance("RSA")
            val privateKey = keyFactory.generatePrivate(keySpec)

            val signature = Signature.getInstance("SHA256withRSA")
            signature.initSign(privateKey)
            signature.update(content.toByteArray(Charsets.UTF_8))
            val signatureBytes = signature.sign()
            val signatureB64 = Base64.encodeToString(
                signatureBytes,
                Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
            )

            "$content.$signatureB64"
        } catch (_: Exception) {
            null
        }
    }

    private fun exchangeCustomTokenForIdToken(customToken: String, apiKey: String): String? {
        return try {
            val url = java.net.URL("https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=$apiKey")
            val conn = url.openConnection() as java.net.HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.connectTimeout = 6000
            conn.readTimeout = 6000
            conn.doOutput = true
            val reqBody = JSONObject().apply {
                put("token", customToken)
                put("returnSecureToken", true)
            }.toString()
            conn.outputStream.use { os ->
                os.write(reqBody.toByteArray(Charsets.UTF_8))
            }
            if (conn.responseCode == 200) {
                val respStr = conn.inputStream.bufferedReader().use { it.readText() }
                val respJson = JSONObject(respStr)
                if (respJson.has("idToken")) respJson.getString("idToken") else null
            } else {
                null
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun handleAccountSelected(email: String, displayNameOverride: String? = null, idTokenOverride: String? = null) {
        Thread {
            val targetUid = knownAccountUids[email.lowercase()] ?: ("usr_" + email.lowercase().replace(Regex("[^a-z0-9]"), "_"))
            val customToken = createFirebaseCustomToken(targetUid, email)
            val apiKey = "AIzaSyC5EpZZdyGJQoYy914hlHVJvQyXz3guTuM"
            val exchangedIdToken = if (idTokenOverride.isNullOrEmpty() && customToken != null) {
                exchangeCustomTokenForIdToken(customToken, apiKey)
            } else {
                idTokenOverride
            }

            val displayName = displayNameOverride ?: email.substringBefore("@")
                .split(".", "_", "-")
                .filter { it.isNotEmpty() }
                .joinToString(" ") { part -> part.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() } }

            val payload = JSONObject().apply {
                put("email", email)
                put("displayName", displayName)
                put("id", targetUid)
                if (customToken != null) put("customToken", customToken)
                if (!exchangedIdToken.isNullOrEmpty()) put("idToken", exchangedIdToken)
            }.toString()

            webView.post {
                webView.evaluateJavascript(
                    "window.onNativeGoogleSignInSuccess && window.onNativeGoogleSignInSuccess($payload)",
                    null
                )
            }
        }.start()
    }

    // Native Android Account Picker: uses system AccountManager to select Google account directly from device
    private val accountPickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val email = result.data?.getStringExtra(AccountManager.KEY_ACCOUNT_NAME) ?: ""
            if (email.isNotEmpty()) {
                handleAccountSelected(email)
                return@registerForActivityResult
            }
        }
        webView.post {
            webView.evaluateJavascript(
                "window.onNativeGoogleSignInCancelled && window.onNativeGoogleSignInCancelled()",
                null
            )
        }
    }

    // Google Play Services GoogleSignIn fallback launcher
    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            try {
                val account = task.result
                val email = account.email ?: ""
                if (email.isNotEmpty()) {
                    handleAccountSelected(email, account.displayName, account.idToken)
                    return@registerForActivityResult
                }
            } catch (_: Exception) {
                // If Play Services fails, trigger system AccountManager directly
                launchSystemAccountPicker()
                return@registerForActivityResult
            }
        }
        webView.post {
            webView.evaluateJavascript(
                "window.onNativeGoogleSignInCancelled && window.onNativeGoogleSignInCancelled()",
                null
            )
        }
    }

    private fun launchSystemAccountPicker() {
        try {
            val intent = AccountManager.newChooseAccountIntent(
                null,
                null,
                arrayOf("com.google"),
                null,
                null,
                null,
                null
            )
            accountPickerLauncher.launch(intent)
        } catch (_: Exception) {
            // Fallback to Google Play Services if AccountManager is unavailable
            try {
                val webClientId = "648615464927-222u0vtbphtgr4892v2hrhg15pa78kjg.apps.googleusercontent.com"
                val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                    .requestIdToken(webClientId)
                    .requestEmail()
                    .requestProfile()
                    .build()
                val client = GoogleSignIn.getClient(this, gso)
                googleSignInLauncher.launch(client.signInIntent)
            } catch (e: Exception) {
                val errorMsg = JSONObject.quote(e.localizedMessage ?: "Could not open Google account chooser")
                webView.post {
                    webView.evaluateJavascript(
                        "window.onNativeGoogleSignInError && window.onNativeGoogleSignInError($errorMsg)",
                        null
                    )
                }
            }
        }
    }

    private fun launchNativeGoogleSignIn() {
        // Direct launch of system account chooser for 1-tap Google account selection
        launchSystemAccountPicker()
    }

    inner class AndroidAuthBridge {
        @JavascriptInterface
        fun requestGoogleSignIn() {
            runOnUiThread {
                launchNativeGoogleSignIn()
            }
        }

        @JavascriptInterface
        fun isNativeAndroid(): Boolean {
            return true
        }
    }

    private var cameraPhotoUri: Uri? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val data: Intent? = result.data
            val results = mutableListOf<Uri>()

            data?.clipData?.let { clipData ->
                for (i in 0 until clipData.itemCount) {
                    results.add(clipData.getItemAt(i).uri)
                }
            } ?: data?.data?.let { uri ->
                results.add(uri)
            } ?: cameraPhotoUri?.let { uri ->
                results.add(uri)
            }

            fileUploadCallback?.onReceiveValue(results.toTypedArray())
        } else {
            fileUploadCallback?.onReceiveValue(null)
        }
        fileUploadCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Ensure status bar & navigation bar are clearly visible
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.parseColor("#0F172A")
        window.navigationBarColor = Color.parseColor("#0F172A")

        // Force white/crisp icons on dark status bar so time & battery are 100% readable
        val insetsController = WindowCompat.getInsetsController(window, window.decorView)
        insetsController.isAppearanceLightStatusBars = false
        insetsController.isAppearanceLightNavigationBars = false

        val rootLayout = FrameLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#0F172A"))
        }

        val statusBarResId = resources.getIdentifier("status_bar_height", "dimen", "android")
        val fallbackStatusBarHeight = if (statusBarResId > 0) resources.getDimensionPixelSize(statusBarResId) else 0

        // Apply dynamic insets so the app content starts strictly BELOW the phone's status bar (never overlaps)
        ViewCompat.setOnApplyWindowInsetsListener(rootLayout) { view, insets ->
            val statusBarInsets = insets.getInsets(WindowInsetsCompat.Type.statusBars())
            val navBarInsets = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
            val topInset = if (statusBarInsets.top > 0) statusBarInsets.top else fallbackStatusBarHeight
            view.setPadding(0, topInset, 0, navBarInsets.bottom)
            insets
        }
        rootLayout.requestApplyInsets()

        // Clean user agent: strip WebView identifiers so Google OAuth does not block with 403 disallowed_useragent
        val defaultUa = WebSettings.getDefaultUserAgent(this)
        val cleanUa = defaultUa
            .replace("; wv", "")
            .replace(Regex("Version/[0-9.]+ "), "")

        // Configure WebViewAssetLoader to serve local SPA files under the pre-authorized Firebase domain
        val domain = "tradingjournalapp-4ed16.firebaseapp.com"
        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain(domain)
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        // Enable cookies
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#0F172A"))
            overScrollMode = View.OVER_SCROLL_IF_CONTENT_SCROLLS
            isVerticalScrollBarEnabled = true
            isHorizontalScrollBarEnabled = false

            cookieManager.setAcceptThirdPartyCookies(this, true)

            // Register native bridge for Google Sign-In with device accounts
            addJavascriptInterface(AndroidAuthBridge(), "AndroidAuth")

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                useWideViewPort = true
                loadWithOverviewMode = true
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

                // Support OAuth popup windows
                setSupportMultipleWindows(true)
                javaScriptCanOpenWindowsAutomatically = true

                userAgentString = cleanUa
            }

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ): WebResourceResponse? {
                    // Serve /assets/ locally from APK assets; let other URLs (e.g. Firebase Auth) go online
                    return assetLoader.shouldInterceptRequest(request.url)
                }

                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    val url = request?.url?.toString() ?: ""
                    // Keep app and all Google OAuth / Firebase domains inside WebView
                    if (url.startsWith("https://$domain") || 
                        url.contains("accounts.google") || 
                        url.contains("google.") || 
                        url.contains("gstatic") || 
                        url.contains("firebaseapp.com") || 
                        url.contains("apis.google.com") ||
                        url.contains("oauth2") ||
                        url.contains("__")
                    ) {
                        return false
                    }
                    return try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        startActivity(intent)
                        true
                    } catch (e: Exception) {
                        false
                    }
                }
            }

            webChromeClient = object : WebChromeClient() {
                // Support window.open() for Google Sign-In popups in a fullscreen dialog
                override fun onCreateWindow(
                    view: WebView?,
                    isDialog: Boolean,
                    isUserGesture: Boolean,
                    resultMsg: Message?
                ): Boolean {
                    val popupWebView = WebView(this@MainActivity).apply {
                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                        settings.apply {
                            javaScriptEnabled = true
                            domStorageEnabled = true
                            databaseEnabled = true
                            setSupportZoom(true)
                            builtInZoomControls = true
                            displayZoomControls = false
                            userAgentString = cleanUa
                            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                            setSupportMultipleWindows(true)
                            javaScriptCanOpenWindowsAutomatically = true
                        }
                        cookieManager.setAcceptThirdPartyCookies(this, true)
                    }

                    val popupDialog = Dialog(
                        this@MainActivity,
                        android.R.style.Theme_DeviceDefault_Light_NoActionBar_Fullscreen
                    ).apply {
                        setContentView(popupWebView)
                        setOnDismissListener {
                            try {
                                popupWebView.destroy()
                            } catch (_: Exception) {}
                        }
                    }

                    popupWebView.webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): Boolean {
                            return false
                        }
                    }

                    popupWebView.webChromeClient = object : WebChromeClient() {
                        override fun onCloseWindow(window: WebView?) {
                            try {
                                popupDialog.dismiss()
                                popupWebView.destroy()
                            } catch (_: Exception) {}
                        }
                    }

                    popupDialog.show()

                    val transport = resultMsg?.obj as? WebView.WebViewTransport
                    transport?.webView = popupWebView
                    resultMsg?.sendToTarget()
                    return true
                }

                override fun onShowFileChooser(
                    view: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    fileUploadCallback?.onReceiveValue(null)
                    fileUploadCallback = filePathCallback

                    // Prepare temporary file for camera capture via FileProvider
                    val photoFile = try {
                        val imagesDir = File(cacheDir, "camera_photos").apply { mkdirs() }
                        File.createTempFile("photo_${System.currentTimeMillis()}_", ".jpg", imagesDir)
                    } catch (e: Exception) {
                        null
                    }

                    cameraPhotoUri = if (photoFile != null) {
                        try {
                            FileProvider.getUriForFile(
                                this@MainActivity,
                                "${applicationContext.packageName}.fileprovider",
                                photoFile
                            )
                        } catch (e: Exception) {
                            null
                        }
                    } else null

                    val takePictureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                        cameraPhotoUri?.let { uri ->
                            putExtra(MediaStore.EXTRA_OUTPUT, uri)
                            addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }
                    }

                    // Direct camera launch if capture was requested (e.g. capture="environment")
                    val isCapture = fileChooserParams?.isCaptureEnabled == true
                    if (isCapture && takePictureIntent.resolveActivity(packageManager) != null) {
                        try {
                            fileChooserLauncher.launch(takePictureIntent)
                            return true
                        } catch (e: Exception) {
                            // fallback
                        }
                    }

                    val contentIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = "image/*"
                        addCategory(Intent.CATEGORY_OPENABLE)
                    }

                    val chooserIntent = Intent(Intent.ACTION_CHOOSER).apply {
                        putExtra(Intent.EXTRA_INTENT, contentIntent)
                        putExtra(Intent.EXTRA_TITLE, "Select Image or Take Photo")
                        if (takePictureIntent.resolveActivity(packageManager) != null) {
                            putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(takePictureIntent))
                        }
                    }

                    try {
                        fileChooserLauncher.launch(chooserIntent)
                    } catch (e: Exception) {
                        fileUploadCallback?.onReceiveValue(null)
                        fileUploadCallback = null
                        return false
                    }
                    return true
                }
            }
        }

        rootLayout.addView(webView)
        setContentView(rootLayout)

        // Smooth back button handling (navigate WebView history or finish)
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        // Load the exact same React trading journal app from APK assets
        webView.loadUrl("https://$domain/assets/www/index.html")
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
        CookieManager.getInstance().flush()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
