export interface YouTubeTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
}

export interface YouTubeThumbnail {
  url: string
  width: number
  height: number
}

export interface YouTubePlaylistItem {
  kind: string
  etag: string
  id: string
  snippet: {
    publishedAt: string
    channelId: string
    title: string
    description: string
    thumbnails: {
      default?: YouTubeThumbnail
      medium?: YouTubeThumbnail
      high?: YouTubeThumbnail
      standard?: YouTubeThumbnail
      maxres?: YouTubeThumbnail
    }
    channelTitle: string
    resourceId: {
      kind: string
      videoId: string
    }
  }
}

export interface YouTubePlaylistItemsResponse {
  kind: string
  etag: string
  nextPageToken?: string
  prevPageToken?: string
  pageInfo: {
    totalResults: number
    resultsPerPage: number
  }
  items: YouTubePlaylistItem[]
}
