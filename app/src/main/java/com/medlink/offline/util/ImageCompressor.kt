package com.medlink.offline.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import kotlin.math.roundToInt

object ImageCompressor {

    fun compressImage(context: Context, uri: Uri, targetQuality: Int = 80, maxWidth: Int = 1024): File? {
        val contentResolver = context.contentResolver
        var inputStream: InputStream? = null
        try {
            // Get original dimensions
            val options = BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            inputStream = contentResolver.openInputStream(uri)
            BitmapFactory.decodeStream(inputStream, null, options)
            inputStream?.close()

            var srcWidth = options.outWidth
            var srcHeight = options.outHeight
            if (srcWidth <= 0 || srcHeight <= 0) return null

            // Calculate scaled dimensions maintaining aspect ratio
            var targetWidth = srcWidth
            var targetHeight = srcHeight
            if (srcWidth > maxWidth) {
                val ratio = maxWidth.toFloat() / srcWidth
                targetWidth = maxWidth
                targetHeight = (srcHeight * ratio).roundToInt()
            }

            // Calculate sample size
            var sampleSize = 1
            while ((srcWidth / sampleSize / 2) >= targetWidth && (srcHeight / sampleSize / 2) >= targetHeight) {
                sampleSize *= 2
            }

            // Decode with sampleSize
            val decodeOptions = BitmapFactory.Options().apply {
                inSampleSize = sampleSize
            }
            inputStream = contentResolver.openInputStream(uri)
            val decodedBitmap = BitmapFactory.decodeStream(inputStream, null, decodeOptions)
            inputStream?.close()

            if (decodedBitmap == null) return null

            // Scale to exact target width/height if it doesn't match
            val finalBitmap = if (decodedBitmap.width != targetWidth || decodedBitmap.height != targetHeight) {
                val scaled = Bitmap.createScaledBitmap(decodedBitmap, targetWidth, targetHeight, true)
                if (scaled != decodedBitmap) {
                    decodedBitmap.recycle()
                }
                scaled
            } else {
                decodedBitmap
            }

            // Save to temp file
            val outputDir = context.cacheDir
            val outputFile = File.createTempFile("medlink_compressed_", ".jpg", outputDir)
            val outputStream = FileOutputStream(outputFile)
            finalBitmap.compress(Bitmap.CompressFormat.JPEG, targetQuality, outputStream)
            outputStream.flush()
            outputStream.close()
            finalBitmap.recycle()

            return outputFile
        } catch (e: Exception) {
            e.printStackTrace()
            return null
        } finally {
            try {
                inputStream?.close()
            } catch (_: Exception) {}
        }
    }
}
