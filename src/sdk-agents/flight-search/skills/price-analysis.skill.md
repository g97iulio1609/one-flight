# Price Analysis Skill

## When Analyzing Flight Prices

1. **Calculate Statistics**
   - Average price per direction (outbound, return)
   - Price range (min - max)
   - Standard deviation to identify outliers

2. **Identify Good Deals**
   - Flag as "excellent" if price < average - 20%
   - Flag as "good value" if price < average - 10%
   - Flag as "expensive" if price > average + 20%

3. **Compare Flight Types**
   - Calculate direct flight premium vs. connecting
   - If premium < 25%, recommend direct as better value
   - If premium > 50%, highlight savings potential with connections

4. **Price Context**
   - Consider day of week (weekday vs weekend)
   - Note if departure time affects price (early morning = cheaper)
   - Compare one-way combo vs round-trip pricing

## Output Format for Price Insights

Always provide specific numbers in analysis:
- "The average outbound price is €245"
- "Direct flights cost €65 more on average (27% premium)"
- "The €189 option is 23% below average - excellent value"
