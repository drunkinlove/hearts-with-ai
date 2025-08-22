from collections import namedtuple
import random


class Card(namedtuple("Card", ("suit", "rank"))):
    def __repr__(self) -> str:
        return f"{self.suit}{self.rank}"


class Play(namedtuple("Play", ("played_by", "card"))):
    def __repr__(self) -> str:
        return f"{self.played_by}/{self.card}"


class Table:
    def __init__(self, player_ids: list[str]) -> None:
        self.suits = {"♠", "♣", "♦", "♥"}
        self.ranks = [str(i) for i in list(range(2, 11)) + ["J", "Q", "K", "A"]]
        
        self.deck = {Card(suit, rank) for suit in self.suits for rank in self.ranks}
        self.card_values = {card: 1 if card.suit == "♥" else 0 for card in self.deck}
        self.card_values[Card("♠", "Q")] = 13

        self.hands: dict[str, set[Card]] = {player_id: set() for player_id in player_ids}
        self.cards_taken: dict[str, set[Card]] = {player_id: set() for player_id in player_ids}

    def deal_cards(self, n: int, player_id: str) -> None:
        dealt_cards = random.sample(sorted(self.deck), n)

        for card in dealt_cards:
            self.deck.remove(card)
            self.hands[player_id].add(card)

    def update_hands(self, updates: dict[str, dict[str, set[Card]]]) -> None:
        # {"Tom": {"added": [], "removed": []}}
        for player_id, update in updates.items():
            added = update.get("added", set())
            removed = update.get("removed", set())
            assert not self.hands[player_id].intersection(added)
            self.hands[player_id] |= added
            assert not removed - self.hands[player_id]
            self.hands[player_id] -= removed
