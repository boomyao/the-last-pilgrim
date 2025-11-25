import { Track, Chapter } from './types';
import audioDurationsData from '../../audioDurations.json';
import videoDurationsData from '../../videoDurations.json';

// Type for audio durations data
interface AudioDurationsData {
  trackDurations: Record<string, number>;
  chapterDurations: number[];
  totalDuration: number;
  calculatedAt: string;
}

// Type for video durations data
interface VideoDurationsData {
  videoDurations: Record<string, number>;
  calculatedAt: string;
}

// Fallback duration if audio durations file is not available or track is missing
const FALLBACK_TRACK_DURATION_SECONDS = 180; // 3 minutes per track

// Fallback duration if video durations file is not available or video is missing
const FALLBACK_VIDEO_DURATION_SECONDS = 30; // 30 seconds per video

// Get the audio durations data
const audioDurations: AudioDurationsData = audioDurationsData as AudioDurationsData;

// Get the video durations data
const videoDurations: VideoDurationsData = videoDurationsData as VideoDurationsData;

// Get the duration of a specific track
export const getTrackDuration = (audioFile: string): number => {
  if (!audioDurations || !audioDurations.trackDurations) {
    return FALLBACK_TRACK_DURATION_SECONDS;
  }
  
  // Try direct lookup first
  if (audioDurations.trackDurations[audioFile]) {
    return audioDurations.trackDurations[audioFile];
  }
  
  // Try with /assets/ prefix if not already present
  const withAssetsPrefix = audioFile.startsWith('/assets/') 
    ? audioFile 
    : `/assets/${audioFile}`;
  if (audioDurations.trackDurations[withAssetsPrefix]) {
    return audioDurations.trackDurations[withAssetsPrefix];
  }
  
  // Try without /assets/ prefix if it was present
  const withoutAssetsPrefix = audioFile.startsWith('/assets/')
    ? audioFile.replace('/assets/', '')
    : audioFile;
  if (audioDurations.trackDurations[withoutAssetsPrefix]) {
    return audioDurations.trackDurations[withoutAssetsPrefix];
  }
  
  // If still not found, return fallback
  return FALLBACK_TRACK_DURATION_SECONDS;
};

// Get the duration of a specific video
export const getVideoDuration = (videoFile: string): number => {
  if (videoDurations && videoDurations.videoDurations[videoFile]) {
    return videoDurations.videoDurations[videoFile];
  }
  return FALLBACK_VIDEO_DURATION_SECONDS;
};

// Get the duration of a specific chapter
export const getChapterDuration = (chapterIndex: number): number => {
  if (chapterIndex < 0 || chapterIndex >= CHAPTERS.length) return 0;
  
  // Use pre-calculated chapter duration if available
  if (audioDurations && audioDurations.chapterDurations[chapterIndex] !== undefined) {
    return audioDurations.chapterDurations[chapterIndex];
  }
  
  // Fallback: calculate from track durations
  const chapter = CHAPTERS[chapterIndex];
  return chapter.tracks.reduce((sum, track) => {
    return sum + getTrackDuration(track.audioFile);
  }, 0);
};

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: "Movement I: The Silent Colossus",
    subtitle: "巨像静默",
    description: "Wide angle. A tiny human silhouette walking in an endless desert. Background is a colossal Buddha head or ancient monolith half-buried in sand, so huge the top is out of frame. Ancient stone texture, heat haze.",
    visualPrompt: "Cinematic concept art, wide shot. A minuscule human silhouette walking in a vast, empty desert. Looming in the background is a gargantuan, ancient stone head half-buried in sand, weathered and crumbling. The scale is oppressive. Color palette: Earth tones, ocher, dark gold, dusty atmosphere. High detail, 8k resolution, dramatic lighting.",
    colorTheme: {
      bg: "bg-amber-950",
      text: "text-amber-100",
      accent: "text-amber-500"
    },
    quote: "In the shadow of forgotten gods, we are but dust in the wind.",
    video: "01.mp4",
    audioTrack: "Colossal Echoes",
    tracks: [
      {
        artist: "窦唯",
        title: "高级动物",
        reason: "窦唯后期的音乐完全脱离了\"人\"的情绪，进入了一种神性与魔性共存的状态。这种呢喃和阴郁的氛围，像极了莫高窟里那些斑驳掉色的佛像，冷静地注视着众生，充满东方式的神秘与虚无。",
        audioFile: "a_01_01.mp3"
      },
      {
        artist: "赵季平",
        title: "丝绸之路幻想曲.楼兰梦",
        reason: "经典的管弦乐与民乐结合。它不是那种欢快的异域风情，而是甚至带着一丝悲凉的辽阔。那是\"西出阳关无故人\"的听觉化，你能听到黄沙掩埋古城的痕迹。",
        audioFile: "a_01_02.mp3"
      },
      {
        artist: "Hans Zimmer / Lisa Gerrard",
        title: "Sorrow (Gladiator OST)",
        reason: "虽然出自《角斗士》，但Lisa Gerrard那自创的、无人能懂的吟唱语言，像极了失落文明的挽歌。这种超越语言的悲怆，完美契合人类作为物种面对历史长河时的寂寥。",
        audioFile: "a_01_03.mp3"
      }
    ]
  },
  {
    id: 2,
    title: "Movement II: The Forest of Steel",
    subtitle: "钢铁森林",
    description: "Inside a massive abandoned cooling tower or beneath a cyberpunk mega-structure. Rain falling from kilometers high. Giant holographic ads glitching. Industrial decay.",
    visualPrompt: "Cyberpunk dystopian concept art. Extreme low angle. A tiny human silhouette standing at the bottom of a massive, wet industrial canyon or inside a cooling tower. Rain falling from a great height. Enormous, glitching holographic advertisements dominate the dark vertical space. Color palette: Cold blue, bioluminescent green, neon purple, dark metallic tones. Blade Runner vibes. Atmospheric.",
    colorTheme: {
      bg: "bg-slate-900",
      text: "text-cyan-100",
      accent: "text-cyan-400"
    },
    quote: "The rain washes away the history, leaving only the cold neon hum.",
    video: "02.mp4",
    audioTrack: "Neon Rain",
    tracks: [
      {
        artist: "Hildur Guðnadóttir",
        title: "Vichnaya Pamyat (Chernobyl OST)",
        reason: "必选曲目。这首曲子是为人造灾难谱写的安魂曲。大提琴的沉重呼吸声，就在模拟那种肉眼看不见的、却能摧毁一切的辐射。它既是恐惧，又是那种\"万物终将寂灭\"的绝对死寂。",
        audioFile: "a_02_01.mp3"
      },
      {
        artist: "Vangelis",
        title: "Tears in Rain (Blade Runner OST)",
        reason: "赛博朋克的圣经。\"所有这些时刻，终将消逝在时间里，像雨中的泪水。\" 这种被异化的迷失感在此刻达到顶峰。它不是悲伤，而是一种电子羊才会做的梦，是对\"存在\"本身的质疑。",
        audioFile: "a_02_02.mp3"
      },
      {
        artist: "Burial",
        title: "Archangel",
        reason: "Future Garage 风格的代表。采样中那些破碎的人声、仿佛下雨般的背景底噪、孤独的贝斯线，像极了一个人在巨大的、拥挤的、高科技的都市中行走，却感到前所未有的孤独。",
        audioFile: "a_02_03.mp3"
      }
    ]
  },
  {
    id: 3,
    title: "Movement III: The Gaze of the Void",
    subtitle: "虚空注视",
    description: "Space. A tiny human silhouette floating. Facing a massive black sphere (black hole) or a perfect geometric alien structure. Absolute silence.",
    visualPrompt: "Sci-fi masterpiece. Deep space. A tiny human astronaut silhouette floating helplessly. Directly in front is a terrifyingly massive, perfect black sphere or event horizon that consumes all light. Minimalist composition. Color palette: Stark black and white, high contrast, absolute darkness. A sense of cosmic horror and awe.",
    colorTheme: {
      bg: "bg-black",
      text: "text-gray-200",
      accent: "text-white"
    },
    quote: "When you look long into an abyss, the abyss also looks into you.",
    video: "03.mp4",
    audioTrack: "Abyssal Drone",
    tracks: [
      {
        artist: "Jóhann Jóhannsson",
        title: "Heptapod B (Arrival OST)",
        reason: "这种音乐听起来不像是由人类创作的。它像是非线性时间的具象化，循环往复，没有起点也没有终点。它对应了你说的\"比宿命论更冰冷\"，因为它是一种高维度的俯视，人类的悲欢在其中微不足道。",
        audioFile: "a_03_01.mp3"
      },
      {
        artist: "Hans Zimmer",
        title: "No Time for Caution (Interstellar OST)",
        reason: "这里的管风琴不是为了宗教，而是为了模拟宇宙的呼吸。那种极简主义的重复（Ostinato），就是你提到的螺旋。它既是旋转的太空站，也是无法逃脱的物理定律，宏大、磅礴、甚至让人感到压抑的崇高感（Sublime）。",
        audioFile: "a_03_02.mp3"
      }
    ]
  },
  {
    id: 4,
    title: "Movement IV: White Oblivion",
    subtitle: "白色湮灭",
    description: "Blizzard. Massive objects disintegrating into shards rising up. The pilgrim sits down, covered in snow/ash.",
    visualPrompt: "Abstract cinematic art. A blinding white blizzard. Massive, undefined geometric structures are disintegrating into shards and floating upwards into the sky. A tiny human silhouette is sitting on the ground, accepting fate, slowly being buried by white snow and ash. Color palette: Overexposed white, light grey, faint silver. Ethereal, peaceful, final.",
    colorTheme: {
      bg: "bg-white",
      text: "text-slate-600",
      accent: "text-slate-900"
    },
    quote: "And in the end, silence was the loudest sound of all.",
    video: "04.mp4",
    audioTrack: "Fading Pulse",
    tracks: [
      {
        artist: "Mono",
        title: "Ashes in the Snow",
        reason: "日本后摇乐队Mono最擅长制造\"磅礴的悲伤\"。这首曲子长达11分钟，从细微的铃声开始，层层堆叠，最后爆发成巨大的音墙。它完美诠释了《百年孤独》的结尾：一场将一切卷走的飓风。听完后，真的会有\"被抹去\"的感觉。",
        audioFile: "a_04_01.mp3"
      },
      {
        artist: "Pink Floyd",
        title: "Echoes",
        reason: "23分钟的史诗。歌词 \"Strangers passing in the street / By chance two separate glances meet\"（街上路过的陌生人/偶然间两个视线相交）。从深海的声纳声到宇宙的轰鸣，它串联了人类从诞生到消亡的所有孤独。这是对整个物种命运最温柔也最冷酷的注脚。",
        audioFile: "a_04_02.mp3"
      }
    ]
  }
];

// Calculate total duration of all tracks across all chapters
export const getTotalDuration = (): number => {
  // Use pre-calculated total duration if available
  if (audioDurations && audioDurations.totalDuration) {
    return audioDurations.totalDuration;
  }
  
  // Fallback: calculate from chapter durations
  return CHAPTERS.reduce((total, _, chapterIndex) => {
    return total + getChapterDuration(chapterIndex);
  }, 0);
};

// Calculate chapter boundaries (start time for each chapter)
export const getChapterBoundaries = (): number[] => {
  const boundaries: number[] = [0];
  let currentTime = 0;
  
  for (let chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex++) {
    currentTime += getChapterDuration(chapterIndex);
    boundaries.push(currentTime);
  }
  
  return boundaries;
};

// Get the start time of a specific chapter
export const getChapterStartTime = (chapterIndex: number): number => {
  const boundaries = getChapterBoundaries();
  return boundaries[chapterIndex] || 0;
};

// Get track start time within a chapter
export const getTrackStartTime = (chapterIndex: number, trackIndex: number): number => {
  if (chapterIndex < 0 || chapterIndex >= CHAPTERS.length) return 0;
  const chapter = CHAPTERS[chapterIndex];
  
  let startTime = 0;
  for (let i = 0; i < trackIndex && i < chapter.tracks.length; i++) {
    startTime += getTrackDuration(chapter.tracks[i].audioFile);
  }
  return startTime;
};

