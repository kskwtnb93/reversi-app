import mysql from 'mysql2/promise'
import { Turn } from './turn'
import { TurnGateway } from '../dataaccess/turnGateway'
import { SquareGateway } from '../dataaccess/squareGateway'
import { MoveGateway } from '../dataaccess/moveGateway'
import { Move } from './move'
import { toDisc } from './disc'
import { Point } from './point'
import { Board } from './board'
import { Connection } from '../../node_modules/mysql2/index.d'

const turnGateway = new TurnGateway()
const squareGateway = new SquareGateway()
const moveGateway = new MoveGateway()

export class TurnRepository {
  // ターンを取得
  async findForGameIdAndTurnCount(
    conn: mysql.Connection,
    gameId: number,
    turnCount: number
  ): Promise<Turn> {
    // ターンを取得
    const turnRecord = await turnGateway.findForGameIdAndTurnCount(
      conn,
      gameId,
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

    // 指定したターンのムーヴを取得
    const moveRecord = await moveGateway.findForTurnId(conn, turnRecord.id)
    let move: Move | undefined
    if (moveRecord) {
      move = new Move(
        toDisc(moveRecord.disc),
        new Point(moveRecord.x, moveRecord.y)
      )
    }

    return new Turn(
      gameId,
      turnCount,
      toDisc(turnRecord.nextDisc),
      move,
      new Board(board),
      turnRecord.endAt
    )
  }

  // ターンを保存
  async save(conn: mysql.Connection, turn: Turn) {
    const turnRecord = await turnGateway.insert(
      conn,
      turn.gameId,
      turn.turnCount,
      turn.nextDisc,
      turn.endAt
    )

    // 盤面の状態を保存
    await squareGateway.insertAll(conn, turnRecord.id, turn.board.discs)

    if (turn.move) {
      // 打った手を保存
      await moveGateway.insert(
        conn,
        turnRecord.id,
        turn.move.disc,
        turn.move.point.x,
        turn.move.point.y
      )
    }
  }
}
