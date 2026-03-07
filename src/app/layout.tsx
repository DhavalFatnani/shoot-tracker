import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "ShootTrack",
  description: "Serialized shoot inventory tracker",
  icons: {
    icon: "/icon",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700,500,400&f[]=satoshi@700,500,400&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var h=document.documentElement;var t=localStorage.getItem('theme');var dark=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches);h.classList.remove('light','dark');h.classList.add(dark?'dark':'light');})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function isEventReason(r){return r&&typeof r==='object'&&typeof r.preventDefault==='function'&&'target' in r;}var add=window.addEventListener;window.addEventListener=function(type,listener,options){if(type==='unhandledrejection'){var useCapture=options===true||(options&&options.capture);var wrapped=useCapture?listener:function(ev){if(isEventReason(ev.reason))return;return listener.call(this,ev);};return add.call(window,type,wrapped,options);}return add.call(window,type,listener,options);};add.call(window,'unhandledrejection',function(ev){if(isEventReason(ev.reason)){ev.preventDefault();ev.stopImmediatePropagation();}},true);})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <Toaster>{children}</Toaster>
      </body>
    </html>
  );
}
