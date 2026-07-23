(() => {
  'use strict'

  const WIDGET_ID = 'kanna-live2d-widget'
  const CANVAS_ID = 'kanna-live2d-canvas'
  const TALK_INPUT_ID = 'live_talk'
  const STORAGE_KEY = 'mio-kanna-live2d-hidden'
  const MODEL_URL = '/live2d/kanna/Kobayaxi.model.json'
  const IDLE_RESTART_MS = 12000

  const readStoredState = () => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  }

  const writeStoredState = hidden => {
    try {
      window.localStorage.setItem(STORAGE_KEY, hidden ? '1' : '0')
    } catch {
      // The widget still works when storage is unavailable.
    }
  }

  const mountWidget = () => {
    if (document.getElementById(WIDGET_ID)) return
    if (!window.WebGLRenderingContext || typeof window.loadlive2d !== 'function') return

    const widget = document.createElement('aside')
    widget.id = WIDGET_ID
    widget.setAttribute('aria-label', '康纳 Live2D 看板娘')
    widget.dataset.live2dStatus = 'loading'

    const canvas = document.createElement('canvas')
    canvas.id = CANVAS_ID
    canvas.width = 500
    canvas.height = 560
    canvas.setAttribute('aria-hidden', 'true')

    const closeButton = document.createElement('button')
    closeButton.id = 'kanna-live2d-toggle'
    closeButton.type = 'button'
    closeButton.textContent = '×'
    closeButton.setAttribute('aria-label', '收起康纳看板娘')
    closeButton.title = '收起看板娘'

    let talkInput = document.getElementById(TALK_INPUT_ID)
    if (!talkInput) {
      talkInput = document.createElement('input')
      talkInput.id = TALK_INPUT_ID
      talkInput.type = 'hidden'
      talkInput.value = '0'
      talkInput.setAttribute('aria-hidden', 'true')
    }

    const restoreButton = document.createElement('button')
    restoreButton.id = 'kanna-live2d-restore'
    restoreButton.type = 'button'
    restoreButton.textContent = '康'
    restoreButton.setAttribute('aria-label', '显示康纳看板娘')
    restoreButton.title = '显示看板娘'

    const setHidden = hidden => {
      widget.classList.toggle('is-hidden', hidden)
      restoreButton.classList.toggle('is-visible', hidden)
      restoreButton.setAttribute('aria-hidden', hidden ? 'false' : 'true')
      talkInput.value = hidden ? '3' : '0'
      writeStoredState(hidden)
    }

    closeButton.addEventListener('click', event => {
      event.stopPropagation()
      setHidden(true)
    })

    restoreButton.addEventListener('click', event => {
      event.stopPropagation()
      setHidden(false)
    })

    widget.append(canvas, closeButton)
    if (!talkInput.parentNode) widget.append(talkInput)
    document.body.append(widget, restoreButton)
    setHidden(readStoredState())

    try {
      window.loadlive2d(CANVAS_ID, MODEL_URL, 0.52)
      widget.dataset.live2dStatus = 'ready'
    } catch (error) {
      widget.dataset.live2dStatus = 'failed'
      widget.remove()
      restoreButton.remove()
      console.error('[Live2D] 康纳模型加载失败：', error)
      return
    }

    window.setInterval(() => {
      if (!widget.classList.contains('is-hidden') && talkInput.value === '3') {
        talkInput.value = '0'
      }
    }, IDLE_RESTART_MS)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWidget, { once: true })
  } else {
    mountWidget()
  }
})()
