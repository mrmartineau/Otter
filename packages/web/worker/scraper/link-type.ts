import { LinkType, typeChecker } from './type-checker'

export const linkType = (link: string, isReaderable?: boolean): LinkType => {
  // if known file or site type, return early and use the
  // value for the type
  const urlIsKnownFileType = typeChecker(link)
  if (urlIsKnownFileType) {
    return urlIsKnownFileType
  }

  if (isReaderable) {
    return 'article'
  }

  return 'link'
}
