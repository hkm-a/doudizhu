export const GAME_OVER_RESTART_DELAY = 9000;

export const getGameOverResult = function (isLandlordWinner) {
    if (isLandlordWinner) {
        return {
            title: '地主赢',
            detail: '地主守住牌桌',
            sound: 'music_win',
        };
    }
    return {
        title: '农民赢',
        detail: '农民合力获胜',
        sound: 'music_lose',
    };
};

export const getGameOverScoreRows = function (gameOverPlayers, seatPlayers) {
    const seats = seatPlayers || [];
    return (gameOverPlayers || []).map(player => {
        const seatPlayer = seats.find(seat => seat && seat.uid === player.uid);
        const row = {
            uid: player.uid,
            name: seatPlayer && seatPlayer.name ? seatPlayer.name : '玩家 ' + player.uid,
            point: player.point || 0,
        };
        if (player.balance !== undefined && player.balance !== null) {
            row.balance = player.balance;
        }
        return row;
    });
};

const MULTIPLE_DETAIL_LABELS = {
    origin: '底分',
    origin_multiple: '初始',
    di: '底牌',
    ming: '明牌',
    bomb: '炸弹',
    rob: '抢地主',
    spring: '春天',
    landlord: '地主',
    farmer: '农民',
};

const normalizePositiveNumber = function (value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
};

export const getGameOverMultipleSummary = function (multipleDetails) {
    const details = multipleDetails || {};
    const entries = Object.keys(MULTIPLE_DETAIL_LABELS)
        .map(key => ({
            key: key,
            label: MULTIPLE_DETAIL_LABELS[key],
            value: normalizePositiveNumber(details[key]),
        }))
        .filter(entry => {
            if (entry.key === 'origin') {
                return entry.value > 0;
            }
            return entry.value > 1;
        });

    if (entries.length === 0) {
        return '';
    }

    const product = entries.reduce((total, entry) => {
        if (entry.key === 'origin') {
            return total;
        }
        return total * entry.value;
    }, 1);
    const totalMultiple = product > 1 ? product : normalizePositiveNumber(details.origin_multiple);
    const totalLabel = totalMultiple > 0 ? '总倍数 x' + totalMultiple + ' · ' : '';

    return totalLabel + entries.map(entry => (
        entry.key === 'origin'
            ? entry.label + ' ' + entry.value
            : entry.label + ' x' + entry.value
    )).join(' / ');
};

export const getGameOverStatusSummary = function (isLandlordWinner, scoreRows) {
    const result = getGameOverResult(isLandlordWinner);
    const rows = scoreRows || [];
    const points = rows.map(row => {
        const point = row.point > 0 ? '+' + row.point : '' + row.point;
        return row.name + ' ' + point;
    }).join(' / ');

    return points ? result.title + ' · ' + points : result.title;
};
