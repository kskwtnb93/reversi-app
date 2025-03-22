import { connectMySQL } from '../../infrastructure/connection'
import { Disc } from '../../domain/model/turn/disc'
import { Point } from '../../domain/model/turn/point'
import { ApplicationError } from '../error/applicationError'
import { GameResult } from '../../domain/model/gameReult/gameResult'
import { GameRepository } from '../../domain/model/game/gameRepository'
import { TurnRepository } from '../../domain/model/turn/turnRepository'
import { GameResultRepository } from '../../domain/model/gameReult/gameResultRepository'

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
  constructor(
    private _gameRepository: GameRepository,
    private _turnRepository: TurnRepository,
    private _gameResultRepository: GameResultRepository
  ) {}

  async findLatestGameTurnByCount(
    turnCount: number
  ): Promise<FindLatestGameTurnByTurnCountOutput> {
    const conn = await connectMySQL()
    try {
      // 対戦を取得
      const game = await this._gameRepository.findLatest(conn)
      if (!game) {
        throw new ApplicationError(
          'LatestGameNotFound',
          'Latest game not found.'
        )
      }
      if (!game.id) {
        throw new Error('game.id not exist')
      }

      // ターンを取得
      const turn = await this._turnRepository.findForGameIdAndTurnCount(
        conn,
        game.id,
        turnCount
      )

      let gameResult: GameResult | undefined
      if (turn.gameEnded()) {
        gameResult = await this._gameResultRepository.findForGameId(
          conn,
          game.id
        )
      }

      return new FindLatestGameTurnByTurnCountOutput(
        turn.turnCount,
        turn.board.discs,
        turn.nextDisc,
        gameResult?.winnerDisc
      )
    } finally {
      await conn.end()
    }
  }

  async registerTurn(turnCount: number, disc: Disc, point: Point) {
    const conn = await connectMySQL()

    try {
      // 対戦を取得
      const game = await this._gameRepository.findLatest(conn)
      if (!game) {
        throw new ApplicationError(
          'LatestGameNotFound',
          'Latest game not found.'
        )
      }
      if (!game.id) {
        throw new Error('game.id not exist')
      }

      // １つ前のターンを取得
      const previousTurnCount = turnCount - 1
      const previousTurn = await this._turnRepository.findForGameIdAndTurnCount(
        conn,
        game.id,
        previousTurnCount
      )

      // 石を置く
      const newTurn = previousTurn.placeNext(disc, point)

      // ターンを保存
      await this._turnRepository.save(conn, newTurn)

      // 勝敗が決した場合、対戦結果を保存
      if (newTurn.gameEnded()) {
        const winnerDisc = newTurn.winnerDisc()
        const gameResult = new GameResult(game.id, winnerDisc, newTurn.endAt)
        await this._gameResultRepository.save(conn, gameResult)
      }

      await conn.commit()
    } finally {
      await conn.end()
    }
  }
}
