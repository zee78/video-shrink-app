
package expo.modules.videoprocessor

import androidx.media3.transformer.DefaultEncoderFactory
import androidx.media3.transformer.VideoEncoderSettings
import android.media.MediaMetadataRetriever
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
import androidx.media3.transformer.EncoderSelector
import androidx.media3.transformer.EncoderUtil
import com.google.common.collect.ImmutableList

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import android.media.MediaCodecInfo
import android.media.MediaCodecList

import java.io.File
import java.util.UUID

class VideoProcessorModule : Module() {

    private data class SourceMetadata(
        val width: Int?,
        val height: Int?,
        val bitrate: Int?,
        val durationMs: Long?
    )

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
            preset: String,
            removeAudio: Boolean,
            targetSizeMB: Double?,
            promise: Promise ->

            mainHandler.post {
                startCompression(
                    inputUri,
                    preset,
                    removeAudio,
                    targetSizeMB,
                    promise
                )
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
        preset: String,
        removeAudio: Boolean,
        targetSizeMB: Double?,
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

        val targetShortSide = when (preset) {
            "small" -> 480
            "balanced" -> 720
            "high" -> 1080
            "custom" -> 480
            else -> {
                promise.reject(
                    "INVALID_PRESET",
                    "Unsupported compression preset: $preset",
                    null
                )
                return
            }
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

            val retriever = MediaMetadataRetriever()

            val sourceMetadata = try {
                retriever.setDataSource(context, uri)

                SourceMetadata(
                    width = retriever.extractMetadata(
                        MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH
                    )?.toIntOrNull(),
                    height = retriever.extractMetadata(
                        MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT
                    )?.toIntOrNull(),
                    bitrate = retriever.extractMetadata(
                        MediaMetadataRetriever.METADATA_KEY_BITRATE
                    )?.toIntOrNull(),
                    durationMs = retriever.extractMetadata(
                        MediaMetadataRetriever.METADATA_KEY_DURATION
                    )?.toLongOrNull()
                )
            } finally {
                retriever.release()
            }

            val sourceWidth = sourceMetadata.width
            val sourceHeight = sourceMetadata.height
            val sourceBitrate = sourceMetadata.bitrate
            val durationMs = sourceMetadata.durationMs

            if (
                sourceWidth == null ||
                sourceHeight == null ||
                sourceWidth <= 0 ||
                sourceHeight <= 0
            ) {
                throw IllegalArgumentException(
                    "Unable to determine video resolution."
                )
            }

            val sourceShortSide = minOf(
                sourceWidth,
                sourceHeight
            )

            val outputShortSide = minOf(
                sourceShortSide,
                targetShortSide
            )

            val targetVideoBitrate =
                if (preset == "custom") {
                    val requestedSize = targetSizeMB
                        ?: throw IllegalArgumentException(
                            "Custom target size is required."
                        )

                    val videoDuration = durationMs
                        ?: throw IllegalArgumentException(
                            "Unable to determine video duration."
                        )

                    calculateCustomBitrate(
                        targetSizeMB = requestedSize,
                        durationMs = videoDuration,
                        removeAudio = removeAudio
                    )
                } else {
                    calculateSmartBitrate(
                        preset = preset,
                        sourceBitrate = sourceBitrate,
                        outputShortSide = outputShortSide,
                        removeAudio = removeAudio
                    )
                }

             Log.d(
                "VideoShrink",
                """
                Compression settings:
                Preset: $preset
                Source resolution: ${sourceWidth}x${sourceHeight}
                Source bitrate: $sourceBitrate
                Target short side: $outputShortSide
                Target video bitrate: $targetVideoBitrate
                Remove audio: $removeAudio
                """.trimIndent()
            )

            outputFile = File(
                context.cacheDir,
                "videoshrink_${UUID.randomUUID()}.mp4"
            )

            val mediaItem = MediaItem.fromUri(uri)

            val videoEffects =
                if (sourceShortSide > outputShortSide) {
                    listOf(
                        Presentation.createForShortSide(
                            outputShortSide
                        )
                    )
                } else {
                    emptyList()
                }

            val editedMediaItem =
                EditedMediaItem.Builder(mediaItem)
                    .setRemoveAudio(removeAudio)
                    .setEffects(
                        Effects(
                            emptyList(),
                            videoEffects
                        )
                    )
                    .build()

            val outputPath = outputFile.absolutePath

            val videoEncoderSettings =
                VideoEncoderSettings.Builder()
                    .setBitrate(targetVideoBitrate)
                    .build()

            val encoderFactoryBuilder =
                DefaultEncoderFactory.Builder(context)
                    .setRequestedVideoEncoderSettings(videoEncoderSettings)

            // Experiment: use a software H.264 encoder for Custom Size only.
            if (preset == "custom") {

                val softwareEncoderSelector = EncoderSelector { mimeType ->

                    val availableEncoders =
                        EncoderUtil.getSupportedEncoders(mimeType)

                    val softwareEncoders = availableEncoders.filter { codec ->

                        codec.name.startsWith(
                            "c2.android.",
                            ignoreCase = true
                        ) || codec.name.startsWith(
                            "OMX.google.",
                            ignoreCase = true
                        )
                    }

                    if (softwareEncoders.isNotEmpty()) {

                        Log.d(
                            "VideoShrink",
                            "Software encoders: ${
                                softwareEncoders.joinToString { it.name }
                            }"
                        )

                        ImmutableList.copyOf(softwareEncoders)

                    } else {

                        Log.w(
                            "VideoShrink",
                            "No software encoder found; using default selection."
                        )

                        EncoderSelector.DEFAULT.selectEncoderInfos(mimeType)
                    }
                }

                encoderFactoryBuilder.setVideoEncoderSelector(
                    softwareEncoderSelector
                )
            }

            val encoderFactory =
                encoderFactoryBuilder.build()

            val transformer =
                Transformer.Builder(context)
                    .setVideoMimeType(
                        MimeTypes.VIDEO_H264
                    )
                    .setAudioMimeType(
                        MimeTypes.AUDIO_AAC
                    )
                    .setEncoderFactory(encoderFactory)
                    .addListener(
                        object : Transformer.Listener {

                            override fun onCompleted(
                                composition: Composition,
                                result: ExportResult
                            ) {
                                activeTransformer = null
                                
                                val videoProcess = when (result.videoConversionProcess) {
                                    ExportResult.CONVERSION_PROCESS_TRANSCODED ->
                                        "TRANSCODED"

                                    ExportResult.CONVERSION_PROCESS_TRANSMUXED ->
                                        "TRANSMUXED"

                                    ExportResult.CONVERSION_PROCESS_TRANSMUXED_AND_TRANSCODED ->
                                        "BOTH"

                                    else -> "UNKNOWN"
                                }

                                Log.d(
                                    "VideoShrink",
                                    "Video process: $videoProcess, " +
                                        "Requested bitrate: $targetVideoBitrate, " +
                                        "Actual video bitrate: ${result.averageVideoBitrate}"
                                )

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
                                        "uri" to Uri.fromFile(file).toString(),
                                        "outputPath" to outputPath,
                                        "outputSizeBytes" to file.length(),
                                        "videoProcess" to videoProcess,
                                        "requestedVideoBitrate" to targetVideoBitrate,
                                        "actualVideoBitrate" to result.averageVideoBitrate,
                                        "encoderDiagnostics" to getEncoderDiagnostics()
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

    private fun calculateSmartBitrate(
        preset: String,
        sourceBitrate: Int?,
        outputShortSide: Int,
        removeAudio: Boolean
    ): Int {

        // Target bitrate limits in bits per second.
        val presetMaxBitrate = when (preset) {
            "small" -> 600_000
            "balanced" -> 1_500_000
            "high" -> 3_000_000
            else -> 600_000
        }

        // Lower-resolution videos need less bitrate.
        val resolutionScale =
            (outputShortSide.toDouble() / 480.0)
                .let { it * it }

        val resolutionAwareBitrate =
            (600_000 * resolutionScale)
                .toInt()
                .coerceAtMost(presetMaxBitrate)

        // If source bitrate is unknown, use the preset target.
        if (sourceBitrate == null || sourceBitrate <= 0) {
            return resolutionAwareBitrate.coerceAtLeast(64_000)
        }

        // Allow room for container overhead and audio.
        val audioBudget =
            if (removeAudio) 0 else 96_000

        val sourceBasedBudget =
            (sourceBitrate * 0.80)
                .toInt() - audioBudget

        return minOf(
            resolutionAwareBitrate,
            sourceBasedBudget.coerceAtLeast(64_000)
        )
    }

    private fun getEncoderDiagnostics(): String {
        return try {
            val codecList = MediaCodecList(
                MediaCodecList.REGULAR_CODECS
            )

            val encoders = codecList.codecInfos.filter { codec ->
                codec.isEncoder &&
                    codec.supportedTypes.any { type ->
                        type.equals(
                            MimeTypes.VIDEO_H264,
                            ignoreCase = true
                        )
                    }
            }

            if (encoders.isEmpty()) {
                return "No H.264 video encoder found."
            }

            encoders.joinToString("\n\n") { codec ->
                try {
                    val capabilities = codec.getCapabilitiesForType(
                        MimeTypes.VIDEO_H264
                    )

                    val videoCapabilities =
                        capabilities.videoCapabilities

                    val encoderCapabilities =
                        capabilities.encoderCapabilities

                    val bitrateRange =
                        videoCapabilities?.bitrateRange

                    val supportsCBR =
                        encoderCapabilities?.isBitrateModeSupported(
                            MediaCodecInfo.EncoderCapabilities.BITRATE_MODE_CBR
                        ) ?: false

                    val supportsVBR =
                        encoderCapabilities?.isBitrateModeSupported(
                            MediaCodecInfo.EncoderCapabilities.BITRATE_MODE_VBR
                        ) ?: false

                    val supportsCQ =
                        encoderCapabilities?.isBitrateModeSupported(
                            MediaCodecInfo.EncoderCapabilities.BITRATE_MODE_CQ
                        ) ?: false

                    val bitrateRangeText =
                        if (bitrateRange != null) {
                            "${bitrateRange.lower / 1000}-${bitrateRange.upper / 1000} kbps"
                        } else {
                            "Unknown"
                        }

                    """
                    Encoder: ${codec.name}
                    Bitrate range: $bitrateRangeText
                    CBR supported: $supportsCBR
                    VBR supported: $supportsVBR
                    CQ supported: $supportsCQ
                    """.trimIndent()

                } catch (error: Exception) {
                    "Encoder: ${codec.name}\nDetails unavailable: ${error.message}"
                }
            }

        } catch (error: Exception) {
            "Encoder diagnostics failed: ${error.message}"
        }
    }

    private fun calculateCustomBitrate(
        targetSizeMB: Double,
        durationMs: Long,
        removeAudio: Boolean
    ): Int {
        require(targetSizeMB.isFinite() && targetSizeMB > 0.0) {
            "Target size must be greater than zero."
        }

        require(durationMs > 0L) {
            "Unable to determine video duration."
        }

        val durationSeconds = durationMs / 1000.0
        val targetSizeBytes = targetSizeMB * 1024.0 * 1024.0
        val usableBits = targetSizeBytes * 8.0 * 0.95
        val totalBitrate = usableBits / durationSeconds
        val audioBitrate = if (removeAudio) 0 else 128_000
        val videoBitrate = totalBitrate - audioBitrate

        require(videoBitrate >= 100_000.0) {
            "Target size is too small for this video's duration."
        }

        require(videoBitrate <= Int.MAX_VALUE.toDouble()) {
            "Target size is too large."
        }

        return videoBitrate.toInt()
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
