import express from 'express'
import morgan from 'morgan'
import 'express-async-errors'
import mysql from 'mysql2/promise'
import { GameGateway } from './dataaccess/gameGateway'
import { TurnGateway } from './dataaccess/turnGateway'
import { MoveGateway } from './dataaccess/moveGateway'
import { SquareGateway } from './dataaccess/squareGateway'

const EMPTY = 0
const DARK = 1
const LIGHT = 2
const INITIAL_BOARD = [
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, DARK, LIGHT, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, LIGHT, DARK, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
]
const PORT = 3000

const app = express()

app.use(morgan('dev'))
app.use(express.static('static', { extensions: ['html'] }))
app.use(express.json())

const gameGateway = new GameGateway()
const turnGateway = new TurnGateway()
const moveGateway = new MoveGateway()
const squareGateway = new SquareGateway()

app.get('/api/hello', async (req, res) => {
  res.json({
    message: 'Hello Express',
  })
})

app.get('/api/error', async (req, res) => {
  throw new Error('Error endpoint')
})

// 対戦を開始するAPI
app.post('/api/games', async (req, res) => {
  const now = new Date()
  const conn = await connectMySQL()

  try {
    await conn.beginTransaction()

    // 対戦を保存
    const gameRecord = await gameGateway.insert(conn, now)

    // ターンを保存
    const turnRecord = await turnGateway.insert(
      conn,
      gameRecord.id,
      0,
      DARK,
      now
    )

    // 盤面の状態を保存
    await squareGateway.insertAll(conn, turnRecord.id, INITIAL_BOARD)

    await conn.commit()
  } finally {
    await conn.end()
  }

  res.status(201).end()
})

// 盤面を取得するAPI
app.get('/api/games/latest/turns/:turnCount', async (req, res) => {
  const turnCount = parseInt(req.params.turnCount)
  const conn = await connectMySQL()
  try {
    // 対戦を取得
    const gameRecord = await gameGateway.findLatest(conn)
    if (!gameRecord) {
      throw new Error('Latest game not found.')
    }

    // ターンを取得
    const turnRecord = await turnGateway.findForGameIdAndTurnCount(
      conn,
      gameRecord.id,
      turnCount
    )
    if (!turnRecord) {
      throw new Error('Specified turn not found')
    }

    // 盤面を取得
    const squareRecords = await squareGateway.findForTurnId(conn, turnRecord.id)
    // 8*8の二次元配列を生成
    const board = Array.from(Array(8)).map(() => Array.from(Array(8)))
    // squareRecordsから、盤面の状態を復元
    squareRecords.forEach((s) => {
      board[s.y][s.x] = s.disc
    })

    // レスポンス
    const responseBody = {
      turnCount,
      board,
      nextDisc: turnRecord.nextDisc,
      // TODO: 決着がついている場合、game_resultsテーブルから取得する
      winnerDisc: null,
    }
    res.json(responseBody)
  } finally {
    await conn.end()
  }
})

// 石を打った情報からターンを登録する処理
app.post('/api/games/latest/turns', async (req, res) => {
  const turnCount = parseInt(req.body.turnCount)
  const disc = parseInt(req.body.move.disc)
  const x = parseInt(req.body.move.x)
  const y = parseInt(req.body.move.y)
  console.log(`turnCount = ${turnCount}, disc = ${disc}, x = ${x}, y = ${y}`)

  const conn = await connectMySQL()
  try {
    // 対戦を取得
    const gameRecord = await gameGateway.findLatest(conn)
    if (!gameRecord) {
      throw new Error('Latest game not found.')
    }

    // １つ前のターンを取得
    const previousTurnCount = turnCount - 1
    const previousTurnRecord = await turnGateway.findForGameIdAndTurnCount(
      conn,
      gameRecord.id,
      previousTurnCount
    )
    if (!previousTurnRecord) {
      throw new Error('Specified turn not found')
    }

    // 盤面を取得
    const squareRecords = await squareGateway.findForTurnId(
      conn,
      previousTurnRecord.id
    )
    // 8*8の二次元配列を生成
    const board = Array.from(Array(8)).map(() => Array.from(Array(8)))
    // squareRecordsから、盤面の状態を復元
    squareRecords.forEach((s) => {
      board[s.y][s.x] = s.disc
    })

    // TODO: 盤面に置けるかチェック

    // 石を置く
    board[y][x] = disc

    // TODO: ひっくり返す

    // ターンを保存
    const nextDisc = disc === DARK ? LIGHT : DARK
    const now = new Date()
    const turnRecord = await turnGateway.insert(
      conn,
      gameRecord.id,
      turnCount,
      nextDisc,
      now
    )

    // 盤面の状態を保存
    await squareGateway.insertAll(conn, turnRecord.id, board)

    // 打った手を保存
    await moveGateway.insert(conn, turnRecord.id, disc, x, y)

    await conn.commit()
  } finally {
    await conn.end()
  }

  res.status(201).end()
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Reversi application started: http://localhost:${PORT}`)
})

function errorHandler(
  err: any,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) {
  console.log('Unexpected error occurred', err)
  res.status(500).send({
    message: 'Unexpected error occurred',
  })
}

async function connectMySQL() {
  return await mysql.createConnection({
    host: 'localhost',
    database: 'reversi',
    user: 'reversi',
    password: 'password',
  })
}
