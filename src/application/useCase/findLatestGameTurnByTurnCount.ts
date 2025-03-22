import { connectMySQL } from '../../infrastructure/connection'
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

export class FindLatestGameTurnByTurnCount {
  constructor(
    private _gameRepository: GameRepository,
    private _turnRepository: TurnRepository,
    private _gameResultRepository: GameResultRepository
  ) {}

  async run(turnCount: number): Promise<FindLatestGameTurnByTurnCountOutput> {
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
}
