# Data Integrations

The original SEO Machine repo supports multiple data sources. This skill should consume the same information, whether live or exported.

## Supported Sources

- **Google Analytics 4** — traffic, engagement, page performance
- **Google Search Console** — queries, positions, clicks, impressions, CTR
- **DataForSEO** — search volume, competition, SERP data, keyword opportunities
- **WordPress** — publishing target and source content
- **internal business data** — conversions, revenue, sales priorities, campaign targets

## Integration Rule

Do not store credentials in the repository. Use the host project's secret-management process and feed Copilot only the needed exported data or safe summaries.

## Minimum Useful Export Set

- top pages with traffic and conversions
- search queries with impressions, clicks, CTR, and average position
- target keywords with volume and competition
- content inventory with update dates
