const EMPTY = 0
const DARK = 1
const LIGHT = 2

const WINNER_DRAW = 0
const WINNER_DARK = 1
const WINNER_LIGHT = 2

const boardElement = document.getElementById('board')
const nextDiscMessageElement = document.getElementById('next-disc-message')
const warningMessageElement = document.getElementById('warning-message')

async function showBoard(turnCount, previousDisc) {
  const response = await fetch(`/api/games/latest/turns/${turnCount}`)
  const responseBody = await response.json()
  const board = responseBody.board
  const nextDisc = responseBody.nextDisc
  const winnerDisc = responseBody.winnerDisc

  showWarningMessage(previousDisc, nextDisc, winnerDisc)
  showNextDiscMessage(nextDisc)

  // boardElement の子要素があれば削除
  while (boardElement.firstChild) {
    boardElement.removeChild(boardElement.firstChild)
  }

  board.forEach((line, y) => {
    line.forEach((square, x) => {
      // <div class="square">
      const squareElement = document.createElement('div')
      squareElement.className = 'square'

      if (square !== EMPTY) {
        // <div class="stone dark">
        const stoneElement = document.createElement('div')
        const color = square === DARK ? 'dark' : 'light'
        stoneElement.className = `stone ${color}`

        squareElement.appendChild(stoneElement)
      } else {
        squareElement.addEventListener('click', async () => {
          const nextTurnCount = turnCount + 1
          const registerTurnResponse = await registerTurn(
            nextTurnCount,
            nextDisc,
            x,
            y
          )
          if (registerTurnResponse.ok) {
            await showBoard(nextTurnCount, nextDisc)
          }
        })
      }

      boardElement.appendChild(squareElement)
    })
  })
}

async function registerGame() {
  await fetch('/api/games', {
    method: 'POST',
  })
}

function discToString(disc) {
  return disc === DARK ? '黒' : '白'
}

function warningMessage(previousDisc, nextDisc, winnerDisc) {
  if (nextDisc !== null) {
    if (previousDisc === nextDisc) {
      const skipped = nextDisc === DARK ? LIGHT : DARK
      return `${discToString(skipped)}の番はスキップです`
    } else {
      return null
    }
  } else {
    if (winnerDisc === WINNER_DRAW) {
      return '引き分けです'
    } else {
      return `${discToString(winnerDisc)}の勝ちです`
    }
  }
}

function showWarningMessage(previousDisc, nextDisc, winnerDisc) {
  const message = warningMessage(previousDisc, nextDisc, winnerDisc)

  warningMessageElement.innerText = message

  if (message === null) {
    warningMessageElement.style.display = 'none'
  } else {
    warningMessageElement.style.display = 'block'
  }
}

function showNextDiscMessage(nextDisc) {
  if (nextDisc) {
    const color = discToString(nextDisc)
    nextDiscMessageElement.innerText = `次は${color}の番です`
  } else {
    nextDiscMessageElement.innerText = ''
  }
}

async function registerTurn(turnCount, disc, x, y) {
  const requestBody = {
    turnCount,
    move: {
      disc,
      x,
      y,
    },
  }
  return await fetch('/api/games/latest/turns', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })
}

async function main() {
  await registerGame()
  await showBoard(0)
}

main()
