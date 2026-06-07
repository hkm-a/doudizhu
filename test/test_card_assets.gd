extends GdUnitTestSuite


func test_card_id_to_suit_mapping() -> void:
	assert_that(CardAssets.card_id_to_suit(0)).is_equal("S")
	assert_that(CardAssets.card_id_to_suit(1)).is_equal("H")
	assert_that(CardAssets.card_id_to_suit(2)).is_equal("C")
	assert_that(CardAssets.card_id_to_suit(3)).is_equal("D")
	assert_that(CardAssets.card_id_to_suit(4)).is_equal("S")
	assert_that(CardAssets.card_id_to_suit(13)).is_equal("D")
	assert_that(CardAssets.card_id_to_suit(51)).is_equal("D")


func test_card_id_to_rank_mapping() -> void:
	assert_that(CardAssets.card_id_to_rank(0)).is_equal(3)
	assert_that(CardAssets.card_id_to_rank(3)).is_equal(4)
	assert_that(CardAssets.card_id_to_rank(4)).is_equal(5)
	assert_that(CardAssets.card_id_to_rank(12)).is_equal(6)
	assert_that(CardAssets.card_id_to_rank(47)).is_equal(15)
	assert_that(CardAssets.card_id_to_rank(48)).is_equal(3)
	assert_that(CardAssets.card_id_to_rank(51)).is_equal(15)


func test_card_image_loaded_for_standard_cards() -> void:
	for rank in range(3, 16):
		for suit in ["S", "H", "C", "D"]:
			var card_id := CardAssetsScript._card_id_from_rank_suit(rank, suit)
			assert_that(CardAssets.has_card_image(card_id)).is_equal(
				true,
				"Card %d (%s%s) should have image" % [card_id, CardRules.RANK_LABELS[rank], suit]
			)
			var tex := CardAssets.get_card_image(card_id)
			assert_that(tex).is_not_null()
			assert_that(tex is Texture2D).is_equal(true)


func test_joker_images_loaded() -> void:
	assert_that(CardAssets.has_card_image(52)).is_equal(true)
	assert_that(CardAssets.has_card_image(53)).is_equal(true)
	var red_joker := CardAssets.get_card_image(52)
	assert_that(red_joker).is_not_null()
	assert_that(red_joker is Texture2D).is_equal(true)
	var black_joker := CardAssets.get_card_image(53)
	assert_that(black_joker).is_not_null()
	assert_that(black_joker is Texture2D).is_equal(true)


func test_card_back_texture_loaded() -> void:
	var back := CardAssets.get_card_back()
	assert_that(back).is_not_null()
	assert_that(back is Texture2D).is_equal(true)


func test_table_bg_texture_loaded() -> void:
	var bg := CardAssets.get_table_bg()
	assert_that(bg).is_not_null()
	assert_that(bg is Texture2D).is_equal(true)


func test_card_image_consistency_across_calls() -> void:
	var tex1 := CardAssets.get_card_image(0)
	var tex2 := CardAssets.get_card_image(0)
	assert_that(tex1).is_same(tex2)


func test_joker_image_consistency_across_calls() -> void:
	var tex1 := CardAssets.get_card_image(52)
	var tex2 := CardAssets.get_card_image(52)
	assert_that(tex1).is_same(tex2)
	var tex3 := CardAssets.get_card_image(53)
	var tex4 := CardAssets.get_card_image(53)
	assert_that(tex3).is_same(tex4)
