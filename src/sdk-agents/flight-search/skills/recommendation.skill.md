# Recommendation Skill

## Recommendation Strategy Selection

Based on user preference, apply these weights:

### Price Priority (User wants cheapest)
- Price: 70%
- Duration: 20%
- Convenience: 10%

### Duration Priority (User wants fastest)
- Price: 20%
- Duration: 60%
- Convenience: 20%

### Convenience Priority (User wants easiest)
- Price: 15%
- Duration: 25%
- Convenience: 60%

### Best Value (Default/Balanced)
- Price: 40%
- Duration: 30%
- Convenience: 30%

## Strategy Labels

Use these strategy codes:
- `best_value`: Best balance of price, time, and convenience
- `cheapest`: Lowest total cost regardless of inconvenience
- `fastest`: Shortest total travel time
- `most_convenient`: Direct flights with good timing
- `flexible_combo`: When one-way booking saves money

## Reasoning Requirements

Every recommendation MUST include:
1. **Specific price** with currency
2. **Time comparison** vs alternatives
3. **Why this beats alternatives** (1-2 sentences)
4. **Confidence score** (0.0-1.0)

### Good Example:
"Recommending the €245 Emirates direct flight (confidence: 0.85). While the €198 Turkish Airlines option is €47 cheaper, the direct flight saves 4 hours and avoids the 3-hour Istanbul layover. The time value exceeds the price premium."

### Bad Example:
"This flight is recommended because it's good."
