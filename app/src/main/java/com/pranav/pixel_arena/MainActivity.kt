package com.pranav.pixel_arena

import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.pranav.pixel_arena.ui.theme.PiXelArenaTheme

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private var embeddedServer: EmbeddedServer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val server = EmbeddedServer(assets)
        server.start()
        embeddedServer = server
        val port = server.port

        setContent {
            PiXelArenaTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    WebViewScreen(
                        url = "http://localhost:$port/index.html",
                        modifier = Modifier.padding(innerPadding),
                        onWebViewCreated = { webView = it }
                    )
                }
            }
        }
    }

    override fun onDestroy() {
        embeddedServer?.stop()
        super.onDestroy()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}

@Composable
fun WebViewScreen(url: String, modifier: Modifier = Modifier, onWebViewCreated: (WebView) -> Unit) {
    AndroidView(
        factory = { context ->
            WebView(context).apply {
                webViewClient = WebViewClient()
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                loadUrl(url)
                onWebViewCreated(this)
            }
        },
        modifier = modifier.fillMaxSize()
    )
}
