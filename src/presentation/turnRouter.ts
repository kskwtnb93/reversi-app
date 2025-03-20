import express from 'express'
import { TurnService } from '../application/service/turnServece'

export const turnRouter = express.Router()

const turnService = new TurnService()

interface TurnGetResponseBody {
  turnCount: number
  board: number[][]
  nextDisc: number | null
  winnerDisc: number | null
}

// 盤面を取得するAPI
turnRouter.get(
  '/api/games/latest/turns/:turnCount',
  async (req, res: express.Response<TurnGetResponseBody>) => {
    const turnCount = parseInt(req.params.turnCount)

    const output = await turnService.findLatestGameTurnByCount(turnCount)
    const responseBody = {
      turnCount: output.turnCount,
      board: output.board,
      nextDisc: output.nextDisc ?? null,
      winnerDisc: output.winnerDisc ?? null,
    }

    res.json(responseBody)
  }
)

interface TurnPostRequestBody {
  turnCount: number
  move: {
    disc: number
    x: number
    y: number
  }
}

// 石を打った情報からターンを登録する処理
turnRouter.post(
  '/api/games/latest/turns',
  async (req: express.Request<{}, {}, TurnPostRequestBody>, res) => {
    const turnCount = req.body.turnCount
    const disc = req.body.move.disc
    const x = req.body.move.x
    const y = req.body.move.y

    await turnService.registerTurn(turnCount, disc, x, y)

    res.status(201).end()
  }
)
