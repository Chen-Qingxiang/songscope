import { loadCuratedDataset } from './load-curated.js'

const dataset = await loadCuratedDataset()
console.log(`Validated ${dataset.metadata.datasetVersion}: ${dataset.assertions.length} assertions, ${dataset.evidenceLinks.length} evidence links.`)
