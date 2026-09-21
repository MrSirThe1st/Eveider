'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useState } from 'react';
import {
  shouldLoadTawk,
  SUPPORT_WIDGET_OFF_ATTR,
  SUPPORT_WIDGET_OFF_VALUE,
} from '@/lib/tawk';

type TawkApi = {
  hideWidget?: () => void;
  showWidget?: () => void;
  onLoad?: () => void;
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

function syncTawkVisibility(visible: boolean): void {
  const root = document.documentElement;
  if (visible) {
    root.removeAttribute(SUPPORT_WIDGET_OFF_ATTR);
  } else {
    root.setAttribute(SUPPORT_WIDGET_OFF_ATTR, SUPPORT_WIDGET_OFF_VALUE);
  }

  const api = window.Tawk_API ?? {};
  window.Tawk_API = api;
  api.onLoad = () => {
    if (document.documentElement.getAttribute(SUPPORT_WIDGET_OFF_ATTR) === SUPPORT_WIDGET_OFF_VALUE) {
      api.hideWidget?.();
    } else {
      api.showWidget?.();
    }
  };

  if (visible) {
    api.showWidget?.();
  } else {
    api.hideWidget?.();
  }
}

export function TawkToWidget() {
  const pathname = usePathname() ?? '/';
  const visible = shouldLoadTawk(pathname);
  const [scriptReady, setScriptReady] = useState(visible);

  useLayoutEffect(() => {
    if (visible) setScriptReady(true);
    syncTawkVisibility(visible);
  }, [visible]);

  if (!scriptReady) return null;

  return (
    <Script id="tawk-to" strategy="afterInteractive">
      {`
            var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
            (function(){
            var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
            s1.async=true;
            s1.src='https://embed.tawk.to/6a8af5a0c19bf93443db9e3a/1k0ncuuvc';
            s1.charset='UTF-8';
            s1.setAttribute('crossorigin','*');
            s0.parentNode.insertBefore(s1,s0);
            })();
          `}
    </Script>
  );
}
