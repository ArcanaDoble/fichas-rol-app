export const tablePath = '/canvas-3d';
export function invitationFrom(value = window.location.href) {
  try {
    const url = new URL(value.trim(), window.location.origin);
    const fragment = new URLSearchParams(url.hash.slice(1));
    return {
      roomId: url.searchParams.get('mesa') || '',
      invite: fragment.get('invitacion') || '',
    };
  } catch {
    return { roomId: '', invite: '' };
  }
}
export function tableLink(roomId, invite, origin = window.location.origin) {
  const url = new URL(tablePath, origin);
  url.searchParams.set('mesa', roomId);
  if (invite) url.hash = new URLSearchParams({ invitacion: invite }).toString();
  return url.href;
}
