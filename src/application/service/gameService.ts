import { connectMySQL } from '../../infrastructure/connection'
import { firstTurn } from '../../domain/model/turn/turn'
import { Game } from '../../domain/model/game/game'
import { GameMySQLRepository } from '../../infrastructure/repository/game/gameMySQLRepository'
import { TurnMySQLRepository } from '../../infrastructure/repository/turn/turnMySQLRepository'
import { GameRepository } from '../../domain/model/game/gameRepository'
import { TurnRepository } from '../../domain/model/turn/turnRepository'

export class GameService {
  constructor(
    private _gameRepository: GameRepository,
    private _turnRepository: TurnRepository
  ) {}

  async startNewGame() {
    const now = new Date()
    const conn = await connectMySQL()

    try {
      await conn.beginTransaction()

      // 対戦を保存
      const game = await this._gameRepository.save(
        conn,
        new Game(undefined, now)
      )
      if (!game.id) {
        throw new Error('game.id not exist')
      }

      // ターン／盤面の初期状態を保存
      const turn = firstTurn(game.id, now)
      await this._turnRepository.save(conn, turn)

      await conn.commit()
    } finally {
      await conn.end()
    }
  }
}
