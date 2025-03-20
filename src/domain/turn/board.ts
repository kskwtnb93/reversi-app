/**
 * board: 盤面、ゲームボード
 */

import { Disc, isOppositeDisc } from './disc'
import { Move } from './move'
import { Point } from './point'

export class Board {
  private _walledDiscs: Disc[][]

  constructor(private _discs: Disc[][]) {
    this._walledDiscs = this.wallDiscs()
  }

  get discs() {
    return this._discs
  }

  private wallDiscs(): Disc[][] {
    const walled: Disc[][] = []
    const topAndBottomWall = Array(this._discs[0].length + 2).fill(Disc.Wall)

    // 上の壁
    walled.push(topAndBottomWall)

    // 左右の壁
    this._discs.forEach((line) => {
      const walledLine = [Disc.Wall, ...line, Disc.Wall]
      walled.push(walledLine)
    })

    // 下の壁
    walled.push(topAndBottomWall)

    return walled
  }

  /**
   * ひっくり返せる座標をリストアップする
   */
  private listFlipPoints(move: Move): Point[] {
    const flipPoints: Point[] = []

    const walledX = move.point.x + 1
    const walledY = move.point.y + 1

    const checkFlipPoints = (xMove: number, yMove: number) => {
      const flipCandidate: Point[] = []

      // １つ動いた位置から開始
      let cursorX = walledX + xMove
      let cursorY = walledY + yMove

      // 手と逆の色の石がある間、１つずつ見ていく
      while (isOppositeDisc(move.disc, this._walledDiscs[cursorY][cursorX])) {
        // 番兵を考慮して-1する
        flipCandidate.push(new Point(cursorX - 1, cursorY - 1))

        // １つ移動
        cursorX += xMove
        cursorY += yMove

        // 次の手が同じ色の石なら、ひっくり返す石が確定
        if (move.disc === this._walledDiscs[cursorY][cursorX]) {
          flipPoints.push(...flipCandidate)
          break
        }
      }
    }

    // 上
    checkFlipPoints(0, -1)
    // 左上
    checkFlipPoints(-1, -1)
    // 左
    checkFlipPoints(-1, 0)
    // 左下
    checkFlipPoints(-1, 1)
    // 下
    checkFlipPoints(0, 1)
    // 右下
    checkFlipPoints(1, 1)
    // 右
    checkFlipPoints(1, 0)
    // 右上
    checkFlipPoints(1, -1)

    return flipPoints
  }

  place(move: Move): Board {
    // 盤面に置けるかチェック
    // 空のマス目ではない場合、置くことはできない
    if (this._discs[move.point.y][move.point.x] !== Disc.Empty) {
      throw new Error('Selected point is not empty')
    }
    // ひっくり返せる点がない場合、置くことはできない
    const flipPoints = this.listFlipPoints(move)
    if (flipPoints.length === 0) {
      console.log(move)
      throw new Error('Flip points is empty')
    }

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
