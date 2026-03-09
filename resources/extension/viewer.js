"use strict";

(function () {
  function getViewerContent() {
    const elem = document.getElementById('cozy-pdf-viewer-config')
    if (elem) {
      return elem.getAttribute('content')
    }
    throw new Error('Could not find preview content.')
  }

  window.addEventListener('load', function () {
    const content_path = getViewerContent()
    PDFViewerApplication.open(content_path)

    window.addEventListener('message', function (event) {
      const msg = event.data
      if (msg && msg.type === 'setPageColors') {
        applyPageColors(msg.pageColors)
        return
      }
      // reload
      window.PDFViewerApplication.open(content_path)
    });
  }, { once:true });

  // Page colors via SVG filter
  function hexToRgb(hex) {
    hex = hex.replace('#', '')
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]
    const n = parseInt(hex, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }

  function applyPageColors(pageColors) {
    let existing = document.getElementById('page-colors-svg')
    if (existing) existing.remove()
    const style = document.getElementById('page-colors-style')
    if (style) style.remove()

    if (!pageColors) return

    const bg = hexToRgb(pageColors.background)
    const fg = hexToRgb(pageColors.foreground)

    // Determine if dark mode: luminance < 0.5
    const lum = (0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2]) / 255
    const isDark = lum < 0.5

    let filterContent
    if (!isDark) {
      // Light mode: multiply — output = input * (bg/255)
      // Black stays black, white becomes bg color
      const sR = (bg[0] / 255).toFixed(6)
      const sG = (bg[1] / 255).toFixed(6)
      const sB = (bg[2] / 255).toFixed(6)
      filterContent = `
        <feComponentTransfer>
          <feFuncR type="linear" slope="${sR}" intercept="0"/>
          <feFuncG type="linear" slope="${sG}" intercept="0"/>
          <feFuncB type="linear" slope="${sB}" intercept="0"/>
        </feComponentTransfer>`
    } else {
      // Dark mode: linear remap per channel
      // black(0) -> fg, white(255) -> bg
      const sR = ((bg[0] - fg[0]) / 255).toFixed(6)
      const sG = ((bg[1] - fg[1]) / 255).toFixed(6)
      const sB = ((bg[2] - fg[2]) / 255).toFixed(6)
      const iR = (fg[0] / 255).toFixed(6)
      const iG = (fg[1] / 255).toFixed(6)
      const iB = (fg[2] / 255).toFixed(6)
      filterContent = `
        <feComponentTransfer>
          <feFuncR type="linear" slope="${sR}" intercept="${iR}"/>
          <feFuncG type="linear" slope="${sG}" intercept="${iG}"/>
          <feFuncB type="linear" slope="${sB}" intercept="${iB}"/>
        </feComponentTransfer>`
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.id = 'page-colors-svg'
    svg.setAttribute('style', 'position:absolute;width:0;height:0')
    svg.innerHTML = `
      <defs>
        <filter id="page-colors-filter" color-interpolation-filters="sRGB">
          ${filterContent}
        </filter>
      </defs>
    `
    document.body.appendChild(svg)

    const styleEl = document.createElement('style')
    styleEl.id = 'page-colors-style'
    styleEl.textContent = `
      .page canvas {
        filter: url(#page-colors-filter) !important;
      }
    `
    document.head.appendChild(styleEl)
  }

  // Signal ready
  const vscodeApi = acquireVsCodeApi()
  vscodeApi.postMessage({ type: 'ready' })

  window.onerror = function () {
    const msg = document.createElement('body')
    msg.innerText = 'An error occurred reading the document. Please try again.'
    document.body = msg
  }
}());
