func test_joker_comparison() -> void:
	var sj := {"rank": 16, "id": 52}
	var bj := {"rank": 17, "id": 53}
	
	var sj_class := CardRules.classify([sj])
	var bj_class := CardRules.classify([bj])
	
	print("SJ class: ", sj_class)
	print("BJ class: ", bj_class)
	print("BJ beats SJ: ", CardRules.can_beat(bj_class, sj_class))
	
	assert_that(bool(bj_class.valid)).is_true()
	assert_that(int(bj_class.primary_rank)).is_equal(17)
	assert_that(int(sj_class.primary_rank)).is_equal(16)
	assert_that(CardRules.can_beat(bj_class, sj_class)).is_true()
