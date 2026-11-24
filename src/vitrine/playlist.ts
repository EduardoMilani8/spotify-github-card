import { getApi, type FetchFn } from '../spotify.js'
import type { ItensPlaylist } from './tipos.js'

const ID_SPOTIFY = /^[A-Za-z0-9]{22}$/
const CAMPOS = 'items(item(type,is_local,album(id,name,artists(name),images)))'

/** Aceita o link da playlist, a URI `spotify:playlist:<id>` ou só o ID. */
export function lerIdPlaylist(valor: string | null | undefined): string | null {
  const texto = valor?.trim() ?? ''
  const achado = texto.match(/playlist[/:]([A-Za-z0-9]{22})/)
  const id = achado ? achado[1] : texto
  return ID_SPOTIFY.test(id) ? id : null
}

export async function buscarItensPlaylist(token: string, id: string, fetchFn: FetchFn = fetch): Promise<ItensPlaylist> {
  const query = new URLSearchParams({ limit: '20', fields: CAMPOS })
  const resposta = await getApi(`/playlists/${id}/items?${query}`, token, fetchFn)
  return (await resposta.json()) as ItensPlaylist
}
