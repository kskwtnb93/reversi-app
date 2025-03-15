import mysql from 'mysql2/promise'
import { SquareRecord } from './squareRecord'

export class SquareGateway {
  // 盤面を取得
  async findForTurnId(
    conn: mysql.Connection,
    turnId: number
  ): Promise<SquareRecord[]> {
    const squaresSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      'select id, turn_id, x, y, disc from squares where turn_id = ?',
      [turnId]
    )
    const records = squaresSelectResult[0]

    return records.map((record) => {
      return new SquareRecord(
        record['id'],
        record['turn_id'],
        record['x'],
        record['y'],
        record['disc']
      )
    })
  }

  // 盤面を保存
  async insertAll(conn: mysql.Connection, turnId: number, board: number[][]) {
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
  }
}
