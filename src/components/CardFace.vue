<script setup lang="ts">
import type { Card } from '../game'

defineProps<{ card: Card }>()

const symbols: Record<Card['suit'], string> = {
  clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠',
}

function rankLabel(rank: number) {
  return rank === 1 ? 'A' : rank === 11 ? 'J' : rank === 12 ? 'Q' : rank === 13 ? 'K' : String(rank)
}
</script>

<template>
  <span class="card-corner card-corner-top"><b>{{ rankLabel(card.rank) }}</b><i>{{ symbols[card.suit] }}</i></span>
  <span class="card-center" aria-hidden="true">
    <template v-if="card.rank >= 11">
      <span class="court-crown">✦</span>
      <b class="court-rank">{{ rankLabel(card.rank) }}</b>
      <span class="court-suit">{{ symbols[card.suit] }}</span>
    </template>
    <template v-else>
      <span class="center-suit">{{ symbols[card.suit] }}</span>
      <span class="center-rank">{{ rankLabel(card.rank) }}</span>
    </template>
  </span>
  <span class="card-corner card-corner-bottom"><b>{{ rankLabel(card.rank) }}</b><i>{{ symbols[card.suit] }}</i></span>
</template>
