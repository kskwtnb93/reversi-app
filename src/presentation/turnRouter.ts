import express from 'express'
import { GameGateway } from '../dataaccess/gameGateway'
import { TurnGateway } from '../dataaccess/turnGateway'
import { MoveGateway } from '../dataaccess/moveGateway'
import { SquareGateway } from '../dataaccess/squareGateway'
import { connectMySQL } from '../dataaccess/connection'
import { DARK, LIGHT } from '../application/constants'

export const turnRouter = express.Router()

const gameGateway = new GameGateway()
const turnGateway = new TurnGateway()
const moveGateway = new MoveGateway()
const squareGateway = new SquareGateway()

// 盤面を取得するAPI
turnRouter.get('/api/games/latest/turns/:turnCount', async (req, res) => {
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
turnRouter.post('/api/games/latest/turns', async (req, res) => {
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
