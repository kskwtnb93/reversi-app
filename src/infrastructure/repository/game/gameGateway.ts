import mysql from 'mysql2/promise'
import { GameRecord } from './gameRecord'

export class GameGateway {
  async findLatest(conn: mysql.Connection): Promise<GameRecord | undefined> {
    // 対戦を取得
    const gameSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      'select id, started_at from games order by id desc limit 1'
    )
    const record = gameSelectResult[0][0]

    if (!record) return undefined

    return new GameRecord(record['id'], record['started_at'])
  }

  async insert(conn: mysql.Connection, startedAt: Date): Promise<GameRecord> {
    // 対戦を保存
    const gameInsertResult = await conn.execute<mysql.ResultSetHeader>(
      'insert into games (started_at) values (?)',
      [startedAt]
    )
    const gameId = gameInsertResult[0].insertId

    return new GameRecord(gameId, startedAt)
  }
}
