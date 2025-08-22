import { shuffle, sample_indices, remove_by_idxs, input } from "./helpers.js";
import { SUITS, RANKS } from "./table.js";

function validate_passed_cards(cards, hand) {
  if (new Set(cards).size < 3) {
    return false;
  }
  for (const card of cards) {
    if (
      !SUITS.includes(card[0]) |
      !RANKS.includes(card[1]) |
      !hand.includes(card)
    ) {
      return false;
    }
  }
  return true;
}

function validate_played_card(card, legal_cards) {
  if (legal_cards.includes(card)) {
    return true;
  } else {
    return false;
  }
}

export class DumbPlayer {
  constructor(player_id, opponents, llm_client, count_cards, shoot_the_moon) {}

  async pass_three_cards(hand, recipient) {
    await new Promise((r) => setTimeout(r, 3000));
    const idxs = sample_indices(hand.length, 3);
    hand.filter((card) => idxs);
    const cards_to_pass = idxs.map((idx) => hand[idx]);
    return cards_to_pass;
  }

  async select_card_for_trick(hand, legal_cards, trick, cards_taken) {
    await new Promise((r) => setTimeout(r, 1500));
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

export class HumanPlayer {
  constructor(player_id, opponents, llm_client, count_cards, shoot_the_moon) {}

  async pass_three_cards(hand, recipient) {
    const prompt = `Passing three cards to ${recipient}. Your hand is ${hand}. List cards to pass like '♦10,♣2,♥A':`;

    var validated = false;
    while (!validated) {
      var reply = await input(prompt);
      var cards_to_pass = reply.split(",");
      if (validate_passed_cards(cards_to_pass, hand)) {
        validated = true;
      } else {
        console.log("Try again.");
      }
    }
    return cards_to_pass;
  }

  async select_card_for_trick(hand, legal_cards, trick, cards_taken) {
    const prompt = `It's your turn to play the trick. Your hand is ${hand}. Cards you can legally play: ${legal_cards}. Trick so far: ${trick}. Select a card to play like '♣J':`;

    var validated = false;
    while (!validated) {
      var reply = await input(prompt);
      var played_card = reply;
      if (validate_played_card(played_card, legal_cards)) {
        validated = true;
      } else {
        console.log("Try again.");
      }
    }
    return played_card;
  }
}

export class AIPlayer {
  constructor(player_id, opponents, llm_client, count_cards, shoot_the_moon) {
    this.player_id = player_id;
    this.opponents = opponents;
    this.llm_client = llm_client;
    this.count_cards = count_cards;
    this.shoot_the_moon = shoot_the_moon;
    this.system_prompt = `Your name is ${player_id} and you're playing a game of Hearts against ${opponents}.`;
    if (shoot_the_moon) {
      this.system_prompt = this.system_prompt + "\nTry to shoot the moon!";
    }
    this.period = 1;
  }

  async pass_three_cards(hand, recipient) {
    var prompt = `Choose 3 cards to pass to ${recipient}. Your hand: ${hand}. Reply ONLY with a list of cards to pass like: '♦10,♣2,♥A'.`;

    var validated = false;
    while (!validated) {
      var reply = await this.llm_client.get_response(
        this.system_prompt,
        prompt
      );
      var cards_to_pass = reply.split(",");
      if (validate_passed_cards(cards_to_pass, hand)) {
        validated = true;
      } else {
        console.log(`Trying again in ${this.period}s...`);
      }
    }
    return cards_to_pass;
  }

  async select_card_for_trick(hand, legal_cards, trick, cards_taken) {
    var prompt = `Choose a card to play in current trick. The trick so far: ${trick}. Your hand: ${hand}. Cards you can legally play: ${legal_cards}\n`;
    if (this.count_cards) {
      prompt =
        prompt +
        `You have been counting cards that have been taken so far, use this to your advantage: ${JSON.stringify(cards_taken)}.\n`;
    }
    prompt =
      prompt +
      `Reply ONLY with a card that's LEGAL to play in the format: '♣J'.`;

    var validated = false;
    while (!validated) {
      var reply = await this.llm_client.get_response(
        this.system_prompt,
        prompt
      );
      var played_card = reply;
      if (validate_played_card(played_card, legal_cards)) {
        validated = true;
      } else {
        console.log(`Trying again in ${this.period}s...`);
      }
    }
    return played_card;
  }
}

// const player = new HumanPlayer();
// player.pass_three_cards([], "");
