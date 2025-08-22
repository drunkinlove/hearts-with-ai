import { shuffle, sample_indices, remove_by_idxs } from "./helpers.js";

export class DumbPlayer {
  constructor() {}

  pass_three_cards(hand, recipient) {
    const idxs = sample_indices(hand.length, 3);
    hand.filter((card) => idxs);
    const cards_to_pass = idxs.map((idx) => hand[idx]);
    return cards_to_pass;
  }

  select_card_for_trick(hand, legal_cards, trick, cards_taken) {
    const leading_suit = trick.length !== 0 ? trick[0][1][0] : null;
    var ordered_hand = [];
    legal_cards = legal_cards.slice();
    const bad_cards = [];
    for (const card of legal_cards) {
      if (card === "♠Q") {
        bad_cards.push(card);
      }
      if (card[0] === leading_suit) {
        ordered_hand.push(card);
      }
      if (card[0] === "♥") {
        bad_cards.push(card);
      }
    }
    legal_cards = legal_cards.filter((card) => !ordered_hand.includes(card));
    legal_cards = legal_cards.filter((card) => !bad_cards.includes(card));

    ordered_hand = ordered_hand.concat(legal_cards);
    ordered_hand = ordered_hand.concat(bad_cards);
    const played_card = ordered_hand[0];
    return played_card;
  }
}
