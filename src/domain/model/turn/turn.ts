/**
 * turn: ターン（順番）
 */

import { DomainError } from '../../error/domainError'
import { Board, initialBoard } from './board'
import { Disc } from './disc'
import { Move } from './move'
import { Point } from './point'

export class Turn {
  constructor(
    private _gameId: number,
    private _turnCount: number,
    private _nextDisc: Disc | undefined,
    private _move: Move | undefined,
    private _board: Board,
    private _endAt: Date
  ) {}

  get gameId() {
    return this._gameId
  }

  get turnCount() {
    return this._turnCount
  }

  get nextDisc() {
    return this._nextDisc
  }

  get move() {
    return this._move
  }

  get board() {
    return this._board
  }

  get endAt() {
    return this._endAt
  }

  placeNext(disc: Disc, point: Point): Turn {
    // 打とうとした石が、次の石ではない場合、置くことはできない。
    if (disc !== this._nextDisc) {
      throw new DomainError(
        'SelectedDiscIsNotNextDisc',
        'Selected disc is not next disc'
      )
    }

    const move = new Move(disc, point)
    const nextBoard = this._board.place(move)
    const nextDisc = this.dicideNextDisc(nextBoard, disc)

    return new Turn(
      this._gameId,
      this._turnCount + 1,
      nextDisc,
      move,
      nextBoard,
      new Date()
    )
  }

  private dicideNextDisc(board: Board, previousDisc: Disc): Disc | undefined {
    const existDarkValidMove = board.existValidMove(Disc.Dark)
    const existLightValidMove = board.existValidMove(Disc.Light)

    if (existDarkValidMove && existLightValidMove) {
      // 両方おける場合は、前の医師と反対の石の番
      return previousDisc === Disc.Dark ? Disc.Light : Disc.Dark
    } else if (!existDarkValidMove && !existLightValidMove) {
      // 両方置けない場合は、次の石はない
      return undefined
    } else if (existDarkValidMove) {
      // 片方しか置けない場合は、おける方の石の番
      return Disc.Dark
    } else if (existLightValidMove) {
      return Disc.Light
    }
  }
}

export function firstTurn(gameId: number, endAt: Date): Turn {
  return new Turn(gameId, 0, Disc.Dark, undefined, initialBoard, endAt)
}
