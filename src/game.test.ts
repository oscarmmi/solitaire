import { describe, expect, it } from 'vitest'
import { canBuildFoundation, canStackTableau, createGame, drawFromStock, type Card, type GameState } from './game'

function card(suit: Card['suit'], rank: number, faceUp = true): Card {
  return {
    id: `${suit}-${rank}`,
    suit,
    rank,
    color: suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black',
    faceUp,
  }
}

describe('Klondike rules', () => {
  it('allows a red six on a black seven', () => {
    expect(canStackTableau(card('hearts', 6), card('clubs', 7))).toBe(true)
  })

  it('rejects a same-color tableau stack', () => {
    expect(canStackTableau(card('hearts', 6), card('diamonds', 7))).toBe(false)
  })

  it('allows an ace to start a foundation', () => {
    expect(canBuildFoundation(card('spades', 1), [])).toBe(true)
    expect(canBuildFoundation(card('spades', 2), [])).toBe(false)
  })

  it('draws one card from stock onto the waste', () => {
    const drawn = card('clubs', 4, false)
    const state: GameState = {
      stock: [drawn], waste: [], foundations: [[], [], [], []], tableau: [[], [], [], [], [], [], []], moves: 0, won: false,
    }
    const next = drawFromStock(state)
    expect(next.stock).toHaveLength(0)
    expect(next.waste).toEqual([{ ...drawn, faceUp: true }])
    expect(next.moves).toBe(1)
    expect(state.stock).toHaveLength(1)
  })

  it('deals a complete game into seven columns and a 24-card stock', () => {
    const state = createGame(() => 0.5)
    expect(state.tableau.map((pile) => pile.length)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(state.stock).toHaveLength(24)
    expect(state.tableau.flat().filter((item) => item.faceUp)).toHaveLength(7)
    expect(new Set([...state.stock, ...state.tableau.flat()].map((item) => item.id)).size).toBe(52)
  })
})
