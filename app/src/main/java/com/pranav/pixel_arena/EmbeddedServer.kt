package com.pranav.pixel_arena

import android.content.res.AssetManager
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.ServerSocket
import java.net.Socket
import kotlin.concurrent.thread

class EmbeddedServer(private val assets: AssetManager) {
    private var serverSocket: ServerSocket? = null
    private var running = false
    var port: Int = 0
        private set

    private val mimeTypes = mapOf(
        ".html" to "text/html",
        ".js" to "application/javascript",
        ".css" to "text/css",
        ".json" to "application/json",
        ".png" to "image/png",
        ".jpg" to "image/jpeg",
        ".jpeg" to "image/jpeg",
        ".gif" to "image/gif",
        ".svg" to "image/svg+xml",
        ".ico" to "image/x-icon",
        ".webp" to "image/webp",
        ".woff" to "font/woff",
        ".woff2" to "font/woff2",
        ".ttf" to "font/ttf",
        ".txt" to "text/plain",
        ".xml" to "application/xml",
    )

    fun start() {
        if (running) return
        running = true

        var sock: ServerSocket? = null
        for (tryPort in 5500..5510) {
            try {
                sock = ServerSocket(tryPort)
                port = tryPort
                break
            } catch (_: Exception) {
            }
        }
        serverSocket = sock ?: throw RuntimeException("No free port found")
        thread(start = true, name = "embedded-server") { serve() }
    }

    private fun serve() {
        while (running) {
            try {
                val client = serverSocket?.accept() ?: break
                handleClient(client)
            } catch (_: Exception) {
                if (!running) break
            }
        }
    }

    private fun handleClient(client: Socket) {
        thread(start = true) {
            try {
                val reader = BufferedReader(InputStreamReader(client.getInputStream()))
                val requestLine = reader.readLine() ?: return@thread
                val parts = requestLine.split(" ")
                if (parts.size < 2) return@thread
                val method = parts[0]
                var path = parts[1]
                if (path == "/") path = "/index.html"
                val filePath = path.trimStart('/').split("?").first()

                if (method == "GET" || method == "HEAD") {
                    serveAsset(client, filePath, method)
                }
                reader.close()
            } catch (_: Exception) {
            } finally {
                try {
                    client.close()
                } catch (_: Exception) {
                }
            }
        }
    }

    private fun serveAsset(client: Socket, filePath: String, method: String) {
        try {
            val inputStream = assets.open(filePath)
            val bytes = inputStream.readBytes()
            inputStream.close()

            val ext = filePath.substringAfterLast('.', "").let { ".$it" }
            val contentType = mimeTypes[ext] ?: "application/octet-stream"
            val out = client.getOutputStream()

            out.write("HTTP/1.1 200 OK\r\n".toByteArray())
            out.write("Content-Type: $contentType\r\n".toByteArray())
            out.write("Content-Length: ${bytes.size}\r\n".toByteArray())
            out.write("Connection: close\r\n".toByteArray())
            out.write("Access-Control-Allow-Origin: *\r\n".toByteArray())
            out.write("\r\n".toByteArray())
            if (method == "GET") {
                out.write(bytes)
            }
            out.flush()
            out.close()
        } catch (_: Exception) {
            val msg = "404 Not Found"
            val out = client.getOutputStream()
            out.write("HTTP/1.1 404 Not Found\r\n".toByteArray())
            out.write("Content-Type: text/plain\r\n".toByteArray())
            out.write("Content-Length: ${msg.length}\r\n".toByteArray())
            out.write("Connection: close\r\n".toByteArray())
            out.write("\r\n".toByteArray())
            out.write(msg.toByteArray())
            out.flush()
            out.close()
        }
    }

    fun stop() {
        running = false
        try {
            serverSocket?.close()
        } catch (_: Exception) {
        }
    }
}
