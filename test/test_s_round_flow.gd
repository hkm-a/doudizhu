extends GdUnitTestSuite


func test_round_flow_system_shell_loads() -> void:
	var system: RoundFlowSystem = auto_free(RoundFlowSystem.new()) as RoundFlowSystem
	assert_that(system).is_not_null()
	assert_that(system.model_class()).is_equal("DoudizhuGame")


func test_component_defaults_match_plan() -> void:
	assert_that(C_RoundState.new().phase).is_equal("setup")
	assert_that(C_Role.new().role).is_equal("undecided")
	assert_that(C_TurnState.new().initiative_seat).is_equal(-1)
	assert_that(C_TrickState.new().owner_seat).is_equal(-1)
