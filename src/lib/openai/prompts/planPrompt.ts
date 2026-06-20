import type { BookProject } from '@/types/book'
import { ACADEMIC_SUBTYPE_LABELS, LITERARY_GENRE_LABELS } from '@/types/book'

/**
 * Estima o número de palavras por página para o tipo da obra.
 * Obras acadêmicas tendem a ter mais texto por página; literárias menos.
 */
function wordsPerPage(type: BookProject['type']): number {
  return type === 'academic' ? 350 : 280
}

/**
 * Monta o system prompt para geração do plano de escrita.
 */
export function buildPlanSystemPrompt(book: BookProject): string {
  const isAcademic = book.type === 'academic'

  return isAcademic
    ? `Você é um especialista em metodologia científica e redação acadêmica.
Sua tarefa é criar um plano de escrita detalhado para uma obra acadêmica em português brasileiro.
Siga rigorosamente as normas ABNT.
O plano deve ter estrutura acadêmica clássica adaptada ao tipo da obra.
Cada capítulo deve ter objetivo claro, coerência com o tema geral e progressão lógica.
Distribua as páginas de forma proporcional à complexidade de cada seção.
Responda APENAS com o JSON do plano, sem texto adicional.`
    : `Você é um escritor profissional especialista em obras literárias.
Sua tarefa é criar um plano de escrita detalhado para uma obra literária em português brasileiro.
O plano deve ter arco narrativo coerente, capítulos com progressão dramática e ritmo adequado ao gênero.
Cada capítulo deve ter título criativo e descrição que guie a escrita do conteúdo.
Distribua as páginas de forma equilibrada.
Responda APENAS com o JSON do plano, sem texto adicional.`
}

/**
 * Monta o user prompt com os dados da obra.
 */
export function buildPlanUserPrompt(book: BookProject): string {
  const isAcademic = book.type === 'academic'
  const wpg = wordsPerPage(book.type)
  const totalWords = book.targetPages * wpg

  const subtypeLabel =
    isAcademic && book.academicSubtype
      ? ACADEMIC_SUBTYPE_LABELS[book.academicSubtype]
      : book.literaryGenre
      ? LITERARY_GENRE_LABELS[book.literaryGenre]
      : ''

  const structureHint = isAcademic
    ? buildAcademicStructureHint(book)
    : buildLiteraryStructureHint(book)

  return `Crie o plano de escrita para a seguinte obra:

TÍTULO: ${book.title}
TEMA: ${book.theme}
TIPO: ${isAcademic ? 'Acadêmica' : 'Literária'} — ${subtypeLabel}
DESCRIÇÃO: ${book.description}
TOTAL DE PÁGINAS: ${book.targetPages}
TOTAL DE PALAVRAS ESTIMADO: ${totalWords} (a ${wpg} palavras/página)

${structureHint}

INSTRUÇÕES:
- Gere exatamente os capítulos necessários para cobrir ${book.targetPages} páginas no total.
- A soma de targetPages de todos os capítulos deve ser igual a ${book.targetPages}.
- targetWords de cada capítulo = targetPages × ${wpg}.
- Títulos em português, claros e descritivos.
- Descrições de 2 a 4 frases explicando o conteúdo de cada capítulo.
- A ordem começa em 1.`
}

function buildAcademicStructureHint(book: BookProject): string {
  const subtype = book.academicSubtype

  if (subtype === 'article') {
    return `ESTRUTURA ESPERADA PARA ARTIGO CIENTÍFICO:
1. Introdução (apresentação do problema, justificativa, objetivos)
2. Referencial Teórico (revisão de literatura)
3. Metodologia (delineamento da pesquisa)
4. Resultados e Discussão
5. Conclusão
6. Referências (não conta como capítulo de texto — inclua apenas se necessário)`
  }

  if (subtype === 'thesis' || subtype === 'dissertation') {
    return `ESTRUTURA ESPERADA PARA ${subtype === 'thesis' ? 'TESE' : 'DISSERTAÇÃO'}:
1. Introdução
2. Revisão de Literatura / Referencial Teórico
3. Metodologia
4. Capítulos de desenvolvimento (2 a 4 capítulos conforme o tema)
5. Resultados e Discussão
6. Considerações Finais
Elementos pré-textuais (resumo, abstract) não são capítulos.`
  }

  return `ESTRUTURA ESPERADA PARA OBRA ACADÊMICA:
1. Introdução
2. Referencial Teórico
3. Metodologia
4. Desenvolvimento (1 a 3 capítulos)
5. Resultados / Análise
6. Conclusão`
}

function buildLiteraryStructureHint(book: BookProject): string {
  const genre = book.literaryGenre

  if (genre === 'poetry') {
    return `ESTRUTURA PARA COLETÂNEA DE POESIA:
- Organize em seções temáticas ou cronológicas.
- Cada "capítulo" é uma seção da coletânea com poemas relacionados.`
  }

  if (genre === 'short_story' || genre === 'chronicle') {
    return `ESTRUTURA PARA COLETÂNEA DE CONTOS/CRÔNICAS:
- Cada capítulo é um conto ou crônica independente com título próprio.
- Mantenha unidade temática ou de estilo entre eles.`
  }

  return `ESTRUTURA NARRATIVA ESPERADA:
- Ato 1 (apresentação): ~25% das páginas
- Ato 2 (desenvolvimento e conflito): ~50% das páginas
- Ato 3 (clímax e resolução): ~25% das páginas
Distribua os capítulos dentro dessa estrutura de três atos.`
}
