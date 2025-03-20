import express from 'express'
import morgan from 'morgan'
import 'express-async-errors'
import mysql from 'mysql2/promise'
import { gameRouter } from './presentation/gameRouter'
import { turnRouter } from './presentation/turnRouter'
import { DomainError } from './domain/error/domainError'

const PORT = 3000

const app = express()

app.use(morgan('dev'))
app.use(express.static('static', { extensions: ['html'] }))
app.use(express.json())

app.use(gameRouter)
app.use(turnRouter)

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
  if (err instanceof DomainError) {
    res.status(400).json({
      type: err.type,
      message: err.message,
    })
    return
  }

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
