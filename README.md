# 📋 Gestão de Licenças — Escola Ponte do Saber

Sistema simples e completo para controlar **todas as licenças da escola em um só lugar**:
vigilância sanitária, corpo de bombeiros, meio ambiente, educação, alvará/prefeitura,
acessibilidade e outras.

Acompanhe **vencimentos**, guarde os **arquivos/documentos** de cada licença, marque as
**exigências (checklist)** e registre o **histórico de renovações**.

## ✨ O que o sistema faz

- **Painel de alertas** — mostra de forma colorida o que está vencido, vencendo em breve
  (≤ 30 dias), em atenção (≤ 90 dias) e em dia.
- **Cadastro de licenças** por categoria, com órgão emissor, número/protocolo, datas de
  emissão e vencimento, responsável e observações.
- **Checklist de exigências** — cada categoria já vem com uma lista padrão de documentos
  necessários (que você pode editar). Marque o que já foi providenciado.
- **Arquivos/documentos** — anexe PDFs, fotos e outros arquivos a cada licença
  (alvará, protocolo, laudos, comprovantes...). Baixe quando precisar.
- **Renovações e histórico** — registre cada renovação; o vencimento anterior fica guardado.
- **Busca e filtros** por nome, categoria e status.
- **Backup** — exporte e importe todos os dados (incluindo arquivos) em um único arquivo.

## 🚀 Como usar

### Opção 1 — Abrir direto no computador
Baixe os arquivos e abra o `index.html` no navegador (Chrome, Edge, Firefox).
Funciona **offline**, sem instalar nada.

### Opção 2 — Publicar grátis no GitHub Pages
1. No GitHub, vá em **Settings → Pages**.
2. Em *Build and deployment*, escolha **Deploy from a branch**.
3. Selecione a branch desejada e a pasta **/ (root)**, salve.
4. Em alguns minutos o sistema fica disponível num endereço `https://...github.io/...`.

## 💾 Onde os dados ficam salvos

Os dados (licenças, exigências e arquivos) ficam salvos **apenas no navegador/computador
em que você usa o sistema** (tecnologia IndexedDB). Eles **não** vão para a internet.

> ⚠️ **Faça backups com frequência** na aba **Backup**. Se o navegador for limpo ou o
> computador trocado, os dados se perdem. Guarde o arquivo de backup em local seguro
> (pen drive, e-mail, nuvem).

Para usar em vários computadores/pessoas ao mesmo tempo com dados compartilhados, é
necessária uma versão com banco na nuvem (ex.: Supabase) — isso pode ser adicionado depois.

## 🗂️ Estrutura do projeto

```
index.html        Página principal
css/styles.css    Estilos
js/db.js          Persistência (IndexedDB) + exportar/importar
js/seed.js        Categorias e checklists padrão
js/app.js         Lógica da aplicação (telas, formulários, arquivos)
```

## 🔧 Personalização rápida

As categorias e as listas de exigências padrão ficam em `js/seed.js`. Para adicionar uma
nova categoria ou ajustar os itens de checklist, basta editar esse arquivo.
