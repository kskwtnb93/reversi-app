import { GameGateway } from '../dataaccess/gameGateway'
import { connectMySQL } from '../dataaccess/connection'
import { toDisc } from '../domain/turn/disc'
import { Point } from '../domain/turn/point'
import { TurnRepository } from '../domain/turn/turnRepository'
import { GameRepository } from '../domain/game/gameRepository'

const gameGateway = new GameGateway()

const turnRepository = new TurnRepository()
const gameRepository = new GameRepository()

class FindLatestGameTurnByTurnCountOutput {
  constructor(
    private _turnCount: number,
    private _board: number[][],
    private _nextDisc: number | undefined,
    private _winnerDisc: number | undefined
  ) {}

  get turnCount() {
    return this._turnCount
  }

  get board() {
    return this._board
  }

  get nextDisc() {
    return this._nextDisc
  }

  get winnerDisc() {
    return this._winnerDisc
  }
}

export class TurnService {
  async findLatestGameTurnByCount(
    turnCount: number
  ): Promise<FindLatestGameTurnByTurnCountOutput> {
    const conn = await connectMySQL()
    try {
      // 対戦を取得
      const game = await gameRepository.findLatest(conn)
      if (!game) {
        throw new Error('Latest game not found.')
      }
      if (!game.id) {
        throw new Error('game.id not exist')
      }

      // ターンを取得
      const turn = await turnRepository.findForGameIdAndTurnCount(
        conn,
        game.id,
        turnCount
      )

      return new FindLatestGameTurnByTurnCountOutput(
        turn.turnCount,
        turn.board.discs,
        turn.nextDisc,
        // TODO: 決着がついている場合、game_resultsテーブルから取得する
        undefined
      )
    } finally {
      await conn.end()
    }
  }

  async registerTurn(turnCount: number, disc: number, x: number, y: number) {
    const conn = await connectMySQL()

    try {
      // 対戦を取得
      const game = await gameRepository.findLatest(conn)
      if (!game) {
        throw new Error('Latest game not found.')
      }
      if (!game.id) {
        throw new Error('game.id not exist')
      }

      // １つ前のターンを取得
      const previousTurnCount = turnCount - 1
      const previousTurn = await turnRepository.findForGameIdAndTurnCount(
        conn,
        game.id,
        previousTurnCount
      )

      // 石を置く
      const newTurn = previousTurn.placeNext(toDisc(disc), new Point(x, y))

      // ターンを保存
      await turnRepository.save(conn, newTurn)

      await conn.commit()
    } finally {
      await conn.end()
    }
  }
}
