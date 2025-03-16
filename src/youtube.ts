interface YouTubeApiError {
  type: 'YOUTUBE_API_ERROR';
  code: number;
  message: string;
  retryable: boolean;
}

interface YouTubeVideoResponse {
  items: Array<{
    snippet: {
      title: string;
      categoryId: string;
      liveBroadcastContent: string;
    };
  }>;
}

const getYouTubeApiKey = async (): Promise<string> => {
  const result = await chrome.storage.sync.get(['youtubeApiKey']);
  if (!result.youtubeApiKey) {
    throw new Error('YouTube API key is not set. Please configure it in the extension settings.');
  }
  return result.youtubeApiKey;
};

export const extractVideoId = (url: string): string | null => {
  const urlObj = new URL(url);
  const videoId = urlObj.searchParams.get('v');
  return videoId;
};

export const getVideoCategory = async (videoId: string): Promise<number | YouTubeApiError> => {
  try {
    const apiKey = await getYouTubeApiKey();
    if (!apiKey) {
      return {
        type: 'YOUTUBE_API_ERROR',
        code: 401,
        message: 'YouTube API key not configured',
        retryable: false
      };
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
    );

    if (response.status === 403) {
      return {
        type: 'YOUTUBE_API_ERROR',
        code: 403,
        message: 'YouTube API quota exceeded',
        retryable: true
      };
    }

    if (!response.ok) {
      return {
        type: 'YOUTUBE_API_ERROR',
        code: response.status,
        message: 'YouTube API request failed',
        retryable: true
      };
    }

    const data: YouTubeVideoResponse = await response.json();
    if (!data.items?.[0]?.snippet?.categoryId) {
      return {
        type: 'YOUTUBE_API_ERROR',
        code: 404,
        message: 'Video category not found',
        retryable: false
      };
    }

    return parseInt(data.items[0].snippet.categoryId, 10);
  } catch (error) {
    return {
      type: 'YOUTUBE_API_ERROR',
      code: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    };
  }
};

export const isMusicCategory = (categoryId: number, liveBroadcastContent?: string): boolean => {
  // Consider live broadcasts as music
  if (liveBroadcastContent === "live") {
    return true;
  }
  // YouTube category ID 10 is "Music"
  return categoryId === 10;
};

export const getVideoDetails = async (videoId: string): Promise<{ title: string; categoryId: number; liveBroadcastContent: string } | YouTubeApiError> => {
  try {
    const apiKey = await getYouTubeApiKey();
    if (!apiKey) {
      return {
        type: 'YOUTUBE_API_ERROR',
        code: 401,
        message: 'YouTube API key not configured',
        retryable: false
      };
    }
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
    );
    if (response.status === 403) {
      return {
        type: 'YOUTUBE_API_ERROR',
        code: 403,
        message: 'YouTube API quota exceeded',
        retryable: true
      };
    }
    if (!response.ok) {
      return {
        type: 'YOUTUBE_API_ERROR',
        code: response.status,
        message: 'YouTube API request failed',
        retryable: true
      };
    }
    const data: YouTubeVideoResponse = await response.json();
    console.log(data);
    if (!data.items?.[0]?.snippet?.title || !data.items?.[0]?.snippet?.categoryId || !data.items?.[0]?.snippet?.liveBroadcastContent) {
      return {
        type: 'YOUTUBE_API_ERROR',
        code: 404,
        message: 'Video details not found',
        retryable: false
      };
    }
    return {
      title: data.items[0].snippet.title,
      categoryId: parseInt(data.items[0].snippet.categoryId, 10),
      liveBroadcastContent: data.items[0].snippet.liveBroadcastContent
    };
  } catch (error) {
    return {
      type: 'YOUTUBE_API_ERROR',
      code: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    };
  }
};
