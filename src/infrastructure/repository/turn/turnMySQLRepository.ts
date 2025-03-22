import mysql from 'mysql2/promise'
import { Turn } from '../../../domain/model/turn/turn'
import { DomainError } from '../../../domain/error/domainError'
import { Move } from '../../../domain/model/turn/move'
import { toDisc } from '../../../domain/model/turn/disc'
import { Point } from '../../../domain/model/turn/point'
import { Board } from '../../../domain/model/turn/board'
import { TurnRepository } from '../../../domain/model/turn/turnRepository'
import { TurnGateway } from './turnGateway'
import { SquareGateway } from './squareGateway'
import { MoveGateway } from './moveGateway'

const turnGateway = new TurnGateway()
const squareGateway = new SquareGateway()
const moveGateway = new MoveGateway()

export class TurnMySQLRepository implements TurnRepository {
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
      throw new DomainError('SpecifiedTurnNotFound', 'Specified turn not found')
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

    const nextDisc =
      turnRecord.nextDisc === null ? undefined : toDisc(turnRecord.nextDisc)

    return new Turn(
      gameId,
      turnCount,
      nextDisc,
      move,
      new Board(board),
      turnRecord.endAt
    )
  }

  // ターンを保存
  async save(conn: mysql.Connection, turn: Turn) {
    // ターンを保存
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
