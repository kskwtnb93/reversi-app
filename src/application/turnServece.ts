import express from 'express'
import { GameGateway } from '../dataaccess/gameGateway'
import { TurnGateway } from '../dataaccess/turnGateway'
import { MoveGateway } from '../dataaccess/moveGateway'
import { SquareGateway } from '../dataaccess/squareGateway'
import { connectMySQL } from '../dataaccess/connection'
import { DARK, LIGHT } from '../application/constants'

const gameGateway = new GameGateway()
const turnGateway = new TurnGateway()
const moveGateway = new MoveGateway()
const squareGateway = new SquareGateway()

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
      const turnRecord = await turnGateway.findForGameIdAndTurnCount(
        conn,
        gameRecord.id,
        turnCount
      )
      if (!turnRecord) {
        throw new Error('Specified turn not found')
      }

      // 盤面を取得
      const squareRecords = await squareGateway.findForTurnId(
        conn,
        turnRecord.id
      )
      // 8*8の二次元配列を生成
      const board = Array.from(Array(8)).map(() => Array.from(Array(8)))
      // squareRecordsから、盤面の状態を復元
      squareRecords.forEach((s) => {
        board[s.y][s.x] = s.disc
      })

      return new FindLatestGameTurnByTurnCountOutput(
        turnCount,
        board,
        turnRecord.nextDisc,
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
  }
}
