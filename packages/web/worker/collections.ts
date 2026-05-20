import type { CollectionType } from '@/utils/fetching/meta'

type TaggedRow = { tags: string[] | null }

// A collection is the prefix of any tag formatted `<name>:<rest>`.
// `ai:openai` → `ai`. Tags without a colon are not collections, but a
// bookmark tagged with a bare `name` still belongs to that collection
// if one exists — see `tagBelongsToCollection`.
const collectionFromTag = (tag: string): string | null => {
  const colonIndex = tag.indexOf(':')
  if (colonIndex <= 0) return null
  return tag.slice(0, colonIndex)
}

export const tagBelongsToCollection = (tag: string, name: string): boolean =>
  tag === name || tag.startsWith(`${name}:`)

export const summariseCollections = (rows: TaggedRow[]): CollectionType[] => {
  const collections = new Map<string, { count: number; tags: Set<string> }>()

  for (const row of rows) {
    for (const tag of row.tags ?? []) {
      const name = collectionFromTag(tag)
      if (!name) continue
      const item = collections.get(name) ?? {
        count: 0,
        tags: new Set<string>(),
      }
      item.tags.add(tag)
      collections.set(name, item)
    }
  }

  for (const row of rows) {
    const matched = new Set<string>()
    for (const tag of row.tags ?? []) {
      const name = collectionFromTag(tag) ?? tag
      if (collections.has(name)) matched.add(name)
    }
    for (const name of matched) {
      collections.get(name)!.count += 1
    }
  }

  return Array.from(collections, ([collection, value]) => ({
    bookmark_count: value.count,
    collection,
    tags: Array.from(value.tags).sort(),
  })).sort(
    (a, b) =>
      (b.bookmark_count ?? 0) - (a.bookmark_count ?? 0) ||
      a.collection.localeCompare(b.collection),
  )
}
