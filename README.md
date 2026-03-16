# OutlierGov

Free, open-source public accountability tool that makes Medicare spending patterns transparent and accessible to journalists, researchers, policymakers, and the public.

**Live site:** [outliergov.com](https://outliergov.com)

## What it does

OutlierGov processes 3.7 million provider-year records from CMS Medicare Part B public data to identify providers with persistently extreme billing patterns. Each of the 1.2 million providers billing Medicare annually is compared only to peers in the same specialty and state.

A provider is flagged when their allowed amount per beneficiary falls in the top 0.5% of their peer group for at least two consecutive years. Roughly 2,200 providers currently meet this threshold.

## Features

- Searchable registry of verified statistical outliers across all 50 states and all Medicare Part B specialties
- Provider profiles with peer group rank, ratio to median, year-over-year trend data, and contextual flags (drug-dominant billing, patient acuity, procedure diversity)
- AI-generated plain-language summaries that translate statistical patterns into accessible explanations (GPT-4o-mini)
- Filterable by specialty, state, outlier severity, drug percentage, and trend direction
- Exportable provider profiles (CSV, PDF)
- Fully reproducible methodology using public CMS data

## Data source

[CMS Medicare Physician and Other Practitioners Provider Utilization and Payment Data](https://data.cms.gov/provider-summary-by-type-of-service/medicare-physician-other-practitioners/medicare-physician-other-practitioners-by-provider-and-service) (2021-2023)

## Methodology

1. Aggregate provider-level data by NPI, computing allowed amount per beneficiary
2. Assign each provider to a peer group by specialty and state
3. Compute percentile ranks within each peer group
4. Flag providers in the top 0.5% for two or more consecutive years
5. Generate AI-powered plain-language summaries of each flagged provider's statistical profile

Full methodology documentation: [outliergov.com/methodology](https://outliergov.com/methodology)

## Tech stack

React, TypeScript, Supabase (Postgres + Edge Functions), OpenAI API (GPT-4o-mini), Python/pandas for offline data processing

## Roadmap

- Natural language querying across the full provider dataset
- Public API for programmatic access
- Medicare Advantage and Part D dataset integration
- ML-based pattern classification (clustering outlier types by billing signature)
- Embeddable widgets for newsrooms

## License

MIT

## Author

Built by [Arif G.](mailto:arif@outliergov.com) (University of Arizona)
