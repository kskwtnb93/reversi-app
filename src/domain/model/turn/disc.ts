/**
 * disc: 石（駒）
 */

export const Disc = {
  Empty: 0,
  Dark: 1,
  Light: 2,
  Wall: 3,
} as const

export type Disc = (typeof Disc)[keyof typeof Disc]

export function toDisc(value: number): Disc {
  // TODO: あとで改善
  return value as Disc
}

/**
 * 逆の色の石かを判定する
 */
export function isOppositeDisc(disc1: Disc, disc2: Disc): boolean {
  return (
    (disc1 === Disc.Dark && disc2 === Disc.Light) ||
    (disc1 === Disc.Light && disc2 === Disc.Dark)
  )
}
