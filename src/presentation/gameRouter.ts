import express from 'express'

import { GameMySQLRepository } from '../infrastructure/repository/game/gameMySQLRepository'
import { TurnMySQLRepository } from '../infrastructure/repository/turn/turnMySQLRepository'
import { StartNewGameUseCase } from '../application/useCase/StartNewGameUseCase'
import { FindLastGamesUseCase } from '../application/useCase/findLastGamesUseCase'
import { FindLastGamesMySQLQueryService } from '../infrastructure/query/findLastGamesMySQLQueryService'

export const gameRouter = express.Router()

const startNewGameUseCase = new StartNewGameUseCase(
  new GameMySQLRepository(),
  new TurnMySQLRepository()
)

const findLastGamesUseCase = new FindLastGamesUseCase(
  new FindLastGamesMySQLQueryService()
)

interface GetGamesResponseBody {
  games: {
    id: number
    darkMoveCount: number
    lightMoveCount: number
    winnerDisc: number
    startedAt: Date
    endAt: Date
  }[]
}

// 対戦履歴一覧リストを取得するAPI
gameRouter.get(
  '/api/games',
  async (req, res: express.Response<GetGamesResponseBody>) => {
    const output = await findLastGamesUseCase.run()
    const responseBodyGames = output.map((g) => {
      return {
        id: g.gameId,
        darkMoveCount: g.darkMoveCount,
        lightMoveCount: g.lightMoveCount,
        winnerDisc: g.winnerDisc,
        startedAt: g.startedAt,
        endAt: g.endAt,
      }
    })

    const responseBody = {
      games: responseBodyGames,
    }

    res.json(responseBody)
  }
)

// 対戦を開始するAPI
gameRouter.post('/api/games', async (req, res) => {
  await startNewGameUseCase.run()

  res.status(201).end()
})
