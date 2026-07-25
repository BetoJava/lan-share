import { describe, expect, test } from 'bun:test'
import { looksLikeMarkdown, normalizeListSpacing } from './markdown-paste'

// looksLikeMarkdown décide si le collage natif doit être préservé. Un faux
// négatif fait réécrire du markdown déjà correct (et échappe ses astérisques),
// un faux positif laisse passer du HTML sans le convertir.
describe('looksLikeMarkdown', () => {
  test.each([
    ['gras', 'Voici mon **plan** :'],
    ['italique souligné', 'un mot _important_ ici'],
    ['code inline', 'lance `npm run build`'],
    ['bloc de code', '```bash\nnpm ci\n```'],
    ['titre', '# Titre\n\ndu texte'],
    ['liste à puces', '- étape 1\n- étape 2'],
    ['liste numérotée', '1. étape 1\n2. étape 2'],
    ['citation', '> une citation'],
    ['lien', 'voir [la doc](https://example.com)'],
    ['tableau', '| a | b |\n| - | - |'],
    ['liste indentée', '  - imbriquée'],
  ])('reconnaît %s', (_label, text) => {
    expect(looksLikeMarkdown(text)).toBe(true)
  })

  test.each([
    ['texte simple', 'Bonjour, comment ça va ?'],
    ['multi-ligne sans marqueur', 'première ligne\nseconde ligne'],
    ['ponctuation seule', 'Attends... vraiment ?!'],
    ['underscore dans un identifiant', 'la variable max_file_size vaut 1000'],
    ['astérisque isolé', 'note * voir plus bas'],
    ['tiret sans espace', 'anti-inflammatoire'],
    ['nombre suivi d une parenthèse', '1) pas une liste markdown'],
    ['chaîne vide', ''],
  ])('ignore %s', (_label, text) => {
    expect(looksLikeMarkdown(text)).toBe(false)
  })
})

describe('normalizeListSpacing', () => {
  test('resserre les puces produites par turndown', () => {
    expect(normalizeListSpacing('-   étape 1\n-   étape 2')).toBe('- étape 1\n- étape 2')
  })

  test('resserre les listes numérotées', () => {
    expect(normalizeListSpacing('1.  premier\n2.  second')).toBe('1. premier\n2. second')
  })

  test("conserve l'indentation des listes imbriquées", () => {
    expect(normalizeListSpacing('-   parent\n    -   enfant')).toBe('- parent\n    - enfant')
  })

  test('laisse une puce déjà correcte intacte', () => {
    expect(normalizeListSpacing('- déjà propre')).toBe('- déjà propre')
  })

  test('ne touche pas au texte hors début de ligne', () => {
    expect(normalizeListSpacing('calcul 3 -   4 = -1')).toBe('calcul 3 -   4 = -1')
  })
})
