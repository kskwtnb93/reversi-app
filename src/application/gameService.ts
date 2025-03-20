import { GameGateway } from '../dataaccess/gameGateway'
import { connectMySQL } from '../dataaccess/connection'
import { TurnRepository } from '../domain/turnRepository'
import { firstTurn } from '../domain/turn'

const gameGateway = new GameGateway()

const turnRepository = new TurnRepository()

export class GameService {
  async startNewGame() {
    const now = new Date()
    const conn = await connectMySQL()

    try {
      await conn.beginTransaction()

      // 対戦を保存
      const gameRecord = await gameGateway.insert(conn, now)

      // ターン／盤面の初期状態を保存
      const turn = firstTurn(gameRecord.id, now)
      await turnRepository.save(conn, turn)

      await conn.commit()
    } finally {
      await conn.end()
    }
  }
}
