# Data Model: 斗地主网页版

## Entity Relationship

```
Game 1──* Card
Game 1──1 Trick (activeTrick)
Game *──* Play (playedCards)
Game 1──* History (localStorage)
```

## Card

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| id | number | 0-53 | 唯一标识 |
| rank | number | 3-17 | 牌面值。3-14=A, 15=2, 16=小王, 17=大王 |
| suit | number | 0-3 | 0=♠, 1=♥, 2=♦, 3=♣ |
| is_joker | boolean | | 是否为王 |
| label | string | | 显示文本 |

## Game State

| Field | Type | Description |
|-------|------|-------------|
| phase | enum | SETUP/DEAL/BIDDING/PLAY/RESULT |
| currentSeat | 0-2 | 当前行动座位 |
| landlordSeat | -1/0/1/2 | 地主座位 |
| hands[3] | Card[][] | 三方手牌 |
| bottomCards | Card[] | 底牌（3张） |
| activeTrick | Play | 当前牌型 |
| multiplier | number | 倍数（炸弹/火箭叠加） |
| selectedCards | number[] | 玩家选中的牌ID |
| playedCards | Card[] | 已打出的牌 |
| playedRanks | Map | 各 rank 已出数量 |

## Play (牌型)

| Field | Type | Description |
|-------|------|-------------|
| pattern | string | Single/Pair/Triple/Triple+1/Triple+2/Straight/Consecutive Pairs/Airplane/Bomb/Rocket |
| primary_rank | number | 主 rank |
| count | number | 总张数 |
| cards | Card[] | 具体牌 |
| structural_length | number | 结构长度（连牌数量） |
| owner_seat | number | 出牌者 |

## Card Pattern Classification Rules

| Pattern | Name | Count | Rank Constraint |
|---------|------|-------|-----------------|
| Single | 单张 | 1 | any |
| Pair | 对子 | 2 | same rank |
| Triple | 三条 | 3 | same rank |
| Triple+1 | 三带一 | 4 | 3 same + 1 |
| Triple+2 | 三带二 | 5 | 3 same + 1 pair |
| Straight | 顺子 | ≥5 | consecutive, rank ≤ 14 |
| Consecutive Pairs | 连对 | ≥6 | 3+ consecutive pairs, rank ≤ 14 |
| Airplane | 飞机 | 3N | N consecutive triples, rank ≤ 14 |
| Airplane+Singles | 飞机带单 | 4N | N triples + N singles |
| Airplane+Pairs | 飞机带对 | 5N | N triples + N pairs |
| Bomb | 炸弹 | 4 | 4 same rank |
| Rocket | 火箭 | 2 | 小王 + 大王 |

## localStorage Schema

### doudizhu_history
```json
[{
  "seed": 42,
  "winner": "landlord" | "farmers",
  "landlord": 0,
  "multiplier": 8,
  "spring": true,
  "humanWon": true,
  "ts": 1718123456789
}]
```

### doudizhu_settings
```json
{
  "speed": 500,
  "difficulty": "normal"
}
```
