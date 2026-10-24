package expo.modules.videoprocessor

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VideoProcessorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VideoProcessor")

    Function("getEngineInfo") {
        mapOf(
            "status" to "native-ready",
            "platform" to "android",
            "engine" to "VideoProcessor"
        )
    }
  }
}
