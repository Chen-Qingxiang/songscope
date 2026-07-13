import { loadCorpus, validateCorpusCrossReferences } from '../src/corpus.js'

const corpus = await loadCorpus()
const errors = validateCorpusCrossReferences(corpus)
if (errors.length) throw new Error(`Corpus validation failed:\n${errors.map((error) => `- ${error}`).join('\n')}`)
console.log(`Validated ${corpus.manifest.corpusVersion}: ${corpus.coverage.validated} volumes, ${corpus.volumes.flatMap((volume) => volume.passages).length} passages, ${corpus.coverage.candidateAnnotations} candidate annotations.`)
