// import { BookmarkType } from './bookmark'
import { BookmarkType } from './db';

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export const isApiSuccess = <T>(
  response: ApiSuccessResponse<T> | ApiErrorResponse,
): response is ApiSuccessResponse<T> => {
  return (response as ApiSuccessResponse<T>).count !== undefined;
};
export type ApiSuccessResponse<T> = {
  offset: number;
  limit: number;
  count: number;
  _links: {
    next: string | null;
    prev: string | null;
  };
  data: T;
};

export interface ApiErrorResponse {
  reason: string;
  error: string;
  data: null;
}
// type Link = `/api/${string}/${number}&limit=${number}&offset=${number}`

export type RequestOrder = 'asc' | 'desc';
export type Status = 'active' | 'inactive';

export type isNullable<T> = T | null;
export interface MetadataResponse {
  author: isNullable<string>;
  date: isNullable<string>;
  description: isNullable<string>;
  image: isNullable<string>;
  logo: isNullable<string>;
  publisher: isNullable<string>;
  title: isNullable<string>;
  url: string;
  cleaned_url?: string;
  video: isNullable<string>;
  iframe: isNullable<string>;
  lang: isNullable<string>;
  feeds: isNullable<string>;
  urlType: BookmarkType;
}
