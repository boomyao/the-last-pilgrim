import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(10); // 根据你的 CPU 核心数调整
Config.setJpegQuality(85);