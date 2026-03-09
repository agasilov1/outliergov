

## Update Copy on Methodology and Data Sources Pages

Straightforward copy replacement on two files.

### `src/pages/DataSources.tsx`
- Update the bullet list to include the new fields (drug/medical amounts, HCC risk score, beneficiary average age, total HCPCS codes)
- No structural changes needed, just text updates

### `src/pages/Methodology.tsx`
- Update version from 1.2 → 1.3
- Add new "Contextual Metrics" section (drug vs medical split, risk score, beneficiary age, HCPCS codes)
- Add new "Year-Over-Year Trend Analysis" section
- Update disclaimer to include drug-dominant billing, organizational NPI mentions
- Update Future Enhancements (procedure-level breakdown "by HCPCS code")
- Update Data Processing aggregation text to mention drug/medical split and supplemental fields

### Files changed
- `src/pages/DataSources.tsx`
- `src/pages/Methodology.tsx`

