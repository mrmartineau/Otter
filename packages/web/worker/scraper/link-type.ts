import { type LinkType, typeChecker } from './type-checker'

export const linkType = (link: string, isReaderable?: boolean): LinkType => {
  let type: LinkType = 'link'
  if (isReaderable) {
    type = 'article'
  }

  // if known file or site type, return early and use the
  // value for the type
  const urlIsKnownFileType = typeChecker(link)
  if (urlIsKnownFileType) {
    type = urlIsKnownFileType
  }

  return type
}
