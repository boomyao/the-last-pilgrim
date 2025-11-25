export interface Track {
  artist: string;
  title: string;
  reason: string;
  audioFile: string;
}

export interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  visualPrompt: string;
  colorTheme: {
    bg: string;
    text: string;
    accent: string;
  };
  quote: string;
  video: string;
  audioTrack: string;
  tracks: Track[];
}

