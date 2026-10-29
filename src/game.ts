export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades'
export type Color = 'red' | 'black'
export type Zone = 'stock' | 'waste' | 'foundation' | 'tableau'
export type SourceZone = 'waste' | 'foundations' | 'tableau'

export interface Card {
  id: string
  suit: Suit
  rank: number
  color: Color
  faceUp: boolean
}

export interface GameState {
  stock: Card[]
  waste: Card[]
  foundations: Card[][]
  tableau: Card[][]
  moves: number
  won: boolean
}

export interface Source {
  zone: SourceZone
  index: number
  cardIndex?: number
}

export interface Destination {
  zone: 'tableau' | 'foundation'
  index: number
}

const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => Array.from({ length: 13 }, (_, index) => ({
    id: `${suit}-${index + 1}`,
    suit,
    rank: index + 1,
    color: suit === 'diamonds' || suit === 'hearts' ? 'red' as const : 'black' as const,
    faceUp: false,
  })))
}

export function createGame(random: () => number = Math.random): GameState {
  const deck = createDeck()
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]]
  }

  const tableau: Card[][] = []
  for (let column = 0; column < 7; column += 1) {
    const cards = deck.splice(0, column + 1)
    cards.forEach((card, index) => { card.faceUp = index === cards.length - 1 })
    tableau.push(cards)
  }

  return { stock: deck, waste: [], foundations: [[], [], [], []], tableau, moves: 0, won: false }
}

export function canStackTableau(card: Card, destinationTop?: Card): boolean {
  if (!card.faceUp) return false
  if (!destinationTop) return card.rank === 13
  return destinationTop.faceUp && destinationTop.color !== card.color && destinationTop.rank === card.rank + 1
}

export function canBuildFoundation(card: Card, foundation: Card[]): boolean {
  if (!card.faceUp) return false
  const top = foundation[foundation.length - 1]
  return top ? top.suit === card.suit && card.rank === top.rank + 1 : card.rank === 1
}

function getSourcePile(state: GameState, source: Source): Card[] | undefined {
  if (source.zone === 'waste') return source.index === 0 ? state.waste : undefined
  if (source.zone === 'foundations') return state.foundations[source.index]
  return state.tableau[source.index]
}

function getSourceCards(state: GameState, source: Source): Card[] | undefined {
  const pile = getSourcePile(state, source)
  if (!pile?.length) return undefined
  if (source.zone !== 'tableau') return [pile[pile.length - 1]]
  const start = source.cardIndex ?? pile.length - 1
  if (start < 0 || start >= pile.length) return undefined
  const cards = pile.slice(start)
  if (cards.some((card) => !card.faceUp)) return undefined
  if (cards.some((card, index) => index > 0 && !canStackTableau(card, cards[index - 1]))) return undefined
  return cards
}

export function canMoveToTableau(state: GameState, source: Source, destinationIndex: number): boolean {
  if (source.zone === 'tableau' && source.index === destinationIndex) return false
  const cards = getSourceCards(state, source)
  const destination = state.tableau[destinationIndex]
  if (!cards?.length || !destination) return false
  return canStackTableau(cards[0], destination[destination.length - 1])
}

export function canMoveToFoundation(state: GameState, source: Source, destinationIndex: number): boolean {
  const cards = getSourceCards(state, source)
  const destination = state.foundations[destinationIndex]
  if (!cards || cards.length !== 1 || !destination) return false
  if (source.zone === 'tableau' && source.cardIndex !== undefined && source.cardIndex !== state.tableau[source.index].length - 1) return false
  return canBuildFoundation(cards[0], destination)
}

export function drawFromStock(state: GameState): GameState {
  if (state.won) return state
  if (state.stock.length) {
    const stock = state.stock.slice()
    const card = stock.pop()!
    return {
      ...state,
      stock,
      waste: [...state.waste, { ...card, faceUp: true }],
      moves: state.moves + 1,
    }
  }
  if (!state.waste.length) return state
  return {
    ...state,
    stock: state.waste.map((card) => ({ ...card, faceUp: false })),
    waste: [],
    moves: state.moves + 1,
  }
}

export function moveCard(state: GameState, source: Source, destination: Destination): GameState | null {
  const allowed = destination.zone === 'tableau'
    ? canMoveToTableau(state, source, destination.index)
    : canMoveToFoundation(state, source, destination.index)
  if (!allowed || state.won) return null

  const next: GameState = {
    ...state,
    stock: state.stock.slice(),
    waste: state.waste.slice(),
    foundations: state.foundations.map((pile) => pile.map((card) => ({ ...card }))),
    tableau: state.tableau.map((pile) => pile.map((card) => ({ ...card }))),
    moves: state.moves + 1,
  }
  const sourcePile = source.zone === 'waste'
    ? next.waste
    : source.zone === 'foundations'
      ? next.foundations[source.index]
      : next.tableau[source.index]
  const start = source.zone === 'tableau' ? source.cardIndex ?? sourcePile.length - 1 : sourcePile.length - 1
  const moving = sourcePile.splice(start)
  moving.forEach((card) => { card.faceUp = true })

  if (destination.zone === 'tableau') next.tableau[destination.index].push(...moving)
  else next.foundations[destination.index].push(...moving)

  if (source.zone === 'tableau') {
    const newlyExposed = next.tableau[source.index][next.tableau[source.index].length - 1]
    if (newlyExposed) newlyExposed.faceUp = true
  }
  next.won = next.foundations.every((pile) => pile.length === 13)
  return next
}

export function autoFoundationMove(state: GameState, source: Source): GameState | null {
  const destinationIndex = state.foundations.findIndex((_, index) => canMoveToFoundation(state, source, index))
  return destinationIndex < 0 ? null : moveCard(state, source, { zone: 'foundation', index: destinationIndex })
}
