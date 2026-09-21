export const SUPPORT_WIDGET_OFF_ATTR = 'data-support-widget';
export const SUPPORT_WIDGET_OFF_VALUE = 'off';

export function isAdminPortalPath(pathname: string): boolean {
  return pathname === '/tableau-de-bord' || pathname.startsWith('/tableau-de-bord/');
}

export function shouldLoadTawk(pathname: string): boolean {
  return !isAdminPortalPath(pathname);
}

export const TAWK_INIT_SCRIPT = `(function(){
  try {
    var p = location.pathname;
    if (p === '/tableau-de-bord' || p.indexOf('/tableau-de-bord/') === 0) {
      document.documentElement.setAttribute('${SUPPORT_WIDGET_OFF_ATTR}', '${SUPPORT_WIDGET_OFF_VALUE}');
    }
  } catch (e) {}
})();`;
