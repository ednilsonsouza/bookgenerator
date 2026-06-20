# AGENTS.md

## Objetivo do projeto

SaaS para geração de obras acadêmicas e literárias extensas usando IA, com fluxo de plano de escrita, geração progressiva por capítulos, revisão, exportação em PDF e biblioteca pública.

## Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS — tema dark (black/acinzentado)
- Appwrite self-hosted — autenticação, banco, storage
- OpenAI API — modelo padrão GPT-4o mini
- BullMQ + Redis — filas para geração longa
- Zod — validação de formulários e schemas
- react-hook-form — gerenciamento de formulários

## Regras gerais

- Não modificar arquivos sem autorização explícita do usuário.
- Trabalhar em modo de planejamento antes de implementar mudanças grandes.
- Priorizar TypeScript estrito, validação forte com Zod e componentes reutilizáveis.
- Toda geração longa deve ser feita por jobs assíncronos — nunca por requisição HTTP bloqueante.
- Não expor chaves da OpenAI, Appwrite ou serviços externos no frontend (prefixo NEXT_PUBLIC_ apenas para cliente Appwrite).
- Usar variáveis de ambiente para todos os segredos.
- Implementar logs, status de jobs e tratamento de falhas com retry.
- Sempre usar o App Router do Next.js (src/app/).
- Componentes de servidor quando possível; Client Components ('use client') apenas quando necessário.

## Estrutura de diretórios

```
src/
  app/                   # App Router Next.js
    (auth)/              # Grupo de rotas — login e cadastro
    (dashboard)/         # Grupo de rotas — área do membro
    (admin)/             # Grupo de rotas — painel admin
    library/             # Biblioteca pública
  components/
    ui/                  # Componentes genéricos (Button, Input, Card, etc.)
    forms/               # Formulários específicos do domínio
    books/               # Componentes específicos de obras
  lib/
    appwrite/            # Configuração e helpers do Appwrite
    openai/              # Cliente OpenAI, prompts e schemas
    rag/                 # RAG: extração, chunks, embeddings, recuperação
    jobs/                # Filas e jobs assíncronos
    pdf/                 # Geração de PDF
    validation/          # Schemas Zod
  types/                 # Tipos TypeScript globais
  context/               # Contextos React (AuthContext, etc.)
  middleware.ts          # Proteção de rotas
```

## Convenções de código

- Arquivos de componente: PascalCase (ex: BookProjectForm.tsx)
- Arquivos de lib/util: camelCase (ex: appwriteClient.ts)
- Variáveis de ambiente servidor: sem prefixo (ex: OPENAI_API_KEY)
- Variáveis de ambiente cliente: prefixo NEXT_PUBLIC_ (ex: NEXT_PUBLIC_APPWRITE_ENDPOINT)
- Sempre exportar tipos junto com os componentes/funções que os usam
- Usar `cn()` de src/lib/utils.ts para classes Tailwind condicionais

## IA e geração de conteúdo

- Usar GPT-4o mini como modelo padrão (gpt-4o-mini).
- Usar Structured Outputs para plano de escrita e metadados.
- Gerar obras longas por capítulo/seção, nunca em uma única chamada.
- Para obras acadêmicas, usar somente conteúdo baseado nos documentos enviados (RAG).
- Cada parágrafo acadêmico deve conter citação direta ou indireta conforme ABNT.
- Nunca inventar referência bibliográfica — bloquear se não houver fonte correspondente.
- Registrar sourceChunkIds para cada trecho gerado.

## Segurança

- Implementar autenticação via Appwrite.
- Roles: member e admin (verificado por e-mail: NEXT_PUBLIC_ADMIN_EMAIL).
- Validar upload de arquivos (tipo, tamanho).
- Aplicar rate limit nas rotas de geração.
- Controlar custos de IA por usuário/plano.
- Proteger rotas privadas via middleware.ts.

## Appwrite — Regras críticas

- IDs de banco e coleções centralizados em src/lib/appwrite/config.ts.
- Delay de 1.5s após criar collection, 300ms entre atributos, 2s antes de índices.
- maximumFileSize de bucket: máximo 30.000.000 bytes.
- encryption: false, antivirus: false no self-hosted.
- Campos truncados antes de salvar (s.slice(0, maxSize)).
- Nunca criar botão de "Setup" na interface — bootstrap via agente com API Key.

## Testes prioritários

- Cadastro e login de usuário
- Criação de projeto de obra (acadêmica e literária)
- Upload de referências (mínimo 5, máximo 30)
- Geração do plano de escrita
- Edição e salvamento do plano
- Geração parcial e retomada de jobs
- Exportação em PDF
- Publicação na biblioteca pública
```
