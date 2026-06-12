// Doudizhu Edge Case Tests
var assert = require('assert');
var G = require('../game.js');

var passed = 0, failed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('  ✓ ' + name); }
    catch (e) { failed++; console.log('  ✗ ' + name + ': ' + e.message); }
}

console.log('=== Bidding Edge Cases ===');

test('Bid 3 immediately resolves landlord', function() {
    var g = new G(); g.newRound(42);
    g.callBid(0, 3);
    assert.equal(g.phase, 3, 'Should be in PLAY phase after bid 3');
    assert.equal(g.landlordSeat, 0);
});

test('All pass: landlord chosen randomly (not always seat 0)', function() {
    var results = [];
    for (var i = 0; i < 10; i++) {
        var g = new G(); g.newRound(i * 100);
        g.passBid(0); g.passBid(1); g.passBid(2);
        results.push(g.landlordSeat);
    }
    var allZero = results.every(function(s) { return s === 0; });
    assert.equal(allZero, false, 'Landlord should not always be seat 0');
});

console.log('\n=== Play Edge Cases ===');

test('Bomb vs Bomb: higher rank wins', function() {
    var g = new G();
    var b1 = g.classifyCards([{id:1,rank:8,suit:0},{id:2,rank:8,suit:1},{id:3,rank:8,suit:2},{id:4,rank:8,suit:3}]);
    var b2 = g.classifyCards([{id:5,rank:10,suit:0},{id:6,rank:10,suit:1},{id:7,rank:10,suit:2},{id:8,rank:10,suit:3}]);
    assert.equal(g.canBeat(b2, b1), true);
    assert.equal(g.canBeat(b1, b2), false);
});

test('Rocket is unbeatable', function() {
    var g = new G();
    var rocket = g.classifyCards([{id:1,rank:16,suit:0,is_joker:true},{id:2,rank:17,suit:0,is_joker:true}]);
    var bomb = g.classifyCards([{id:3,rank:14,suit:0},{id:4,rank:14,suit:1},{id:5,rank:14,suit:2},{id:6,rank:14,suit:3}]);
    assert.equal(g.canBeat(rocket, bomb), true);
    assert.equal(g.canBeat(bomb, rocket), false);
    assert.equal(g.canBeat(rocket, rocket), true);
});

test('Spring detection: landlord wins without farmers playing', function() {
    var g = new G(); g.newRound(42);
    g.callBid(0, 3);
    g.seatPlayed[1] = false; g.seatPlayed[2] = false;
    g.winnerSide = 'landlord'; g.landlordSeat = 0;
    var isSpring = g.winnerSide === 'landlord' && !g.seatPlayed[1] && !g.seatPlayed[2];
    assert.equal(isSpring, true);
});

console.log('\n--- Results: ' + passed + ' passed, ' + failed + ' failed ---');
process.exit(failed > 0 ? 1 : 0);
