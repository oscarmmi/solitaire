<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import CardFace from './components/CardFace.vue'
import {
  autoFoundationMove,
  canMoveToFoundation,
  canMoveToTableau,
  createGame,
  drawFromStock,
  moveCard,
  type Card,
  type Destination,
  type GameState,
  type Source,
  type SourceZone,
  type Zone,
} from './game'

type Pile = { zone: Zone; index: number }

const game = ref<GameState>(createGame())
const selected = ref<Source | null>(null)
const cursor = ref<Pile>({ zone: 'stock', index: 0 })
const seconds = ref(0)
const sessionKey = ref(0)
const winCount = ref(Number(localStorage.getItem('night-tableau-wins') || 0))
const elapsedLabel = computed(() => `${String(Math.floor(seconds.value / 60)).padStart(2, '0')}:${String(seconds.value % 60).padStart(2, '0')}`)
const isWon = computed(() => game.value.won)

const suits = [
  { key: 'clubs', symbol: '♣', label: 'Clubs' },
  { key: 'diamonds', symbol: '♦', label: 'Diamonds' },
  { key: 'hearts', symbol: '♥', label: 'Hearts' },
  { key: 'spades', symbol: '♠', label: 'Spades' },
] as const

function rankLabel(rank: number) {
  return rank === 1 ? 'A' : rank === 11 ? 'J' : rank === 12 ? 'Q' : rank === 13 ? 'K' : String(rank)
}

function cardName(card: Card) {
  return `${rankLabel(card.rank)} of ${suits.find((suit) => suit.key === card.suit)?.label}`
}

function sourceFor(zone: SourceZone, index: number, cardIndex?: number): Source {
  return { zone, index, ...(cardIndex === undefined ? {} : { cardIndex }) }
}

function selectedCanMoveTo(zone: 'tableau' | 'foundation', index: number) {
  if (!selected.value) return false
  return zone === 'tableau'
    ? canMoveToTableau(game.value, selected.value, index)
    : canMoveToFoundation(game.value, selected.value, index)
}

function applyMove(destination: Destination) {
  if (!selected.value) return false
  const next = moveCard(game.value, selected.value, destination)
  if (!next) return false
  game.value = next
  selected.value = null
  return true
}

function activateFoundation(index: number) {
  cursor.value = { zone: 'foundation', index }
  if (selected.value && applyMove({ zone: 'foundation', index })) return
  if (!selected.value && game.value.foundations[index].length) {
    selected.value = sourceFor('foundations', index)
    return
  }
  if (selected.value && !selectedCanMoveTo('foundation', index)) selected.value = null
}

function activateTableau(index: number, cardIndex?: number) {
  cursor.value = { zone: 'tableau', index }
  if (selected.value && applyMove({ zone: 'tableau', index })) return

  const column = game.value.tableau[index]
  const targetIndex = cardIndex ?? column.length - 1
  const target = column[targetIndex]
  if (target?.faceUp) {
    selected.value = sourceFor('tableau', index, targetIndex)
  } else if (selected.value && column.length === 0) {
    selected.value = null
  } else if (selected.value && !selectedCanMoveTo('tableau', index)) {
    selected.value = null
  }
}

function activateWaste() {
  cursor.value = { zone: 'waste', index: 0 }
  if (game.value.waste.length) selected.value = sourceFor('waste', 0)
}

function draw() {
  game.value = drawFromStock(game.value)
  selected.value = null
  cursor.value = { zone: 'stock', index: 0 }
}

function autoFoundation(source: Source) {
  const next = autoFoundationMove(game.value, source)
  if (next) {
    game.value = next
    selected.value = null
  }
}

function restart() {
  game.value = createGame()
  selected.value = null
  seconds.value = 0
  cursor.value = { zone: 'stock', index: 0 }
  sessionKey.value += 1
}

function sourceIsSelected(zone: SourceZone, index: number, cardIndex?: number) {
  return selected.value?.zone === zone && selected.value.index === index
    && (zone !== 'tableau' || selected.value.cardIndex === cardIndex)
}

function pileIsCursor(zone: Zone, index: number) {
  return cursor.value.zone === zone && cursor.value.index === index
}

function currentTopSource(): Source | null {
  const { zone, index } = cursor.value
  if (zone === 'tableau') {
    const column = game.value.tableau[index]
    return column?.length && column[column.length - 1].faceUp ? sourceFor('tableau', index, column.length - 1) : null
  }
  if (zone === 'waste') return game.value.waste.length ? sourceFor('waste', 0) : null
  if (zone === 'foundation') return game.value.foundations[index].length ? sourceFor('foundations', index) : null
  return null
}

function keyboardActivate() {
  const { zone, index } = cursor.value
  if (zone === 'stock') {
    draw()
    return
  }
  if (selected.value) {
    if (zone === 'tableau' || zone === 'foundation') {
      if (applyMove({ zone, index })) return
    }
    const source = selected.value
    autoFoundation(source)
    return
  }
  const source = currentTopSource()
  if (source) selected.value = source
}

function onKeydown(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLInputElement) return
  const piles: Pile[] = [
    { zone: 'stock', index: 0 }, { zone: 'waste', index: 0 },
    ...game.value.foundations.map((_, index) => ({ zone: 'foundation' as const, index })),
    ...game.value.tableau.map((_, index) => ({ zone: 'tableau' as const, index })),
  ]
  const current = piles.findIndex((pile) => pile.zone === cursor.value.zone && pile.index === cursor.value.index)
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault()
    cursor.value = piles[(current + 1) % piles.length]
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault()
    cursor.value = piles[(current - 1 + piles.length) % piles.length]
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    keyboardActivate()
  } else if (event.key.toLowerCase() === 's') {
    event.preventDefault()
    draw()
  } else if (event.key.toLowerCase() === 'r') {
    event.preventDefault()
    restart()
  } else if (event.key === 'Escape') {
    selected.value = null
  }
}

watch(isWon, (won) => {
  if (won) {
    winCount.value += 1
    localStorage.setItem('night-tableau-wins', String(winCount.value))
  }
})

let timer: number | undefined
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  timer = window.setInterval(() => {
    if (!game.value.won) seconds.value += 1
  }, 1000)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <main class="app-shell" :key="sessionKey">
    <div class="ambient ambient-one" aria-hidden="true"></div>
    <div class="ambient ambient-two" aria-hidden="true"></div>

    <header class="masthead">
      <a class="wordmark" href="#top" aria-label="Night Tableau home">
        <span class="wordmark-mark" aria-hidden="true">✦</span>
        <span>STILLROOM <span class="wordmark-divider">/</span> CARD CLUB</span>
      </a>
      <div class="header-note"><span class="live-dot"></span> A little room to think</div>
    </header>

    <section id="top" class="game-intro" aria-labelledby="game-title">
      <div class="intro-copy">
        <div class="eyebrow"><span>01</span><i></i> THE EVENING EDITION</div>
        <h1 id="game-title">Night <em>Tableau</em></h1>
        <p>A classic game of patience, played at your own pace.</p>
      </div>
      <button class="new-game-button" type="button" @click="restart">
        <span class="new-game-icon" aria-hidden="true">↻</span>
        <span>New game</span>
      </button>
    </section>

    <section class="game-panel" aria-label="Klondike solitaire game">
      <div class="table-meta">
        <div class="table-meta-left">
          <span class="mode-pill"><span class="mode-dot"></span> KLONDIKE <b>·</b> DRAW 1</span>
          <span class="table-separator"></span>
          <span class="table-subtitle">Take your time.</span>
        </div>
        <div class="table-meta-right">
          <div class="stat"><span>TIME</span><strong>{{ elapsedLabel }}</strong></div>
          <span class="stat-divider"></span>
          <div class="stat"><span>MOVES</span><strong>{{ game.moves }}</strong></div>
        </div>
      </div>

      <div class="felt" :class="{ 'game-won': isWon }">
        <div class="top-row">
          <div class="draw-area">
            <div class="pile-wrap">
              <button
                class="card-slot stock-slot"
                :class="[{ 'keyboard-cursor': pileIsCursor('stock', 0) }, { 'slot-glow': selected && game.stock.length === 0 && game.waste.length > 0 }]"
                type="button"
                :aria-label="game.stock.length ? `Draw from stock, ${game.stock.length} cards remaining` : game.waste.length ? 'Recycle waste into stock' : 'Stock empty'"
                @click="draw"
              >
                <span v-if="game.stock.length" class="card-back" aria-hidden="true"><span class="back-ornament">✦</span></span>
                <span v-else class="empty-stock" aria-hidden="true">↻</span>
              </button>
              <span class="pile-caption">STOCK <b>{{ game.stock.length }}</b></span>
            </div>
            <div class="pile-wrap">
              <div class="waste-slot">
                <button
                  v-if="game.waste.length"
                  class="playing-card waste-card"
                  :class="[{ 'is-selected': sourceIsSelected('waste', 0) }, { 'keyboard-cursor': pileIsCursor('waste', 0) }, { 'legal-target': selectedCanMoveTo('tableau', 0) || selectedCanMoveTo('foundation', 0) }]"
                  :data-color="game.waste[game.waste.length - 1].color"
                  type="button"
                  :aria-label="`Waste pile, ${cardName(game.waste[game.waste.length - 1])}`"
                  @click="activateWaste"
                  @dblclick.stop="autoFoundation(sourceFor('waste', 0))"
                >
                  <CardFace :card="game.waste[game.waste.length - 1]" />
                </button>
                <span v-else class="empty-slot" aria-hidden="true"></span>
              </div>
              <span class="pile-caption">WASTE</span>
            </div>
          </div>

          <div class="foundations" aria-label="Foundations">
            <div v-for="(suit, index) in suits" :key="suit.key" class="pile-wrap">
              <button
                class="card-slot foundation-slot"
                :class="[
                  { 'keyboard-cursor': pileIsCursor('foundation', index) },
                  { 'legal-target': selectedCanMoveTo('foundation', index) },
                  { 'is-selected': sourceIsSelected('foundations', index) },
                ]"
                type="button"
                :aria-label="game.foundations[index].length ? `${suit.label} foundation, ${rankLabel(game.foundations[index][game.foundations[index].length - 1].rank)}` : `Empty ${suit.label} foundation`"
                @click="activateFoundation(index)"
                @dblclick.stop="game.foundations[index].length && autoFoundation(sourceFor('foundations', index))"
              >
                <span v-if="game.foundations[index].length" class="playing-card foundation-card" :data-color="game.foundations[index][game.foundations[index].length - 1].color">
                  <CardFace :card="game.foundations[index][game.foundations[index].length - 1]" />
                </span>
                <span v-else class="foundation-mark" :data-suit="suit.key">{{ suit.symbol }}</span>
              </button>
              <span class="pile-caption">{{ suit.label.toUpperCase() }}</span>
            </div>
          </div>
        </div>

        <div class="tableau" aria-label="Tableau columns">
          <div v-for="(column, columnIndex) in game.tableau" :key="columnIndex" class="tableau-column">
            <div
              class="tableau-pile"
              :class="[
                { 'keyboard-cursor': pileIsCursor('tableau', columnIndex) },
                { 'legal-target': selectedCanMoveTo('tableau', columnIndex) },
              ]"
              :style="{ minHeight: `${112 + Math.max(0, column.length - 1) * 23}px` }"
              :aria-label="`Tableau column ${columnIndex + 1}, ${column.length} cards`"
              @click="!column.length && activateTableau(columnIndex)"
            >
              <button
                v-for="(card, cardIndex) in column"
                :key="card.id"
                class="playing-card tableau-card"
                :class="[
                  { 'is-selected': sourceIsSelected('tableau', columnIndex, cardIndex) || (selected?.zone === 'tableau' && selected.index === columnIndex && selected.cardIndex !== undefined && cardIndex >= selected.cardIndex) },
                  { 'keyboard-cursor': pileIsCursor('tableau', columnIndex) && cardIndex === column.length - 1 },
                  { 'legal-target': selectedCanMoveTo('tableau', columnIndex) && cardIndex === column.length - 1 },
                ]"
                :style="{ top: `${cardIndex * 23}px`, zIndex: cardIndex + 1 }"
                :data-color="card.color"
                type="button"
                :aria-label="card.faceUp ? cardName(card) : 'Face-down card'"
                :disabled="!card.faceUp"
                @click.stop="card.faceUp && activateTableau(columnIndex, cardIndex)"
                @dblclick.stop="card.faceUp && autoFoundation(sourceFor('tableau', columnIndex, cardIndex))"
              >
                <span v-if="card.faceUp"><CardFace :card="card" /></span>
                <span v-else class="card-back card-back-small"><span class="back-ornament">✦</span></span>
              </button>
              <button
                v-if="!column.length"
                class="empty-tableau"
                type="button"
                :aria-label="`Empty tableau column ${columnIndex + 1}`"
                @click.stop="activateTableau(columnIndex)"
              ><span>Ｋ</span></button>
            </div>
            <span class="column-index">0{{ columnIndex + 1 }}</span>
          </div>
        </div>

        <Transition name="win">
          <div v-if="isWon" class="win-banner" role="status">
            <span class="win-sparkle">✦</span>
            <div><strong>A lovely finish.</strong><span>One for the books — deal again?</span></div>
            <button type="button" aria-label="Start a new game" @click="restart">↻</button>
          </div>
        </Transition>
      </div>

      <footer class="table-footer">
        <div class="footer-note"><span class="footer-star">✳</span> {{ winCount ? `${winCount} ${winCount === 1 ? 'quiet victory' : 'quiet victories'}` : 'A fresh deal, a fresh chance' }}</div>
        <div class="keyboard-hint"><kbd>←</kbd><kbd>→</kbd> navigate <span class="hint-dot">·</span> <kbd>↵</kbd> move <span class="hint-dot">·</span> <kbd>S</kbd> draw <span class="hint-dot">·</span> <kbd>R</kbd> restart</div>
      </footer>
    </section>

    <section class="closing-note" aria-label="How to play">
      <div><span class="closing-icon">♧</span><p>Build down in alternating colors. Build each suit from ace to king.<br><strong>Every card has somewhere to go.</strong></p></div>
      <span class="closing-edition">NO. 04 <i>—</i> THE PATIENCE SERIES</span>
    </section>
    <p class="page-credit">Made for the moments between things <span>✦</span></p>
  </main>
</template>
