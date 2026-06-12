// Doudizhu Game Engine Unit Tests
var assert = require('assert');
var G = require('../game.js');

var passed = 0, failed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('  ✓ ' + name); }
    catch (e) { failed++; console.log('  ✗ ' + name + ': ' + e.message); }
}

console.log('=== classifyCards ===');
var g = new G();

test('Single card', function() {
    var r = g.classifyCards([{id:1,rank:5,suit:0}]);
    assert.equal(r.pattern, 'Single');
    assert.equal(r.primary_rank, 5);
});

test('Pair', function() {
    var r = g.classifyCards([{id:1,rank:5,suit:0},{id:2,rank:5,suit:1}]);
    assert.equal(r.pattern, 'Pair');
});

test('Triple', function() {
    var r = g.classifyCards([{id:1,rank:5,suit:0},{id:2,rank:5,suit:1},{id:3,rank:5,suit:2}]);
    assert.equal(r.pattern, 'Triple');
});

test('Triple+1', function() {
    var r = g.classifyCards([{id:1,rank:5,suit:0},{id:2,rank:5,suit:1},{id:3,rank:5,suit:2},{id:4,rank:3,suit:0}]);
    assert.equal(r.pattern, 'Triple+1');
});

test('Triple+2', function() {
    var r = g.classifyCards([{id:1,rank:5,suit:0},{id:2,rank:5,suit:1},{id:3,rank:5,suit:2},{id:4,rank:3,suit:0},{id:5,rank:3,suit:1}]);
    assert.equal(r.pattern, 'Triple+2');
});

test('Triple+2 with non-pair kicker is INVALID', function() {
    var r = g.classifyCards([{id:1,rank:5,suit:0},{id:2,rank:5,suit:1},{id:3,rank:5,suit:2},{id:4,rank:3,suit:0},{id:5,rank:7,suit:0}]);
    assert.equal(r.pattern, 'INVALID');
});

test('Bomb', function() {
    var r = g.classifyCards([{id:1,rank:8,suit:0},{id:2,rank:8,suit:1},{id:3,rank:8,suit:2},{id:4,rank:8,suit:3}]);
    assert.equal(r.pattern, 'Bomb');
});

test('Rocket', function() {
    var r = g.classifyCards([{id:1,rank:16,suit:0,is_joker:true},{id:2,rank:17,suit:0,is_joker:true}]);
    assert.equal(r.pattern, 'Rocket');
});

test('JQKA2 is INVALID', function() {
    var r = g.classifyCards([{id:1,rank:11,suit:0},{id:2,rank:12,suit:0},{id:3,rank:13,suit:0},{id:4,rank:14,suit:0},{id:5,rank:15,suit:0}]);
    assert.equal(r.pattern, 'INVALID');
});

test('34567 is Straight', function() {
    var r = g.classifyCards([{id:1,rank:3,suit:0},{id:2,rank:4,suit:0},{id:3,rank:5,suit:0},{id:4,rank:6,suit:0},{id:5,rank:7,suit:0}]);
    assert.equal(r.pattern, 'Straight');
});

console.log('\n=== canBeat ===');

test('Bomb beats Single', function() {
    var bomb = g.classifyCards([{id:1,rank:8,suit:0},{id:2,rank:8,suit:1},{id:3,rank:8,suit:2},{id:4,rank:8,suit:3}]);
    var single = g.classifyCards([{id:5,rank:5,suit:0}]);
    assert.equal(g.canBeat(bomb, single), true);
});

test('Rocket beats Bomb', function() {
    var rocket = g.classifyCards([{id:1,rank:16,suit:0,is_joker:true},{id:2,rank:17,suit:0,is_joker:true}]);
    var bomb = g.classifyCards([{id:3,rank:8,suit:0},{id:4,rank:8,suit:1},{id:5,rank:8,suit:2},{id:6,rank:8,suit:3}]);
    assert.equal(g.canBeat(rocket, bomb), true);
});

test('Bomb cannot beat Rocket', function() {
    var rocket = g.classifyCards([{id:1,rank:16,suit:0,is_joker:true},{id:2,rank:17,suit:0,is_joker:true}]);
    var bomb = g.classifyCards([{id:3,rank:8,suit:0},{id:4,rank:8,suit:1},{id:5,rank:8,suit:2},{id:6,rank:8,suit:3}]);
    assert.equal(g.canBeat(bomb, rocket), false);
});

console.log('\n=== getLegalPlays ===');

test('Rocket can be played as response to Bomb', function() {
    var hand=[{id:1,rank:16,suit:0,is_joker:true},{id:2,rank:17,suit:0,is_joker:true},{id:3,rank:3,suit:0},{id:4,rank:5,suit:0},{id:5,rank:7,suit:0},{id:6,rank:9,suit:0}];
    var trick={pattern:'Bomb',primary_rank:10,count:4};
    var plays=g.findLegalPlays(hand,trick,false);
    var rockets=plays.filter(function(x){return x.pattern==='Rocket';});
    assert.ok(rockets.length > 0, 'Should find rocket as legal play');
});

test('Joker can be played as single response to 2', function() {
    var hand=[{id:1,rank:16,suit:0,is_joker:true},{id:2,rank:3,suit:0},{id:3,rank:5,suit:0},{id:4,rank:7,suit:0},{id:5,rank:9,suit:0},{id:6,rank:11,suit:0}];
    var trick={pattern:'Single',primary_rank:15,count:1};
    var plays=g.findLegalPlays(hand,trick,false);
    var jokerPlays=plays.filter(function(x){return x.pattern==='Single'&&x.primary_rank>15;});
    assert.ok(jokerPlays.length > 0, 'Joker should be legal response to 2');
});

console.log('\n=== Full Game Simulation ===');

test('10-game stress test (0 stuck)', function() {
    var stuck=0;
    for(var seed=1;seed<=10;seed++){
        var g=new G();g.newRound(seed*100);g.callBid(0,3);
        while(g.phase===2&&g.currentSeat!==0){if(g.highestBid<3)g.callBid(g.currentSeat,g.highestBid+1);else g.passBid(g.currentSeat);}
        var r=0;while(g.phase===3&&r<1000){if(g.currentSeat===0){var p=g.getLegalPlays();if(p.length>0){g.selectedCards=p[0].cards.map(function(c){return c.id});g.playSelected();}else g.passTurn();}else g.processAiTurns(1);r++;}
        if(g.phase!==4) stuck++;
    }
    assert.equal(stuck, 0, 'All 10 games should complete');
});

console.log('\n--- Results: ' + passed + ' passed, ' + failed + ' failed ---');
process.exit(failed > 0 ? 1 : 0);
