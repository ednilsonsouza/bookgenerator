import type { BookProject } from '@/types/book'
import { ACADEMIC_SUBTYPE_LABELS, LITERARY_GENRE_LABELS } from '@/types/book'

/**
 * Estima o número de palavras por página para o tipo da obra.
 */
function wordsPerPage(type: BookProject['type']): number {
  return type === 'academic' ? 350 : 280
}

/**
 * Monta o system prompt para geração do plano de escrita.
 */
export function buildPlanSystemPrompt(book: BookProject): string {
  const isAcademic = book.type === 'academic'

  const jsonFormat = `Responda APENAS com JSON válido neste formato exato (sem markdown, sem texto extra):
{"chapters":[{"order":1,"title":"Título do capítulo","description":"Descrição do capítulo.","targetPages":N,"targetWords":N}]}`

  return isAcademic
    ? `Você é um especialista em metodologia científica e redação acadêmica.
Sua tarefa é criar um plano de escrita para uma obra acadêmica do tipo LEVANTAMENTO BIBLIOGRÁFICO em português brasileiro.
A metodologia deve ser baseada na Análise de Conteúdo de Laurence Bardin.
Os resultados devem ser analisados a partir das unidades de contexto e categorias criadas na Análise de Conteúdo.
Siga as normas ABNT. Cada capítulo deve ter objetivo claro e progressão lógica.
${jsonFormat}`
    : `Você é um escritor profissional especialista em obras literárias.
Sua tarefa é criar um plano de escrita para uma obra literária em português brasileiro.
O plano deve ter arco narrativo coerente e ritmo adequado ao gênero.
${jsonFormat}`
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
TIPO: ${isAcademic ? 'Acadêmica — Levantamento Bibliográfico' : 'Literária'} — ${subtypeLabel}
DESCRIÇÃO: ${book.description}
TOTAL DE PÁGINAS: ${book.targetPages}
TOTAL DE PALAVRAS ESTIMADO: ${totalWords} (a ${wpg} palavras/página)

${structureHint}

INSTRUÇÕES (obrigatório):
- Use EXATAMENTE os campos: order, title, description, targetPages, targetWords (em inglês).
- Gere os capítulos necessários para cobrir ${book.targetPages} páginas no total.
- A soma de targetPages de todos os capítulos deve ser igual a ${book.targetPages}.
- targetWords de cada capítulo = targetPages × ${wpg} (número inteiro).
- Títulos e descrições em português, claros e descritivos.
- Descrições de 2 a 4 frases por capítulo.
- A ordem (order) começa em 1.
- Retorne SOMENTE o JSON, sem qualquer texto antes ou depois.`
}

function buildAcademicStructureHint(book: BookProject): string {
  const subtype = book.academicSubtype

  // Estrutura padrão de levantamento bibliográfico com Análise de Conteúdo de Bardin
  const bardinStructure = `ESTRUTURA OBRIGATÓRIA — LEVANTAMENTO BIBLIOGRÁFICO COM ANÁLISE DE CONTEÚDO DE BARDIN:

1. Introdução
   - Contextualização do tema, problema de pesquisa, justificativa e objetivos (geral e específicos).
   - Apresentação da abordagem metodológica adotada.

2. Referencial Teórico
   - Fundamentação teórica sobre o tema.
   - Pode ser dividido em subcapítulos conforme a complexidade do tema.
   - Discussão dos principais conceitos, teorias e estudos relacionados.

3. Metodologia
   - Caracterização da pesquisa como levantamento bibliográfico de abordagem qualitativa.
   - Descrição dos critérios de seleção do corpus documental (bases de dados, descritores, período, critérios de inclusão/exclusão).
   - Detalhamento das três fases da Análise de Conteúdo de Laurence Bardin:
     a) Pré-análise: leitura flutuante, constituição do corpus e formulação de hipóteses.
     b) Exploração do material: codificação, definição das unidades de registro e unidades de contexto.
     c) Tratamento dos resultados: categorização temática e inferências.
   - Apresentação das categorias de análise emergentes do corpus.

4. Análise e Discussão dos Resultados
   - Resultados analisados e discutidos a partir das categorias e unidades de contexto identificadas.
   - Cada categoria deve ter uma seção própria com análise dos dados e discussão à luz do referencial teórico.
   - Citações e evidências dos textos analisados para sustentar cada categoria.

5. Considerações Finais
   - Síntese dos principais resultados encontrados nas categorias.
   - Resposta aos objetivos e problema de pesquisa.
   - Limitações do estudo e sugestões para pesquisas futuras.`

  if (subtype === 'article') {
    return `ESTRUTURA PARA ARTIGO CIENTÍFICO — LEVANTAMENTO BIBLIOGRÁFICO COM ANÁLISE DE CONTEÚDO DE BARDIN:

1. Introdução (problema, justificativa, objetivos)
2. Referencial Teórico
3. Metodologia (levantamento bibliográfico + Análise de Conteúdo de Bardin: pré-análise, exploração do material, categorização)
4. Resultados e Discussão (por categorias da Análise de Conteúdo, com unidades de contexto)
5. Considerações Finais`
  }

  if (subtype === 'thesis' || subtype === 'dissertation') {
    return `${bardinStructure}

NOTA: Para ${subtype === 'thesis' ? 'tese' : 'dissertação'}, o Referencial Teórico pode ser dividido em 2 ou 3 capítulos temáticos. A Análise e Discussão pode igualmente ser dividida em capítulos por categoria.`
  }

  return bardinStructure
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
