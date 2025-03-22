import {
  FindLatestGameQueryService,
  FindLastGamesQueryModel,
} from '../query/findLastGamesQueryService'
import { connectMySQL } from '../../infrastructure/connection'

const FIND_COUNT = 10

export class FindLastGamesUseCase {
  constructor(private _queryService: FindLatestGameQueryService) {}

  async run(): Promise<FindLastGamesQueryModel[]> {
    const conn = await connectMySQL()
    try {
      return await this._queryService.query(conn, FIND_COUNT)
    } finally {
      conn.end()
    }
  }
}
