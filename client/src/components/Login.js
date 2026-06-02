import React from 'react'
import './Login.css'
import {
	canEnterRoomLevel,
	getRoomLevelPointShortfall,
	getSelectableRoomLevel,
	getRoomLevelStatus,
	normalizePlayerPoint,
	normalizeRoomLevel,
	normalizeRoomOptions,
	readStoredRoomLevel,
	storeRoomLevel,
} from '../game/roomLevel'
import {
	getStoredRoomId,
	storeCurrentRoomId,
} from '../game/sync'

const LOGIN_NAME_LIMIT = 50;

// const cookie = function (name) {
// 	let r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
// 	return r ? r[1] : undefined;
// };

const post = function (url, data, callback) {
	let xhr = new XMLHttpRequest();
	let settled = false;
	const finish = function (error, response) {
		if (settled) {
			return;
		}
		settled = true;
		callback(error, response);
	};
	xhr.open('POST', url, true);
	xhr.setRequestHeader('Content-type', 'application/json');
	xhr.timeout = 10000;
	// xhr.setRequestHeader('X-Csrftoken', cookie("_xsrf"));
	xhr.onreadystatechange = function () {
		if (xhr.readyState === XMLHttpRequest.DONE) {
			let response = {};
			try {
				response = JSON.parse(xhr.responseText || '{}');
			} catch (error) {
				response = {detail: '登录响应格式异常'};
			}
			if (xhr.status === 200) {
				finish(null, response);
			} else {
				finish(response.detail || '登录失败');
			}
		}
	};
	xhr.onerror = function () {
		finish('无法连接本地服务，请确认后端已启动');
	};
	xhr.ontimeout = function () {
		finish('登录请求超时，请稍后重试');
	};
	xhr.send(JSON.stringify(data));
};

const getHealth = function (callback) {
	let xhr = new XMLHttpRequest();
	let settled = false;
	const finish = function (error, response) {
		if (settled) {
			return;
		}
		settled = true;
		callback(error, response);
	};
	xhr.open('GET', '/healthz', true);
	xhr.timeout = 4000;
	xhr.onreadystatechange = function () {
		if (xhr.readyState === XMLHttpRequest.DONE) {
			let response = {};
			try {
				response = JSON.parse(xhr.responseText || '{}');
			} catch (error) {
				response = {};
			}
			if (xhr.status === 200 && response.status === 'ok') {
				finish(null, response);
			} else {
				finish('本地服务状态异常');
			}
		}
	};
	xhr.onerror = function () {
		finish('本地服务未连接');
	};
	xhr.ontimeout = function () {
		finish('本地服务检查超时');
	};
	xhr.send();
};

const formatLobbySummary = function (lobby) {
	const summary = lobby || {};
	const players = Number(summary.players);
	const waitingRooms = Number(summary.waiting_rooms);
	const playingRooms = Number(summary.playing_rooms);
	const playerCount = Number.isFinite(players) ? players : 0;
	const roomCount = (Number.isFinite(waitingRooms) ? waitingRooms : 0)
		+ (Number.isFinite(playingRooms) ? playingRooms : 0);
	return '在线 ' + playerCount + ' · 房间 ' + roomCount;
};

const readStoredLoginName = function (storage = localStorage) {
	try {
		return storage.getItem('name') || 'player';
	} catch (error) {
		return 'player';
	}
};

const readStoredLoginPoint = function (storage = localStorage) {
	try {
		return normalizePlayerPoint(storage.getItem('point'));
	} catch (error) {
		return 1000;
	}
};

class Login extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			name: readStoredLoginName(),
			error: '',
			loading: false,
			healthStatus: 'checking',
			healthMessage: '检查中',
			robots: null,
			lobbySummary: '大厅待确认',
			point: readStoredLoginPoint(),
			roomLevel: readStoredRoomLevel(),
			resumeRoomId: getStoredRoomId(),
			roomOptions: normalizeRoomOptions(),
		};
		this.isMountedFlag = false;
		this.handleChange = this.handleChange.bind(this);
		this.handleResumeClear = this.handleResumeClear.bind(this);
		this.handleRoomLevelChange = this.handleRoomLevelChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
		this.refreshHealth = this.refreshHealth.bind(this);
	}

	componentDidMount() {
		this.isMountedFlag = true;
		this.refreshHealth();
	}

	componentWillUnmount() {
		this.isMountedFlag = false;
	}

	refreshHealth() {
		this.setState({
			error: '',
			healthStatus: 'checking',
			healthMessage: '检查中',
			robots: null,
			lobbySummary: '大厅待确认',
		});
		getHealth((error, response) => {
			if (!this.isMountedFlag) {
				return;
			}
			if (error) {
				this.setState({
					healthStatus: 'offline',
					healthMessage: error,
					robots: null,
					lobbySummary: '大厅离线',
				});
				return;
			}
			this.setState({
				healthStatus: 'online',
				healthMessage: '服务在线',
				robots: Boolean(response && response.robots),
				lobbySummary: formatLobbySummary(response && response.lobby),
				roomOptions: normalizeRoomOptions(response && response.rooms),
				roomLevel: getSelectableRoomLevel(response && response.rooms, this.state.roomLevel, this.state.point),
			});
		});
	}

	handleChange(event) {
		const target = event.target;
		const name = target.name;
		this.setState({
			[name]: event.target.value,
			error: '',
		});
	}

	handleRoomLevelChange(event) {
		const level = storeRoomLevel(event.target.value);
		storeCurrentRoomId(-1);
		this.setState({
			roomLevel: level,
			resumeRoomId: -1,
			error: '',
		});
	}

	handleResumeClear() {
		storeCurrentRoomId(-1);
		this.setState({
			resumeRoomId: -1,
			error: '',
		});
	}

	handleSubmit(event) {
		event.preventDefault();
		const name = this.state.name.trim();
		if (this.state.healthStatus !== 'online') {
			this.setState({error: this.state.healthStatus === 'checking' ? '服务检查中，请稍候' : '本地服务未连接，请先重试'});
			return;
		}
		if (!name) {
			this.setState({error: '请先输入昵称'});
			return;
		}
		if (name.length > LOGIN_NAME_LIMIT) {
			this.setState({error: '昵称最多 ' + LOGIN_NAME_LIMIT + ' 个字'});
			return;
		}
		const data = {"name": name};
		const self = this;
		this.setState({error: '', loading: true});
		post('/login', data, (error, response) => {
			if (error) {
				self.setState({error: error, loading: false});
				return;
			}
			if (!response || !response.token) {
				self.setState({error: '登录响应缺少 token', loading: false});
				return;
			}
			const responsePoint = normalizePlayerPoint(response.point, self.state.point);
			const responseRooms = response.rooms || self.state.roomOptions;
			const requestedRoomLevel = normalizeRoomLevel(self.state.roomLevel);
			const nextRoomLevel = getSelectableRoomLevel(responseRooms, requestedRoomLevel, responsePoint);
			storeRoomLevel(nextRoomLevel);
			if (nextRoomLevel !== requestedRoomLevel) {
				storeCurrentRoomId(-1);
				response = {
					...response,
					room: -1,
				};
			}
			self.setState({loading: false});
			self.props.onChange("game", response);
		});
	}

	render() {
		const isBusy = this.state.loading;
		const hasLoginName = String(this.state.name || '').trim().length > 0;
		const canSubmit = !isBusy && this.state.healthStatus === 'online' && hasLoginName;
		const errorId = 'login-name-error';
		const hasError = Boolean(this.state.error);
		const selectedRoomLevel = normalizeRoomLevel(this.state.roomLevel);
		const availableRoomCount = this.state.roomOptions.filter(room => canEnterRoomLevel(room, this.state.point)).length;
		const hasResumeRoom = Number(this.state.resumeRoomId) > 0;
		const healthStatusClassName = 'login-status__item login-status__item--' + this.state.healthStatus;
		const robotStatusClassName = 'login-status__item login-status__item--' + (
			this.state.robots === null ? 'checking' : this.state.robots ? 'online' : 'offline'
		);
		const submitLabel = isBusy
			? '连接中...'
			: this.state.healthStatus === 'checking' ? '检查服务...'
				: this.state.healthStatus === 'offline' ? '服务离线'
					: hasLoginName ? '进入牌桌' : '输入昵称';
		return (
			<div className="login-page" data-ui-theme="happy-doudizhu">
				<main className="login-panel" aria-labelledby="login-title" data-ui-theme="happy-doudizhu">
					<div className="login-brand">
						<span className="login-brand__tile">斗</span>
						<div>
							<p className="login-kicker">金币赛场 · 三人开局</p>
							<h1 id="login-title" className="login-head">欢乐斗地主</h1>
						</div>
					</div>
					<div className="login-status" aria-label="当前运行状态">
						<span className={healthStatusClassName}>{this.state.healthMessage}</span>
						<span className={robotStatusClassName}>
							{this.state.robots === null ? '机器人待确认' : this.state.robots ? '机器人补位开启' : '机器人补位关闭'}
						</span>
						<span className="login-status__item login-status__item--lobby">{this.state.lobbySummary}</span>
					</div>
					<div className="login-account-summary" aria-label="账户积分">
						<span>积分 {this.state.point}</span>
						<strong>可入场 {availableRoomCount}/{this.state.roomOptions.length}</strong>
					</div>
					{hasResumeRoom && (
						<div className="login-resume" role="status">
							<div>
								<span>继续房间</span>
								<strong>{this.state.resumeRoomId}</strong>
							</div>
							<button type="button" onClick={this.handleResumeClear} disabled={isBusy}>
								重新匹配
							</button>
						</div>
					)}
					{this.state.healthStatus === 'offline' && (
						<div className="login-health" role="status">
							<span>{this.state.healthMessage}</span>
							<button type="button" onClick={this.refreshHealth}>重试</button>
						</div>
					)}
					<div className="login-room-picker" role="radiogroup" aria-label="选择入场场次">
						{this.state.roomOptions.map(room => {
							const roomLevel = normalizeRoomLevel(room.level);
							const isSelected = roomLevel === selectedRoomLevel;
							const roomStatus = getRoomLevelStatus(room, this.state.point);
							const canEnter = canEnterRoomLevel(room, this.state.point);
							const pointShortfall = getRoomLevelPointShortfall(room, this.state.point);
							return (
								<label
									key={roomLevel}
									className={[
										'login-room-option',
										'login-room-option--' + roomStatus.tone,
										isSelected ? 'login-room-option--selected' : '',
									].filter(Boolean).join(' ')}
								>
									<input
										type="radio"
										name="roomLevel"
										value={roomLevel}
										checked={isSelected}
										onChange={this.handleRoomLevelChange}
										disabled={isBusy}
									/>
									<span>{room.label}</span>
									<strong>底分 {room.origin}</strong>
									<small>{room.number} 人 · 入场 {room.minPoint} · {roomStatus.label}</small>
									{!canEnter && pointShortfall > 0 && (
										<em>还差 {pointShortfall} 积分</em>
									)}
								</label>
							);
						})}
					</div>
					<form onSubmit={this.handleSubmit} className="login-form">
						<label htmlFor="name">昵称</label>
						<input type="text"
									 id="name"
									 name="name"
									 value={this.state.name}
									 onChange={this.handleChange}
									 placeholder="输入昵称"
									 maxLength={LOGIN_NAME_LIMIT}
									 disabled={isBusy}
									 aria-invalid={hasError}
									 aria-describedby={hasError ? errorId : 'login-name-meta'}
									 required/>
						<div id="login-name-meta" className="login-name-meta">最多 {LOGIN_NAME_LIMIT} 个字</div>
						{hasError && <div id={errorId} className="login-error" role="alert">{this.state.error}</div>}
						<button type="submit" className="submit" disabled={!canSubmit}>
							{submitLabel}
						</button>
					</form>
				</main>
			</div>
		)
	}

}

export {Login, formatLobbySummary, getHealth, post, readStoredLoginName, readStoredLoginPoint};
