/*
/// Module: suistamp
module suistamp::suistamp;
*/

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions

module suistamp::suistamp {
    const MAX_STAMPS: u64 = 5;
    const E_MAXED_OUT: u64 = 1;
    const E_NOT_ENOUGH: u64 = 2;

    /// Tarjeta con contador de "sellos".
    public struct Card has key {
        id: sui::object::UID,
        stamps: u64,
    }

    /// Insignia que se acuña al redimir una tarjeta completa.
    public struct Badge has key {
        id: sui::object::UID,
        stamps_redeemed: u64,
    }

    /// Crea una nueva tarjeta y la transfiere al remitente.
    public fun create(ctx: &mut sui::tx_context::TxContext) {
        let card = Card { id: sui::object::new(ctx), stamps: 0 };
        sui::transfer::transfer(card, sui::tx_context::sender(ctx));
    }

    /// Agrega 1 sello. Falla si ya está completa.
    public fun punch(card: &mut Card) {
        assert!(card.stamps < MAX_STAMPS, E_MAXED_OUT);
        card.stamps = card.stamps + 1;
    }

    /// Redime una tarjeta con 5 sellos: resetea la tarjeta y mintea un Badge.
    public fun redeem(card: &mut Card, ctx: &mut sui::tx_context::TxContext) {
        assert!(card.stamps >= MAX_STAMPS, E_NOT_ENOUGH);
        card.stamps = 0;
        let badge = Badge { id: sui::object::new(ctx), stamps_redeemed: MAX_STAMPS };
        sui::transfer::transfer(badge, sui::tx_context::sender(ctx));
    }

    /// Regala la tarjeta a otra address.
    public fun gift(card: Card, to: address) {
        sui::transfer::transfer(card, to);
    }

    /// Lectura del contador (útil para tests).
    public fun count(card: &Card): u64 { card.stamps }
}

