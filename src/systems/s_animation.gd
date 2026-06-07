class_name AnimationSystem extends System

var _tween_pool: Array[Tween] = []


func query() -> QueryBuilder:
	return q.with_all([C_CardAnimationState])


func process(entities: Array[Entity], components: Array, _delta: float) -> void:
	for i in entities.size():
		var entity: Entity = entities[i]
		var comp: C_CardAnimationState = components[i]

		if comp.animation_type == "flight":
			_process_flight(entity, comp)
		elif comp.animation_type == "bounce":
			_process_bounce(entity, comp)


func play_flight_animation(card_button: Button, target_pos: Vector2, duration_secs: float = 0.35) -> Tween:
	var tween := create_tween()
	tween.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	tween.tween_property(card_button, "position", target_pos, duration_secs)
	_tween_pool.append(tween)
	tween.finished.connect(func() -> void:
		if tween in _tween_pool:
			_tween_pool.erase(tween)
	)
	return tween


func play_bounce_animation(card_button: Button, bounce_height: float = 8.0, duration_secs: float = 0.2) -> Tween:
	var tween := create_tween()
	tween.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_SINE)
	tween.tween_property(card_button, "position:y", card_button.position.y - bounce_height, duration_secs * 0.5)
	tween.tween_property(card_button, "position:y", card_button.position.y, duration_secs * 0.5)
	_tween_pool.append(tween)
	tween.finished.connect(func() -> void:
		if tween in _tween_pool:
			_tween_pool.erase(tween)
	)
	return tween


func get_animation_progress() -> Dictionary:
	var result: Dictionary = {}
	for tween in _tween_pool:
		if is_instance_valid(tween):
			var props: Array = tween.get_tweenable_properties()
			for prop_info in props:
				var key: String = String(prop_info["id"])
				result[key] = tween.tween_get_progress(prop_info["id"])
	return result


func _process_flight(entity: Entity, comp: C_CardAnimationState) -> void:
	comp.progress += 1.0 / maxf(comp.duration * 60.0, 1.0)
	if comp.progress >= 1.0:
		comp.animation_type = "idle"
		comp.progress = 0.0


func _process_bounce(entity: Entity, comp: C_CardAnimationState) -> void:
	comp.progress += 1.0 / maxf(comp.duration * 60.0, 1.0)
	if comp.progress >= 1.0:
		comp.animation_type = "idle"
		comp.progress = 0.0
