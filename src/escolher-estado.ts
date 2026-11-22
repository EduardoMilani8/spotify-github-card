import { paraMusica } from './musica.js'
import type { Estado, TocadasRecentes, TocandoAgora } from './tipos.js'

/**
 * Decide o que o card mostra.
 * - "tocando": há uma MÚSICA (item.type === 'track') e is_playing é true.
 * - "ultima": caso contrário, a primeira faixa de `recentes` (tocadaEm = played_at).
 * - "vazio": sem música tocando e sem histórico.
 * Use paraMusica(faixa) para converter a faixa do Spotify.
 */
export function escolherEstado(atual: TocandoAgora | null, recentes: TocadasRecentes | null): Estado {
  if (atual?.item?.type === 'track' && atual.is_playing) {
    return {
      tipo: 'tocando',
      musica: paraMusica(atual.item)
    }
  }

  const ultima = recentes?.items?.[0]

  if (ultima) {
    return {
      tipo: 'ultima',
      musica: paraMusica(ultima.track),
      tocadaEm: new Date(ultima.played_at)
    }
  }

  return {
    tipo: 'vazio'
  }
}
