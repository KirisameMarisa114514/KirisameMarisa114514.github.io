(() => {
  'use strict'

  const CANVAS_ID = 'sakura-canvas'
  const TAU = Math.PI * 2
  const COLORS = ['#ff9fbd', '#ffb7cf', '#ffc6d9', '#ffd4e3']

  if (document.getElementById(CANVAS_ID)) return

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', {
    alpha: true,
    desynchronized: true
  })

  if (!context) return

  canvas.id = CANVAS_ID
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '10',
    display: 'block',
    contain: 'strict'
  })

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const particles = []
  let width = 0
  let height = 0
  let animationFrame = 0
  let lastTime = 0
  let resizeTimer = 0
  let running = false

  const random = (min, max) => Math.random() * (max - min) + min

  const resetParticle = (particle, initial = false) => {
    const mobile = width < 768

    particle.size = random(mobile ? 8 : 10, mobile ? 15 : 19)
    particle.baseX = random(-particle.size, width + particle.size)
    particle.y = initial
      ? random(-height * 0.15, height)
      : random(-height * 0.18, -particle.size)
    particle.speed = random(mobile ? 22 : 25, mobile ? 43 : 54)
    particle.drift = random(-5, 5)
    particle.sway = random(mobile ? 8 : 12, mobile ? 22 : 32)
    particle.phase = random(0, TAU)
    particle.phaseSpeed = random(0.55, 1.15)
    particle.rotation = random(0, TAU)
    particle.rotationSpeed = random(-0.9, 0.9)
    particle.opacity = random(0.45, 0.78)
    particle.color = COLORS[Math.floor(Math.random() * COLORS.length)]
  }

  const getParticleCount = () => {
    const mobile = width < 768
    const countByArea = Math.round((width * height) / 48000)
    const minimum = mobile ? 12 : 20
    const maximum = mobile ? 18 : 38

    return Math.min(maximum, Math.max(minimum, countByArea))
  }

  const syncParticleCount = () => {
    const target = getParticleCount()

    while (particles.length < target) {
      const particle = {}
      resetParticle(particle, true)
      particles.push(particle)
    }

    if (particles.length > target) {
      particles.length = target
    }
  }

  const resizeCanvas = () => {
    width = Math.max(1, window.innerWidth)
    height = Math.max(1, window.innerHeight)

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * pixelRatio)
    canvas.height = Math.round(height * pixelRatio)
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

    syncParticleCount()

    particles.forEach(particle => {
      if (particle.baseX > width + particle.sway || particle.y > height + particle.size) {
        resetParticle(particle, true)
      }
    })
  }

  const drawFlower = particle => {
    context.save()
    context.translate(
      particle.baseX + Math.sin(particle.phase) * particle.sway,
      particle.y
    )
    context.rotate(particle.rotation)
    context.scale(1, 0.68 + Math.abs(Math.sin(particle.phase * 0.7)) * 0.32)
    context.globalAlpha = particle.opacity
    context.fillStyle = particle.color

    for (let index = 0; index < 5; index += 1) {
      context.save()
      context.rotate((TAU / 5) * index)
      context.beginPath()
      context.ellipse(
        0,
        -particle.size * 0.28,
        particle.size * 0.18,
        particle.size * 0.34,
        0,
        0,
        TAU
      )
      context.fill()
      context.restore()
    }

    context.fillStyle = '#ffe59a'
    context.beginPath()
    context.arc(0, 0, particle.size * 0.12, 0, TAU)
    context.fill()
    context.restore()
  }

  const updateParticle = (particle, delta) => {
    particle.y += particle.speed * delta
    particle.baseX += particle.drift * delta
    particle.phase += particle.phaseSpeed * delta
    particle.rotation += particle.rotationSpeed * delta

    if (particle.baseX < -particle.sway - particle.size) {
      particle.baseX = width + particle.sway
    } else if (particle.baseX > width + particle.sway + particle.size) {
      particle.baseX = -particle.sway
    }

    if (particle.y - particle.size > height) {
      resetParticle(particle)
    }
  }

  const render = timestamp => {
    if (!running) return

    const delta = Math.min((timestamp - lastTime) / 1000 || 0, 0.033)
    lastTime = timestamp
    context.clearRect(0, 0, width, height)

    particles.forEach(particle => {
      updateParticle(particle, delta)
      drawFlower(particle)
    })

    animationFrame = window.requestAnimationFrame(render)
  }

  const stop = (clear = false) => {
    running = false
    window.cancelAnimationFrame(animationFrame)
    animationFrame = 0

    if (clear) {
      context.clearRect(0, 0, width, height)
    }
  }

  const start = () => {
    if (running || reducedMotion.matches || document.hidden) return

    running = true
    lastTime = performance.now()
    animationFrame = window.requestAnimationFrame(render)
  }

  const handleVisibilityChange = () => {
    if (document.hidden) {
      stop()
    } else {
      start()
    }
  }

  const handleMotionPreference = event => {
    canvas.hidden = event.matches

    if (event.matches) {
      stop(true)
    } else {
      resizeCanvas()
      start()
    }
  }

  const handleResize = () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(resizeCanvas, 120)
  }

  const mount = () => {
    document.body.appendChild(canvas)
    canvas.hidden = reducedMotion.matches
    resizeCanvas()
    start()

    window.addEventListener('resize', handleResize, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)

    if (typeof reducedMotion.addEventListener === 'function') {
      reducedMotion.addEventListener('change', handleMotionPreference)
    } else {
      reducedMotion.addListener(handleMotionPreference)
    }
  }

  if (document.body) {
    mount()
  } else {
    document.addEventListener('DOMContentLoaded', mount, { once: true })
  }
})()
