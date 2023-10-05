export const searchParamsToObject = (url: string) =>
  Object.fromEntries(new URLSearchParams(new URL(url).search));
