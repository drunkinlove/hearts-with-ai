import { shuffle, sample_indices, remove_by_idxs } from "./helpers.js";

export const SUITS = ["♠", "♣", "♦", "♥"];
export const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "X",
  "J",
  "Q",
  "K",
  "A",
];

export class Table {
  constructor(player_ids) {
    this.deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.deck.push(`${suit}${rank}`);
      }
    }

    this.card_values = new Map();
    this.deck
      .filter((card) => card[0] === "♥")
      .forEach((card) => this.card_values.set(card, 1));
    this.deck
      .filter((card) => card[0] !== "♥")
      .forEach((card) => this.card_values.set(card, 0));
    this.card_values.set("♠Q", 13);

    this.hands = new Map();
    player_ids.forEach((player_id) => this.hands.set(player_id, []));

    this.cards_taken = new Map();
    player_ids.forEach((player_id) => this.cards_taken.set(player_id, []));
  }

  deal_cards(n, player_id) {
    const idxs = sample_indices(this.deck.length, n);
    for (const idx of idxs) {
      var card = this.deck[idx];
      this.hands.get(player_id).push(card);
    }
    this.deck = remove_by_idxs(this.deck, idxs);
  }

  update_hands(updates) {
    for (const [player_id, update] of updates.entries()) {
      this.hands.set(
        player_id,
        this.hands.get(player_id).concat(update.get("added"))
      );

      for (const card of update.get("removed")) {
        var idx = this.hands.get(player_id).indexOf(card);
        this.hands.get(player_id).splice(idx, 1);
      }
    }
  }
}

// const table = new Table(["Mary", "John"]);
// table.deal_cards(10, "Mary");
// table.deal_cards(10, "John");

// const updates = new Map([
//   [
//     "Mary",
//     new Map([
//       ["added", ["♥9", "♦6", "♥6"]],
//       ["removed", table.hands.get("Mary")],
//     ]),
//   ],
// ]);

// table.update_hands(updates);

// console.log(table.hands);
