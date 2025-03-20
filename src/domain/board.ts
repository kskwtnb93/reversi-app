/**
 * board: 盤面、ゲームボード
 */

import { Disc } from './disc'
import { Move } from './move'

export class Board {
  constructor(private _discs: Disc[][]) {}

  get discs() {
    return this._discs
  }

  place(move: Move): Board {
    // TODO: 盤面に置けるかチェック

    // 盤面をコピー
    const newDiscs = this._discs.map((line) => {
      return line.map((disc) => disc)
    })

    // 石を置く
    newDiscs[move.point.y][move.point.x] = move.disc

    // TODO: ひっくり返す

    return new Board(newDiscs)
  }
}

const E = Disc.Empty
const D = Disc.Dark
const L = Disc.Light

const INITIAL_DISCS = [
  [E, E, E, E, E, E, E, E],
  [E, E, E, E, E, E, E, E],
  [E, E, E, E, E, E, E, E],
  [E, E, E, D, L, E, E, E],
  [E, E, E, L, D, E, E, E],
  [E, E, E, E, E, E, E, E],
  [E, E, E, E, E, E, E, E],
  [E, E, E, E, E, E, E, E],
]

export const initialBoard = new Board(INITIAL_DISCS)
