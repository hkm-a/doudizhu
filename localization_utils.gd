class_name LocalizationUtils
extends RefCounted

## Simple localization system.
## Uses built-in StringName resources for now.
## Later can be extended to load from CSV/JSON files.

func string(key: String) -> String:
	match key:
		"label.help":
			return "支持：单张、对子、三张、三带一、三带对、顺子、连对、飞机、炸弹、王炸。\n仅能跟牌时不出。如果两名对手都过，最后出牌者先出。\n提示选择最低成本的合法出牌。\n先出完手牌的一方获胜。"
		"label.close":
			return "关闭"
		"label.settings":
			return "设置"
		"label.role":
			return "角色"
		"label.count":
			return "牌数"
		"label.turn":
			return "回合"
		"label.recent":
			return "最近"
		"label.reason":
			return "原因"
		"seat.player":
			return "玩家"
		"seat.ai_left":
			return "AI 左"
		"seat.ai_right":
			return "AI 右"
		"action.call_landlord":
			return "叫地主"
		"action.decline_landlord":
			return "不叫"
		_:
			return key
