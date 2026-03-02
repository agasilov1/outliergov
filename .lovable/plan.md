## Plan: Dashboard Drug % Column/Filter + Provider Data Context Card

### Overview

Two changes: (1) Add a "Drug %" column and drug-dominant filter toggle to the dashboard rankings table, and (2) replace the static "Possible Explanations" component on the provider detail page with a data-driven context card showing only applicable insights.

---

### Technical Details

#### 1.. Dashboard changes (`Dashboard.tsx` + `ProviderFilters.tsx`)

**New state/filter:**

- Add `excludeDrugDominant` boolean filter (URL param `exDrug`), default `true`
- Add to `QueryParams` interface and `applyFilters` function: `WHERE drug_pct < 0.8 OR drug_pct IS NULL`

**Institutional filter default:**

- Already defaults to ON (`searchParams.get('exInst') !== 'false'` on line 104). No change needed.

**Table column:**

- Add "Drug %" column header (sortable) after "Max Allowed" column
- Display `drug_pct` formatted as percentage (e.g. "82.3%") or "—" if null
- Add sorting: new URL param `sort` to allow toggling sort by `drug_pct`

**Data fetching:**

- Add `drug_pct` to the `outlier_registry` select query (line 167)
- Add filter logic in `applyFilters`: if `excludeDrugDominant`, add `.or('drug_pct.lt.0.8,drug_pct.is.null')`

**Filter UI (`ProviderFilters.tsx`):**

- Add new prop `excludeDrugDominant` + `onExcludeDrugDominantChange`
- Render a toggle similar to the institutional one: "Exclude drug-dominant (>80%)"

#### 3. Provider Detail: Data Context Card (`ProviderDetail.tsx`)

**Fetch new fields:**

- Add `drug_pct`, `tot_hcpcs_cds`, `bene_avg_risk_score`, `entity_type` to the `provider_year_metrics` select query (line 166)
- Already fetches `entity_type`, `tot_benes`

**Replace `<PossibleExplanations />**` with a new `<DataContextCard />` component that receives the latest year's metrics and conditionally renders applicable bullets:


| Condition                   | Bullet text                                             |
| --------------------------- | ------------------------------------------------------- |
| `drug_pct > 0.8`            | Drug-related billing explanation with actual percentage |
| `tot_benes < 50`            | Small patient panel with actual count                   |
| `bene_avg_risk_score > 2.0` | High-acuity population with actual score                |
| `tot_hcpcs_cds < 15`        | Narrow procedure set with actual count                  |
| `entity_type === 'O'`       | Organizational provider aggregation note                |


If no conditions apply, fall back to the existing generic `PossibleExplanations` component.

#### 4. New component: `src/components/DataContextCard.tsx`

Props: `drugPct`, `totBenes`, `beneAvgRiskScore`, `totHcpcsCds`, `entityType` (all nullable). Renders a Card with only the matching insights as styled bullet items.

---

### Files to modify

- `**src/pages/Dashboard.tsx**`: Add drug_pct to query, filter logic, table column, sort support
- `**src/components/ProviderFilters.tsx**`: Add drug-dominant toggle
- `**src/components/DataContextCard.tsx**`: New component (data-driven context bullets)
- `**src/pages/ProviderDetail.tsx**`: Fetch new fields, replace `<PossibleExplanations />` with `<DataContextCard />`