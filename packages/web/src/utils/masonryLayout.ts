export interface MasonryPosition {
  column: number
  top: number
}

/**
 * Places each card, in order, at the top of the shortest column. Earlier cards
 * never move when more are added, and the page keeps its reading order.
 */
export const masonryLayout = (
  heights: number[],
  columnCount: number,
  gap: number,
): { positions: MasonryPosition[]; height: number } => {
  const columnHeights: number[] = Array(columnCount).fill(0)
  const positions = heights.map((height) => {
    const column = columnHeights.indexOf(Math.min(...columnHeights))
    const top = columnHeights[column]
    columnHeights[column] += height + gap
    return { column, top }
  })

  return {
    height: Math.max(0, Math.max(...columnHeights) - gap),
    positions,
  }
}
