import { GameGateway } from '../dataaccess/gameGateway'
import { connectMySQL } from '../dataaccess/connection'
import { toDisc } from '../domain/turn/disc'
import { Point } from '../domain/turn/point'
import { TurnRepository } from '../domain/turn/turnRepository'

const gameGateway = new GameGateway()

const turnRepository = new TurnRepository()

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
      const gameRecord = await gameGateway.findLatest(conn)
      if (!gameRecord) {
        throw new Error('Latest game not found.')
      }

      // ターンを取得
      const turn = await turnRepository.findForGameIdAndTurnCount(
        conn,
        gameRecord.id,
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
      const gameRecord = await gameGateway.findLatest(conn)
      if (!gameRecord) {
        throw new Error('Latest game not found.')
      }

      // １つ前のターンを取得
      const previousTurnCount = turnCount - 1
      const previousTurn = await turnRepository.findForGameIdAndTurnCount(
        conn,
        gameRecord.id,
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
