import express from 'express'
import morgan from 'morgan'
import 'express-async-errors'
import mysql from 'mysql2/promise'

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
    const gameInsertResult = await conn.execute<mysql.ResultSetHeader>(
      'insert into games (started_at) values (?)',
      [now]
    )
    const gameId = gameInsertResult[0].insertId

    // ターンを保存
    const turnInsertResult = await conn.execute<mysql.ResultSetHeader>(
      'insert into turns (game_id, turn_count, next_disc, end_at) values (?, ?, ?, ?)',
      [gameId, 0, DARK, now]
    )
    const turnId = turnInsertResult[0].insertId

    // 盤面の状態を保存
    const squareCount = INITIAL_BOARD.map((line) => line.length).reduce(
      (v1, v2) => v1 + v2,
      0
    )
    const squareInsertSql =
      'insert into squares (turn_id, x, y, disc) values ' +
      Array.from(Array(squareCount))
        .map(() => '(?, ?, ?, ?)')
        .join(', ')
    const squaresInsertValues: any[] = []
    INITIAL_BOARD.forEach((line, y) => {
      line.forEach((disc, x) => {
        squaresInsertValues.push(turnId)
        squaresInsertValues.push(x)
        squaresInsertValues.push(y)
        squaresInsertValues.push(disc)
      })
    })
    await conn.execute(squareInsertSql, squaresInsertValues)

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
    const gameSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      'select id, started_at from games order by id desc limit 1'
    )
    const game = gameSelectResult[0][0]

    // ターンを取得
    const turnSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      'select id, game_id, turn_count, next_disc, end_at from turns where game_id = ? and turn_count = ?',
      [game['id'], turnCount]
    )
    const turn = turnSelectResult[0][0]

    // 盤面を取得
    const squaresSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      'select id, turn_id, x, y, disc from squares where turn_id = ?',
      [turn['id']]
    )
    const squares = squaresSelectResult[0]
    // 8*8の二次元配列を生成
    const board = Array.from(Array(8)).map(() => Array.from(Array(8)))
    // squaresから、盤面の状態を復元
    squares.forEach((s) => {
      board[s.y][s.x] = s.disc
    })

    // レスポンス
    const responseBody = {
      turnCount,
      board,
      nextDisc: turn['next_disc'],
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
    const gameSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      'select id, started_at from games order by id desc limit 1'
    )
    const game = gameSelectResult[0][0]

    // １つ前のターンを取得
    const previousTurnCount = turnCount - 1
    const turnSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      'select id, game_id, turn_count, next_disc, end_at from turns where game_id = ? and turn_count = ?',
      [game['id'], previousTurnCount]
    )
    const turn = turnSelectResult[0][0]

    // 盤面を取得
    const squaresSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      'select id, turn_id, x, y, disc from squares where turn_id = ?',
      [turn['id']]
    )
    const squares = squaresSelectResult[0]
    // 8*8の二次元配列を生成
    const board = Array.from(Array(8)).map(() => Array.from(Array(8)))
    // squaresから、盤面の状態を復元
    squares.forEach((s) => {
      board[s.y][s.x] = s.disc
    })

    // TODO: 盤面に置けるかチェック

    // 石を置く
    board[y][x] = disc

    // TODO: ひっくり返す

    // ターンを保存
    const nextDisc = disc === DARK ? LIGHT : DARK
    const now = new Date()
    const turnInsertResult = await conn.execute<mysql.ResultSetHeader>(
      'insert into turns (game_id, turn_count, next_disc, end_at) values (?, ?, ?, ?)',
      [game['id'], turnCount, nextDisc, now]
    )
    const turnId = turnInsertResult[0].insertId

    // 盤面の状態を保存
    const squareCount = board
      .map((line) => line.length)
      .reduce((v1, v2) => v1 + v2, 0)
    const squareInsertSql =
      'insert into squares (turn_id, x, y, disc) values ' +
      Array.from(Array(squareCount))
        .map(() => '(?, ?, ?, ?)')
        .join(', ')
    const squaresInsertValues: any[] = []
    board.forEach((line, y) => {
      line.forEach((disc, x) => {
        squaresInsertValues.push(turnId)
        squaresInsertValues.push(x)
        squaresInsertValues.push(y)
        squaresInsertValues.push(disc)
      })
    })
    await conn.execute(squareInsertSql, squaresInsertValues)

    // 打った手を保存
    await conn.execute(
      'insert into moves (turn_id, disc, x, y) values (?, ?, ?, ?)',
      [turnId, disc, x, y]
    )

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
