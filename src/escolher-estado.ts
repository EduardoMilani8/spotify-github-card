import { paraMusica } from './musica.js'
import type { Estado, TocadasRecentes, TocandoAgora } from './tipos.js'

/**
 * Decide o que o card mostra, da informação mais recente para a mais antiga:
 * - "tocando": o player tem uma MÚSICA (item.type === 'track') e is_playing é true.
 * - "pausada": o player tem uma música, mas pausada. Ela vence o histórico porque o
 *   recently-played só registra faixas depois de ~30s de reprodução.
 * - "ultima": sem música no player, a primeira faixa de `recentes` (tocadaEm = played_at).
 * - "vazio": sem música e sem histórico.
 */
export function escolherEstado(atual: TocandoAgora | null, recentes: TocadasRecentes | null): Estado {
  if (atual?.item?.type === 'track') {
    const musica = paraMusica(atual.item)
    return atual.is_playing ? { tipo: 'tocando', musica } : { tipo: 'pausada', musica }
  }

  const ultima = recentes?.items?.[0]
  if (ultima) {
    return { tipo: 'ultima', musica: paraMusica(ultima.track), tocadaEm: new Date(ultima.played_at) }
  }

  return { tipo: 'vazio' }
}
