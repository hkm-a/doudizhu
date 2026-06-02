import React from 'react';
import {Login, getHealth} from './components/Login'
import Github from './components/Github'
import Game from './game/Index'
import {Protocol, Socket} from './game/net'
import {buildStatusLog, DEFAULT_GAME_STATUS, GAME_STATUS_EVENT, emitGameCommand} from './game/status'

const PHASE_STEPS = ['准备中', '叫地主', '出牌中', '结算'];
const ROUND_HISTORY_LIMIT = 5;
const CHAT_MESSAGE_LIMIT = 24;
const QUICK_CHAT_MESSAGES = ['大家好', '我准备好了', '打得不错'];

const getActionStateLabel = function (tone, isTimerLow = false) {
	if (isTimerLow) {
		return '即将超时';
	}

	switch (tone) {
		case 'action':
			return '轮到你操作';
		case 'blocked':
			return '操作受阻';
		case 'done':
			return '本局结束';
		case 'waiting':
		default:
			return '等待对手';
	}
};

const getConnectionTone = function (connection) {
	const text = String(connection || '');
	if (text.indexOf('断开') !== -1 || text.indexOf('未连接') !== -1 || text.indexOf('失败') !== -1) {
		return 'blocked';
	}
	if (text.indexOf('已连接') !== -1 || text.indexOf('连接已建立') !== -1) {
		return 'online';
	}
	return 'waiting';
};

const getPhaseProgress = function (phase) {
	const phaseIndex = PHASE_STEPS.indexOf(phase);
	const activeIndex = Math.max(phaseIndex, 0);
	return {
		index: activeIndex,
		percent: Math.round((activeIndex + 1) / PHASE_STEPS.length * 100),
	};
};

const getMultipleRisk = function (multiple) {
	const value = Number(multiple);
	if (!Number.isFinite(value) || value <= 0) {
		return {
			label: '待确认',
			detail: '等待倍数同步',
			tone: 'waiting',
		};
	}
	if (value >= 60) {
		return {
			label: '高倍风险',
			detail: '输赢波动很大',
			tone: 'danger',
		};
	}
	if (value >= 30) {
		return {
			label: '倍数升温',
			detail: '注意本局积分',
			tone: 'warm',
		};
	}
	return {
		label: '风险正常',
		detail: '常规倍数',
		tone: 'normal',
	};
};

const getTurnTimerSummary = function (turnTimer) {
	const value = Number(turnTimer);
	if (!Number.isFinite(value) || value <= 0) {
		return {
			valueLabel: '待开始',
			stateLabel: '暂无计时',
			tone: 'idle',
		};
	}
	if (value <= 5) {
		return {
			valueLabel: value + 's',
			stateLabel: '即将超时',
			tone: 'low',
		};
	}
	return {
		valueLabel: value + 's',
		stateLabel: '计时中',
		tone: 'active',
	};
};

const getSeatPressure = function (seat) {
	if (!seat || seat.left || !seat.name || seat.name === '等待玩家加入' || seat.cardCount <= 0) {
		return {
			label: '',
			tone: 'normal',
		};
	}

	const isLocalSeat = seat.seat === '你';
	if (seat.cardCount === 1) {
		return {
			label: isLocalSeat ? '剩 1 张' : '报单',
			tone: isLocalSeat ? 'low' : 'danger',
		};
	}
	if (seat.cardCount === 2) {
		return {
			label: isLocalSeat ? '剩 2 张' : '报双',
			tone: isLocalSeat ? 'low' : 'danger',
		};
	}
	if (seat.cardCount <= 5) {
		return {
			label: '低牌量',
			tone: 'low',
		};
	}

	return {
		label: '',
		tone: 'normal',
	};
};

const getSeatStatusBadges = function (seat, pressure = getSeatPressure(seat)) {
	if (!seat) {
		return [];
	}

	const badges = [{
		label: seat.left ? '暂离' : seat.landlord ? '地主' : seat.ready ? '已准备' : '未准备',
		tone: seat.left ? 'blocked' : seat.landlord ? 'landlord' : seat.ready ? 'ready' : 'waiting',
	}];
	if (seat.turn) {
		badges.push({
			label: '当前回合',
			tone: 'turn',
		});
	}
	if (pressure && pressure.label) {
		badges.push({
			label: pressure.label,
			tone: pressure.tone,
		});
	}
	return badges;
};

const getActiveSeatSummaries = function (status) {
	const seats = status && Array.isArray(status.seatSummaries) ? status.seatSummaries : [];
	return seats.filter(seat => (
		seat
		&& !seat.left
		&& seat.name
		&& seat.name !== '等待玩家加入'
		&& Number(seat.cardCount) > 0
	));
};

const formatSeatCardCount = function (seat) {
	return seat.seat + ' ' + Number(seat.cardCount) + '张';
};

const getTablePulse = function (status) {
	const activeSeats = getActiveSeatSummaries(status);
	const opponents = activeSeats.filter(seat => seat.seat !== '你');
	const leader = activeSeats.slice().sort((left, right) => Number(left.cardCount) - Number(right.cardCount))[0];
	const singleThreats = opponents.filter(seat => Number(seat.cardCount) === 1).length;
	const pairThreats = opponents.filter(seat => Number(seat.cardCount) === 2).length;
	const lowThreats = opponents.filter(seat => Number(seat.cardCount) > 2 && Number(seat.cardCount) <= 5).length;
	const turnTimer = Number(status && status.turnTimer);
	const actionTone = status && status.actionTone;

	let pressureLabel = '压力正常';
	let pressureDetail = opponents.length > 0 ? '对手牌量可控' : '等待对手入座';
	let pressureTone = 'normal';
	if (singleThreats > 0) {
		pressureLabel = '对手报单';
		pressureDetail = singleThreats + '人只剩 1 张';
		pressureTone = 'danger';
	} else if (pairThreats > 0) {
		pressureLabel = '对手报双';
		pressureDetail = pairThreats + '人只剩 2 张';
		pressureTone = 'danger';
	} else if (lowThreats > 0) {
		pressureLabel = '对手低牌';
		pressureDetail = lowThreats + '人进入 5 张内';
		pressureTone = 'low';
	}

	let paceLabel = status && status.phase ? status.phase : '等待';
	let paceDetail = '等待牌局推进';
	let paceTone = 'normal';
	if (Number.isFinite(turnTimer) && turnTimer > 0 && turnTimer <= 5) {
		paceLabel = '计时紧';
		paceDetail = '剩余 ' + turnTimer + 's';
		paceTone = 'danger';
	} else if (actionTone === 'action') {
		paceLabel = '轮到你';
		paceDetail = Number.isFinite(turnTimer) && turnTimer > 0 ? '剩余 ' + turnTimer + 's' : '请出牌或操作';
		paceTone = 'action';
	} else if (Number.isFinite(turnTimer) && turnTimer > 0) {
		paceDetail = '剩余 ' + turnTimer + 's';
	}

	return {
		leaderLabel: leader ? formatSeatCardCount(leader) : '待开局',
		leaderDetail: leader ? (leader.seat === '你' ? '你当前牌最少' : leader.name + ' 牌最少') : '等待发牌',
		leaderTone: leader && leader.seat !== '你' && Number(leader.cardCount) <= 2 ? 'danger' : leader && leader.seat === '你' ? 'action' : 'normal',
		pressureLabel: pressureLabel,
		pressureDetail: pressureDetail,
		pressureTone: pressureTone,
		paceLabel: paceLabel,
		paceDetail: paceDetail,
		paceTone: paceTone,
	};
};

const getScorePointLabel = function (point) {
	const value = Number(point);
	if (!Number.isFinite(value)) {
		return '0';
	}
	return value > 0 ? '+' + value : '' + value;
};

const getScorePointTone = function (point) {
	const value = Number(point);
	if (!Number.isFinite(value) || value === 0) {
		return 'even';
	}
	return value > 0 ? 'win' : 'lose';
};

const createChatReceipt = function (message, sent) {
	const text = String(message || '').trim();
	if (!text) {
		return {
			label: '未发送',
			message: '请输入快捷语',
			tone: 'blocked',
		};
	}
	return {
		label: sent ? '已发送' : '未发送',
		message: text,
		tone: sent ? 'sent' : 'blocked',
	};
};

const getLocalSettlementSummary = function (status, uid) {
	const scoreRows = status && Array.isArray(status.scoreRows) ? status.scoreRows : [];
	const localScore = scoreRows.find(row => (
		uid !== undefined
		&& uid !== null
		&& row
		&& String(row.uid) === String(uid)
	));
	if (!localScore) {
		return null;
	}

	const point = Number(localScore.point);
	if (!Number.isFinite(point)) {
		return null;
	}

	const hasBalance = localScore.balance !== null && localScore.balance !== undefined && localScore.balance !== '';
	const balance = hasBalance ? Number(localScore.balance) : NaN;
	return {
		label: point > 0 ? '本局盈利' : point < 0 ? '本局亏损' : '本局持平',
		point: point,
		pointLabel: getScorePointLabel(point),
		balanceLabel: Number.isFinite(balance) ? '余额 ' + balance : '余额待同步',
		tone: getScorePointTone(point),
	};
};

const getActionAdvisor = function (status, tablePulse, multipleRisk, timerSummary) {
	const currentStatus = status || {};
	const pulse = tablePulse || getTablePulse(currentStatus);
	const risk = multipleRisk || getMultipleRisk(currentStatus.multiple);
	const timer = timerSummary || getTurnTimerSummary(currentStatus.turnTimer);
	const phase = currentStatus.phase || '准备中';
	const actionHint = currentStatus.actionHint || currentStatus.lastAction || '';
	const selectedCount = Number(currentStatus.selectedPokerCount) || 0;

	if (currentStatus.actionTone === 'blocked') {
		return {
			label: '先处理阻塞',
			detail: actionHint || '当前操作未通过',
			tone: 'blocked',
			secondary: risk.tone === 'danger' ? '倍数很高，避免误点' : '确认连接和牌型后再操作',
		};
	}

	if (phase === '准备中') {
		const readyProgress = getReadyProgress(currentStatus);
		return {
			label: currentStatus.actionTone === 'action' ? '准备开局' : '等待同桌',
			detail: readyProgress.label,
			tone: readyProgress.tone === 'done' ? 'done' : currentStatus.actionTone,
			secondary: currentStatus.actionTone === 'action' ? '点击准备进入下一局' : '观察座位和机器人补位状态',
		};
	}

	if (phase === '叫地主') {
		return {
			label: currentStatus.actionTone === 'action' ? '评估抢地主' : '等待叫分',
			detail: currentStatus.actionTone === 'action' ? '看炸弹、王和高牌后决定' : currentStatus.turnLabel || '等待对手',
			tone: currentStatus.actionTone === 'action' ? 'action' : 'waiting',
			secondary: risk.tone === 'danger' ? '当前倍数偏高' : '地主确认后底牌会显示在下方',
		};
	}

	if (phase === '出牌中') {
		if (timer.tone === 'low') {
			return {
				label: '尽快决策',
				detail: '剩余 ' + currentStatus.turnTimer + 's',
				tone: 'danger',
				secondary: selectedCount > 0 ? '已选 ' + selectedCount + ' 张，可检查后出牌' : '可先点提示寻找可跟牌',
			};
		}
		if (currentStatus.actionTone === 'action') {
			return {
				label: selectedCount > 0 ? '检查后出牌' : '寻找可管牌',
				detail: selectedCount > 0 ? '已选 ' + selectedCount + ' 张牌' : (currentStatus.lastShotLabel || '轮到你行动'),
				tone: 'action',
				secondary: pulse.pressureTone === 'danger' ? pulse.pressureDetail : '用提示循环查看候选牌',
			};
		}
		if (pulse.pressureTone === 'danger') {
			return {
				label: '防守预警',
				detail: pulse.pressureDetail,
				tone: 'danger',
				secondary: '下次轮到你时优先拦截低牌对手',
			};
		}
		return {
			label: '观察出牌',
			detail: currentStatus.turnLabel || '等待对手',
			tone: 'waiting',
			secondary: pulse.leaderDetail,
		};
	}

	if (phase === '结算') {
		return {
			label: '复盘本局',
			detail: currentStatus.resultSummary || '查看分数变化',
			tone: 'done',
			secondary: currentStatus.multipleSummary || '准备下一局',
		};
	}

	return {
		label: '跟随牌桌',
		detail: actionHint || currentStatus.lastAction || '等待状态同步',
		tone: currentStatus.actionTone || 'waiting',
		secondary: pulse.paceDetail,
	};
};

const isLocalScoreRow = function (row, uid) {
	return uid !== undefined
		&& uid !== null
		&& row
		&& row.uid !== undefined
		&& row.uid !== null
		&& String(row.uid) === String(uid);
};

const getScoreRowClassName = function (row, uid) {
	return [
		'game-shell__score-row',
		'game-shell__score-row--' + getScorePointTone(row && row.point),
		isLocalScoreRow(row, uid) ? 'game-shell__score-row--local' : '',
	].filter(Boolean).join(' ');
};

const buildHandPreviewCards = function (status) {
	const currentStatus = status || {};
	const selectedRanks = String(currentStatus.selectedPokerLabel || '')
		.split(/[\s,，、]+/)
		.map(rank => rank.trim())
		.filter(Boolean);
	const selectedCount = Math.max(0, Number(currentStatus.selectedPokerCount) || 0);
	const fallbackCount = Math.max(5, Math.min(17, Number(currentStatus.localHandCount) || 13));
	const cardCount = selectedRanks.length > 0
		? Math.max(selectedRanks.length, Math.min(17, selectedCount || selectedRanks.length))
		: fallbackCount;

	return Array.from({length: cardCount}, (_, index) => ({
		label: selectedRanks[index] || '',
		selected: selectedRanks.length > 0 && index < selectedRanks.length,
	}));
};

const getSeatByLabel = function (seats, label, fallbackIndex) {
	const source = Array.isArray(seats) ? seats : [];
	return source.find(seat => seat && seat.seat === label) || source[fallbackIndex] || DEFAULT_GAME_STATUS.seatSummaries[fallbackIndex];
};

const getReadyProgress = function (status) {
	const playerCount = Math.max(0, Number(status && status.playerCount) || 0);
	const readyCount = Math.max(0, Number(status && status.readyCount) || 0);
	const cappedReadyCount = playerCount > 0 ? Math.min(readyCount, playerCount) : 0;
	const percent = playerCount > 0 ? Math.round(cappedReadyCount / playerCount * 100) : 0;
	return {
		label: playerCount > 0 ? cappedReadyCount + '/' + playerCount + ' 已准备' : '等待玩家',
		percent: percent,
		tone: playerCount > 0 && cappedReadyCount >= playerCount ? 'done' : 'waiting',
	};
};

const getScoreRowsSignature = function (scoreRows) {
	return (Array.isArray(scoreRows) ? scoreRows : []).map(row => [
		row && row.uid !== undefined ? row.uid : '',
		row && row.name ? row.name : '',
		row && row.point !== undefined ? row.point : '',
		row && row.balance !== undefined ? row.balance : '',
	].join(':')).join('|');
};

const createRoundHistoryEntry = function (status, uid) {
	if (!status || status.phase !== '结算' || !status.resultSummary) {
		return null;
	}

	const scoreRows = Array.isArray(status.scoreRows) ? status.scoreRows : [];
	if (scoreRows.length === 0) {
		return null;
	}

	const signature = [
		status.roomLabel || '',
		status.resultSummary || '',
		status.multipleSummary || '',
		getScoreRowsSignature(scoreRows),
	].join('::');
	const localScore = scoreRows.find(row => (
		uid !== undefined
		&& uid !== null
		&& row
		&& String(row.uid) === String(uid)
	));

	return {
		signature: signature,
		roomLabel: status.roomLabel || '牌桌',
		resultSummary: status.resultSummary,
		multipleSummary: status.multipleSummary || '',
		localPoint: localScore ? localScore.point : null,
		scoreRows: scoreRows.map(row => ({
			uid: row && row.uid !== undefined && row.uid !== null ? String(row.uid) : '',
			name: row && row.name ? String(row.name) : '玩家',
			point: row && row.point !== undefined ? row.point : 0,
			balance: row && row.balance !== undefined ? row.balance : null,
		})),
	};
};

const buildRoundHistory = function (currentHistory, status, uid, limit = ROUND_HISTORY_LIMIT) {
	const history = Array.isArray(currentHistory) ? currentHistory : [];
	const entry = createRoundHistoryEntry(status, uid);
	if (!entry || limit <= 0) {
		return history.slice(0, Math.max(limit, 0));
	}
	if (history[0] && history[0].signature === entry.signature) {
		return history.slice(0, limit);
	}
	return [entry].concat(history).slice(0, limit);
};

const buildRoundHistoryStats = function (roundHistory) {
	const entries = Array.isArray(roundHistory) ? roundHistory : [];
	const stats = entries.reduce((nextStats, entry) => {
		if (!entry || entry.localPoint === null || entry.localPoint === undefined) {
			return nextStats;
		}
		const point = Number(entry && entry.localPoint);
		if (!Number.isFinite(point)) {
			return nextStats;
		}
		return {
			rounds: nextStats.rounds + 1,
			totalPoint: nextStats.totalPoint + point,
			wins: nextStats.wins + (point > 0 ? 1 : 0),
			losses: nextStats.losses + (point < 0 ? 1 : 0),
		};
	}, {
		rounds: 0,
		totalPoint: 0,
		wins: 0,
		losses: 0,
	});
	const validPoints = entries
		.map(entry => entry && entry.localPoint)
		.filter(point => point !== null && point !== undefined && Number.isFinite(Number(point)))
		.map(point => Number(point));
	const latestPoint = validPoints[0];
	let streakCount = 0;
	let streakTone = 'even';
	let streakLabel = '暂无走势';
	if (latestPoint > 0) {
		streakCount = validPoints.findIndex(point => point <= 0);
		streakCount = streakCount === -1 ? validPoints.length : streakCount;
		streakTone = 'win';
		streakLabel = streakCount + '连胜';
	} else if (latestPoint < 0) {
		streakCount = validPoints.findIndex(point => point >= 0);
		streakCount = streakCount === -1 ? validPoints.length : streakCount;
		streakTone = 'lose';
		streakLabel = streakCount + '连败';
	} else if (latestPoint === 0) {
		streakCount = 1;
		streakLabel = '刚持平';
	}
	return {
		...stats,
		streakCount: streakCount,
		streakLabel: streakLabel,
		streakTone: streakTone,
	};
};

const readStoredSession = function (storage = localStorage) {
	try {
		const token = storage.getItem('token');
		const storedPoint = storage.getItem('point');
		const point = storedPoint === null || storedPoint === undefined || storedPoint === ''
			? 1000
			: Number(storedPoint);
		return {
			token: token,
			name: storage.getItem('name') || 'player',
			uid: storage.getItem('uid'),
			point: Number.isFinite(point) ? point : 1000,
			page: !!token ? 'game' : 'login',
		};
	} catch (error) {
		return {
			token: null,
			name: 'player',
			uid: null,
			point: 1000,
			page: 'login',
		};
	}
};

const setStoredItem = function (key, value) {
	try {
		localStorage.setItem(key, value);
		return true;
	} catch (error) {
		return false;
	}
};

const removeStoredItem = function (key) {
	try {
		localStorage.removeItem(key);
		return true;
	} catch (error) {
		return false;
	}
};

const storeSessionRoom = function (room) {
	const roomId = Number(room);
	if (Number.isInteger(roomId) && roomId > 0) {
		return setStoredItem('room', String(roomId));
	}
	return removeStoredItem('room');
};

const getStoredToken = function (storage = localStorage) {
	try {
		return storage.getItem('token');
	} catch (error) {
		return null;
	}
};

const postAdminRobotStatus = function (allowRobot, callback) {
	let xhr = new XMLHttpRequest();
	let settled = false;
	const finish = function (error, response) {
		if (settled) {
			return;
		}
		settled = true;
		callback(error, response);
	};
	xhr.open('POST', '/admin', true);
	xhr.setRequestHeader('Content-type', 'application/json');
	const token = getStoredToken();
	if (token) {
		xhr.setRequestHeader('Authorization', 'Bearer ' + token);
	}
	xhr.timeout = 5000;
	xhr.onreadystatechange = function () {
		if (xhr.readyState === XMLHttpRequest.DONE) {
			let response = {};
			try {
				response = JSON.parse(xhr.responseText || '{}');
			} catch (error) {
				response = {};
			}
			if (xhr.status === 200 && response.allow_robot !== undefined) {
				finish(null, response);
			} else {
				finish(response.detail || '机器人补位切换失败');
			}
		}
	};
	xhr.onerror = function () {
		finish('无法连接本地服务');
	};
	xhr.ontimeout = function () {
		finish('机器人补位切换超时');
	};
	xhr.send(JSON.stringify({allow_robot: Boolean(allowRobot)}));
};

const getLocalSeatPoint = function (status, uid) {
	const seats = status && Array.isArray(status.seatSummaries) ? status.seatSummaries : [];
	const localSeat = seats.find(seat => seat && seat.seat === '你');
	if (!localSeat || localSeat.point === undefined || localSeat.point === null) {
		return null;
	}
	const point = Number(localSeat.point);
	return Number.isFinite(point) ? point : null;
};

class App extends React.Component {

	constructor(props) {
		super(props);

		const session = readStoredSession();
		this.state = {
			token: session.token,
			name: session.name,
			uid: session.uid,
			point: session.point,
			page: session.page,
			gameStatus: {...DEFAULT_GAME_STATUS},
			statusLog: buildStatusLog([], DEFAULT_GAME_STATUS),
			roundHistory: [],
			robots: null,
			robotAdminBusy: false,
			robotAdminMessage: '',
			chatDraft: '',
			chatReceipt: null,
			autoPlay: false,
			cardCounterVisible: false,
			sortByRank: false,
		}
		this.handleLogout = this.handleLogout.bind(this);
		this.handleChangeTable = this.handleChangeTable.bind(this);
		this.handleQuickChat = this.handleQuickChat.bind(this);
		this.handleChatDraftChange = this.handleChatDraftChange.bind(this);
		this.handleChatSubmit = this.handleChatSubmit.bind(this);
		this.handleRobotToggle = this.handleRobotToggle.bind(this);
		this.handleReady = this.handleReady.bind(this);
		this.handleCallScore = this.handleCallScore.bind(this);
		this.handlePass = this.handlePass.bind(this);
		this.handleShotRequest = this.handleShotRequest.bind(this);
		this.handleHintRequest = this.handleHintRequest.bind(this);
		this.handleAutoPlayToggle = this.handleAutoPlayToggle.bind(this);
		this.handleCardCounterToggle = this.handleCardCounterToggle.bind(this);
		this.handleSortToggle = this.handleSortToggle.bind(this);
		this.handleGameStatus = this.handleGameStatus.bind(this);
		this.refreshRobotAdminStatus = this.refreshRobotAdminStatus.bind(this);
		this.tickTurnTimer = this.tickTurnTimer.bind(this);
		this.turnTimerInterval = null;
	}

	componentDidMount() {
		window.addEventListener(GAME_STATUS_EVENT, this.handleGameStatus);
		this.turnTimerInterval = window.setInterval(this.tickTurnTimer, 1000);
		if (this.isAdminPlayer()) {
			this.refreshRobotAdminStatus();
		}
	}

	componentWillUnmount() {
		window.removeEventListener(GAME_STATUS_EVENT, this.handleGameStatus);
		window.clearInterval(this.turnTimerInterval);
	}

	handleGameStatus(event) {
		if (!event.detail) {
			return;
		}

		this.setState(previous => {
			const gameStatus = {
				...previous.gameStatus,
				...event.detail,
			};
			const localPoint = getLocalSeatPoint(gameStatus, previous.uid);
			if (localPoint !== null) {
				setStoredItem('point', String(localPoint));
			}
			return {
				gameStatus: gameStatus,
				statusLog: buildStatusLog(previous.statusLog, gameStatus),
				roundHistory: buildRoundHistory(previous.roundHistory, gameStatus, previous.uid),
				...(localPoint !== null ? {point: localPoint} : {}),
			};
		});
	}

	tickTurnTimer() {
		this.setState(previous => {
			const currentTimer = Number(previous.gameStatus.turnTimer);
			if (previous.page !== 'game' || !Number.isFinite(currentTimer) || currentTimer <= 0) {
				return null;
			}

			return {
				gameStatus: {
					...previous.gameStatus,
					turnTimer: Math.max(currentTimer - 1, 0),
				},
			};
		});
	}

	isAdminPlayer() {
		return String(this.state.uid || '') === '1';
	}

	refreshRobotAdminStatus() {
		getHealth((error, response) => {
			if (!this.isAdminPlayer()) {
				return;
			}
			if (error) {
				this.setState({robotAdminMessage: error});
				return;
			}
			this.setState({
				robots: Boolean(response && response.robots),
				robotAdminMessage: '',
			});
		});
	}

	handleRobotToggle() {
		if (!this.isAdminPlayer() || this.state.robotAdminBusy) {
			return;
		}
		const nextRobotStatus = !this.state.robots;
		this.setState({
			robotAdminBusy: true,
			robotAdminMessage: '正在切换机器人补位',
		});
		postAdminRobotStatus(nextRobotStatus, (error, response) => {
			if (error) {
				this.setState({
					robotAdminBusy: false,
					robotAdminMessage: error,
				});
				return;
			}
			const robots = Boolean(response && response.allow_robot);
			this.setState({
				robots: robots,
				robotAdminBusy: false,
				robotAdminMessage: robots ? '机器人补位已开启' : '机器人补位已关闭',
			});
		});
	}

	onChange(page, response) {
		const token = response && response.token ? response.token : response;
		const name = response && response.name ? response.name : this.state.name;
		const uid = response && response.uid !== undefined ? String(response.uid) : this.state.uid;
		const point = response && response.point !== undefined ? Number(response.point) : this.state.point;
		if (token) {
			setStoredItem('token', token);
		} else if (page === 'login') {
			removeStoredItem('token');
		}
		if (name) {
			setStoredItem('name', name);
		}
		if (uid) {
			setStoredItem('uid', uid);
		}
		if (Number.isFinite(point)) {
			setStoredItem('point', String(point));
		}
		if (response && Object.prototype.hasOwnProperty.call(response, 'room')) {
			storeSessionRoom(response.room);
		}
		this.setState({
			'page': page,
			'token': token,
			'name': name,
			'uid': uid,
			'point': Number.isFinite(point) ? point : this.state.point,
		}, () => {
			if (page === 'game' && this.isAdminPlayer()) {
				this.refreshRobotAdminStatus();
			}
		});
	}

	handleLogout() {
		Socket.send([Protocol.REQ_LEAVE_ROOM, {}]);
		removeStoredItem('token');
		removeStoredItem('uid');
		removeStoredItem('point');
		removeStoredItem('room');
		this.setState({
			'page': 'login',
			'token': null,
			'uid': null,
			'point': 1000,
			gameStatus: {...DEFAULT_GAME_STATUS},
			statusLog: buildStatusLog([], DEFAULT_GAME_STATUS),
			roundHistory: [],
			robots: null,
			robotAdminBusy: false,
			robotAdminMessage: '',
			chatDraft: '',
			chatReceipt: null,
			autoPlay: false,
			cardCounterVisible: false,
			sortByRank: false,
		});
	}

	handleChangeTable() {
		Socket.send([Protocol.REQ_LEAVE_ROOM, {}]);
		removeStoredItem('room');
		this.setState({
			'page': 'login',
			gameStatus: {...DEFAULT_GAME_STATUS},
			statusLog: buildStatusLog([], DEFAULT_GAME_STATUS),
			roundHistory: [],
			robots: null,
			robotAdminBusy: false,
			robotAdminMessage: '',
			chatDraft: '',
			chatReceipt: null,
			autoPlay: false,
			cardCounterVisible: false,
			sortByRank: false,
		});
	}

	updateLocalActionHint(message, tone = 'waiting') {
		this.setState(previous => ({
			gameStatus: {
				...previous.gameStatus,
				lastAction: message,
				actionHint: message,
				actionTone: tone,
			},
		}));
	}

	sendGameCommand(command, payload, failureMessage) {
		if (!emitGameCommand({
			type: command,
			...(payload || {}),
		})) {
			this.updateLocalActionHint(failureMessage || '牌桌命令未发送', 'blocked');
			return false;
		}
		return true;
	}

	sendChatMessage(message) {
		const text = String(message || '').trim();
		if (!text) {
			this.setState(previous => ({
				chatReceipt: createChatReceipt(text, false),
				gameStatus: {
					...previous.gameStatus,
					lastAction: '请输入快捷语',
					actionHint: '请输入快捷语',
					actionTone: 'blocked',
				},
			}));
			return false;
		}

		if (!Socket.send([Protocol.REQ_CHAT, {message: text}])) {
			this.setState(previous => ({
				chatReceipt: createChatReceipt(text, false),
				gameStatus: {
					...previous.gameStatus,
					lastAction: '连接未建立，快捷语未发送',
					actionHint: '连接未建立，快捷语未发送',
					actionTone: 'blocked',
				},
			}));
			return false;
		}
		this.setState({chatReceipt: createChatReceipt(text, true)});
		return true;
	}

	handleQuickChat(message) {
		this.sendChatMessage(message);
	}

	handleChatDraftChange(event) {
		this.setState({chatDraft: event.target.value});
	}

	handleChatSubmit(event) {
		event.preventDefault();
		if (this.sendChatMessage(this.state.chatDraft)) {
			this.setState({chatDraft: ''});
		}
	}

	handleReady() {
		this.sendGameCommand('ready', {}, '准备未发送');
	}

	handleCallScore(rob) {
		const nextRob = rob ? 1 : 0;
		this.sendGameCommand(
			'call-score',
			{rob: nextRob},
			'叫地主操作未发送'
		);
	}

	handlePass() {
		this.sendGameCommand('play-action', {action: 'pass'}, '不要未发送');
	}

	handleShotRequest() {
		this.sendGameCommand('play-action', {action: 'shot'}, '出牌未发送');
	}

	handleHintRequest() {
		this.sendGameCommand('play-action', {action: 'hint'}, '提示未发送');
	}

	handleAutoPlayToggle() {
		this.setState(previous => ({
			autoPlay: !previous.autoPlay,
			gameStatus: {
				...previous.gameStatus,
				lastAction: !previous.autoPlay ? '本地托管提示已开启' : '本地托管提示已关闭',
				actionHint: !previous.autoPlay ? '本地托管提示已开启' : '本地托管提示已关闭',
				actionTone: 'waiting',
			},
		}));
	}

	handleCardCounterToggle() {
		this.setState(previous => ({
			cardCounterVisible: !previous.cardCounterVisible,
		}));
	}

	handleSortToggle() {
		this.setState(previous => ({
			sortByRank: !previous.sortByRank,
		}));
	}

	render() {
		const status = this.state.gameStatus;
		const statusLog = this.state.statusLog;
		const roundHistory = this.state.roundHistory || [];
		const roundHistoryStats = buildRoundHistoryStats(roundHistory);
		const seatSummaries = status.seatSummaries || [];
		const tablePulse = getTablePulse(status);
		const scoreRows = status.scoreRows || [];
		const localSettlement = getLocalSettlementSummary(status, this.state.uid);
		const readyProgress = getReadyProgress(status);
		const actionHintClassName = 'game-shell__rail-section game-shell__action-hint game-shell__action-hint--' + status.actionTone;
		const turnTimer = Number(status.turnTimer);
		const timerSummary = getTurnTimerSummary(turnTimer);
		const isTimerLow = timerSummary.tone === 'low';
		const timerProgressValue = Number.isFinite(turnTimer)
			? Math.max(0, Math.min(turnTimer, 40))
			: 0;
		const timerProgress = timerProgressValue / 40 * 100;
		const phaseProgress = getPhaseProgress(status.phase);
			const actionStateLabel = getActionStateLabel(status.actionTone, isTimerLow);
			const connectionTone = getConnectionTone(status.connection);
			const multipleRisk = getMultipleRisk(status.multiple);
			const actionAdvisor = getActionAdvisor(status, tablePulse, multipleRisk, timerSummary);
			const chatDraft = String(this.state.chatDraft || '');
		const chatDraftLength = chatDraft.length;
		const canSendChatDraft = chatDraft.trim().length > 0;
		const chatReceipt = this.state.chatReceipt;
		const turnFocusClassName = [
			'game-shell__rail-section',
			'game-shell__turn-focus',
			'game-shell__turn-focus--' + status.actionTone,
			isTimerLow ? 'game-shell__turn-focus--timer-low' : '',
		].filter(Boolean).join(' ');
		const timerMetricClassName = [
			'game-shell__metric',
			'game-shell__metric--timer',
			'game-shell__metric--timer-' + timerSummary.tone,
			isTimerLow ? 'game-shell__metric--timer-low' : '',
		].filter(Boolean).join(' ');
		const robotAdminLabel = this.state.robotAdminBusy
			? '切换中'
			: this.state.robots ? '关闭机器人' : '开启机器人';
		const selfSeat = getSeatByLabel(seatSummaries, '你', 0);
		const nextSeat = getSeatByLabel(seatSummaries, '下家', 1);
		const previousSeat = getSeatByLabel(seatSummaries, '上家', 2);
		const handPreviewCards = buildHandPreviewCards(status);
		const autoPlay = Boolean(this.state.autoPlay);
		const cardCounterVisible = Boolean(this.state.cardCounterVisible);
		const sortByRank = Boolean(this.state.sortByRank);
		const canReady = Boolean(status.canReady);
		const canCallScore = Boolean(status.canCallScore);
		const canPass = Boolean(status.canPass);
		const canHint = Boolean(status.canHint);
		const canShot = Boolean(status.canShot);
		const handCountValue = Math.max(0, Number(status.localHandCount) || 0);
		const handCountPercent = Math.round(Math.min(handCountValue, 17) / 17 * 100);
		const ddzTableClassName = [
			'game-shell__replica',
			'ddz-table',
			sortByRank ? 'ddz-table--sort-rank' : 'ddz-table--sort-default',
		].join(' ');
		switch (this.state.page) {
			case 'login':
                return <div><Login onChange={(page, response) => this.onChange(page, response)}/> <Github/></div>;
			case "game":
	            default:
                return (
					<div className="game-shell" data-ui-theme="happy-doudizhu">
						<header className="game-shell__bar">
							<div>
								<span className="game-shell__label">当前玩家</span>
								<strong>{this.state.name}</strong>
								{this.state.uid && <span className="game-shell__uid">UID {this.state.uid}</span>}
								<span className="game-shell__account-point">积分 {this.state.point}</span>
							</div>
							{this.isAdminPlayer() && (
								<div className="game-shell__admin-tools" aria-label="管理员工具">
									<button
										type="button"
										onClick={this.handleRobotToggle}
										disabled={this.state.robotAdminBusy}
									>
										{robotAdminLabel}
									</button>
									<span>{this.state.robotAdminMessage || (this.state.robots === null ? '机器人状态待确认' : this.state.robots ? '机器人补位开启' : '机器人补位关闭')}</span>
								</div>
							)}
							<div className="game-shell__actions" aria-label="牌桌操作">
								<button type="button" className="game-shell__rematch" onClick={this.handleChangeTable}>
									换桌
								</button>
								<button type="button" className="game-shell__logout" onClick={this.handleLogout}>
									退出登录
								</button>
							</div>
						</header>
						<section className={ddzTableClassName} aria-label="欢乐斗地主牌桌">
							<header className="ddz-topbar">
								<button type="button" className="ddz-topbar__button ddz-topbar__button--back" onClick={this.handleChangeTable}>
									换桌
								</button>
								<div className="ddz-room-badge">
									<span>{status.roomLevelLabel}</span>
									<strong>{status.roomLabel}</strong>
								</div>
								<div className="ddz-topbar__stats" aria-label="牌桌概要">
									<span>底分 {status.roomOrigin}</span>
									<span>倍数 x{status.multiple}</span>
									<span className={'ddz-topbar__connection ddz-topbar__connection--' + connectionTone}>{status.connection}</span>
								</div>
								<div className="ddz-topbar__actions">
									{this.isAdminPlayer() && (
										<button
											type="button"
											className="ddz-topbar__button"
											onClick={this.handleRobotToggle}
											disabled={this.state.robotAdminBusy}
										>
											{robotAdminLabel}
										</button>
									)}
									<button type="button" className="ddz-topbar__button ddz-topbar__button--exit" onClick={this.handleLogout}>
										退出
									</button>
								</div>
							</header>

							<div className="ddz-standard-data" role="group" aria-label="斗地主数据控件">
								<div className="ddz-data-control">
									<span>场次</span>
									<strong>{status.roomLevelLabel}</strong>
									<small>{status.roomLabel}</small>
								</div>
								<div className="ddz-data-control">
									<span>底分</span>
									<strong>{status.roomOrigin}</strong>
									<small>入场底注</small>
								</div>
								<div className={'ddz-data-control ddz-data-control--' + multipleRisk.tone}>
									<span>倍数</span>
									<strong>x{status.multiple}</strong>
									<small>{multipleRisk.label}</small>
									<div className="ddz-data-control__track">
										<i style={{width: Math.min(Number(status.multiple) || 0, 80) / 80 * 100 + '%'}} />
									</div>
								</div>
								<div className={'ddz-data-control ddz-data-control--timer-' + timerSummary.tone}>
									<span>回合计时</span>
									<strong>{timerSummary.valueLabel}</strong>
									<small>{timerSummary.stateLabel}</small>
									<div className="ddz-data-control__track">
										<i style={{width: timerProgress + '%'}} />
									</div>
								</div>
								<div className="ddz-data-control">
									<span>地主</span>
									<strong>{status.landlordLabel}</strong>
									<small>{status.localRoleLabel}</small>
								</div>
								<div className="ddz-data-control">
									<span>手牌</span>
									<strong>{handCountValue} 张</strong>
									<small>已选 {status.selectedPokerCount}</small>
									<div className="ddz-data-control__track">
										<i style={{width: handCountPercent + '%'}} />
									</div>
								</div>
							</div>

							<div className="ddz-seat ddz-seat--left" aria-label="上家">
								<div className="ddz-avatar" aria-hidden="true">{previousSeat.landlord ? '地' : '农'}</div>
								<div className="ddz-seat__body">
									<strong>{previousSeat.name}</strong>
									<span>{previousSeat.point} 分</span>
									<b>{previousSeat.cardCount} 张</b>
								</div>
							</div>
							<div className="ddz-seat ddz-seat--right" aria-label="下家">
								<div className="ddz-avatar" aria-hidden="true">{nextSeat.landlord ? '地' : '农'}</div>
								<div className="ddz-seat__body">
									<strong>{nextSeat.name}</strong>
									<span>{nextSeat.point} 分</span>
									<b>{nextSeat.cardCount} 张</b>
								</div>
							</div>

							<div className="ddz-center">
								<div className="ddz-bottom-cards" aria-label="底牌">
									{status.bottomPokerLabel ? (
										<strong>{status.bottomPokerLabel}</strong>
									) : (
										<>
											<i aria-hidden="true" />
											<i aria-hidden="true" />
											<i aria-hidden="true" />
										</>
									)}
								</div>
								<div className="ddz-table-felt">
									<Game onChange={(page, response) => this.onChange(page, response)}/>
									<div className="ddz-action-banner">
										<span>{status.phase}</span>
										<strong>{actionStateLabel}</strong>
										<small>{status.actionHint}</small>
									</div>
									<div className="ddz-last-shot" aria-label="上一手">
										<span>{status.lastShotLabel}</span>
										{status.lastShotPokerLabel && <strong>{status.lastShotPokerLabel}</strong>}
									</div>
								</div>
							</div>

							<div className="ddz-player-panel">
								<div className="ddz-seat ddz-seat--self" aria-label="当前玩家">
									<div className="ddz-avatar ddz-avatar--self" aria-hidden="true">{selfSeat.landlord ? '地' : '我'}</div>
									<div className="ddz-seat__body">
										<strong>{this.state.name}</strong>
										<span>{this.state.point} 分</span>
										<b>{status.localHandCount} 张</b>
									</div>
								</div>
								<div className="ddz-hand" aria-label="手牌预览">
									{handPreviewCards.map((card, index) => (
										<span
											key={index}
											className={card.selected ? 'ddz-card ddz-card--selected' : 'ddz-card'}
											style={{
												'--card-index': index,
												'--card-total': handPreviewCards.length,
												'--card-offset': (handPreviewCards.length - 1) / 2,
											}}
										>
											{card.label || '牌'}
										</span>
									))}
								</div>
								<div className="ddz-command-panel" role="group" aria-label="斗地主操作控件">
									<div className="ddz-command-row ddz-command-row--bid">
										<button type="button" onClick={this.handleReady} disabled={!canReady}>准备</button>
										<button type="button" onClick={() => this.handleCallScore(0)} disabled={!canCallScore}>不叫</button>
										<button type="button" className="ddz-command-row__primary" onClick={() => this.handleCallScore(1)} disabled={!canCallScore}>叫地主</button>
									</div>
									<div className="ddz-command-row ddz-command-row--play">
										<button type="button" onClick={this.handlePass} disabled={!canPass}>不要</button>
										<button type="button" onClick={this.handleHintRequest} disabled={!canHint}>提示</button>
										<button type="button" className="ddz-command-row__primary" onClick={this.handleShotRequest} disabled={!canShot}>出牌</button>
									</div>
									<div className="ddz-tool-row" aria-label="辅助控件">
										<button
											type="button"
											className={autoPlay ? 'ddz-tool-row__toggle ddz-tool-row__toggle--on' : 'ddz-tool-row__toggle'}
											aria-pressed={autoPlay}
											onClick={this.handleAutoPlayToggle}
										>
											托管
										</button>
										<button
											type="button"
											className={cardCounterVisible ? 'ddz-tool-row__toggle ddz-tool-row__toggle--on' : 'ddz-tool-row__toggle'}
											aria-pressed={cardCounterVisible}
											onClick={this.handleCardCounterToggle}
										>
											记牌
										</button>
										<button
											type="button"
											className={sortByRank ? 'ddz-tool-row__toggle ddz-tool-row__toggle--on' : 'ddz-tool-row__toggle'}
											aria-pressed={sortByRank}
											onClick={this.handleSortToggle}
										>
											排序
										</button>
									</div>
								</div>
							</div>

							{cardCounterVisible && (
								<div className="ddz-card-counter" aria-label="记牌器">
									<span>上家 {previousSeat.cardCount}</span>
									<span>底牌 {status.bottomCount}</span>
									<span>下家 {nextSeat.cardCount}</span>
								</div>
							)}

							{status.resultSummary && (
								<section className="ddz-result-panel" aria-label="结算摘要">
									<span className="game-shell__label">结算摘要</span>
									<strong>{status.resultSummary}</strong>
									{status.multipleSummary && <small>{status.multipleSummary}</small>}
									{localSettlement && (
										<div className={'game-shell__local-settlement game-shell__local-settlement--' + localSettlement.tone} aria-label="我的本局结算">
											<div>
												<span>{localSettlement.label}</span>
												<strong>{localSettlement.pointLabel}</strong>
											</div>
											<small>{localSettlement.balanceLabel}</small>
										</div>
									)}
									{scoreRows.length > 0 && (
										<ul className="ddz-score-list" aria-label="结算分数">
											{scoreRows.map((row, index) => (
												<li key={row.uid + row.name + index} className={'ddz-score-row ddz-score-row--' + getScorePointTone(row.point)}>
													<span>{row.name}</span>
													<div className="game-shell__score-points">
														<strong>{getScorePointLabel(row.point)}</strong>
														{row.balance !== null && row.balance !== undefined && <small>余额 {row.balance}</small>}
													</div>
												</li>
											))}
										</ul>
									)}
								</section>
							)}
						</section>
						<div className="game-shell__layout" aria-hidden="true" inert="">
							<section className="game-shell__stage" aria-label="游戏牌桌">
								<div className="game-shell__stage-bar">
									<div>
										<span>{status.phase}</span>
										<small className={'game-shell__connection game-shell__connection--' + connectionTone} aria-label="连接状态">
											{status.connection}
										</small>
									</div>
									<div className="game-shell__phase-panel">
										<ol className="game-shell__phase-track" aria-label="对局阶段">
											{PHASE_STEPS.map((phase, index) => {
												const phaseState = index < phaseProgress.index
													? 'complete'
													: index === phaseProgress.index ? 'active' : 'pending';
												return (
													<li
														key={phase}
														className={'game-shell__phase-step game-shell__phase-step--' + phaseState}
														aria-current={phaseState === 'active' ? 'step' : undefined}
													>
														<span>{phase}</span>
													</li>
												);
											})}
										</ol>
										<div
											className="game-shell__phase-progress"
											role="progressbar"
											aria-label="对局进度"
											aria-valuemin="0"
											aria-valuemax="100"
											aria-valuenow={phaseProgress.percent}
										>
											<span style={{width: phaseProgress.percent + '%'}} />
										</div>
									</div>
								</div>
								<div className="game-shell__stage-placeholder" />
								</section>
								<aside className="game-shell__rail" aria-label="牌桌状态">
									<div className={'game-shell__rail-section game-shell__advisor game-shell__advisor--' + actionAdvisor.tone} aria-label="行动建议">
										<span className="game-shell__label">行动建议</span>
										<strong>{actionAdvisor.label}</strong>
										<span className="game-shell__hint">{actionAdvisor.detail}</span>
										<small>{actionAdvisor.secondary}</small>
									</div>
									<div className="game-shell__rail-section game-shell__table-status">
									<span className="game-shell__label">牌桌状态</span>
									<strong>{status.roomLabel}</strong>
									<span className="game-shell__hint">{status.lastAction}</span>
									<div className={'game-shell__ready-progress game-shell__ready-progress--' + readyProgress.tone} aria-label="准备进度">
										<div>
											<span>准备进度</span>
											<strong>{readyProgress.label}</strong>
										</div>
										<div
											className="game-shell__ready-track"
											role="progressbar"
											aria-label="玩家准备进度"
											aria-valuemin="0"
											aria-valuemax="100"
											aria-valuenow={readyProgress.percent}
										>
											<span className="game-shell__ready-fill" style={{width: readyProgress.percent + '%'}} />
										</div>
									</div>
								</div>
								<div className={turnFocusClassName} aria-label="当前操作状态">
									<div>
										<span className="game-shell__label">当前操作</span>
										<strong>{actionStateLabel}</strong>
									</div>
									<div>
										<span className="game-shell__label">回合</span>
										<strong>{status.turnLabel}</strong>
									</div>
									<p>{status.actionHint}</p>
									{status.selectedPokerLabel && (
										<div className="game-shell__selected-ranks" aria-label="已选牌面">
											<span>{status.selectedPokerTypeLabel || '已选牌'}</span>
											<strong>{status.selectedPokerLabel}</strong>
										</div>
									)}
								</div>
								<div className="game-shell__rail-section game-shell__seats" aria-label="玩家座位">
									<span className="game-shell__label">玩家座位</span>
									<ul className="game-shell__seat-list">
										{seatSummaries.map((seat, index) => {
											const pressure = getSeatPressure(seat);
											const seatBadges = getSeatStatusBadges(seat, pressure);
											const className = [
												'game-shell__seat',
												seat.turn ? 'game-shell__seat--turn' : '',
												seat.left ? 'game-shell__seat--left' : '',
												pressure.tone !== 'normal' ? 'game-shell__seat--' + pressure.tone : '',
											].filter(Boolean).join(' ');
											return (
												<li
													key={seat.seat + seat.name + index}
													className={className}
												>
													<span>{seat.seat}</span>
													<strong>{seat.name}</strong>
													<div className="game-shell__seat-badges" aria-label={seat.seat + '状态'}>
														{seatBadges.map(badge => (
															<b
																key={badge.label}
																className={'game-shell__seat-badge game-shell__seat-badge--' + badge.tone}
															>
																{badge.label}
															</b>
														))}
													</div>
													<small className="game-shell__seat-meta">
														<span><b>手牌</b>{seat.cardCount} 张</span>
														<span><b>积分</b>{seat.point}</span>
													</small>
												</li>
											);
										})}
									</ul>
								</div>
								<div className="game-shell__rail-section game-shell__pulse" aria-label="牌局脉搏">
									<span className="game-shell__label">牌局脉搏</span>
									<ul className="game-shell__pulse-list">
										<li className={'game-shell__pulse-item game-shell__pulse-item--' + tablePulse.leaderTone}>
											<span>领跑</span>
											<strong>{tablePulse.leaderLabel}</strong>
											<small>{tablePulse.leaderDetail}</small>
										</li>
										<li className={'game-shell__pulse-item game-shell__pulse-item--' + tablePulse.pressureTone}>
											<span>压力</span>
											<strong>{tablePulse.pressureLabel}</strong>
											<small>{tablePulse.pressureDetail}</small>
										</li>
										<li className={'game-shell__pulse-item game-shell__pulse-item--' + tablePulse.paceTone}>
											<span>节奏</span>
											<strong>{tablePulse.paceLabel}</strong>
											<small>{tablePulse.paceDetail}</small>
										</li>
									</ul>
								</div>
								<div className="game-shell__metrics">
									<div className="game-shell__metric">
										<span>人数</span>
										<strong>{status.playerCount}/3</strong>
									</div>
									<div className="game-shell__metric">
										<span>准备</span>
										<strong>{status.readyCount}/3</strong>
									</div>
									<div className="game-shell__metric">
										<span>场次</span>
										<strong>{status.roomLevelLabel}</strong>
									</div>
									<div className="game-shell__metric">
										<span>底分</span>
										<strong>{status.roomOrigin}</strong>
									</div>
									<div
										className={'game-shell__metric game-shell__metric--multiple game-shell__metric--' + multipleRisk.tone}
										aria-label={'当前倍数风险：' + multipleRisk.label + '，' + multipleRisk.detail}
									>
										<span>倍数</span>
										<strong>x{status.multiple}</strong>
										<small>{multipleRisk.label}</small>
									</div>
									<div className="game-shell__metric">
										<span>地主</span>
										<strong>{status.landlordLabel}</strong>
									</div>
									<div className="game-shell__metric">
										<span>身份</span>
										<strong>{status.localRoleLabel}</strong>
									</div>
									<div className={timerMetricClassName}>
										<span>计时</span>
										<strong>{timerSummary.valueLabel}</strong>
										<small>{timerSummary.stateLabel}</small>
										<div
											className="game-shell__timer-track"
											role="progressbar"
											aria-label="剩余出牌时间"
											aria-valuemin="0"
											aria-valuemax="40"
											aria-valuenow={timerProgressValue}
										>
											<span className="game-shell__timer-fill" style={{width: timerProgress + '%'}} />
										</div>
									</div>
									<div className="game-shell__metric">
										<span>手牌</span>
										<strong>{status.localHandCount}</strong>
									</div>
									<div className="game-shell__metric">
										<span>已选</span>
										<strong>{status.selectedPokerCount}</strong>
									</div>
								</div>
									<div className="game-shell__rail-section game-shell__round-state">
									<span className="game-shell__label">当前回合</span>
									<strong>{status.turnLabel}</strong>
									<span className="game-shell__hint">底牌 {status.bottomCount} 张</span>
									{status.bottomPokerLabel && (
										<div className="game-shell__bottom-ranks" aria-label="底牌牌面">
											<span>{status.bottomPokerTypeLabel || '底牌'}</span>
											<strong>{status.bottomPokerLabel}</strong>
										</div>
									)}
								</div>
								<div className="game-shell__rail-section game-shell__quick-chat" aria-label="快捷语">
									<span className="game-shell__label">快捷语</span>
									<div className="game-shell__quick-chat-presets">
										{QUICK_CHAT_MESSAGES.map(message => (
											<button
												key={message}
												type="button"
												onClick={() => this.handleQuickChat(message)}
											>
												{message}
											</button>
										))}
									</div>
									<form onSubmit={this.handleChatSubmit}>
										<input
											type="text"
											className="game-shell__chat-input"
											value={chatDraft}
											onChange={this.handleChatDraftChange}
											placeholder="自定义短句"
											maxLength={CHAT_MESSAGE_LIMIT}
											aria-label="自定义快捷语"
											aria-describedby="game-chat-counter"
										/>
										<button type="submit" disabled={!canSendChatDraft}>发送</button>
									</form>
									<div className="game-shell__chat-meta">
										<span id="game-chat-counter">{chatDraftLength}/{CHAT_MESSAGE_LIMIT}</span>
									</div>
									{chatReceipt && (
										<div
											className={'game-shell__chat-receipt game-shell__chat-receipt--' + chatReceipt.tone}
											role="status"
											aria-live="polite"
										>
											<span>{chatReceipt.label}</span>
											<strong>{chatReceipt.message}</strong>
										</div>
									)}
								</div>
								<div className={actionHintClassName} aria-label="操作提示" role="status" aria-live="polite">
									<span className="game-shell__label">操作提示</span>
									<strong>{status.actionHint}</strong>
								</div>
								{status.resultSummary && (
									<div className="game-shell__rail-section game-shell__result" aria-label="结算摘要">
										<span className="game-shell__label">结算摘要</span>
										<strong>{status.resultSummary}</strong>
										{status.multipleSummary && (
											<span className="game-shell__hint">{status.multipleSummary}</span>
										)}
										{localSettlement && (
											<div className={'game-shell__local-settlement game-shell__local-settlement--' + localSettlement.tone} aria-label="我的本局结算">
												<div>
													<span>{localSettlement.label}</span>
													<strong>{localSettlement.pointLabel}</strong>
												</div>
												<small>{localSettlement.balanceLabel}</small>
											</div>
										)}
										{scoreRows.length > 0 && (
											<ul className="game-shell__score-list" aria-label="结算分数">
												{scoreRows.map((row, index) => {
													const isLocalRow = isLocalScoreRow(row, this.state.uid);
													return (
														<li
															key={row.uid + row.name + index}
															className={getScoreRowClassName(row, this.state.uid)}
															aria-current={isLocalRow ? 'true' : undefined}
														>
															<span>
																{row.name}
																{isLocalRow && <b>你</b>}
															</span>
															<div className="game-shell__score-points">
																<strong>{getScorePointLabel(row.point)}</strong>
																{row.balance !== null && row.balance !== undefined && (
																	<small>余额 {row.balance}</small>
																)}
															</div>
														</li>
													);
												})}
											</ul>
										)}
									</div>
								)}
								{roundHistory.length > 0 && (
									<div className="game-shell__rail-section game-shell__round-history" aria-label="近局战绩">
										<span className="game-shell__label">近局战绩</span>
										{roundHistoryStats.rounds > 0 && (
											<div className="game-shell__round-summary" aria-label="近局积分趋势">
												<div>
													<span>净胜分</span>
													<strong className={'game-shell__round-summary-point game-shell__round-summary-point--' + getScorePointTone(roundHistoryStats.totalPoint)}>
														{getScorePointLabel(roundHistoryStats.totalPoint)}
													</strong>
												</div>
												<div>
													<span>胜负</span>
													<strong>{roundHistoryStats.wins}胜 {roundHistoryStats.losses}负</strong>
												</div>
												<div>
													<span>走势</span>
													<strong className={'game-shell__round-summary-point game-shell__round-summary-point--' + roundHistoryStats.streakTone}>
														{roundHistoryStats.streakLabel}
													</strong>
												</div>
											</div>
										)}
										<ul className="game-shell__round-history-list">
											{roundHistory.map((entry, index) => (
												<li key={entry.signature + index} className="game-shell__round-history-item">
													<div className="game-shell__round-history-head">
														<span>{entry.roomLabel}</span>
														{entry.localPoint !== null && entry.localPoint !== undefined && (
															<strong className={'game-shell__round-history-delta game-shell__round-history-delta--' + getScorePointTone(entry.localPoint)}>
																{getScorePointLabel(entry.localPoint)}
															</strong>
														)}
													</div>
													<strong>{entry.resultSummary}</strong>
													{entry.multipleSummary && (
														<small>{entry.multipleSummary}</small>
													)}
												</li>
											))}
										</ul>
									</div>
								)}
									<div className="game-shell__rail-section game-shell__last-shot">
									<span className="game-shell__label">上一手</span>
									<strong>{status.lastShotLabel}</strong>
									{status.lastShotPokerLabel && (
										<div className="game-shell__shot-ranks" aria-label="上一手牌面">
											<span>{status.lastShotPokerTypeLabel || '出牌'}</span>
											<strong>{status.lastShotPokerLabel}</strong>
										</div>
									)}
								</div>
								<div className="game-shell__rail-section game-shell__activity">
									<span className="game-shell__label">牌桌动态</span>
									<ul
										className="game-shell__activity-list"
										role="log"
										aria-label="牌桌动态"
										aria-live="polite"
										aria-relevant="additions text"
									>
										{statusLog.map((entry, index) => (
											<li
												key={entry.phase + entry.message + index}
												className={'game-shell__activity-item game-shell__activity-item--' + (entry.tone || 'waiting')}
												aria-label={entry.phase + ': ' + entry.message}
												aria-current={index === 0 ? 'true' : undefined}
											>
												<i aria-hidden="true" />
												<span>{entry.phase}</span>
												<strong>{entry.message}</strong>
												{index === 0 && <b>最新</b>}
											</li>
										))}
									</ul>
								</div>
							</aside>
						</div>
					</div>
				);
		}
	}
}

export default App;
export {
	buildRoundHistoryStats,
	buildRoundHistory,
	createRoundHistoryEntry,
	createChatReceipt,
	getLocalSettlementSummary,
	getScoreRowClassName,
	getReadyProgress,
	getConnectionTone,
	getMultipleRisk,
	getPhaseProgress,
	isLocalScoreRow,
	getActionStateLabel,
	getActionAdvisor,
	getScorePointLabel,
	getScorePointTone,
	getSeatPressure,
	getSeatStatusBadges,
	getTablePulse,
	getTurnTimerSummary,
	getLocalSeatPoint,
	getStoredToken,
	postAdminRobotStatus,
	readStoredSession,
	removeStoredItem,
	ROUND_HISTORY_LIMIT,
	setStoredItem,
	storeSessionRoom,
};
