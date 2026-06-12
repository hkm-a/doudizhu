// Doudizhu Performance Test
var G = require('../game.js');

console.log('=== Performance Test: 1000 Games ===');
var start = Date.now();
var completed = 0, stuck = 0;

for (var seed = 1; seed <= 1000; seed++) {
    var g = new G();
    g.newRound(seed);
    g.callBid(0, 3);
    while (g.phase === 2 && g.currentSeat !== 0) {
        if (g.highestBid < 3) g.callBid(g.currentSeat, g.highestBid + 1);
        else g.passBid(g.currentSeat);
    }
    var r = 0;
    while (g.phase === 3 && r < 1000) {
        if (g.currentSeat === 0) {
            var p = g.getLegalPlays();
            if (p.length > 0) {
                g.selectedCards = p[0].cards.map(function(c) { return c.id; });
                g.playSelected();
            } else g.passTurn();
        } else g.processAiTurns(1);
        r++;
    }
    if (g.phase === 4) completed++;
    else stuck++;
}

var elapsed = Date.now() - start;
console.log('Completed: ' + completed + '/1000');
console.log('Stuck: ' + stuck);
console.log('Time: ' + elapsed + 'ms (' + (elapsed / 1000).toFixed(1) + 'ms/game)');
console.log('Memory: ' + (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1) + 'MB');
