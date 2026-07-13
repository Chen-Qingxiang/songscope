import { loadCorpus, validateCorpusCrossReferences } from '../src/corpus.js'

const corpus = await loadCorpus()
const errors = validateCorpusCrossReferences(corpus)
if (errors.length) throw new Error(`Coverage cannot be trusted:\n${errors.map((error) => `- ${error}`).join('\n')}`)
console.log(JSON.stringify(corpus.coverage, null, 2))
