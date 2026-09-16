/**
 * YouTube Data API keys inherited from pointauc. They are rotated on failure
 * (quota exceeded, revoked key). If all of them fail the caller falls back to
 * the keyless oEmbed lookup.
 */
const YOUTUBE_API_KEYS = [
  'AIzaSyBMnL4y-4VNxQRRYfSXajuPH6OmkvDsbT0',
  'AIzaSyAbkUdit9z4zGiSmXtYAuBoJYKMDeZ6rSM',
  'AIzaSyCVPinFlGHMn0uzeWFjNTA38QOZBejOlSs',
  'AIzaSyD0WjHt1tEIzdYLWSbcArCXTdBbDvyxDMk',
];

const withApiKeyRotation = async <T>(requestFn: (keyId: number) => Promise<T>, keyId = 0): Promise<T | undefined> => {
  try {
    if (!YOUTUBE_API_KEYS[keyId]) {
      return undefined;
    }
    return await requestFn(keyId);
  } catch (e) {
    if (keyId + 1 < YOUTUBE_API_KEYS.length) {
      return withApiKeyRotation(requestFn, keyId + 1);
    }
    return undefined;
  }
};

export interface VideoDetails {
  videoId: string;
  title: string;
  channelTitle: string;
  duration: number;
  thumbnailUrl: string;
}

/**
 * Parses ISO 8601 duration format (PT#H#M#S) to seconds
 */
const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Fetches detailed information for a single YouTube video by ID
 */
export const fetchYoutubeVideoById = async (videoId: string): Promise<VideoDetails | null> => {
  const result = await withApiKeyRotation(async (keyId) => {
    const params = new URLSearchParams({ id: videoId, part: 'snippet,contentDetails', key: YOUTUBE_API_KEYS[keyId] });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);

    if (!response.ok) {
      throw new Error(`YouTube API responded with ${response.status}`);
    }

    const data = await response.json();

    if (!data?.items?.length) {
      return null;
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;

    return {
      videoId,
      title: snippet.title,
      channelTitle: snippet.channelTitle,
      duration: parseDuration(contentDetails.duration),
      thumbnailUrl:
        snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url || '',
    };
  });

  return result ?? null;
};
