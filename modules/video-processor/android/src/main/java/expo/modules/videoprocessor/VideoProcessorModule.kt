
package expo.modules.videoprocessor

import android.net.Uri
import android.os.Handler
import android.os.Looper

import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.effect.Presentation
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.provider.MediaStore


import java.io.File
import java.util.UUID

class VideoProcessorModule : Module() {

    private val mainHandler = Handler(Looper.getMainLooper())

    private var activeTransformer: Transformer? = null

    override fun definition() = ModuleDefinition {

        Name("VideoProcessor")

        Function("getEngineInfo") {
            mapOf(
                "status" to "native-ready",
                "platform" to "android",
                "engine" to "Media3 Transformer"
            )
        }

        AsyncFunction("compressVideo") {
            inputUri: String,
            promise: Promise ->

            mainHandler.post {
                startCompression(inputUri, promise)
            }
        }

        OnDestroy {
            mainHandler.post {
                activeTransformer?.cancel()
                activeTransformer = null
            }
        }

        AsyncFunction("saveToGallery") {
            outputPath: String ->

            saveVideoToGallery(outputPath)
        }
    }

    private fun startCompression(
        inputUri: String,
        promise: Promise
    ) {
        if (activeTransformer != null) {
            promise.reject(
                "COMPRESSION_BUSY",
                "Another video is already being processed.",
                null
            )
            return
        }

        if (inputUri.isBlank()) {
            promise.reject(
                "INVALID_INPUT",
                "Video URI cannot be empty.",
                null
            )
            return
        }

        val context = appContext.reactContext

        if (context == null) {
            promise.reject(
                "CONTEXT_UNAVAILABLE",
                "Android context is unavailable.",
                null
            )
            return
        }

        var outputFile: File? = null

        try {
            val uri = Uri.parse(inputUri)

            outputFile = File(
                context.cacheDir,
                "videoshrink_${UUID.randomUUID()}.mp4"
            )

            val mediaItem = MediaItem.fromUri(uri)

            val editedMediaItem =
                EditedMediaItem.Builder(mediaItem)
                    .setEffects(
                        Effects(
                            emptyList(),
                            listOf(
                                Presentation.createForHeight(720)
                            )
                        )
                    )
                    .build()

            val outputPath = outputFile.absolutePath

            val transformer =
                Transformer.Builder(context)
                    .setVideoMimeType(
                        MimeTypes.VIDEO_H264
                    )
                    .setAudioMimeType(
                        MimeTypes.AUDIO_AAC
                    )
                    .addListener(
                        object : Transformer.Listener {

                            override fun onCompleted(
                                composition: Composition,
                                result: ExportResult
                            ) {
                                activeTransformer = null

                                val file = File(outputPath)

                                if (!file.exists() ||
                                    file.length() == 0L
                                ) {
                                    promise.reject(
                                        "EMPTY_OUTPUT",
                                        "Export produced no video.",
                                        null
                                    )
                                    return
                                }

                                promise.resolve(
                                    mapOf(
                                        "uri" to Uri.fromFile(file)
                                            .toString(),
                                        "outputPath" to outputPath,
                                        "outputSizeBytes" to file.length()
                                    )
                                )
                            }

                            override fun onError(
                                composition: Composition,
                                result: ExportResult,
                                exception: ExportException
                            ) {
                                activeTransformer = null

                                File(outputPath).delete()

                                promise.reject(
                                    "COMPRESSION_FAILED",
                                    exception.message
                                        ?: "Video compression failed.",
                                    exception
                                )
                            }
                        }
                    )
                    .build()

            activeTransformer = transformer

            transformer.start(
                editedMediaItem,
                outputPath
            )

        } catch (exception: Exception) {
            activeTransformer = null

            outputFile?.delete()

            promise.reject(
                "COMPRESSION_ERROR",
                exception.message
                    ?: "Unable to start compression.",
                exception
            )
        }
    }

    private fun saveVideoToGallery(
      outputPath: String
    ): String {
        val context = appContext.reactContext
            ?: throw IllegalStateException(
                "Android context is unavailable."
            )

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            throw UnsupportedOperationException(
                "Gallery saving currently requires Android 10 or newer."
            )
        }

        val source = File(outputPath).canonicalFile
        val cacheDir = context.cacheDir.canonicalFile

        // Only allow exports inside our private cache.
        if (!source.toPath().startsWith(cacheDir.toPath())) {
            throw SecurityException("Invalid export location.")
        }

        if (!source.isFile || source.length() == 0L) {
            throw IllegalArgumentException(
                "Compressed video file does not exist."
            )
        }

        val resolver = context.contentResolver

        val displayName =
            "VideoShrink_${System.currentTimeMillis()}_" +
            "${UUID.randomUUID().toString().take(8)}.mp4"

        val values = ContentValues().apply {
            put(
                MediaStore.Video.Media.DISPLAY_NAME,
                displayName
            )
            put(
                MediaStore.Video.Media.MIME_TYPE,
                "video/mp4"
            )
            put(
                MediaStore.Video.Media.RELATIVE_PATH,
                "${Environment.DIRECTORY_MOVIES}/VideoShrink"
            )
            put(MediaStore.Video.Media.IS_PENDING, 1)
        }

        val collection =
            MediaStore.Video.Media.getContentUri(
                MediaStore.VOLUME_EXTERNAL_PRIMARY
            )

        val destination = resolver.insert(
            collection,
            values
        ) ?: throw IllegalStateException(
            "Unable to create a Gallery entry."
        )

        try {
            val outputStream =
                resolver.openOutputStream(destination)
                    ?: throw IllegalStateException(
                        "Unable to open Gallery output stream."
                    )

            outputStream.use { output ->
                source.inputStream().use { input ->
                    input.copyTo(output)
                }
            }

            val completedValues = ContentValues().apply {
                put(MediaStore.Video.Media.IS_PENDING, 0)
            }

            val updated = resolver.update(
                destination,
                completedValues,
                null,
                null
            )

            if (updated < 1) {
                throw IllegalStateException(
                    "Unable to finalize Gallery export."
                )
            }

            return destination.toString()

        } catch (error: Exception) {
            resolver.delete(destination, null, null)
            throw error
        }
    }
}
